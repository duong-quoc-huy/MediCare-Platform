from rest_framework import serializers
from .models import Payment
from apps.orders.models import MedicineOrder

class PaymentListSerializer(serializers.ModelSerializer):
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