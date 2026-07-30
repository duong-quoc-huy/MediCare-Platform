from decimal import Decimal

from rest_framework import serializers

from apps.medical_records.models import Prescription, PrescriptionItem

MONEY = Decimal('0.01')
INSURANCE_RATE = Decimal('0.50')


def calculate_prescription_bill(prescription):
	appointment = prescription.appointment
	total_fee = Decimal(appointment.total_fee or 0)
	deposit_amount = Decimal(appointment.deposit_amount or 0) if appointment.deposit_paid else Decimal('0.00')
	remaining_fee = max(total_fee - deposit_amount, Decimal('0.00'))
	medicine_subtotal = sum((Decimal(item.line_total or 0) for item in prescription.items.all()), Decimal('0.00'))
	gross_amount = remaining_fee + medicine_subtotal
	has_insurance = bool((appointment.patient.health_insurance_card or '').strip())
	discount_amount = gross_amount * INSURANCE_RATE if has_insurance else Decimal('0.00')
	payable_amount = max(gross_amount - discount_amount, Decimal('0.00'))

	return {
		'has_insurance': has_insurance,
		'insurance_rate': INSURANCE_RATE if has_insurance else Decimal('0.00'),
		'remaining_appointment_fee': remaining_fee.quantize(MONEY),
		'medicine_subtotal': medicine_subtotal.quantize(MONEY),
		'gross_amount': gross_amount.quantize(MONEY),
		'discount_amount': discount_amount.quantize(MONEY),
		'payable_amount': payable_amount.quantize(MONEY),
	}


class NursePrescriptionItemSerializer(serializers.ModelSerializer):
	class Meta:
		model = PrescriptionItem
		fields = [
			'id', 'hospital_medicine', 'medicine_name', 'dosage', 'frequency',
			'duration', 'instructions', 'quantity', 'unit_price', 'line_total',
		]

class AssignmentFieldsMixin(serializers.Serializer):
	assigned_nurse_id = serializers.UUIDField(source='assigned_nurse.user_id', read_only=True, allow_null=True,)

	assigned_nurse_name = serializers.CharField(source='assigned_nurse.full_name', read_only=True, allow_null=True,)

	pharmacy_counter = serializers.CharField(read_only=True)

	pharmacy_counter_display = serializers.CharField(source='get_pharmacy_counter_display', read_only=True)

	pharmacy_status = serializers.CharField(read_only=True)

	is_claimed_by_me = serializers.SerializerMethodField()
	can_claim = serializers.SerializerMethodField()

	def get_is_claimed_by_me(self, obj):
		request = self.context.get('request')

		return bool(
			request
			and request.user.is_authenticated
			and obj.assigned_nurse_id == request.user.user_id
		)

	def get_can_claim(self, obj):
		request = self.context.get('request')

		return bool(
			request
			and request.user.is_authenticated
			and request.user.role == 'nurse'
			and obj.assigned_nurse_id is None
			and obj.sent_to_pharmacy
			and not obj.appointment.final_paid
			and obj.appointment.status == 'in_progress'
		)


class BillFieldsMixin(serializers.Serializer):
	has_insurance = serializers.SerializerMethodField()
	insurance_rate = serializers.SerializerMethodField()
	remaining_appointment_fee = serializers.SerializerMethodField()
	medicine_subtotal = serializers.SerializerMethodField()
	gross_amount = serializers.SerializerMethodField()
	discount_amount = serializers.SerializerMethodField()
	payable_amount = serializers.SerializerMethodField()

	def _bill(self, obj):
		cache_name = '_nurse_bill_cache'

		if not hasattr(obj, cache_name):
			setattr(
				obj,
				cache_name,
				calculate_prescription_bill(obj)
			)

		return getattr(obj, cache_name)

	def get_has_insurance(self, obj):
		return self._bill(obj)['has_insurance']

	def get_insurance_rate(self, obj):
		return self._bill(obj)['insurance_rate']

	def get_remaining_appointment_fee(self, obj):
		return self._bill(obj)['remaining_appointment_fee']

	def get_medicine_subtotal(self, obj):
		return self._bill(obj)['medicine_subtotal']

	def get_gross_amount(self, obj):
		return self._bill(obj)['gross_amount']

	def get_discount_amount(self, obj):
		return self._bill(obj)['discount_amount']

	def get_payable_amount(self, obj):
		return self._bill(obj)['payable_amount']


class NursePharmacyQueueSerializer(AssignmentFieldsMixin, BillFieldsMixin, serializers.ModelSerializer):
	appointment_id = serializers.UUIDField(source='appointment.appointment_id', read_only=True)
	patient_name = serializers.CharField(source='appointment.patient.full_name', read_only=True)
	doctor_name = serializers.CharField(source='appointment.doctor.user.full_name', read_only=True)
	appointment_date = serializers.DateField(source='appointment.appointment_date', read_only=True)
	start_time = serializers.TimeField(source='appointment.start_time', read_only=True)
	visit_type = serializers.CharField(source='appointment.visit_type', read_only=True)
	appointment_status = serializers.CharField(source='appointment.status', read_only=True)
	

	assigned_nurse_id = serializers.UUIDField(source='assigned_nurse.user_id', read_only=True,allow_null=True,)
	assigned_nurse_name = serializers.CharField(source='assigned_nurse.full_name', read_only=True,allow_null=True,)
	pharmacy_counter = serializers.CharField(read_only=True)
	pharmacy_counter_display = serializers.CharField(source='get_pharmacy_counter_display', read_only=True)
	pharmacy_status = serializers.CharField(read_only=True)

	is_claimed_by_me = serializers.SerializerMethodField()
	can_claim = serializers.SerializerMethodField()

	medicine_count = serializers.SerializerMethodField()
	amount_due = serializers.SerializerMethodField()

	class Meta:
		model = Prescription
		fields = [
			'id', 'appointment_id', 'patient_name', 'doctor_name', 'appointment_date',
			'start_time', 'visit_type', 'appointment_status', 'diagnosis',
			'sent_to_pharmacy', 'medicine_count', 'amount_due', 'payable_amount',
			'has_insurance', 'created_at', 'updated_at',
			'assigned_nurse_id', 'assigned_nurse_name',
			'pharmacy_counter','pharmacy_counter_display',
			'pharmacy_status','is_claimed_by_me','can_claim',
		]

	def get_medicine_count(self, obj): return obj.items.count()
	def get_amount_due(self, obj): return Decimal('0.00') if obj.appointment.final_paid else self._bill(obj)['payable_amount']

	def get_is_claimed_by_me(self, obj):
		request = self.context.get('request')

		if not request or not request.user.is_authenticated:
			return False

		return obj.assigned_nurse_id == request.user.user_id


	def get_can_claim(self, obj):
		request = self.context.get('request')

		if not request or not request.user.is_authenticated:
			return False

		return (
			request.user.role == 'nurse'
			and obj.sent_to_pharmacy
			and obj.assigned_nurse_id is None
			and not obj.appointment.final_paid
			and obj.appointment.status == 'in_progress'
		)


class NursePharmacyDetailSerializer(AssignmentFieldsMixin, BillFieldsMixin, serializers.ModelSerializer):
	appointment_id = serializers.UUIDField(source='appointment.appointment_id', read_only=True)
	patient_name = serializers.CharField(source='appointment.patient.full_name', read_only=True)
	patient_email = serializers.CharField(source='appointment.patient.email', read_only=True)
	patient_phone_1 = serializers.CharField(source='appointment.patient.phone_number_1', read_only=True)
	patient_phone_2 = serializers.CharField(source='appointment.patient.phone_number_2', read_only=True)
	health_insurance_card = serializers.CharField(source='appointment.patient.health_insurance_card', read_only=True, allow_null=True)
	doctor_name = serializers.CharField(source='appointment.doctor.user.full_name', read_only=True)
	appointment_date = serializers.DateField(source='appointment.appointment_date', read_only=True)
	start_time = serializers.TimeField(source='appointment.start_time', read_only=True)
	end_time = serializers.TimeField(source='appointment.end_time', read_only=True)
	visit_type = serializers.CharField(source='appointment.visit_type', read_only=True)
	appointment_status = serializers.CharField(source='appointment.status', read_only=True)
	total_fee = serializers.DecimalField(source='appointment.total_fee', max_digits=10, decimal_places=2, read_only=True)
	deposit_paid = serializers.BooleanField(source='appointment.deposit_paid', read_only=True)
	deposit_amount = serializers.DecimalField(source='appointment.deposit_amount', max_digits=10, decimal_places=2, read_only=True, allow_null=True)
	final_paid = serializers.BooleanField(source='appointment.final_paid', read_only=True)
	final_amount = serializers.DecimalField(source='appointment.final_amount', max_digits=10, decimal_places=2, read_only=True, allow_null=True)
	amount_due = serializers.SerializerMethodField()
	items = NursePrescriptionItemSerializer(many=True, read_only=True)

	assigned_nurse_id = serializers.UUIDField(source='assigned_nurse.user_id', read_only=True,allow_null=True,)
	assigned_nurse_name = serializers.CharField(source='assigned_nurse.full_name', read_only=True,allow_null=True,)
	pharmacy_counter = serializers.CharField(read_only=True)
	pharmacy_counter_display = serializers.CharField(source='get_pharmacy_counter_display', read_only=True)
	pharmacy_status = serializers.CharField(read_only=True)

	is_claimed_by_me = serializers.SerializerMethodField()
	can_claim = serializers.SerializerMethodField()

	class Meta:
		model = Prescription
		fields = [
			'id', 'appointment_id', 'patient_name', 'patient_email', 'patient_phone_1',
			'patient_phone_2', 'health_insurance_card', 'doctor_name', 'appointment_date',
			'start_time', 'end_time', 'visit_type', 'appointment_status', 'total_fee',
			'deposit_paid', 'deposit_amount', 'final_paid', 'final_amount', 'amount_due',
			'has_insurance', 'insurance_rate', 'remaining_appointment_fee',
			'medicine_subtotal', 'gross_amount', 'discount_amount', 'payable_amount',
			'diagnosis', 'notes', 'sent_to_pharmacy', 'items', 'created_at', 'updated_at',
			'assigned_nurse_id', 'assigned_nurse_name',
			'pharmacy_counter','pharmacy_counter_display',
			'pharmacy_status','is_claimed_by_me','can_claim',
		]

	def get_amount_due(self, obj): return Decimal('0.00') if obj.appointment.final_paid else self._bill(obj)['payable_amount']

	def get_is_claimed_by_me(self, obj):
		request = self.context.get('request')

		if not request or not request.user.is_authenticated:
			return False

		return obj.assigned_nurse_id == request.user.user_id


	def get_can_claim(self, obj):
		request = self.context.get('request')

		if not request or not request.user.is_authenticated:
			return False

		return (
			request.user.role == 'nurse'
			and obj.sent_to_pharmacy
			and obj.assigned_nurse_id is None
			and not obj.appointment.final_paid
			and obj.appointment.status == 'in_progress'
		)


class NursePharmacyPaymentCreateSerializer(serializers.Serializer):
	payment_method = serializers.ChoiceField(choices=['cash', 'vnpay', 'paypal'])
	receipt_number = serializers.CharField(required=False, allow_blank=True)
	notes = serializers.CharField(required=False, allow_blank=True)

class NursePharmacyClaimSerializer(serializers.Serializer):
	pharmacy_counter = serializers.ChoiceField(choices=Prescription.PharmacyCounter.choices)