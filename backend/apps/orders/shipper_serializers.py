from rest_framework import serializers

from apps.payments.models import Payment

from .models import MedicineOrder
from .serializers import MedicineOrderItemSerializer


class ShipperOrderSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    assigned_shipper_id = serializers.UUIDField(source='assigned_shipper.user_id', read_only=True, allow_null=True)
    assigned_shipper_name = serializers.CharField(source='assigned_shipper.full_name', read_only=True, allow_null=True)
    final_shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payment_method = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    items = MedicineOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = MedicineOrder
        fields = [
            'medicine_order_id', 'patient_name', 'status',
            'medicine_subtotal', 'shipping_fee', 'shipping_discount',
            'final_shipping_fee', 'total_amount',
            'delivery_recipient_name', 'delivery_phone', 'delivery_phone_2',
            'delivery_address', 'delivery_street_address', 'delivery_ward_name',
            'delivery_province_name', 'delivery_postal_code', 'delivery_notes',
            'package_weight_grams', 'assigned_shipper_id',
            'assigned_shipper_name', 'shipper_assigned_at',
            'delivery_failure_reason', 'payment_method', 'payment_status',
            'ready_at', 'pickup_at', 'delivering_at', 'delivered_at',
            'failed_at', 'returning_at', 'returned_at', 'created_at',
            'updated_at', 'items',
        ]

    def _payment(self, obj):
        cached = getattr(obj, '_shipper_payment', None)
        if cached is not None:
            return cached
        payment = Payment.objects.filter(
            reference_id=obj.medicine_order_id,
            reference_type=Payment.ReferenceType.MEDICINE_ORDER,
        ).order_by('-created_at').first()
        obj._shipper_payment = payment
        return payment

    def get_payment_method(self, obj):
        payment = self._payment(obj)
        return payment.method if payment else ''

    def get_payment_status(self, obj):
        payment = self._payment(obj)
        return payment.status if payment else ''


class ShipperStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        MedicineOrder.Status.DISPATCHED, MedicineOrder.Status.DELIVERING,
        MedicineOrder.Status.DELIVERED, MedicineOrder.Status.DELIVERY_FAILED,
        MedicineOrder.Status.RETURNING, MedicineOrder.Status.RETURNED,
    ])
    failure_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        order = self.instance
        new_status = attrs['status']
        allowed = {
            MedicineOrder.Status.READY_FOR_PICKUP: {MedicineOrder.Status.DISPATCHED},
            MedicineOrder.Status.DISPATCHED: {MedicineOrder.Status.DELIVERING},
            MedicineOrder.Status.DELIVERING: {MedicineOrder.Status.DELIVERED, MedicineOrder.Status.DELIVERY_FAILED},
            MedicineOrder.Status.DELIVERY_FAILED: {MedicineOrder.Status.RETURNING},
            MedicineOrder.Status.RETURNING: {MedicineOrder.Status.RETURNED},
        }.get(order.status, set())
        if new_status not in allowed:
            raise serializers.ValidationError({'status': f'Cannot move from {order.status} to {new_status}.'})
        if new_status == MedicineOrder.Status.DELIVERY_FAILED and not attrs.get('failure_reason', '').strip():
            raise serializers.ValidationError({'failure_reason': 'A failure reason is required.'})
        return attrs
