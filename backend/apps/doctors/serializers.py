from rest_framework import serializers

from .models import Doctor, DoctorSchedule
from .schedule_rules import (
	ensure_schedule_update_preserves_appointments,
	validate_schedule_values,
)
from django.core.exceptions import ValidationError as DjangoValidationError


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

	def validate(self, attrs):
		instance = self.instance
		doctor = attrs.get('doctor') or getattr(instance, 'doctor', None)

		if doctor is None:
			request = self.context.get('request')
			if request and hasattr(request.user, 'doctor_profile'):
				doctor = request.user.doctor_profile

		day_of_week = attrs.get('day_of_week', getattr(instance, 'day_of_week', None))
		start_time = attrs.get('start_time', getattr(instance, 'start_time', None))
		end_time = attrs.get('end_time', getattr(instance, 'end_time', None))
		visit_type = attrs.get('visit_type', getattr(instance, 'visit_type', DoctorSchedule.VisitType.CLINIC))
		slot_duration = attrs.get('slot_duration_minutes', getattr(instance, 'slot_duration_minutes', 30))

		try:
			validate_schedule_values(
				doctor=doctor,
				day_of_week=day_of_week,
				start_time=start_time,
				end_time=end_time,
				visit_type=visit_type,
				slot_duration_minutes=slot_duration,
				instance=instance,
			)
			if instance:
				ensure_schedule_update_preserves_appointments(
					instance,
					day_of_week=day_of_week,
					start_time=start_time,
					end_time=end_time,
					visit_type=visit_type,
				)
		except DjangoValidationError as exc:
			raise serializers.ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)

		return attrs


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