from datetime import datetime, timedelta

from django.utils import timezone


EARLY_START_MINUTES = 15
LATE_START_GRACE_MINUTES = 30


def get_appointment_start_window(appointment):
	current_timezone = timezone.get_current_timezone()

	scheduled_start = timezone.make_aware(
		datetime.combine(
			appointment.appointment_date,
			appointment.start_time,
		),
		current_timezone,
	)

	scheduled_end = timezone.make_aware(
		datetime.combine(
			appointment.appointment_date,
			appointment.end_time,
		),
		current_timezone,
	)

	earliest_start = scheduled_start - timedelta(
		minutes=EARLY_START_MINUTES
	)

	latest_start = scheduled_end + timedelta(
		minutes=LATE_START_GRACE_MINUTES
	)

	return {
		'scheduled_start': scheduled_start,
		'scheduled_end': scheduled_end,
		'earliest_start': earliest_start,
		'latest_start': latest_start,
	}


def get_checkup_start_availability(appointment, current_time=None):
	if current_time is None:
		current_time = timezone.localtime()

	window = get_appointment_start_window(appointment)

	if current_time < window['earliest_start']:
		return {
			'can_start': False,
			'reason': 'too_early',
			'message': (
				'This appointment cannot be started yet. '
				f'It can be started from '
				f'{timezone.localtime(window["earliest_start"]).strftime("%H:%M")}.'
			),
			**window,
		}

	if current_time > window['latest_start']:
		return {
			'can_start': False,
			'reason': 'start_window_expired',
			'message': (
				'The allowed start window for this appointment '
				'has expired.'
			),
			**window,
		}

	return {
		'can_start': True,
		'reason': None,
		'message': '',
		**window,
	}

def synchronize_missed_appointment(appointment, current_time=None,):
	if (appointment.status != appointment.Status.CONFIRMED):
		return False

	if current_time is None:
		current_time = timezone.localtime()

	availability = get_checkup_start_availability(appointment, current_time=current_time,)

	if (availability['reason'] != 'start_window_expired'):
		return False

	appointment.status = appointment.Status.MISSED

	appointment.save(
		update_fields=[
			'status',
			'updated_at',
		]
	)

	return True