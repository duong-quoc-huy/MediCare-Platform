from rest_framework import serializers
from .models import Payment
from apps.appointments.models import Appointment
from apps.orders.models import MedicineOrder

class AppointmentPaymentCreateSerializer(serializers.Serializer):
	appointment_id = serializers.UUIDField()


class AppointmentPayPalCaptureSerializer(serializers.Serializer):
	payment_id = serializers.UUIDField()
	paypal_order_id = serializers.CharField(required=False)
	token = serializers.CharField(required=False)

	def validate(self, attrs):
		if not attrs.get('paypal_order_id') and not attrs.get('token'):
			raise serializers.ValidationError(
				'paypal_order_id or token is required.'
			)

		return attrs

class PaymentListSerializer(serializers.ModelSerializer):
	purchased_items = serializers.SerializerMethodField()
	reference_label = serializers.SerializerMethodField()

	class Meta:
		model = Payment
		fields = [
			'payment_id',
			'reference_id',
			'reference_type',
			'reference_label',
			'method',
			'amount',
			'currency',
			'status',
			'transaction_id',
			'created_at',
			'purchased_items',
		]

	def get_reference_label(self, obj):
		if obj.reference_type == Payment.ReferenceType.MEDICINE_ORDER:
			return 'Medicine order'

		if obj.reference_type == Payment.ReferenceType.APPOINTMENT:
			return 'Appointment deposit'

		return obj.reference_type

	def get_purchased_items(self, obj):
		if obj.reference_type == Payment.ReferenceType.MEDICINE_ORDER:
			try:
				order = (
					MedicineOrder.objects
					.prefetch_related('items', 'items__medicine')
					.get(medicine_order_id=obj.reference_id)
				)
			except MedicineOrder.DoesNotExist:
				return []

			return [
				{
					'item_type': 'medicine',
					'medicine_name': item.medicine.medicine_name,
					'quantity': item.quantity,
					'unit_price': item.unit_price,
					'sub_total': item.sub_total,
					'currency': 'VND',
				}
				for item in order.items.all()
			]

		if obj.reference_type == Payment.ReferenceType.APPOINTMENT:
			try:
				appointment = (
					Appointment.objects
					.select_related('doctor', 'doctor__user')
					.get(appointment_id=obj.reference_id)
				)
			except Appointment.DoesNotExist:
				return []

			return [
				{
					'item_type': 'appointment_deposit',
					'medicine_name': f'Appointment deposit - Dr. {appointment.doctor.user.full_name}',
					'quantity': 1,
					'unit_price': obj.amount,
					'sub_total': obj.amount,
					'currency': obj.currency,
					'appointment_date': appointment.appointment_date,
					'start_time': appointment.start_time,
					'visit_type': appointment.visit_type,
					'total_fee': appointment.total_fee,
				}
			]

		return []

class PaymentDetailSerializer(serializers.ModelSerializer):
	purchased_items = serializers.SerializerMethodField()

	class Meta:
		model = Payment
		fields = [
			'payment_id',
			'reference_id',
			'reference_type',
			'method',
			'amount',
			'currency',
			'status',
			'transaction_id',
			'created_at',
			'purchased_items',
		]

	def get_purchased_items(self, obj):
		if obj.reference_type != Payment.ReferenceType.MEDICINE_ORDER:
			return []

		try:
			order = (
				MedicineOrder.objects
				.prefetch_related('items', 'items__medicine')
				.get(medicine_order_id=obj.reference_id)
			)
		except MedicineOrder.DoesNotExist:
			return []

		return [
			{
				'medicine_name': item.medicine.medicine_name,
				'quantity': item.quantity,
				'unit_price': item.unit_price,
				'sub_total': item.sub_total,
			}
			for item in order.items.all()
		]


class PaymentCreateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Payment
		fields = [
			'reference_id',
			'reference_type',
			'method',
			'amount',
			'currency',
		]

	def validate_amount(self, value):
		if value <= 0:
			raise serializers.ValidationError('Payment amount must be greater than 0.')

		return value


class PaymentStatusUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Payment
		fields = [
			'status',
			'transaction_id',
		]

	def validate_status(self, value):
		current_status = self.instance.status

		allowed_transitions = {
			'pending': ['success', 'failed'],
			'success': ['refunded'],
			'failed': [],
			'refunded': [],
		}

		allowed = allowed_transitions.get(current_status, [])

		if value not in allowed:
			raise serializers.ValidationError(
				f'Cannot move from {current_status} to {value}.'
			)

		return value