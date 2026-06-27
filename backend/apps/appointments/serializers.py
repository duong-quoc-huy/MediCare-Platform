from rest_framework import serializers
from .models import Appointment
from .models import User, Doctor, User, Patient
from apps.doctors.serializers import DoctorSerializer

class AppointmentLisSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
	doctor_slug = serializers.CharField(source='doctor.slug', read_only=True)
	class Meta:
		model = Appointment
		fields = ['appointmend_id',
				'patient_name', 
				'doctor_name', 'doctor_slug',
				'appointment_date', 'start_time', 'end_time', 
				'status', 'visit_type','address', 
				'notes', 'total_fee', 'created_at'	
		]


class AppointmentDetailSerializer(serializers.ModelSerializer):
	patient_phone = serializers.CharField(source='patient.phone_number_1', read_only=True)
	patienr_address = serializers.CharField(source='p')

