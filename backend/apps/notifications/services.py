from django.db import IntegrityError
from django.utils import timezone

from .models import Notification
from .push import get_push_backend


def short_order_id(order):
	return str(
		order.medicine_order_id
	)[:8].upper()


def get_order_notification_content(
	*,
	order,
	event,
):
	order_code = short_order_id(order)

	templates = {
		Notification.Event.ORDER_CONFIRMED: {
			'title': 'Medicine order confirmed',
			'message': (
				f'Your medicine order #{order_code} '
				'has been paid successfully and confirmed.'
			),
			'send_push': True,
		},

		Notification.Event.ORDER_PREPARING: {
			'title': 'Medicine order is being prepared',
			'message': (
				f'MediCare Pharmacy is preparing '
				f'your medicine order #{order_code}.'
			),
			'send_push': False,
		},

		Notification.Event.READY_FOR_PICKUP: {
			'title': 'Package ready for GHTK',
			'message': (
				f'Your medicine order #{order_code} '
				'is ready for GHTK pickup.'
			),
			'send_push': True,
		},

		Notification.Event.DISPATCHED: {
			'title': 'Package picked up',
			'message': (
				f'GHTK has picked up medicine order '
				f'#{order_code}.'
			),
			'send_push': True,
		},

		Notification.Event.DELIVERING: {
			'title': 'Medicine order is on the way',
			'message': (
				f'Your medicine order #{order_code} '
				'is out for delivery. Please keep '
				'your phone available.'
			),
			'send_push': True,
		},

		Notification.Event.DELIVERED: {
			'title': 'Medicine order delivered',
			'message': (
				f'Your medicine order #{order_code} '
				'has been delivered successfully.'
			),
			'send_push': True,
		},

		Notification.Event.DELIVERY_FAILED: {
			'title': 'Medicine delivery unsuccessful',
			'message': (
				f'Delivery of medicine order '
				f'#{order_code} was unsuccessful. '
				'Please check your order or contact support.'
			),
			'send_push': True,
		},

		Notification.Event.RETURNING: {
			'title': 'Medicine order is being returned',
			'message': (
				f'Medicine order #{order_code} '
				'is being returned to MediCare Pharmacy.'
			),
			'send_push': True,
		},

		Notification.Event.RETURNED: {
			'title': 'Medicine order returned',
			'message': (
				f'Medicine order #{order_code} '
				'has been returned to MediCare Pharmacy.'
			),
			'send_push': True,
		},

		Notification.Event.CANCELLED: {
			'title': 'Medicine order cancelled',
			'message': (
				f'Medicine order #{order_code} '
				'has been cancelled.'
			),
			'send_push': True,
		},
	}

	return templates.get(event)


def create_in_app_notification(
	*,
	order,
	event,
	title,
	message,
):
	try:
		notification, created = (
			Notification.objects.get_or_create(
				medicine_order=order,
				recipient=order.patient,
				event=event,
				channel=Notification.Channel.IN_APP,
				defaults={
					'title': title,
					'message': message,
					'delivery_status': (
						Notification
						.DeliveryStatus
						.SENT
					),
					'sent_at': timezone.now(),
				},
			)
		)
	except IntegrityError:
		notification = Notification.objects.get(
			medicine_order=order,
			event=event,
			channel=Notification.Channel.IN_APP,
		)
		created = False

	return notification, created


def create_push_notification(
	*,
	order,
	event,
	title,
	message,
):
	try:
		notification, created = (
			Notification.objects.get_or_create(
				medicine_order=order,
				recipient=order.patient,
				event=event,
				channel=Notification.Channel.PUSH,
				defaults={
					'title': title,
					'message': message,
				},
			)
		)
	except IntegrityError:
		notification = Notification.objects.get(
			medicine_order=order,
			event=event,
			channel=Notification.Channel.PUSH,
		)
		created = False

	if not created:
		return notification, False

	try:
		push_backend = get_push_backend()

		result = push_backend.send_to_user(
			user=order.patient,
			title=title,
			message=message,
			data={
				'event': event,
				'medicine_order_id': (
					order.medicine_order_id
				),
				'url': (
					f'/orders/'
					f'{order.medicine_order_id}'

				),
			},
		)

		if result.success_count > 0:
			notification.delivery_status = (
				Notification.DeliveryStatus.SENT
			)

			notification.provider_message_id = (
				','.join(result.message_ids)[:255]
			)

			notification.sent_at = timezone.now()

		elif result.failure_count > 0:
			notification.delivery_status = (
				Notification.DeliveryStatus.FAILED
			)

			notification.error_message = (
				'; '.join(result.errors)
			)

		else:
			notification.delivery_status = (
				Notification.DeliveryStatus.FAILED
			)

			notification.error_message = (
				'The patient has no active '
				'Firebase device.'
			)

	except Exception as exc:
		notification.delivery_status = (
			Notification.DeliveryStatus.FAILED
		)

		notification.error_message = str(exc)

	notification.save(
		update_fields=[
			'delivery_status',
			'provider_message_id',
			'error_message',
			'sent_at',
		]
	)

	return notification, True


def notify_order_event(*, order, event):
	content = get_order_notification_content(
		order=order,
		event=event,
	)

	if not content:
		return {
			'in_app_created': False,
			'sms_created': False,
		}

	_, in_app_created = (
		create_in_app_notification(
			order=order,
			event=event,
			title=content['title'],
			message=content['message'],
		)
	)

	push_created = False

	if content['send_push']:
		_, push_created = create_push_notification(
			order=order,
			event=event,
			title=content['title'],
			message=content['message'],
		)

	return {
		'in_app_created': in_app_created,
		'push_created': push_created,
	}