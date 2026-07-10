from django.db import models
from apps.users.models import User
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


class Cart(models.Model):
	cart_id = UUIDv7Field(primary_key=True, editable=False)
	patient = models.OneToOneField(
		User,
		on_delete=models.CASCADE,
		related_name='cart'
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f'Cart - {self.patient.full_name}'

	@property
	def total_amount(self):
		return sum(item.sub_total for item in self.items.all())

	@property
	def total_items(self):
		return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
	cart_item_id = UUIDv7Field(primary_key=True, editable=False)
	cart = models.ForeignKey(
		Cart,
		on_delete=models.CASCADE,
		related_name='items'
	)
	medicine = models.ForeignKey(
		Medicine,
		on_delete=models.CASCADE
	)
	quantity = models.PositiveIntegerField(default=1)
	added_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('cart', 'medicine')

	def __str__(self):
		return f'{self.medicine.medicine_name} x {self.quantity}'

	@property
	def sub_total(self):
		return self.medicine.medicine_price * self.quantity