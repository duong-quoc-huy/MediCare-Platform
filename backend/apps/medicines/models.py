from django.db import models
import uuid
import uuid_utils
from ckeditor.fields import RichTextField
# Create your models here.

# Custom UUID field
def generate_uuid7():
	return uuid.UUID(str(uuid_utils.uuid7()))

class UUIDv7Field(models.UUIDField):
	def __init__(self, *args, **kwargs):
		kwargs.setdefault('default', generate_uuid7)
		kwargs.setdefault('editable', False)
		super().__init__(*args, **kwargs)


class MedicineCategory(models.Model):
	category_id = UUIDv7Field(primary_key=True, editable=False)
	category_name = models.CharField(max_length=100, unique=True)
	category_description = models.TextField(blank=True, null=True)

	def __str__(self):
		return self.category_name

class MedicineManufacturer(models.Model):
	manufacturer_id = UUIDv7Field(primary_key=True, editable=False)
	manufacturer_name = models.CharField(max_length=100, unique=True)
	manufacturer_description = models.TextField(blank=True, null=True)

	def __str__(self):
		return self.manufacturer_name

class Medicine(models.Model):
	medicine_id = UUIDv7Field(primary_key=True, editable=False)
	medicine_name = models.CharField(max_length=255)
	medicine_category = models.ForeignKey(MedicineCategory, on_delete=models.SET_NULL, null=True, related_name='medicines')
	medicine_manufacturer = models.ForeignKey(MedicineManufacturer, on_delete=models.SET_NULL, null=True, related_name='medicines')
	medicine_description = RichTextField(blank=True, null=True)
	medicine_stock = models.PositiveIntegerField(default=0)
	medicine_price = models.DecimalField(max_digits=10, decimal_places=2)
	medicine_image = models.ImageField(upload_to='medicines/', blank=True, null=True)
	medicine_requires_prescription = models.BooleanField(default=False)
	medicine_is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return self.medicine_name



