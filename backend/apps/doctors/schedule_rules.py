from datetime import datetime

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from apps.appointments.models import Appointment

ACTIVE_APPOINTMENT_STATUSES = (
	Appointment.Status.PENDING,
	Appointment.Status.CONFIRMED,
	Appointment.Status.IN_PROGRESS,
)

HOME_VISIT_TRANSITION_MINUTES = 60


def time_to_minutes(value):
	return value.hour * 60 + value.minute

def validate_schedule_values(*, doctor, day_of_week, start_time, end_time, visit_type, slot_duration_minutes, instance=None):
	errors = {}

	if start_time >= end_time:
		errors['end_time'] = ('End time must be later than start time.')

	if slot_duration_minutes <= 0:
		errors['slot_duration_minutes'] = ('Slot duration must be greater than 0.')
	else:
		start_dt = datetime.combine(timezone.localdate(), start_time)
		end_dt = datetime.combine(timezone.localdate(), end_time)
		block_minutes = int((end_dt - start_dt).total_seconds() // 60)

		if slot_duration_minutes > block_minutes:
			errors['slot_duration_minutes'] = (
				'Slot duration must fit inside the '
				'working period.'
			)

	if errors:
		raise DjangoValidationError(errors)

	from .models import DoctorSchedule

	schedules = DoctorSchedule.objects.filter(doctor=doctor, day_of_week=day_of_week)

	if instance and instance.pk:
		schedules = schedules.exclude(pk=instance.pk)

	new_start = time_to_minutes(start_time)
	new_end = time_to_minutes(end_time)

	for existing in schedules:
		existing_start = time_to_minutes(existing.start_time)
		existing_end = time_to_minutes(existing.end_time)

		has_overlap = (new_start < existing_end and new_end > existing_start)

		if has_overlap:
			errors['non_field_errors'] = (
				'This working period overlaps with '
				'another schedule for the same doctor.'
			)
			break

		involves_home_visit = (visit_type == 'home_visit' or existing.visit_type == 'home_visit')
		different_visit_types = (visit_type != existing.visit_type)

		if not (involves_home_visit and different_visit_types):
			continue

		if existing_end <= new_start:
			gap_minutes = (new_start - existing_end)
		elif new_end <= existing_start:
			gap_minutes = (existing_start - new_end)
		else:
			continue

		if (gap_minutes < HOME_VISIT_TRANSITION_MINUTES):
			errors['non_field_errors'] = (
				'A doctor needs at least '
				f'{HOME_VISIT_TRANSITION_MINUTES} '
				'minutes between clinic and '
				'home-visit schedules.'
			)
			break

	if errors:
		raise DjangoValidationError(errors)


def get_appointments_covered_by_schedule(schedule):
	today = timezone.localdate()
	return Appointment.objects.filter(
		doctor=schedule.doctor,
		appointment_date__gte=today,
		appointment_date__week_day=((schedule.day_of_week + 1) % 7) + 1,
		visit_type=schedule.visit_type,
		status__in=ACTIVE_APPOINTMENT_STATUSES,
		start_time__gte=schedule.start_time,
		end_time__lte=schedule.end_time,
	)


def ensure_schedule_update_preserves_appointments(instance, *, day_of_week, start_time, end_time, visit_type):
	affected = get_appointments_covered_by_schedule(instance)
	invalid = affected.exclude(
		appointment_date__week_day=((day_of_week + 1) % 7) + 1,
		visit_type=visit_type,
		start_time__gte=start_time,
		end_time__lte=end_time,
	)
	if invalid.exists():
		raise DjangoValidationError({
			'non_field_errors': (
				'This schedule cannot be changed because active appointments '
				'would fall outside the proposed working period.'
			)
		})


def ensure_schedule_can_be_deleted(schedule):
	if get_appointments_covered_by_schedule(schedule).exists():
		raise DjangoValidationError({
			'detail': (
				'This schedule cannot be deleted because it contains active '
				'future appointments.'
			)
		})
