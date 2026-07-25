from decimal import Decimal

from django.core import signing
from django.utils import timezone
from django.urls import reverse
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction, models
from django.shortcuts import redirect

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.appointments.models import Appointment
from apps.carts.models import Cart
from apps.medicines.models import Medicine
from apps.orders.models import MedicineOrder

from .models import Payment, AppointmentFinalPaymentSession
from .serializers import (
	PaymentListSerializer,
	PaymentDetailSerializer,
	PaymentCreateSerializer,
	PaymentStatusUpdateSerializer,
	AppointmentPaymentCreateSerializer,
	AppointmentPayPalCaptureSerializer,
)
from .utils import VNPay, PayPalClient
from apps.medical_records.models import AppointmentVitals, Prescription
from .serializers import AppointmentFinalPaymentSessionSerializer


def get_user_role(user):
	return str(getattr(user, 'role', '')).lower()


def is_admin_user(user):
	return get_user_role(user) == 'admin' or user.is_superuser


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


def get_appointment_deposit_amount(appointment):
	return (Decimal(appointment.total_fee) * Decimal('0.50')).quantize(
		Decimal('0.01')
	)


def mark_appointment_deposit_paid(appointment):
	deposit_amount = get_appointment_deposit_amount(appointment)

	appointment.deposit_paid = True
	appointment.deposit_amount = deposit_amount
	appointment.status = Appointment.Status.CONFIRMED
	appointment.save(
		update_fields=[
			'deposit_paid',
			'deposit_amount',
			'status',
			'updated_at',
		]
	)

	return appointment

def build_final_payment_signed_key(appointment_id, token):
	return signing.dumps(
		{
			'appointment_id': str(appointment_id),
			'token': token,
			'purpose': 'appointment_final_payment',
		},
		salt='appointment-final-payment'
	)

def verify_final_payment_signed_key(appointment_id, token, signed_key):
	try:
		data = signing.loads(
			signed_key,
			salt='appointment-final-payment',
			max_age=30 * 60,
		)
	except signing.BadSignature:
		return False
	except signing.SignatureExpired:
		return False

	return (
		data.get('appointment_id') == str(appointment_id)
		and data.get('token') == token
		and data.get('purpose') == 'appointment_final_payment'
	)

def get_appointment_final_amount(appointment):
	total_fee = Decimal(appointment.total_fee or 0)
	deposit_amount = Decimal(appointment.deposit_amount or 0)

	if deposit_amount <= 0:
		deposit_amount = get_appointment_deposit_amount(appointment)

	return (total_fee - deposit_amount).quantize(Decimal('0.01'))

def mark_appointment_final_paid_and_complete(appointment, final_amount=None):
	from apps.appointments.pdf_service import generate_medical_pdf

	if final_amount is None:
		final_amount = get_appointment_final_amount(appointment)

	appointment.final_paid = True
	appointment.final_amount = final_amount
	appointment.status = Appointment.Status.COMPLETED
	appointment.save(
		update_fields=[
			'final_paid',
			'final_amount',
			'status',
			'updated_at',
		]
	)

	generate_medical_pdf(appointment)

	return appointment

def validate_home_visit_final_payment_ready(appointment):
	if appointment.visit_type != Appointment.VisitType.HOME_VISIT:
		return 'Final payment QR is only available for home visit appointments.'

	if appointment.status != Appointment.Status.IN_PROGRESS:
		return 'Final payment can only be generated when appointment is in progress.'

	if not appointment.deposit_paid:
		return 'Deposit must be paid before final payment.'

	if appointment.final_paid:
		return 'Final payment has already been completed.'

	if not AppointmentVitals.objects.filter(appointment=appointment).exists():
		return 'Please save vitals before generating final payment.'

	prescription = Prescription.objects.filter(appointment=appointment).first()

	if not prescription or not prescription.items.exists():
		return 'Please save prescription before generating final payment.'

	return None


class PaymentListCreateView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return PaymentCreateSerializer

		return PaymentListSerializer

	def get_queryset(self):
		user = self.request.user
		queryset = Payment.objects.all().order_by('-created_at')

		if is_admin_user(user):
			return queryset

		user_order_ids = MedicineOrder.objects.filter(
			patient=user
		).values_list('medicine_order_id', flat=True)

		user_appointment_ids = Appointment.objects.filter(
			patient=user
		).values_list('appointment_id', flat=True)

		return queryset.filter(
			models.Q(
				reference_type=Payment.ReferenceType.MEDICINE_ORDER,
				reference_id__in=user_order_ids
			)
			| models.Q(
				reference_type=Payment.ReferenceType.APPOINTMENT,
				reference_id__in=user_appointment_ids
			)
		)


class PaymentDetailView(generics.RetrieveAPIView):
	serializer_class = PaymentDetailSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = 'payment_id'

	def get_queryset(self):
		user = self.request.user
		queryset = Payment.objects.all()

		if is_admin_user(user):
			return queryset

		user_order_ids = MedicineOrder.objects.filter(
			patient=user
		).values_list('medicine_order_id', flat=True)

		user_appointment_ids = Appointment.objects.filter(
			patient=user
		).values_list('appointment_id', flat=True)

		return queryset.filter(
			models.Q(
				reference_type=Payment.ReferenceType.MEDICINE_ORDER,
				reference_id__in=user_order_ids
			)
			| models.Q(
				reference_type=Payment.ReferenceType.APPOINTMENT,
				reference_id__in=user_appointment_ids
			)
		)


class PaymentStatusUpdateView(generics.UpdateAPIView):
	serializer_class = PaymentStatusUpdateSerializer
	permission_classes = [permissions.IsAdminUser]
	lookup_field = 'payment_id'
	http_method_names = ['patch']
	queryset = Payment.objects.all()


class VNPayCreatePaymentView(APIView):
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

			if payment.reference_type == Payment.ReferenceType.MEDICINE_ORDER:
				return self.handle_medicine_order_return(
					payment=payment,
					response_code=response_code,
					transaction_no=transaction_no,
				)

			if payment.reference_type == Payment.ReferenceType.APPOINTMENT:
				return self.handle_appointment_return(
					payment=payment,
					response_code=response_code,
					transaction_no=transaction_no,
				)

		return redirect(
			f'{settings.FRONTEND_CART_URL}?payment=failed&reason=invalid_reference_type'
		)

	def handle_medicine_order_return(self, payment, response_code, transaction_no):
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

	def handle_appointment_return(self, payment, response_code, transaction_no):
		try:
			appointment = Appointment.objects.select_for_update().get(
				appointment_id=payment.reference_id
			)
		except Appointment.DoesNotExist:
			return redirect(
				f'{settings.FRONTEND_APPOINTMENT_PAYMENT_URL}?payment=failed&reason=appointment_not_found'
			)

		if payment.status == Payment.Status.SUCCESS:
			if payment.payment_stage == Payment.PaymentStage.DEPOSIT:
				if not appointment.deposit_paid:
					mark_appointment_deposit_paid(appointment)

				return redirect(
					f'{settings.FRONTEND_APPOINTMENT_CONFIRMATION_URL}/{appointment.appointment_id}'
				)

			if payment.payment_stage == Payment.PaymentStage.FINAL:
				if not appointment.final_paid:
					mark_appointment_final_paid_and_complete(
						appointment,
						final_amount=payment.amount
					)

				return redirect(
					f'{settings.FRONTEND_BASE_URL}/appointment-final-payment/{appointment.appointment_id}/success'
				)

		if response_code == '00':
			if payment.payment_stage == Payment.PaymentStage.DEPOSIT:
				if appointment.status == Appointment.Status.PENDING:
					mark_appointment_deposit_paid(appointment)

				payment.status = Payment.Status.SUCCESS
				payment.transaction_id = transaction_no
				payment.save(update_fields=['status', 'transaction_id'])

				return redirect(
					f'{settings.FRONTEND_APPOINTMENT_CONFIRMATION_URL}/{appointment.appointment_id}'
				)

			if payment.payment_stage == Payment.PaymentStage.FINAL:
				if not appointment.final_paid:
					mark_appointment_final_paid_and_complete(
						appointment,
						final_amount=payment.amount
					)

				payment.status = Payment.Status.SUCCESS
				payment.transaction_id = transaction_no
				payment.save(update_fields=['status', 'transaction_id'])

				AppointmentFinalPaymentSession.objects.filter(
					appointment=appointment,
					amount=payment.amount,
					is_used=False,
				).update(is_used=True)

				return redirect(
					f'{settings.FRONTEND_BASE_URL}/appointment-final-payment/{appointment.appointment_id}/success'
				)

		payment.status = Payment.Status.FAILED
		payment.transaction_id = transaction_no
		payment.save(update_fields=['status', 'transaction_id'])

		if payment.payment_stage == Payment.PaymentStage.FINAL:
			return redirect(
				f'{settings.FRONTEND_BASE_URL}/appointment-final-payment/{appointment.appointment_id}/failed?code={response_code}'
			)

		return redirect(
			f'{settings.FRONTEND_APPOINTMENT_PAYMENT_URL}/{appointment.appointment_id}?payment=failed&code={response_code}'
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
		paypal_order_id = (
			request.data.get('paypal_order_id') or
			request.data.get('token')
		)

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

			if payment.status == Payment.Status.SUCCESS:
				serializer = PaymentDetailSerializer(payment)
				return Response(serializer.data, status=status.HTTP_200_OK)

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


class AppointmentVNPayCreatePaymentView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=AppointmentPaymentCreateSerializer,
		responses=PaymentDetailSerializer,
	)
	def post(self, request):
		appointment_id = request.data.get('appointment_id')

		if not appointment_id:
			return Response(
				{'detail': 'appointment_id is required.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			appointment = Appointment.objects.get(
				appointment_id=appointment_id,
				patient=request.user
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if appointment.status != Appointment.Status.PENDING:
			return Response(
				{'detail': 'Only pending appointments can be paid.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		deposit_amount = get_appointment_deposit_amount(appointment)

		payment = Payment.objects.filter(
			reference_id=appointment.appointment_id,
			reference_type=Payment.ReferenceType.APPOINTMENT,
			method=Payment.Method.VNPAY,
			payment_stage=Payment.PaymentStage.DEPOSIT,
			status=Payment.Status.PENDING,
		).first()

		if payment is None:
			payment = Payment.objects.create(
				reference_id=appointment.appointment_id,
				reference_type=Payment.ReferenceType.APPOINTMENT,
				method=Payment.Method.VNPAY,
				payment_stage=Payment.PaymentStage.DEPOSIT,
				amount=deposit_amount,
				currency='VND',
				status=Payment.Status.PENDING,
			)
		elif payment.amount != deposit_amount or payment.payment_stage != Payment.PaymentStage.DEPOSIT:
			payment.amount = deposit_amount
			payment.currency = 'VND'
			payment.payment_stage = Payment.PaymentStage.DEPOSIT
			payment.save(update_fields=['amount', 'currency', 'payment_stage'])

		vnpay = VNPay()

		payment_url = vnpay.build_payment_url(
			payment_id=payment.payment_id,
			amount=payment.amount,
			order_info=f'Thanh toan dat coc lich hen {appointment.appointment_id}',
			ip_addr=get_client_ip(request),
		)

		return Response(
			{
				'payment_id': payment.payment_id,
				'payment_url': payment_url,
				'deposit_amount': payment.amount,
				'total_fee': appointment.total_fee,
				'remaining_amount': Decimal(appointment.total_fee) - Decimal(payment.amount),
			},
			status=status.HTTP_201_CREATED
		)


class AppointmentPayPalCreatePaymentView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=AppointmentPaymentCreateSerializer,
		responses=PaymentDetailSerializer,
	)
	def post(self, request):
		appointment_id = request.data.get('appointment_id')

		if not appointment_id:
			return Response(
				{'detail': 'appointment_id is required.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			appointment = Appointment.objects.get(
				appointment_id=appointment_id,
				patient=request.user
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if appointment.status != Appointment.Status.PENDING:
			return Response(
				{'detail': 'Only pending appointments can be paid.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		deposit_vnd = get_appointment_deposit_amount(appointment)

		vnd_to_usd_rate = Decimal(str(settings.PAYPAL_VND_TO_USD_RATE))
		amount_usd = (deposit_vnd / vnd_to_usd_rate).quantize(
			Decimal('0.01')
		)

		payment = Payment.objects.filter(
			reference_id=appointment.appointment_id,
			reference_type=Payment.ReferenceType.APPOINTMENT,
			method=Payment.Method.PAYPAL,
			payment_stage=Payment.PaymentStage.DEPOSIT,
			status=Payment.Status.PENDING,
		).first()

		if payment is None:
			payment = Payment.objects.create(
				reference_id=appointment.appointment_id,
				reference_type=Payment.ReferenceType.APPOINTMENT,
				method=Payment.Method.PAYPAL,
				payment_stage=Payment.PaymentStage.DEPOSIT,
				amount=amount_usd,
				currency='USD',
				status=Payment.Status.PENDING,
			)
		elif payment.amount != amount_usd or payment.payment_stage != Payment.PaymentStage.DEPOSIT:
			payment.amount = amount_usd
			payment.currency = 'USD'
			payment.payment_stage = Payment.PaymentStage.DEPOSIT
			payment.save(update_fields=['amount', 'currency', 'payment_stage'])

		return_url = (
			f'{settings.PAYPAL_APPOINTMENT_RETURN_URL}'
			f'?payment_id={payment.payment_id}'
		)

		cancel_url = (
			f'{settings.FRONTEND_APPOINTMENT_PAYMENT_URL}'
			f'/{appointment.appointment_id}?payment=failed&reason=paypal_cancelled'
		)

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
				'deposit_amount_usd': payment.amount,
				'deposit_amount_vnd': deposit_vnd,
				'total_fee': appointment.total_fee,
			},
			status=status.HTTP_201_CREATED
		)

class AppointmentPayPalCapturePaymentView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		request=AppointmentPayPalCaptureSerializer,
		responses=PaymentDetailSerializer,
	)
	def post(self, request):
		payment_id = request.data.get('payment_id')
		paypal_order_id = (
			request.data.get('paypal_order_id') or
			request.data.get('token')
		)

		if not payment_id or not paypal_order_id:
			return Response(
				{'detail': 'payment_id and paypal_order_id are required.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		try:
			payment = Payment.objects.get(
				payment_id=payment_id,
				transaction_id=paypal_order_id,
				reference_type=Payment.ReferenceType.APPOINTMENT,
				method=Payment.Method.PAYPAL,
				status=Payment.Status.PENDING,
			)
		except Payment.DoesNotExist:
			return Response(
				{'detail': 'Payment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		try:
			appointment = Appointment.objects.get(
				appointment_id=payment.reference_id,
				patient=request.user
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		try:
			paypal = PayPalClient()
			capture_result = paypal.capture_order(paypal_order_id)
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

			appointment = Appointment.objects.select_for_update().get(
				appointment_id=payment.reference_id
			)

			if payment.status == Payment.Status.SUCCESS:
				if not appointment.deposit_paid:
					mark_appointment_deposit_paid(appointment)

				serializer = PaymentDetailSerializer(payment)
				return Response(serializer.data, status=status.HTTP_200_OK)

			payment.status = Payment.Status.SUCCESS
			payment.transaction_id = capture_id
			payment.save(update_fields=['status', 'transaction_id'])

			if appointment.status == Appointment.Status.PENDING:
				mark_appointment_deposit_paid(appointment)

		serializer = PaymentDetailSerializer(payment)

		return Response(serializer.data, status=status.HTTP_200_OK)

class AppointmentFinalPaymentSessionCreateView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, appointment_id):
		try:
			appointment = (
				Appointment.objects
				.select_related('doctor', 'doctor__user', 'patient')
				.get(appointment_id=appointment_id)
			)
		except Appointment.DoesNotExist:
			return Response(
				{'detail': 'Appointment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		user = request.user

		is_assigned_doctor = (
			get_user_role(user) == 'doctor' and
			appointment.doctor.user == user
		)

		if not is_admin_user(user) and not is_assigned_doctor:
			return Response(
				{'detail': 'You do not have permission to generate final payment QR for this appointment.'},
				status=status.HTTP_403_FORBIDDEN
			)

		validation_error = validate_home_visit_final_payment_ready(appointment)

		if validation_error:
			return Response(
				{'detail': validation_error},
				status=status.HTTP_400_BAD_REQUEST
			)

		amount = get_appointment_final_amount(appointment)

		session = AppointmentFinalPaymentSession.objects.create(
			appointment=appointment,
			amount=amount,
			created_by=user,
		)

		signed_key = build_final_payment_signed_key(
			appointment.appointment_id,
			session.token
		)

		query = urlencode({
			'token': session.token,
			'key': signed_key,
		})

		final_payment_url = (
			f'{settings.FRONTEND_BASE_URL}'
			f'/appointment-final-payment/{appointment.appointment_id}'
			f'?{query}'
		)

		return Response(
			{
				'detail': 'Final payment session created successfully.',
				'session': AppointmentFinalPaymentSessionSerializer(session).data,
				'final_payment_url': final_payment_url,
			},
			status=status.HTTP_201_CREATED
		)


class AppointmentFinalPaymentSessionDetailView(APIView):
	permission_classes = [permissions.AllowAny]

	def get(self, request, appointment_id):
		token = request.query_params.get('token')
		signed_key = request.query_params.get('key')

		if not token or not signed_key:
			return Response(
				{'detail': 'Missing token or signed key.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not verify_final_payment_signed_key(
			appointment_id,
			token,
			signed_key
		):
			return Response(
				{'detail': 'Invalid or expired payment link.'},
				status=status.HTTP_403_FORBIDDEN
			)

		try:
			session = (
				AppointmentFinalPaymentSession.objects
				.select_related('appointment', 'appointment__doctor', 'appointment__doctor__user', 'appointment__patient')
				.get(
					appointment_id=appointment_id,
					token=token,
				)
			)
		except AppointmentFinalPaymentSession.DoesNotExist:
			return Response(
				{'detail': 'Payment session not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if session.is_used:
			return Response(
				{'detail': 'This payment session has already been used.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if session.is_expired:
			return Response(
				{'detail': 'This payment session has expired.'},
				status=status.HTTP_403_FORBIDDEN
			)

		return Response(
			AppointmentFinalPaymentSessionSerializer(session).data,
			status=status.HTTP_200_OK
		)

class AppointmentFinalSessionVNPayCreateView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request, appointment_id):
		token = request.data.get('token')
		signed_key = request.data.get('key')

		if not token or not signed_key:
			return Response(
				{'detail': 'Missing token or signed key.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not verify_final_payment_signed_key(
			appointment_id,
			token,
			signed_key
		):
			return Response(
				{'detail': 'Invalid or expired payment link.'},
				status=status.HTTP_403_FORBIDDEN
			)

		try:
			session = (
				AppointmentFinalPaymentSession.objects
				.select_related('appointment')
				.get(
					appointment_id=appointment_id,
					token=token,
				)
			)
		except AppointmentFinalPaymentSession.DoesNotExist:
			return Response(
				{'detail': 'Payment session not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if session.is_used:
			return Response(
				{'detail': 'This payment session has already been used.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if session.is_expired:
			return Response(
				{'detail': 'This payment session has expired.'},
				status=status.HTTP_403_FORBIDDEN
			)

		appointment = session.appointment

		validation_error = validate_home_visit_final_payment_ready(appointment)

		if validation_error:
			return Response(
				{'detail': validation_error},
				status=status.HTTP_400_BAD_REQUEST
			)

		payment = Payment.objects.create(
			reference_id=appointment.appointment_id,
			reference_type=Payment.ReferenceType.APPOINTMENT,
			method=Payment.Method.VNPAY,
			payment_stage=Payment.PaymentStage.FINAL,
			amount=session.amount,
			currency='VND',
			status=Payment.Status.PENDING,
		)

		vnpay = VNPay()

		payment_url = vnpay.build_payment_url(
			payment_id=payment.payment_id,
			amount=payment.amount,
			order_info=f'Thanh toan phi con lai lich kham {appointment.appointment_id}',
			ip_addr=get_client_ip(request),
		)

		return Response(
			{
				'payment_id': payment.payment_id,
				'payment_url': payment_url,
			},
			status=status.HTTP_201_CREATED
		)

class AppointmentFinalSessionPayPalCreateView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request, appointment_id):
		session_token = request.data.get('token')
		signed_key = request.data.get('key')

		if not session_token or not signed_key:
			return Response(
				{'detail': 'Missing token or signed key.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not verify_final_payment_signed_key(
			appointment_id,
			session_token,
			signed_key
		):
			return Response(
				{'detail': 'Invalid or expired payment link.'},
				status=status.HTTP_403_FORBIDDEN
			)

		try:
			session = (
				AppointmentFinalPaymentSession.objects
				.select_related('appointment')
				.get(
					appointment_id=appointment_id,
					token=session_token,
				)
			)
		except AppointmentFinalPaymentSession.DoesNotExist:
			return Response(
				{'detail': 'Payment session not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if session.is_used:
			return Response(
				{'detail': 'This payment session has already been used.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if session.is_expired:
			return Response(
				{'detail': 'This payment session has expired.'},
				status=status.HTTP_403_FORBIDDEN
			)

		appointment = session.appointment

		validation_error = validate_home_visit_final_payment_ready(appointment)

		if validation_error:
			return Response(
				{'detail': validation_error},
				status=status.HTTP_400_BAD_REQUEST
			)

		vnd_to_usd_rate = Decimal(str(settings.PAYPAL_VND_TO_USD_RATE))
		amount_usd = (Decimal(session.amount) / vnd_to_usd_rate).quantize(
			Decimal('0.01')
		)

		payment = Payment.objects.create(
			reference_id=appointment.appointment_id,
			reference_type=Payment.ReferenceType.APPOINTMENT,
			method=Payment.Method.PAYPAL,
			payment_stage=Payment.PaymentStage.FINAL,
			amount=amount_usd,
			currency='USD',
			status=Payment.Status.PENDING,
		)

		query = urlencode({
			'payment_id': payment.payment_id,
			'appointment_id': appointment.appointment_id,
			'session_token': session.token,
			'key': signed_key,
		})

		return_url = (
			f'{settings.FRONTEND_BASE_URL}'
			f'/appointment-final-paypal/return?{query}'
		)

		cancel_url = (
			f'{settings.FRONTEND_BASE_URL}'
			f'/appointment-final-payment/{appointment.appointment_id}/failed'
			f'?reason=paypal_cancelled'
		)

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
				'amount_usd': payment.amount,
				'amount_vnd': session.amount,
			},
			status=status.HTTP_201_CREATED
		)


class AppointmentFinalSessionPayPalCaptureView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request, appointment_id):
		payment_id = request.data.get('payment_id')
		paypal_order_id = (
			request.data.get('paypal_order_id') or
			request.data.get('token')
		)
		session_token = request.data.get('session_token')
		signed_key = request.data.get('key')

		if not payment_id or not paypal_order_id:
			return Response(
				{'detail': 'payment_id and paypal_order_id are required.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not session_token or not signed_key:
			return Response(
				{'detail': 'Missing session token or signed key.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if not verify_final_payment_signed_key(
			appointment_id,
			session_token,
			signed_key
		):
			return Response(
				{'detail': 'Invalid or expired payment link.'},
				status=status.HTTP_403_FORBIDDEN
			)

		try:
			session = (
				AppointmentFinalPaymentSession.objects
				.select_related('appointment')
				.get(
					appointment_id=appointment_id,
					token=session_token,
				)
			)
		except AppointmentFinalPaymentSession.DoesNotExist:
			return Response(
				{'detail': 'Payment session not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		if session.is_used:
			return Response(
				{'detail': 'This payment session has already been used.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if session.is_expired:
			return Response(
				{'detail': 'This payment session has expired.'},
				status=status.HTTP_403_FORBIDDEN
			)

		try:
			payment = Payment.objects.get(
				payment_id=payment_id,
				transaction_id=paypal_order_id,
				reference_type=Payment.ReferenceType.APPOINTMENT,
				method=Payment.Method.PAYPAL,
				payment_stage=Payment.PaymentStage.FINAL,
				status=Payment.Status.PENDING,
			)
		except Payment.DoesNotExist:
			return Response(
				{'detail': 'Payment not found.'},
				status=status.HTTP_404_NOT_FOUND
			)

		try:
			paypal = PayPalClient()
			capture_result = paypal.capture_order(paypal_order_id)
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

			appointment = Appointment.objects.select_for_update().get(
				appointment_id=payment.reference_id
			)

			session = AppointmentFinalPaymentSession.objects.select_for_update().get(
				session_id=session.session_id
			)

			if payment.status == Payment.Status.SUCCESS:
				serializer = PaymentDetailSerializer(payment)
				return Response(serializer.data, status=status.HTTP_200_OK)

			mark_appointment_final_paid_and_complete(
				appointment,
				final_amount=session.amount
			)

			payment.status = Payment.Status.SUCCESS
			payment.transaction_id = capture_id
			payment.save(update_fields=['status', 'transaction_id'])

			session.is_used = True
			session.save(update_fields=['is_used'])

		serializer = PaymentDetailSerializer(payment)

		return Response(serializer.data, status=status.HTTP_200_OK)