from django.db import models

'''
Note:
When you set 'managed = False' in your Django model's Meta class:
Django completely ignores these tables when running makemigrations and migrate. It will never:
Create them
Modify them
Delete them

'''

class AdministrativeRegion(models.Model):
	name         = models.CharField(max_length=255)
	name_en      = models.CharField(max_length=255)
	code_name    = models.CharField(max_length=255, null=True)
	code_name_en = models.CharField(max_length=255, null=True)

	class Meta:
		managed  = False  # ← Django won't touch this table
		db_table = 'administrative_regions'

	def __str__(self):
		return self.name


class AdministrativeUnit(models.Model):
	full_name    = models.CharField(max_length=255, null=True)
	full_name_en = models.CharField(max_length=255, null=True)
	short_name   = models.CharField(max_length=255, null=True)
	short_name_en = models.CharField(max_length=255, null=True)
	code_name    = models.CharField(max_length=255, null=True)
	code_name_en = models.CharField(max_length=255, null=True)

	class Meta:
		managed  = False
		db_table = 'administrative_units'

	def __str__(self):
		return self.full_name or ''


class Province(models.Model):
	code                = models.CharField(max_length=20, primary_key=True)
	name                = models.CharField(max_length=255)
	name_en             = models.CharField(max_length=255, null=True)
	full_name           = models.CharField(max_length=255)
	full_name_en        = models.CharField(max_length=255, null=True)
	code_name           = models.CharField(max_length=255, null=True)
	administrative_unit = models.ForeignKey(
		AdministrativeUnit,
		on_delete=models.SET_NULL,
		null=True
	)

	class Meta:
		managed  = False
		db_table = 'provinces'

	def __str__(self):
		return self.full_name


class Ward(models.Model):
	code                = models.CharField(max_length=20, primary_key=True)
	name                = models.CharField(max_length=255)
	name_en             = models.CharField(max_length=255, null=True)
	full_name           = models.CharField(max_length=255, null=True)
	full_name_en        = models.CharField(max_length=255, null=True)
	code_name           = models.CharField(max_length=255, null=True)
	province            = models.ForeignKey(
		Province,
		on_delete=models.CASCADE,
		related_name='wards',
		null=True,
		db_column='province_code'
	)
	administrative_unit = models.ForeignKey(
		AdministrativeUnit,
		on_delete=models.SET_NULL,
		null=True
	)

	class Meta:
		managed  = False
		db_table = 'wards'

	def __str__(self):
		return self.full_name or self.name