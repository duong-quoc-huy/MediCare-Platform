from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from apps.appointments.models import Appointment
from apps.doctors.models import Doctor, DoctorSchedule
from apps.medical_records.models import AppointmentVitals, Prescription, PrescriptionItem
from apps.medicines.models import Medicine, MedicineCategory, MedicineManufacturer

from apps.notifications.models import Notification
from apps.orders.models import MedicineOrder, MedicineOrderItem
from apps.payments.models import Payment
from apps.users.models import User

from .models import AdminAuditLog


class AdminUserSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

	class Meta:
		model = User
		fields = [
			'user_id', 'email', 'full_name', 'gender',
			'date_of_birth', 'national_id',
			'health_insurance_card', 'phone_number_1',
			'phone_number_2', 'profile_image', 'role',
			'is_active', 'email_verified', 'is_staff',
			'created_at', 'password',
		]
		read_only_fields = ['user_id', 'created_at']

	def create(self, validated_data):
		password = validated_data.pop('password', None)
		if not password:
			raise serializers.ValidationError({
				'password': 'Password is required.'
			})

		user = User(**validated_data)
		user.set_password(password)
		user.save()
		return user

	def update(self, instance, validated_data):
		password = validated_data.pop('password', None)

		for field, value in validated_data.items():
			setattr(instance, field, value)

		if password:
			instance.set_password(password)

		instance.save()
		return instance


class AdminDoctorScheduleSerializer(serializers.ModelSerializer):
	day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
	visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)

	class Meta:
		model = DoctorSchedule
		fields = [
			'id', 'day_of_week', 'day_of_week_display',
			'start_time', 'end_time', 'visit_type',
			'visit_type_display', 'slot_duration_minutes',
		]


class AdminDoctorSerializer(serializers.ModelSerializer):
	user_id = serializers.UUIDField(source='user.user_id', read_only=True)
	full_name = serializers.CharField(source='user.full_name')
	email = serializers.EmailField(source='user.email')
	phone_number_1 = serializers.CharField(source='user.phone_number_1')
	phone_number_2 = serializers.CharField(source='user.phone_number_2', required=False, allow_blank=True, allow_null=True)
	user_is_active = serializers.BooleanField(source='user.is_active', required=False)
	password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
	schedules = AdminDoctorScheduleSerializer(many=True, read_only=True)

	class Meta:
		model = Doctor
		fields = [
			'id', 'user_id', 'slug', 'full_name',
			'email', 'phone_number_1', 'phone_number_2',
			'user_is_active', 'password', 'specialty',
			'bio', 'experience_years', 'consultation_fee',
			'rating', 'is_available', 'signature_image',
			'created_at', 'schedules',
		]
		read_only_fields = ['id', 'slug', 'created_at', 'rating']

	@transaction.atomic
	def create(self, validated_data):
		user_data = validated_data.pop('user')
		password = validated_data.pop('password', None)

		if not password:
			raise serializers.ValidationError({
				'password': 'Password is required.'
			})

		user = User(role=User.Role.DOCTOR, email_verified=True,**user_data)
		user.set_password(password)
		user.save()

		return Doctor.objects.create(
			user=user,
			**validated_data,
		)

	@transaction.atomic
	def update(self, instance, validated_data):
		user_data = validated_data.pop('user', {})
		password = validated_data.pop('password', None)

		for field, value in user_data.items():
			setattr(instance.user, field, value)

		if password:
			instance.user.set_password(password)

		instance.user.save()

		for field, value in validated_data.items():
			setattr(instance, field, value)

		instance.save()
		return instance


class AdminMedicineCategorySerializer(serializers.ModelSerializer):
	class Meta:
		model = MedicineCategory
		fields = [
			'category_id', 'category_name',
			'category_description',
		]


class AdminMedicineManufacturerSerializer(serializers.ModelSerializer):
	class Meta:
		model = MedicineManufacturer
		fields = [
			'manufacturer_id', 'manufacturer_name',
			'manufacturer_description',
		]


class AdminMedicineSerializer(serializers.ModelSerializer):
	category_name = serializers.CharField(source='medicine_category.category_name', read_only=True)
	manufacturer_name = serializers.CharField(source='medicine_manufacturer.manufacturer_name', read_only=True)
	remove_medicine_image = serializers.BooleanField(write_only=True, required=False, default=False)

	class Meta:
		model = Medicine
		fields = [
			'medicine_id', 'medicine_name', 'generic_name',
			'medicine_category', 'category_name',
			'medicine_manufacturer', 'manufacturer_name',
			'medicine_description', 'dosage', 'unit_type',
			'package_size', 'expiry_date',
			'storage_instructions', 'usage_instructions',
			'side_effects', 'active_ingredients',
			'medicine_stock', 'shipping_weight_grams',
			'medicine_price', 'medicine_image',
			'remove_medicine_image',
			'medicine_requires_prescription',
			'medicine_is_active', 'created_at',
		]
		read_only_fields = ['medicine_id', 'created_at']

	def create(self, validated_data):
		validated_data.pop('remove_medicine_image', None)
		return super().create(validated_data)

	def update(self, instance, validated_data):
		remove_image = validated_data.pop(
			'remove_medicine_image',
			False,
		)

		if remove_image and instance.medicine_image:
			instance.medicine_image.delete(save=False)
			instance.medicine_image = None

		return super().update(instance, validated_data)



class AdminAppointmentSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	patient_phone = serializers.CharField(source='patient.phone_number_1', read_only=True)
	doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
	doctor_specialty = serializers.CharField(source='doctor.specialty', read_only=True)

	class Meta:
		model = Appointment
		fields = [
			'appointment_id', 'patient_name',
			'patient_phone', 'doctor_name',
			'doctor_specialty', 'appointment_date',
			'start_time', 'end_time', 'status',
			'visit_type', 'address', 'notes',
			'total_fee', 'deposit_paid',
			'deposit_amount', 'final_paid',
			'final_amount', 'medical_pdf',
			'created_at', 'updated_at',
		]


class AdminPrescriptionItemSerializer(serializers.ModelSerializer):
	class Meta:
		model = PrescriptionItem
		fields = [
			'id', 'medicine_name', 'dosage',
			'frequency', 'duration', 'instructions',
			'quantity', 'unit_price', 'line_total',
		]


class AdminPrescriptionSerializer(serializers.ModelSerializer):
	appointment_id = serializers.UUIDField(source='appointment.appointment_id', read_only=True)
	patient_name = serializers.CharField(source='appointment.patient.full_name', read_only=True)
	doctor_name = serializers.CharField(source='appointment.doctor.user.full_name', read_only=True)
	items = AdminPrescriptionItemSerializer(many=True, read_only=True)

	class Meta:
		model = Prescription
		fields = [
			'id', 'appointment_id', 'patient_name',
			'doctor_name', 'diagnosis', 'notes',
			'sent_to_pharmacy', 'assigned_nurse',
			'assigned_at', 'pharmacy_counter',
			'pharmacy_status', 'pdf_file',
			'created_at', 'updated_at', 'items',
		]


class AdminVitalsSerializer(serializers.ModelSerializer):
	appointment_id = serializers.UUIDField(source='appointment.appointment_id', read_only=True)

	class Meta:
		model = AppointmentVitals
		fields = [
			'appointment_id', 'blood_pressure_systolic',
			'blood_pressure_diastolic', 'heart_rate',
			'temperature', 'weight', 'height', 'spo2',
			'diagnosis', 'recorded_at', 'updated_at',
		]


class AdminOrderItemSerializer(serializers.ModelSerializer):
	medicine_name = serializers.CharField(source='medicine.medicine_name', read_only=True)

	class Meta:
		model = MedicineOrderItem
		fields = [
			'medicine_order_item_id', 'medicine_name',
			'quantity', 'unit_price', 'sub_total',
		]


class AdminOrderSerializer(serializers.ModelSerializer):
	patient_name = serializers.CharField(source='patient.full_name', read_only=True)
	assigned_shipper_id = serializers.UUIDField(source='assigned_shipper.user_id', read_only=True, allow_null=True)
	assigned_shipper_name = serializers.CharField(source='assigned_shipper.full_name', read_only=True, allow_null=True)
	items = AdminOrderItemSerializer(many=True, read_only=True)
	final_shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

	class Meta:
		model = MedicineOrder
		fields = [
			'medicine_order_id', 'patient_name', 'status',
			'medicine_subtotal', 'shipping_fee',
			'shipping_discount', 'final_shipping_fee',
			'total_amount', 'delivery_recipient_name',
			'delivery_phone', 'delivery_phone_2',
			'delivery_address', 'delivery_notes',
			'package_weight_grams', 'assigned_shipper_id',
			'assigned_shipper_name', 'shipper_assigned_at',
			'delivery_failure_reason', 'ghtk_order_id',
			'ghtk_tracking_url', 'ghtk_status',
			'ghtk_status_text', 'created_at',
			'updated_at', 'items',
		]


class AdminPaymentSerializer(serializers.ModelSerializer):
	class Meta:
		model = Payment
		fields = [
			'payment_id', 'reference_id',
			'reference_type', 'method', 'amount',
			'original_amount', 'exchange_rate',
			'currency', 'status', 'payment_stage',
			'transaction_id', 'created_at',
		]


class AdminNotificationSerializer(serializers.ModelSerializer):
	recipient_name = serializers.CharField(source='recipient.full_name', read_only=True)
	recipient_email = serializers.CharField(source='recipient.email', read_only=True)
	medicine_order_id = serializers.UUIDField(source='medicine_order.medicine_order_id', read_only=True, allow_null=True)

	class Meta:
		model = Notification
		fields = [
			'notification_id', 'recipient_name',
			'recipient_email', 'medicine_order_id',
			'event', 'channel', 'title', 'message',
			'delivery_status', 'destination',
			'provider_message_id', 'error_message',
			'is_read', 'sent_at', 'created_at',
		]


class AdminAuditLogSerializer(serializers.ModelSerializer):
	admin_name = serializers.CharField(source='admin.full_name', read_only=True, allow_null=True)

	class Meta:
		model = AdminAuditLog
		fields = [
			'id', 'admin_name', 'action',
			'resource_type', 'resource_id',
			'previous_data', 'new_data',
			'ip_address', 'created_at',
		]
