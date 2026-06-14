from django.db import models
from apps.users.models import User
from apps.medicines.models import Medicine
import uuid
import uuid_utils


# Create your models here.

# Custom UUID field
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)

class MedicineOrder(models.Model):
	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending'
		CONFIRMED = 'confirmed', 'Confirmed'
		DISPATCHED = 'dispatched', 'Dispatched'
		DELIVERING = 'delivering', 'Delivering'
		DELIVERED = 'delivered', 'Delivered'
		CANCELLED = 'cancelled', 'Cancelled'

	medicine_order_id = UUIDv7Field(primary_key=True, editable=False)
	patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medicine_orders')
	status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
	total_amount = models.DecimalField(max_digits=10, decimal_places=2)
	delivery_address = models.TextField()
	ghtk_order_id = models.CharField(max_length=100, blank=True)
	ghtk_tracking_url = models.CharField(max_length=255, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'Order #{self.id} - {self.patient.full_name}'


class MedicineOrderItem(models.Model):
	medicine_order_item_id = UUIDv7Field(primary_key=True, editable=False)
	order = models.ForeignKey(MedicineOrder, on_delete=models.CASCADE, related_name='items')
	medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
	quantity = models.PositiveIntegerField()
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)

	def __str__(self):
		return f'{self.medicine.name} x {self.quantity}'

	@property
	def sub_total(self):
		return self.unit_price * self.quantity
