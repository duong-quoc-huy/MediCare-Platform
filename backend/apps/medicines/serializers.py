from rest_framework import serializers
from .models import Medicine, MedicineCategory, MedicineManufacturer, MedicineReview
from django.db.models import Avg

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
	average_rating = serializers.SerializerMethodField()
	review_count = serializers.SerializerMethodField()

	class Meta:
		model = Medicine
		fields = [
			'medicine_id',
			'medicine_name',
			'generic_name',

			'medicine_category',
			'category_name',

			'medicine_manufacturer',
			'manufacturer_name',

			'medicine_description',
			'dosage',
			'unit_type',
			'package_size',
			'expiry_date',
			'storage_instructions',
			'usage_instructions',
			'side_effects',
			'active_ingredients',

			'medicine_stock',
			'medicine_price',
			'medicine_image',
			'image_url',
			'medicine_requires_prescription',
			'medicine_is_active',

			'average_rating',
			'review_count',

			'created_at',
		]

	def get_image_url(self, obj):
		request = self.context.get('request')

		if obj.medicine_image and hasattr(obj.medicine_image, 'url'):
			if request:
				return request.build_absolute_uri(obj.medicine_image.url)
			return obj.medicine_image.url

		return None

	def get_average_rating(self, obj):
		average = obj.reviews.aggregate(avg=Avg('rating'))['avg']

		if average is None:
			return 0

		return round(average, 1)


	def get_review_count(self, obj):
		return obj.reviews.count()

class MedicineReviewSerializer(serializers.ModelSerializer):
	user_name = serializers.CharField(source='user.full_name', read_only=True)

	class Meta:
		model = MedicineReview
		fields = [
			'medicine_review_id',
			'medicine',
			'user',
			'user_name',
			'rating',
			'comment',
			'created_at',
			'updated_at',
		]
		read_only_fields = [
			'medicine_review_id',
			'medicine',
			'user',
			'user_name',
			'created_at',
			'updated_at',
		]

	def validate_rating(self, value):
		if value < 1 or value > 5:
			raise serializers.ValidationError('Rating must be between 1 and 5.')
		return value