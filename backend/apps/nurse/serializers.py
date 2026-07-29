from decimal import Decimal
from rest_framework import serializers

from apps.medical_records.models import Prescription, PrescriptionItem

class NursePrescriptionItemSerializer(serializers.ModelSerializer):
	class Meta:
		model = PrescriptionItem
		fields = [
		'id',
		'hospital_medicine',
		'dosage',
		'frequency',
		'duration',
		'instructions',
		'quantity',
		]

class NursePharmacyQueueSerializer(serializers.ModelSerializer):
	appointment_id = serializers.UUIDField(source='appointment.appointment_id', read_only=True)
	patient_name = serializers.CharField(source='appointment.patient.full_name', read_only=True)
	doctor_name = serializers.CharField(source='appointment.doctor.user.full_name', read_only=True)
	appointment_date = serializers.DateField(source='appointment.appointment_date', read_only=True)
	start_time = serializers.TimeField(source='appointment.start_time', read_only=True)
	visit_type = serializers.CharField(source='appointment.visit_type', read_only=True)
	appointment_status = serializers.CharField(source='appointment.status', read_only=True)
	medicine_count = serializers.SerializerMethodField()
	amount_due = serializers.SerializerMethodField()

	class Meta:
		model = Prescription
		fields = [
		'id', 
		'appointment_id', 
		'patient_name', 
		'doctor_name', 
		'appointment_date', 
		'start_time', 
		'visit_type', 
		'appointment_status', 
		'diagnosis', 
		'sent_to_pharmacy', 
		'medicine_count', 
		'amount_due', 
		'created_at', 
		'updated_at', 
		]


	def get_medicine_count(self, obj):
		return obj.items.count()

	def get_amount_due(self, obj):
		appointment = obj.appointment
		if appointment.final_pad:
			return Decimal('0.00')

		total_fee = Decimal(appointment.total_fee or 0)
		deposit_amount = Decimal(appointment.deposit_amount or 0)

		if appointment.deposit_paid:
			return total_fee - deposit_amount

		return total_fee


class NursePharmacyDetailSerializer(serializers.ModelSerializer): 
	appointment_id = serializers.UUIDField(source='appointment.appointment_id', read_only=True) 
	patient_name = serializers.CharField(source='appointment.patient.full_name', read_only=True) 
	patient_email = serializers.CharField(source='appointment.patient.email', read_only=True) 
	patient_phone_1 = serializers.CharField(source='appointment.patient.phone_number_1', read_only=True) 
	patient_phone_2 = serializers.CharField(source='appointment.patient.phone_number_2', read_only=True) 
	doctor_name = serializers.CharField(source='appointment.doctor.user.full_name', read_only=True) 
	appointment_date = serializers.DateField(source='appointment.appointment_date', read_only=True) 
	start_time = serializers.TimeField(source='appointment.start_time', read_only=True) 
	end_time = serializers.TimeField(source='appointment.end_time', read_only=True) 
	visit_type = serializers.CharField(source='appointment.visit_type', read_only=True) 
	appointment_status = serializers.CharField(source='appointment.status', read_only=True) 
	total_fee = serializers.DecimalField(source='appointment.total_fee', max_digits=10, decimal_places=2, read_only=True) 
	deposit_paid = serializers.BooleanField(source='appointment.deposit_paid', read_only=True) 
	deposit_amount = serializers.DecimalField(source='appointment.deposit_amount', max_digits=10, decimal_places=2, read_only=True) 
	final_paid = serializers.BooleanField(source='appointment.final_paid', read_only=True) 
	final_amount = serializers.DecimalField(source='appointment.final_amount', max_digits=10, decimal_places=2, read_only=True) 
	amount_due = serializers.SerializerMethodField() 
	items = NursePrescriptionItemSerializer(many=True, read_only=True) 
 
	class Meta: 
		model = Prescription 
		fields = [
		'id', 
		'appointment_id', 
		'patient_name', 
		'patient_email', 
		'patient_phone_1', 
		'patient_phone_2', 
		'doctor_name', 
		'appointment_date', 
		'start_time', 
		'end_time', 
		'visit_type', 
		'appointment_status', 
		'total_fee', 
		'deposit_paid', 
		'deposit_amount', 
		'final_paid', 
		'final_amount', 
		'amount_due', 
		'diagnosis', 
		'notes', 
		'sent_to_pharmacy', 
		'items', 
		'created_at', 
		'updated_at',
		]


	def get_amount_due(self, obj):
		appointment = obj.appointment
		if appointment.final_pad:
			return Decimal('0.00')

		total_fee = Decimal(appointment.total_fee or 0)
		deposit_amount = Decimal(appointment.deposit_amount or 0)

		if appointment.deposit_paid:
			return total_fee - deposit_amount

		return total_fee


class NursePharmacyPaymentConfirmSerializer(serializers.Serializer): 
	amount_received = serializers.DecimalField(max_digits=10, decimal_places=2) 
	payment_method = serializers.ChoiceField( 
		choices=[ 
			('cash', 'Cash'), 
			('vnpay', 'VNPay'), 
			('other', 'Other'), 
		], 
		default='cash' 
	) 
	receipt_number = serializers.CharField(required=False, allow_blank=True) 
	notes = serializers.CharField(required=False, allow_blank=True) 
 
	def validate_amount_received(self, value): 
		if value <= 0: 
			raise serializers.ValidationError('Amount received must be greater than 0.') 
		return value


