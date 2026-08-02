from django.db import models

from apps.users.models import User, UserAddress
from apps.medicines.models import Medicine

import uuid
import uuid_utils


def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))


class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


class MedicineOrder(models.Model):
	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending Payment'
		CONFIRMED = 'confirmed', 'Payment Confirmed'

		PREPARING = 'preparing', 'Preparing Package'
		READY_FOR_PICKUP = (
			'ready_for_pickup',
			'Ready for Pickup',
		)

		DISPATCHED = 'dispatched', 'Picked Up'
		DELIVERING = 'delivering', 'Delivering'
		DELIVERED = 'delivered', 'Delivered'

		DELIVERY_FAILED = (
			'delivery_failed',
			'Delivery Failed',
		)
		RETURNING = 'returning', 'Returning'
		RETURNED = 'returned', 'Returned'

		CANCELLED = 'cancelled', 'Cancelled'

	medicine_order_id = UUIDv7Field(primary_key=True,editable=False)
	patient = models.ForeignKey(User,on_delete=models.CASCADE, related_name='medicine_orders')
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)


	medicine_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	shipping_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	total_amount = models.DecimalField(max_digits=10, decimal_places=2)

	source_address = models.ForeignKey(UserAddress, on_delete=models.SET_NULL, null=True, blank=True,related_name='medicine_orders')
	delivery_recipient_name = models.CharField(max_length=100, blank=True)
	delivery_phone = models.CharField(max_length=15, blank=True)
	delivery_phone_2 = models.CharField(max_length=15, blank=True)
	delivery_address = models.TextField()
	delivery_street_address = models.CharField(max_length=255, blank=True)
	delivery_ward_code = models.CharField(max_length=20, blank=True)
	delivery_ward_name = models.CharField(max_length=255, blank=True)
	delivery_province_code = models.CharField(max_length=20, blank=True)
	delivery_province_name = models.CharField(max_length=255, blank=True)
	delivery_postal_code = models.CharField(max_length=10, blank=True)
	delivery_notes = models.TextField(blank=True)

	package_weight_grams = models.PositiveIntegerField(default=500, help_text='Package weight sent to GHTK, in grams.',)
	ghtk_order_id = models.CharField(max_length=100, blank=True)
	ghtk_tracking_url = models.URLField(max_length=500, blank=True)
	ghtk_status = models.CharField(max_length=100, blank=True)
	ghtk_status_text = models.CharField(max_length=255, blank=True)
	ghtk_last_synced_at = models.DateTimeField(null=True, blank=True)

	confirmed_at = models.DateTimeField(null=True, blank=True)
	preparing_at = models.DateTimeField(null=True, blank=True)
	ready_at = models.DateTimeField(null=True, blank=True)
	pickup_at = models.DateTimeField(null=True, blank=True)
	delivering_at = models.DateTimeField(null=True, blank=True)
	delivered_at = models.DateTimeField(null=True, blank=True)
	failed_at = models.DateTimeField(null=True, blank=True)
	returning_at = models.DateTimeField(null=True, blank=True)
	returned_at = models.DateTimeField(null=True, blank=True)
	cancelled_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField( auto_now_add=True)
	updated_at = models.DateTimeField( auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return (
			f'Order #{self.medicine_order_id} '
			f'- {self.patient.full_name}'
		)

	@property
	def final_shipping_fee(self):
		fee = self.shipping_fee - self.shipping_discount
		return max(fee, 0)


class MedicineOrderItem(models.Model):
	
	medicine_order_item_id = UUIDv7Field(primary_key=True, editable=False)
	order = models.ForeignKey(MedicineOrder, on_delete=models.CASCADE, related_name='items')
	medicine = models.ForeignKey(Medicine,on_delete=models.CASCADE)
	quantity = models.PositiveIntegerField()
	unit_price = models.DecimalField(max_digits=10,decimal_places=2)

	def __str__(self):
		return (
			f'{self.medicine.medicine_name} '
			f'x {self.quantity}'
		)

	@property
	def sub_total(self):
		return self.unit_price * self.quantity