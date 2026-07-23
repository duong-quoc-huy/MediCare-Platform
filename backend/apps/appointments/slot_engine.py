from datetime import datetime, timedelta
from django.utils import timezone
from apps.doctors.models import DoctorSchedule
from apps.appointments.models import Appointment


def get_available_slots(doctor_id, appointment_date):
	day_of_week = appointment_date.weekday()

	try:
		schedule = DoctorSchedule.objects.get(
			doctor_id=doctor_id,
			day_of_week=day_of_week
		)
	except DoctorSchedule.DoesNotExist:
		return []

	start_hour = datetime.combine(appointment_date, schedule.start_time)
	end_hour = datetime.combine(appointment_date, schedule.end_time)

	now = timezone.localtime()
	today = now.date()
	one_hour_later = now + timedelta(hours=1)

	current = start_hour
	slots = []

	while current < end_hour:
		# If booking today, hide slots within 1 hour from now
		if appointment_date != today or current.time() > one_hour_later.time():
			slots.append(current.strftime('%H:%M'))

		current += timedelta(minutes=schedule.slot_duration_minutes)

	booked = (
		Appointment.objects
		.filter(
			doctor_id=doctor_id,
			appointment_date=appointment_date,
		)
		.exclude(status=Appointment.Status.CANCELLED)
		.values_list('start_time', flat=True)
	)

	booked_times = [time.strftime('%H:%M') for time in booked]

	available = [slot for slot in slots if slot not in booked_times]

	return available