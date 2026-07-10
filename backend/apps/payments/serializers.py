from rest_framework import serializers
from .models import Payment


class PaymentListSerializer(serializers.ModelSerializer):
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
            'created_at',
        ]


class PaymentDetailSerializer(serializers.ModelSerializer):
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