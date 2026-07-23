from rest_framework import serializers

from .models import Doctor, DoctorSchedule


class DoctorScheduleSerializer(serializers.ModelSerializer):
	day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
	visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)

	class Meta:
		model = DoctorSchedule
		fields = (
			'id',
			'day_of_week',
			'day_of_week_display',
			'start_time',
			'end_time',
			'visit_type',
			'visit_type_display',
			'slot_duration_minutes',
		)


class DoctorSerializer(serializers.ModelSerializer):
	full_name = serializers.CharField(source='user.full_name', read_only=True)
	email = serializers.CharField(source='user.email', read_only=True)
	phone_number_1 = serializers.CharField(source='user.phone_number_1', read_only=True)
	phone_number_2 = serializers.CharField(source='user.phone_number_2', read_only=True, allow_null=True)

	schedules = DoctorScheduleSerializer(many=True, read_only=True)

	supports_clinic = serializers.SerializerMethodField()
	supports_home_visit = serializers.SerializerMethodField()
	available_visit_types = serializers.SerializerMethodField()

	class Meta:
		model = Doctor
		fields = (
			'id',
			'slug',
			'full_name',
			'email',
			'phone_number_1',
			'phone_number_2',
			'specialty',
			'bio',
			'experience_years',
			'consultation_fee',
			'rating',
			'is_available',
			'supports_clinic',
			'supports_home_visit',
			'available_visit_types',
			'created_at',
			'schedules',
		)

	def get_available_visit_types(self, obj):
		return list(
			obj.schedules
			.values_list('visit_type', flat=True)
			.distinct()
		)

	def get_supports_clinic(self, obj):
		return obj.schedules.filter(visit_type='clinic').exists()

	def get_supports_home_visit(self, obj):
		return obj.schedules.filter(visit_type='home_visit').exists()