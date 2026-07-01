from rest_framework import serializers
from .models import Medicine, MedicineCategory, MedicineManufacturer


class MedicineCategorySerializer(serializers.ModelSerializer):
	class Meta:
		model = MedicineCategory
		fields = [
			'category_id',
			'category_name',
			'category_description',
		]


class MedicineManufacturerSerializer(serializers.ModelSerializer):
	class Meta:
		model = MedicineManufacturer
		fields = [
			'manufacturer_id',
			'manufacturer_name',
			'manufacturer_description',
		]


class MedicineSerializer(serializers.ModelSerializer):
	category_name = serializers.CharField(
		source='medicine_category.category_name',
		read_only=True
	)
	manufacturer_name = serializers.CharField(
		source='medicine_manufacturer.manufacturer_name',
		read_only=True
	)
	image_url = serializers.SerializerMethodField()

	class Meta:
		model = Medicine
		fields = [
			'medicine_id',
			'medicine_name',
			'medicine_category',
			'category_name',
			'medicine_manufacturer',
			'manufacturer_name',
			'medicine_description',
			'medicine_stock',
			'medicine_price',
			'medicine_image',
			'image_url',
			'medicine_requires_prescription',
			'medicine_is_active',
			'created_at',
		]
		read_only_fields = [
			'medicine_id',
			'created_at',
			'image_url',
			'category_name',
			'manufacturer_name',
		]

	def get_image_url(self, obj):
		request = self.context.get('request')

		if obj.medicine_image:
			if request:
				return request.build_absolute_uri(obj.medicine_image.url)
			return obj.medicine_image.url

		return None