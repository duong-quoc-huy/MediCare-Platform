import uuid
import uuid_utils
from django.utils import timezone
from django.db import models

from apps.orders.models import MedicineOrder
from apps.users.models import User


def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))


class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


class Notification(models.Model):
	class Event(models.TextChoices):
		ORDER_CONFIRMED = (
			'order_confirmed',
			'Order Confirmed',
		)

		ORDER_PREPARING = (
			'order_preparing',
			'Order Preparing',
		)

		READY_FOR_PICKUP = (
			'ready_for_pickup',
			'Ready for Pickup',
		)

		DISPATCHED = (
			'dispatched',
			'Picked Up',
		)

		DELIVERING = (
			'delivering',
			'Delivering',
		)

		DELIVERED = (
			'delivered',
			'Delivered',
		)

		DELIVERY_FAILED = (
			'delivery_failed',
			'Delivery Failed',
		)

		RETURNING = (
			'returning',
			'Returning',
		)

		RETURNED = (
			'returned',
			'Returned',
		)

		CANCELLED = (
			'cancelled',
			'Cancelled',
		)

	class Channel(models.TextChoices):
		IN_APP = 'in_app', 'In App'
		SMS = 'sms', 'SMS'
		PUSH = 'push', 'Push Notification'

	class DeliveryStatus(models.TextChoices):
		PENDING = 'pending', 'Pending'
		SENT = 'sent', 'Sent'
		FAILED = 'failed', 'Failed'

	notification_id = UUIDv7Field(primary_key=True, editable=False)
	recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
	medicine_order = models.ForeignKey(MedicineOrder, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
	event = models.CharField(max_length=30, choices=Event.choices)
	channel = models.CharField(max_length=20, choices=Channel.choices)
	title = models.CharField(max_length=150)
	message = models.TextField()
	delivery_status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING)
	destination = models.CharField(
		max_length=255,
		blank=True,
		help_text=(
			'Phone number, email address, or other '
			'delivery destination.'
		),
	)

	provider_message_id = models.CharField(max_length=255,blank=True)
	error_message = models.TextField(blank=True)
	is_read = models.BooleanField(default=False)
	sent_at = models.DateTimeField(null=True,blank=True)
	read_at = models.DateTimeField(null=True,blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

		constraints = [
			models.UniqueConstraint(
				fields=[
					'medicine_order',
					'event',
					'channel',
				],
				name=(
					'unique_order_event_notification_channel'
				),
			),
		]

	def __str__(self):
		return (
			f'{self.recipient.full_name} '
			f'- {self.event} '
			f'- {self.channel}'
		)

class FirebaseDevice(models.Model):
	class Platform(models.TextChoices):
		WEB = 'web', 'Web'
		ANDROID = 'android', 'Android'
		IOS = 'ios', 'iOS'

	device_id = UUIDv7Field(primary_key=True, editable=False)
	user = models.ForeignKey(User, on_delete=models.CASCADE,related_name='firebase_devices',)
	registration_token = models.TextField(unique=True)

	platform = models.CharField(max_length=20, choices=Platform.choices, default=Platform.WEB)
	device_name = models.CharField(max_length=150, blank=True)
	is_active = models.BooleanField(default=True)
	last_used_at = models.DateTimeField(default=timezone.now)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	class Meta:
		ordering = ['-last_used_at']

	def __str__(self):
		return (
			f'{self.user.full_name} '
			f'- {self.platform} '
			f'- {"active" if self.is_active else "inactive"}'
		)