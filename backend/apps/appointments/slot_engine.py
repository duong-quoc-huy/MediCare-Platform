from datetime import datetime, timedelta

from django.utils import timezone

from apps.appointments.models import Appointment
from apps.doctors.models import DoctorSchedule


def get_available_slots(doctor_id, appointment_date, visit_type='clinic'):
	day_of_week = appointment_date.weekday()

	try:
		schedule = DoctorSchedule.objects.get(
			doctor_id=doctor_id,
			day_of_week=day_of_week,
			visit_type=visit_type
		)
	except DoctorSchedule.DoesNotExist:
		return []

	start_hour = datetime.combine(appointment_date, schedule.start_time)
	end_hour = datetime.combine(appointment_date, schedule.end_time)

	now = timezone.localtime()
	today = now.date()
	minimum_booking_time = now + timedelta(minutes=30)

	current = start_hour
	slots = []

	while current < end_hour:
		candidate_start = current
		candidate_end = current + timedelta(
			minutes=schedule.slot_duration_minutes
		)

		if candidate_end > end_hour:
			break

		passes_same_day_buffer = (
			appointment_date != today
			or candidate_start.time() > minimum_booking_time.time()
		)

		if passes_same_day_buffer:
			has_conflict = (
				Appointment.objects
				.filter(
					doctor_id=doctor_id,
					appointment_date=appointment_date,
					start_time__lt=candidate_end.time(),
					end_time__gt=candidate_start.time(),
				)
				.exclude(status=Appointment.Status.CANCELLED)
				.exists()
			)

			if not has_conflict:
				slots.append(candidate_start.strftime('%H:%M'))

		current += timedelta(minutes=schedule.slot_duration_minutes)

	return slots