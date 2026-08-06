from datetime import datetime

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from apps.appointments.models import Appointment

ACTIVE_APPOINTMENT_STATUSES = (
    Appointment.Status.PENDING,
    Appointment.Status.CONFIRMED,
    Appointment.Status.IN_PROGRESS,
)


def validate_schedule_values(*, doctor, day_of_week, start_time, end_time, slot_duration_minutes, instance=None):
    errors = {}

    if start_time >= end_time:
        errors['end_time'] = 'End time must be later than start time.'

    if slot_duration_minutes <= 0:
        errors['slot_duration_minutes'] = 'Slot duration must be greater than 0.'
    else:
        start_dt = datetime.combine(timezone.localdate(), start_time)
        end_dt = datetime.combine(timezone.localdate(), end_time)
        block_minutes = int((end_dt - start_dt).total_seconds() // 60)
        if slot_duration_minutes > block_minutes:
            errors['slot_duration_minutes'] = 'Slot duration must fit inside the working period.'

    if not errors:
        from .models import DoctorSchedule
        conflicts = DoctorSchedule.objects.filter(
            doctor=doctor,
            day_of_week=day_of_week,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if instance and instance.pk:
            conflicts = conflicts.exclude(pk=instance.pk)
        if conflicts.exists():
            errors['non_field_errors'] = 'This working period overlaps with another schedule for the same doctor.'

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
