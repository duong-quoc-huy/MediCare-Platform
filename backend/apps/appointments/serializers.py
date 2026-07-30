from rest_framework import serializers
from .models import Appointment
from apps.doctors.serializers import DoctorSerializer
from .slot_engine import get_available_slots
from datetime import datetime, timedelta
from apps.doctors.models import DoctorSchedule
from django.utils import timezone
from .time_rules import get_checkup_start_availability

ALLOWED_TRANSITIONS = {
	'pending': ['confirmed', 'cancelled'],
	'confirmed': ['in_progress', 'cancelled', 'missed'],
	'in_progress': ['completed'],
	'completed': [],
	'cancelled': [],
	'missed': [],
}


class AppointmentListSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
	doctor_slug = serializers.CharField(source='doctor.slug', read_only=True)
	doctor_specialty = serializers.CharField(source='doctor.specialty', read_only=True)

	can_start_checkup = serializers.SerializerMethodField()
	start_block_reason = serializers.SerializerMethodField()
	start_block_message = serializers.SerializerMethodField()
	earliest_start_at = serializers.SerializerMethodField()
	latest_start_at = serializers.SerializerMethodField()
	server_time = serializers.SerializerMethodField()

	class Meta:
		model = Appointment
		fields = [
			'appointment_id',
			'patient_name',
			'doctor_name',
			'doctor_slug',
			'doctor_specialty',
			'appointment_date',
			'start_time',
			'end_time',
			'status',
			'visit_type',
			'address',
			'total_fee',
			'created_at',
			'can_start_checkup',
			'start_block_reason',
			'start_block_message',
			'earliest_start_at',
			'latest_start_at',
			'server_time',
		]

	def get_start_availability(self, obj):
		cache_name = '_start_availability_cache'

		if not hasattr(obj, cache_name):
			if (
				obj.status
				!= Appointment.Status.CONFIRMED
			):
				availability = {
					'can_start': False,
					'reason': None,
					'message': '',
					'earliest_start': None,
					'latest_start': None,
				}
			else:
				availability = (
					get_checkup_start_availability(obj)
				)

			setattr(
				obj,
				cache_name,
				availability,
			)

		return getattr(obj, cache_name)

	def get_can_start_checkup(self, obj):
		return self.get_start_availability(obj)[
			'can_start'
		]

	def get_start_block_reason(self, obj):
		return self.get_start_availability(obj)[
			'reason'
		]

	def get_start_block_message(self, obj):
		return self.get_start_availability(obj)[
			'message'
		]

	def get_earliest_start_at(self, obj):
		value = self.get_start_availability(obj).get(
			'earliest_start'
		)

		return value.isoformat() if value else None

	def get_latest_start_at(self, obj):
		value = self.get_start_availability(obj).get(
			'latest_start'
		)

		return value.isoformat() if value else None

	def get_server_time(self, obj):
		return timezone.localtime().isoformat()


class AppointmentDetailSerializer(serializers.ModelSerializer):
	# import patient field
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	patient_phone_1 = serializers.CharField(source='patient.phone_number_1', read_only=True)
	patient_phone_2 = serializers.CharField(source='patient.phone_number_2', read_only=True, allow_null=True)
	patient_address = patient_address = serializers.SerializerMethodField()

	# import doctor patient
	doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
	doctor_slug = serializers.CharField(source='doctor.slug', read_only=True)

	medical_pdf_available = serializers.SerializerMethodField()

	doctor = DoctorSerializer(read_only=True)

	class Meta:
		model = Appointment
		fields = [
			'appointment_id',
			'patient_name', 'patient_phone_1','patient_phone_2', 'patient_address',     
			'doctor', 'doctor_name', 'doctor_slug',         
			'appointment_date', 'start_time', 'end_time',
			'status', 'visit_type', 'address',
			'notes', 'total_fee', 'created_at',
			'medical_pdf_available', 'deposit_paid',
			'deposit_amount', 'final_paid',
			'final_amount',
		]

	def get_patient_address(self, obj):
		return obj.address or ''

	def get_medical_pdf_available(self, obj):
		return (
			obj.status == obj.Status.COMPLETED
			and bool(obj.medical_pdf)
			and (
				obj.visit_type != obj.VisitType.HOME_VISIT
				or obj.final_paid
			)
		)

class AppointmentCreateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Appointment
		fields = [
			'doctor',
			'appointment_date',
			'start_time',
			'visit_type',
			'address',
			'notes',
		]

	def validate(self, attrs):
		request = self.context.get('request')

		if request and getattr(request.user, 'role', None) != 'patient':
			raise serializers.ValidationError(
				{'detail': 'Only patients can book appointments.'}
			)

		doctor = attrs.get('doctor')
		appointment_date = attrs.get('appointment_date')
		start_time = attrs.get('start_time')
		visit_type = attrs.get('visit_type') or Appointment.VisitType.CLINIC
		address = attrs.get('address')

		if not doctor.is_available:
			raise serializers.ValidationError(
				{'doctor': 'This doctor is currently not accepting appointments.'}
			)

		if appointment_date < timezone.localdate():
			raise serializers.ValidationError(
				{'appointment_date': 'Cannot book an appointment in the past'}
			)

		if visit_type == Appointment.VisitType.HOME_VISIT and not address:
			raise serializers.ValidationError(
				{'address': 'Address is required for home visit appointment'}
			)

		available_slots = get_available_slots(
			doctor.id,
			appointment_date,
			visit_type=visit_type
		)

		chosen_slot_str = start_time.strftime('%H:%M')

		if chosen_slot_str not in available_slots:
			raise serializers.ValidationError(
				{
					'start_time': 'This time slot is no longer available. Please choose another.'
				}
			)

		return attrs

	def create(self, validated_data):
		doctor = validated_data['doctor']
		appointment_date = validated_data['appointment_date']
		start_time = validated_data['start_time']
		visit_type = validated_data.get(
			'visit_type',
			Appointment.VisitType.CLINIC
		)

		request = self.context['request']
		validated_data['patient'] = request.user

		day_of_week = appointment_date.weekday()

		schedule = DoctorSchedule.objects.get(
			doctor=doctor,
			day_of_week=day_of_week,
			visit_type=visit_type
		)

		start_dt = datetime.combine(appointment_date, start_time)
		end_dt = start_dt + timedelta(
			minutes=schedule.slot_duration_minutes
		)

		validated_data['end_time'] = end_dt.time()
		validated_data['total_fee'] = doctor.consultation_fee

		return Appointment.objects.create(**validated_data)


class AppointmentStatusUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Appointment
		fields = ['status']

	def validate_status(self, value):
		current_status = self.instance.status
		allowed = ALLOWED_TRANSITIONS.get(current_status, [])

		if value not in allowed:
			raise serializers.ValidationError(
					f'Cannot move from {current_status} to {value}'
				)
		return value