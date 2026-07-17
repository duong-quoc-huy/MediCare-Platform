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
from .utils import VNPay, PayPalClient
from django.conf import settings
from apps.carts.models import Cart
from apps.medicines.models import Medicine


def get_client_ip(request):
	forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

	if forwarded_for:
		return forwarded_for.split(',')[0]

	return request.META.get('REMOTE_ADDR', '127.0.0.1')

def clear_patient_cart(patient):
	try:
		cart = patient.cart
	except Cart.DoesNotExist:
		return

	cart.items.all().delete()
	cart.save()

def deduct_order_stock(order):
	for item in order.items.select_related('medicine').all():
		medicine = Medicine.objects.select_for_update().get(
			medicine_id=item.medicine.medicine_id
		)

		if item.quantity > medicine.medicine_stock:
			raise ValueError(
				f'{medicine.medicine_name} only has {medicine.medicine_stock} items left.'
			)

		medicine.medicine_stock -= item.quantity
		medicine.save(update_fields=['medicine_stock'])


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
				if order.status == MedicineOrder.Status.PENDING:
					try:
						deduct_order_stock(order)
					except ValueError:
						payment.status = Payment.Status.FAILED
						payment.transaction_id = transaction_no
						payment.save(update_fields=['status', 'transaction_id'])

						return redirect(
							f'{settings.FRONTEND_CART_URL}?payment=failed&reason=out_of_stock'
						)

					order.status = MedicineOrder.Status.CONFIRMED
					order.save(update_fields=['status'])

				payment.status = Payment.Status.SUCCESS
				payment.transaction_id = transaction_no
				payment.save(update_fields=['status', 'transaction_id'])

				clear_patient_cart(order.patient)

				return redirect(
					f'{settings.FRONTEND_CART_URL}?payment=success&order_id={order.medicine_order_id}'
				)

			payment.status = Payment.Status.FAILED
			payment.transaction_id = transaction_no
			payment.save(update_fields=['status', 'transaction_id'])

		return redirect(
			f'{settings.FRONTEND_CART_URL}?payment=failed&code={response_code}'
		)


class PayPalCreatePaymentView(APIView):
	permission_classes = [permissions.IsAuthenticated]

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

		# Convert VND to USD for PayPal sandbox
		vnd_to_usd_rate = Decimal(str(settings.PAYPAL_VND_TO_USD_RATE))
		amount_usd = (Decimal(order.total_amount) / vnd_to_usd_rate).quantize(
			Decimal('0.01')
		)

		payment = Payment.objects.filter(
			reference_id=order.medicine_order_id,
			reference_type=Payment.ReferenceType.MEDICINE_ORDER,
			method=Payment.Method.PAYPAL,
			status=Payment.Status.PENDING,
		).first()

		if payment is None:
			payment = Payment.objects.create(
				reference_id=order.medicine_order_id,
				reference_type=Payment.ReferenceType.MEDICINE_ORDER,
				method=Payment.Method.PAYPAL,
				amount=amount_usd,
				currency='USD',
				status=Payment.Status.PENDING,
			)

		return_url = f'{settings.PAYPAL_RETURN_URL}?payment_id={payment.payment_id}'
		cancel_url = settings.PAYPAL_CANCEL_URL

		try:
			paypal = PayPalClient()

			paypal_order = paypal.create_order(
				amount=payment.amount,
				currency=payment.currency,
				reference_id=payment.payment_id,
				return_url=return_url,
				cancel_url=cancel_url,
			)
		except Exception as e:
			return Response(
				{'detail': str(e)},
				status=status.HTTP_502_BAD_GATEWAY
			)

		paypal_order_id = paypal_order.get('id')
		approval_url = None

		for link in paypal_order.get('links', []):
			if link.get('rel') == 'approve':
				approval_url = link.get('href')
				break

		if not approval_url:
			return Response(
				{'detail': 'Could not get PayPal approval URL.'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)

		payment.transaction_id = paypal_order_id
		payment.save(update_fields=['transaction_id'])

		return Response(
			{
				'payment_id': payment.payment_id,
				'paypal_order_id': paypal_order_id,
				'approval_url': approval_url,
			},
			status=status.HTTP_201_CREATED
		)


class PayPalCapturePaymentView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request):
		payment_id = request.data.get('payment_id')
		paypal_order_id = request.data.get('paypal_order_id') or request.data.get('token')

		if not payment_id or not paypal_order_id:
			return Response(
				{'detail': 'payment_id and paypal_order_id are required.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			payment = Payment.objects.get(
				payment_id=payment_id,
				transaction_id=paypal_order_id,
				method=Payment.Method.PAYPAL,
				status=Payment.Status.PENDING,
			)
		except Payment.DoesNotExist:
			return Response(
				{'detail': 'Payment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		try:
			order = MedicineOrder.objects.get(
				medicine_order_id=payment.reference_id,
				patient=request.user
			)
		except MedicineOrder.DoesNotExist:
			return Response(
				{'detail': 'Order not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		try:
			paypal = PayPalClient()
			capture_result = paypal.capture_order(paypal_order_id)

			import json
			print(json.dumps(capture_result, indent=2))
		except Exception as e:
			return Response(
				{'detail': str(e)},
				status=status.HTTP_502_BAD_GATEWAY
			)

		if capture_result.get('status') != 'COMPLETED':
			payment.status = Payment.Status.FAILED
			payment.save(update_fields=['status'])

			return Response(
				{
					'detail': 'PayPal payment was not completed.',
					'paypal_status': capture_result.get('status'),
				},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			capture_id = capture_result['purchase_units'][0]['payments']['captures'][0]['id']
		except (KeyError, IndexError):
			capture_id = paypal_order_id

		with transaction.atomic():
			payment = Payment.objects.select_for_update().get(
				payment_id=payment.payment_id
			)

			order = MedicineOrder.objects.select_for_update().get(
				medicine_order_id=payment.reference_id
			)

			payment.status = Payment.Status.SUCCESS
			payment.transaction_id = capture_id
			payment.save(update_fields=['status', 'transaction_id'])

			if order.status == MedicineOrder.Status.PENDING:
				try:
					deduct_order_stock(order)
				except ValueError as e:
					payment.status = Payment.Status.FAILED
					payment.save(update_fields=['status'])

					return Response(
						{'detail': str(e)},
						status=status.HTTP_400_BAD_REQUEST
					)

				order.status = MedicineOrder.Status.CONFIRMED
				order.save(update_fields=['status'])

			clear_patient_cart(order.patient)

		serializer = PaymentDetailSerializer(payment)

		return Response(serializer.data, status=status.HTTP_200_OK)