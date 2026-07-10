from rest_framework import generics, permissions

from .models import Payment
from .serializers import (
	PaymentListSerializer,
	PaymentDetailSerializer,
	PaymentCreateSerializer,
	PaymentStatusUpdateSerializer,
)


class PaymentListCreateView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return PaymentCreateSerializer
		return PaymentListSerializer

	def get_queryset(self):
		user = self.request.user

		queryset = Payment.objects.all().order_by('-created_at')

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		# For now, normal users can only see their own payments if you later connect
		# Payment to User directly. Since your Payment model only has reference_id,
		# we cannot safely filter by user here yet.
		return queryset.none()


class PaymentDetailView(generics.RetrieveAPIView):
	serializer_class = PaymentDetailSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'payment_id'

	def get_queryset(self):
		user = self.request.user

		queryset = Payment.objects.all()

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		return queryset.none()


class PaymentStatusUpdateView(generics.UpdateAPIView):
	serializer_class = PaymentStatusUpdateSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'payment_id'
	http_method_names = ['patch']

	def get_queryset(self):
		user = self.request.user

		queryset = Payment.objects.all()

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		return Payment.objects.none()