from rest_framework import serializers
from .models import Appointment
from .models import User, Doctor, User, Patient
from apps.doctors.serializers import DoctorSerializer
from .slot_engine import get_available_slots

class AppointmentListSerializer(serializers.ModelSerializer):
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
	# import patient field
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	patient_phone_1 = serializers.CharField(source='patient.phone_number_1', read_only=True)
	patient_phone_2 = serializers.CharField(source='patient.phone_number_2', read_only=True, allow_null=True)
	patienr_address = serializers.CharField(source='patient.address', read_only=True)

	# import doctor patient
	doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
	doctor_slug = serializers.CharField(source='doctor.slug', read_only=True)

	doctor = DoctorSerializer(read_only=True)

	class Meta:
		model = Appointment
		fields = [
			'appointment_id',
			'patient_name', 'patient_phone_1','patient_phone_2', 'patient_address',     
			'doctor', 'doctor_name', 'doctor_slug',         
			'appointment_date', 'start_time', 'end_time',
			'status', 'visit_type', 'address',
			'notes', 'total_fee', 'created_at'
		]

class AppointmentCreateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Appointment
		fields = ['doctor', 'appointment_date',
				'start_time', 'visit_type',
				'address', 'notes'
		]

	#validate conditions before saving to database
	def validate(self, attrs):
		doctor = attrs.get('doctor')
		appointment_date = attrs.get('appointment_date')
		start_time = attrs.get('start_time')
		visit_type = attrs.get('visit_type')
		address = attrs.get('address')

		#first condition - date cannot be in the past
		if appointment_date < datetime.now().date():
			raise serializers.ValidationError(
				{'appointment_date': 'Cannot book an appoointment in the past'}
			)

		# second condition - home visit requires an address
		if visit_type == 'home_visit' and not address:
			raise serializers.ValidationError(
				{'address': 'Address is required for home visit appointment'}
			)

		#third condition - the chosen slot must actually be available
		available_slots = get_available_slots(doctor.id, appointment_date)
		chosen_slot_str = start_time.strftime('%H:%M')

		if chosen_slot_str not in available_slots:
			raise serializers.ValidationError(
				{'start_time':'This time slot is no longer available. Please choose another'}
			)

		return attrs


	def create(self, validated_data):
		doctor = validated_data['doctor']
		appointment_date = validated_data['appoointment_date']
		start_time = validated_data['start_time']


		# get the patient from the logged-in user
		request = self.context['request']
		validated_data['patient'] = request.user

		#calculate end_time using the doctor's schedule that day
		day_of_week = appointment_date.weekday()
		schedule = DoctorSchedule.objects.get(doctor=doctor, day_of_week=day_of_week)

		start_dt = datetime.combine(appointment_date, start_time)
		end_dt = start_dt + timedelta(minutes=schedule.slot_duration_minutes)
		validated_data['end_time'] = end_dt.time()


		#calculate total_fee from doctor's consultation fee
		validated_data['total_fee'] = doctor.consultation_fee

		return Appointment.objects.create(**validated_data)