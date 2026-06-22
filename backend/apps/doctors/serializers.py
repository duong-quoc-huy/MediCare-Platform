from rest_framework import serializers
from .models import Doctor, DoctorSchedule

class DoctorScheduleSerializer(serializers.ModelSerializer):
	class Meta:
		model = DoctorSchedule
		fields = ('id', 'day_of_week', 'start_time', 'end_time', 'slot_duration_minutes')

class DoctorSerializer(serializers.ModelSerializer):
	full_name = serializers.CharField(source='user.full_name', read_only=True)
	email = serializers.CharField(source='user.email', read_only=True)
	phone_number_1 = serializers.CharField(source='user.phone_number_1', read_only=True)
	phone_number_2 = serializers.CharField(source='user.phone_number_2', read_only=True, allow_null=True)
	schedules = DoctorScheduleSerializer(many=True, read_only=True)
	class Meta:
		model = Doctor
		fields = ('id', 'full_name', 'email','phone_number_1', 'phone_number_2', 'specialty', 'bio', 'experience_years', 
			'consultation_fee', 'rating', 'is_available', 'created_at', 'schedules')
