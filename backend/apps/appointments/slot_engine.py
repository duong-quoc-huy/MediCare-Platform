from datetime import datetime, timedelta
from apps.doctors.models import DoctorSchedule
from apps.appointments.models import Appointment

def get_available_slots(doctor_id, appointment_date):

	day_of_week = appointment_date.weekday()

	try:
		schedule = DoctorSchedule.objects.get(doctor_id=doctor_id, day_of_week=day_of_week)
	except DoctorSchedule.DoesNotExist:
		return []

	start_hour = datetime.combine(appointment_date, schedule.start_time)

	end_hour = datetime.combine(appointment_date, schedule.end_time)

	current = start_hour
	slots = []

	while current < end_hour:
		slots.append(current.strftime("%H:%M"))
		current += timedelta(minutes=schedule.slot_duration_minutes)

	booked = Appointment.objects.filter(
		doctor_id=doctor_id,
		appointment_date=appointment_date,
	).exclude(
		status="cancelled"
	).values_list(
		"start_time",
		flat=True
	)

	booked_times = [t.strftime("%H:%M") for t in booked]
	available = [s for s in slots if s not in booked_times]

	return available