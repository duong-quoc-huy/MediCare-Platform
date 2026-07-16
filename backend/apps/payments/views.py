from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.shortcuts import redirect
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import MedicineOrder
from .models import Payment
from .serializers import (
	PaymentListSerializer,
	PaymentDetailSerializer,
	PaymentCreateSerializer,
	PaymentStatusUpdateSerializer,
)
from .utils import VNPay
from django.conf import settings

def get_client_ip(request):
	forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

	if forwarded_for:
		return forwarded_for.split(',')[0]

	return request.META.get('REMOTE_ADDR', '127.0.0.1')


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

		user_order_ids = MedicineOrder.objects.filter(
			patient=user
		).values_list('medicine_order_id', flat=True)

		return queryset.filter(
			reference_type=Payment.ReferenceType.MEDICINE_ORDER,
			reference_id__in=user_order_ids
		)


class PaymentDetailView(generics.RetrieveAPIView):
	serializer_class = PaymentDetailSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'payment_id'

	def get_queryset(self):
		user = self.request.user
		queryset = Payment.objects.all()

		if getattr(user, 'role', None) == 'admin' or user.is_staff:
			return queryset

		user_order_ids = MedicineOrder.objects.filter(
			patient=user
		).values_list('medicine_order_id', flat=True)

		return queryset.filter(
			reference_type=Payment.ReferenceType.MEDICINE_ORDER,
			reference_id__in=user_order_ids
		)


class PaymentStatusUpdateView(generics.UpdateAPIView):
	serializer_class = PaymentStatusUpdateSerializer
	permission_classes = [permissions.IsAdminUser]
	lookup_field = 'payment_id'
	http_method_names = ['patch']
	queryset = Payment.objects.all()


class VNPayCreatePaymentView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	print('Current VNPAY_RETURN_URL:', settings.VNPAY_RETURN_URL)
	def post(self, request):
		order_id = request.data.get('order_id')

		if not order_id:
			return Response(
				{'detail': 'order_id is required.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			order = MedicineOrder.objects.get(
				medicine_order_id=order_id,
				patient=request.user
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{'detail': 'Order not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if order.status != MedicineOrder.Status.PENDING:
			return Response(
				{'detail': 'Only pending orders can be paid.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		payment = Payment.objects.filter(
			reference_id=order.medicine_order_id,
			reference_type=Payment.ReferenceType.MEDICINE_ORDER,
			method=Payment.Method.VNPAY,
			status=Payment.Status.PENDING,
		).first()

		if payment is None:
			payment = Payment.objects.create(
				reference_id=order.medicine_order_id,
				reference_type=Payment.ReferenceType.MEDICINE_ORDER,
				method=Payment.Method.VNPAY,
				amount=order.total_amount,
				currency='VND',
				status=Payment.Status.PENDING,
			)

		vnpay = VNPay()

		payment_url = vnpay.build_payment_url(
			payment_id=payment.payment_id,
			amount=payment.amount,
			order_info=f'Thanh toan don hang {order.medicine_order_id}',
			ip_addr=get_client_ip(request),
		)

		return Response(
			{
				'payment_id': payment.payment_id,
				'payment_url': payment_url,
			},
			status=status.HTTP_201_CREATED
		)


class VNPayReturnView(APIView):
	permission_classes = [permissions.AllowAny]

	def get(self, request):
		params = request.GET.dict()
		vnpay = VNPay()

		if not vnpay.validate_return(params):
			return redirect(
				f'{settings.FRONTEND_CART_URL}?payment=failed&reason=invalid_signature'
			)

		payment_id = params.get('vnp_TxnRef')
		response_code = params.get('vnp_ResponseCode')
		transaction_no = params.get('vnp_TransactionNo', '')

		try:
			payment = Payment.objects.get(payment_id=payment_id)
		except Payment.DoesNotExist:
			return redirect(
				f'{settings.FRONTEND_CART_URL}?payment=failed&reason=payment_not_found'
			)

		with transaction.atomic():
			payment = Payment.objects.select_for_update().get(
				payment_id=payment.payment_id
			)

			try:
				order = MedicineOrder.objects.select_for_update().get(
					medicine_order_id=payment.reference_id
				)
			except MedicineOrder.DoesNotExist:
				return redirect(
					f'{settings.FRONTEND_CART_URL}?payment=failed&reason=order_not_found'
				)

			if payment.status == Payment.Status.SUCCESS:
				return redirect(
					f'{settings.FRONTEND_CART_URL}?payment=success&order_id={order.medicine_order_id}'
				)

			if response_code == '00':
				payment.status = Payment.Status.SUCCESS
				payment.transaction_id = transaction_no
				payment.save(update_fields=['status', 'transaction_id'])

				if order.status == MedicineOrder.Status.PENDING:
					order.status = MedicineOrder.Status.CONFIRMED
					order.save(update_fields=['status'])

				return redirect(
					f'{settings.FRONTEND_CART_URL}?payment=success&order_id={order.medicine_order_id}'
				)

			payment.status = Payment.Status.FAILED
			payment.transaction_id = transaction_no
			payment.save(update_fields=['status', 'transaction_id'])

		return redirect(
			f'{settings.FRONTEND_CART_URL}?payment=failed&code={response_code}'
		)