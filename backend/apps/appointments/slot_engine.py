from datetime import datetime, timedelta

from django.utils import timezone

from apps.appointments.models import Appointment
from apps.doctors.models import DoctorSchedule


def get_schedules_for_date(doctor_id, appointment_date, visit_type='clinic'):
	return DoctorSchedule.objects.filter(
		doctor_id=doctor_id,
		day_of_week=appointment_date.weekday(),
		visit_type=visit_type,
	).order_by('start_time')


def find_schedule_for_slot(doctor_id, appointment_date, start_time, visit_type='clinic'):
	for schedule in get_schedules_for_date(doctor_id, appointment_date, visit_type):
		candidate_start = datetime.combine(appointment_date, start_time)
		candidate_end = candidate_start + timedelta(minutes=schedule.slot_duration_minutes)
		if schedule.start_time <= start_time and candidate_end.time() <= schedule.end_time:
			return schedule, candidate_end.time()
	return None, None


def get_available_slots(doctor_id, appointment_date, visit_type='clinic'):
	schedules = get_schedules_for_date(doctor_id, appointment_date, visit_type)
	if not schedules.exists():
		return []

	now = timezone.localtime()
	minimum_booking_time = now + timedelta(minutes=30)
	slots = set()

	for schedule in schedules:
		current = datetime.combine(appointment_date, schedule.start_time)
		end_hour = datetime.combine(appointment_date, schedule.end_time)

		while current < end_hour:
			candidate_start = current
			candidate_end = current + timedelta(minutes=schedule.slot_duration_minutes)
			if candidate_end > end_hour:
				break

			candidate_aware = timezone.make_aware(candidate_start, timezone.get_current_timezone())
			passes_buffer = appointment_date > now.date() or candidate_aware > minimum_booking_time

			if passes_buffer:
				has_conflict = Appointment.objects.filter(
					doctor_id=doctor_id,
					appointment_date=appointment_date,
					start_time__lt=candidate_end.time(),
					end_time__gt=candidate_start.time(),
				).exclude(
					status__in=[Appointment.Status.CANCELLED, Appointment.Status.MISSED]
				).exists()

				if not has_conflict:
					slots.add(candidate_start.strftime('%H:%M'))

			current += timedelta(minutes=schedule.slot_duration_minutes)

	return sorted(slots)
