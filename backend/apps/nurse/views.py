from decimal import Decimal
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.appointments.pdf_service import generate_medical_pdf
from apps.medical_records.models import Prescription
from apps.payments.models import Payment
from apps.payments.utils import VNPay, PayPalClient

from .serializers import (
	NursePharmacyQueueSerializer,
	NursePharmacyDetailSerializer,
	NursePharmacyPaymentCreateSerializer,
	calculate_prescription_bill,
	NursePharmacyClaimSerializer,
)


def get_user_role(user): return str(getattr(user, 'role', '')).lower()
def is_nurse_or_admin(user): return get_user_role(user) in ('nurse', 'admin') or user.is_superuser


class NurseOnlyPermission(permissions.BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and is_nurse_or_admin(request.user)

class ActualNursePermission(permissions.BasePermission):
	def has_permission(self, request, view):
		return (request.user.is_authenticated and get_user_role(request.user) == 'nurse')


def get_client_ip(request):
	forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
	return forwarded_for.split(',')[0] if forwarded_for else request.META.get('REMOTE_ADDR', '127.0.0.1')


def validate_prescription_for_payment(prescription):
	appointment = prescription.appointment
	if appointment.visit_type != Appointment.VisitType.CLINIC:
		return 'Nurse can only complete clinic appointments.'
	if appointment.status != Appointment.Status.IN_PROGRESS:
		return 'Only in-progress clinic appointments can be paid.'
	if appointment.final_paid:
		return 'Final payment has already been completed.'
	if not prescription.sent_to_pharmacy:
		return 'Prescription has not been sent to pharmacy.'
	if not prescription.items.exists():
		return 'Prescription has no medicine items.'
	return None


def payment_signature(payment_id, prescription_id):
	return signing.dumps({'payment_id': str(payment_id), 'prescription_id': prescription_id}, salt='nurse-paypal')


def complete_appointment(appointment, amount_vnd):
	appointment.final_paid = True
	appointment.final_amount = amount_vnd
	appointment.status = Appointment.Status.COMPLETED
	appointment.save(update_fields=['final_paid', 'final_amount', 'status', 'updated_at'])
	generate_medical_pdf(appointment)


class NursePharmacyQueueView(generics.ListAPIView):
	serializer_class = NursePharmacyQueueSerializer
	permission_classes = [NurseOnlyPermission]

	def get_queryset(self):
		queryset = (Prescription.objects.select_related(
			'appointment', 'appointment__patient', 'appointment__doctor', 'appointment__doctor__user'
		).prefetch_related('items').filter(
			sent_to_pharmacy=True, appointment__visit_type=Appointment.VisitType.CLINIC
		).exclude(appointment__status=Appointment.Status.CANCELLED))
		status_param = self.request.query_params.get('status')
		if status_param:
			queryset = queryset.filter(appointment__status=status_param)
		return queryset.order_by('appointment__appointment_date', 'appointment__start_time')


class NursePharmacyDetailView(generics.RetrieveAPIView):
	serializer_class = NursePharmacyDetailSerializer
	permission_classes = [NurseOnlyPermission]
	lookup_field = 'id'
	lookup_url_kwarg = 'prescription_id'

	def get_queryset(self):
		return Prescription.objects.select_related(
			'appointment', 'appointment__patient', 'appointment__doctor', 'appointment__doctor__user'
		).prefetch_related('items').filter(
			sent_to_pharmacy=True, appointment__visit_type=Appointment.VisitType.CLINIC
		)


class NursePharmacyCreatePaymentView(APIView):
	permission_classes = [NurseOnlyPermission]

	def post(self, request, prescription_id):
		serializer = NursePharmacyPaymentCreateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		try:
			prescription = Prescription.objects.select_related(
				'appointment', 'appointment__patient', 'appointment__doctor', 'appointment__doctor__user'
			).prefetch_related('items').get(id=prescription_id)
		except Prescription.DoesNotExist:
			return Response({'detail': 'Prescription not found.'}, status=status.HTTP_404_NOT_FOUND)

		if prescription.assigned_nurse_id is None:
			return Response(
				{
					'detail': (
						'This prescription must be claimed before payment '
						'can be processed.'
					)
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		if prescription.assigned_nurse_id != request.user.user_id:
			return Response(
				{
					'detail': (
						'Only the assigned nurse can process payment for '
						'this prescription.'
					),
					'assigned_nurse': prescription.assigned_nurse.full_name,
					'pharmacy_counter': (
						prescription.get_pharmacy_counter_display()
					),
				},
				status=status.HTTP_403_FORBIDDEN,
			)

		error = validate_prescription_for_payment(prescription)
		if error:
			return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

		method = serializer.validated_data['payment_method']
		bill = calculate_prescription_bill(prescription)
		amount_vnd = bill['payable_amount']
		appointment = prescription.appointment

		if amount_vnd <= 0:
			return Response({'detail': 'Payable amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

		if method == Payment.Method.CASH:
			with transaction.atomic():
				appointment = Appointment.objects.select_for_update().get(appointment_id=appointment.appointment_id)
				if appointment.final_paid:
					return Response({'detail': 'Payment already completed.'}, status=status.HTTP_409_CONFLICT)
				payment = Payment.objects.create(
					reference_id=appointment.appointment_id,
					reference_type=Payment.ReferenceType.APPOINTMENT,
					method=Payment.Method.CASH,
					payment_stage=Payment.PaymentStage.FINAL,
					amount=amount_vnd,
					original_amount=amount_vnd,
					currency='VND',
					status=Payment.Status.SUCCESS,
					transaction_id=serializer.validated_data.get('receipt_number', ''),
				)
				complete_appointment(appointment, amount_vnd)
			return Response({'detail': 'Cash payment confirmed.', 'payment_id': payment.payment_id}, status=status.HTTP_200_OK)

		if method == Payment.Method.VNPAY:
			payment = Payment.objects.create(
				reference_id=appointment.appointment_id,
				reference_type=Payment.ReferenceType.APPOINTMENT,
				method=Payment.Method.VNPAY,
				payment_stage=Payment.PaymentStage.FINAL,
				amount=amount_vnd,
				original_amount=amount_vnd,
				currency='VND',
				status=Payment.Status.PENDING,
			)
			url = VNPay().build_payment_url(
				payment_id=payment.payment_id,
				amount=amount_vnd,
				order_info=f'Clinic prescription payment {prescription.id}',
				ip_addr=get_client_ip(request),
			)
			return Response({'payment_id': payment.payment_id, 'payment_url': url, 'amount_vnd': amount_vnd}, status=status.HTTP_201_CREATED)

		rate = Decimal(str(settings.PAYPAL_VND_TO_USD_RATE))
		amount_usd = (amount_vnd / rate).quantize(Decimal('0.01'))
		payment = Payment.objects.create(
			reference_id=appointment.appointment_id,
			reference_type=Payment.ReferenceType.APPOINTMENT,
			method=Payment.Method.PAYPAL,
			payment_stage=Payment.PaymentStage.FINAL,
			amount=amount_usd,
			original_amount=amount_vnd,
			exchange_rate=rate,
			currency='USD',
			status=Payment.Status.PENDING,
		)
		signature = payment_signature(payment.payment_id, prescription.id)
		query = urlencode({'payment_id': payment.payment_id, 'prescription_id': prescription.id, 'signature': signature})
		return_url = f'{settings.FRONTEND_BASE_URL}/nurse-payment/paypal-return?{query}'
		cancel_url = f'{settings.FRONTEND_BASE_URL}/nurse-payment/paypal-return?payment=cancelled&{query}'

		try:
			order = PayPalClient().create_order(
				amount=amount_usd, currency='USD', reference_id=payment.payment_id,
				return_url=return_url, cancel_url=cancel_url,
			)
		except Exception as exc:
			payment.status = Payment.Status.FAILED
			payment.save(update_fields=['status'])
			return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

		approval_url = next((link.get('href') for link in order.get('links', []) if link.get('rel') == 'approve'), None)
		if not approval_url:
			payment.status = Payment.Status.FAILED
			payment.save(update_fields=['status'])
			return Response({'detail': 'Could not get PayPal approval URL.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

		payment.transaction_id = order.get('id', '')
		payment.save(update_fields=['transaction_id'])
		return Response({
			'payment_id': payment.payment_id, 'paypal_order_id': order.get('id'),
			'approval_url': approval_url, 'amount_vnd': amount_vnd, 'amount_usd': amount_usd,
		}, status=status.HTTP_201_CREATED)


class NursePharmacyPayPalCaptureView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		payment_id = request.data.get('payment_id')
		prescription_id = request.data.get('prescription_id')
		signature = request.data.get('signature')
		paypal_order_id = request.data.get('paypal_order_id') or request.data.get('token')
		if not all([payment_id, prescription_id, signature, paypal_order_id]):
			return Response({'detail': 'Missing PayPal capture data.'}, status=status.HTTP_400_BAD_REQUEST)
		try:
			expected = signing.loads(signature, salt='nurse-paypal', max_age=30 * 60)
		except (signing.BadSignature, signing.SignatureExpired):
			return Response({'detail': 'Invalid or expired payment signature.'}, status=status.HTTP_403_FORBIDDEN)
		if expected != {'payment_id': str(payment_id), 'prescription_id': int(prescription_id)}:
			return Response({'detail': 'Payment signature does not match.'}, status=status.HTTP_403_FORBIDDEN)

		try:
			payment = Payment.objects.get(
				payment_id=payment_id, method=Payment.Method.PAYPAL,
				payment_stage=Payment.PaymentStage.FINAL,
			)
		except Payment.DoesNotExist:
			return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

		if payment.status == Payment.Status.SUCCESS:
			return Response({'detail': 'Payment already completed.', 'status': payment.status})

		try:
			capture = PayPalClient().capture_order(paypal_order_id)
		except Exception as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

		if capture.get('status') != 'COMPLETED':
			payment.status = Payment.Status.FAILED
			payment.save(update_fields=['status'])
			return Response({'detail': 'PayPal payment was not completed.', 'paypal_status': capture.get('status')}, status=status.HTTP_400_BAD_REQUEST)

		capture_id = paypal_order_id
		try:
			capture_id = capture['purchase_units'][0]['payments']['captures'][0]['id']
		except (KeyError, IndexError):
			pass

		with transaction.atomic():
			payment = Payment.objects.select_for_update().get(payment_id=payment.payment_id)
			appointment = Appointment.objects.select_for_update().get(appointment_id=payment.reference_id)
			if not appointment.final_paid:
				complete_appointment(appointment, payment.original_amount or Decimal('0.00'))
			payment.status = Payment.Status.SUCCESS
			payment.transaction_id = capture_id
			payment.save(update_fields=['status', 'transaction_id'])

		return Response({'detail': 'PayPal payment completed.', 'status': payment.status, 'appointment_id': appointment.appointment_id})

class NursePharmacyClaimView(APIView):
	permission_classes = [ActualNursePermission]

	def post(self, request, prescription_id):
		input_serializer = NursePharmacyClaimSerializer(
			data=request.data
		)
		input_serializer.is_valid(raise_exception=True)

		pharmacy_counter = input_serializer.validated_data[
			'pharmacy_counter'
		]

		with transaction.atomic():
			try:
				prescription = (
					Prescription.objects
					.select_for_update(of=('self',))
					.select_related(
						'appointment',
						'appointment__patient',
						'appointment__doctor',
						'appointment__doctor__user',
					)
					.prefetch_related('items')
					.get(
						id=prescription_id,
						sent_to_pharmacy=True,
						appointment__visit_type=(
							Appointment.VisitType.CLINIC
						),
					)
				)
			except Prescription.DoesNotExist:
				return Response(
					{
						'detail': (
							'Prescription was not found in the '
							'pharmacy queue.'
						)
					},
					status=status.HTTP_404_NOT_FOUND,
				)

			appointment = prescription.appointment

			if appointment.final_paid:
				return Response(
					{
						'detail': (
							'This appointment has already been '
							'completed.'
						)
					},
					status=status.HTTP_400_BAD_REQUEST,
				)

			if appointment.status != Appointment.Status.IN_PROGRESS:
				return Response(
					{
						'detail': (
							'Only prescriptions belonging to an '
							'in-progress appointment can be claimed.'
						)
					},
					status=status.HTTP_400_BAD_REQUEST,
				)

			# Idempotent response when the same nurse clicks twice.
			if prescription.assigned_nurse_id == request.user.user_id:
				detail_serializer = NursePharmacyDetailSerializer(
					prescription,
					context={'request': request},
				)

				return Response(
					{
						'detail': (
							'This prescription is already assigned '
							'to you.'
						),
						'prescription': detail_serializer.data,
					},
					status=status.HTTP_200_OK,
				)

			# Another nurse won the database lock and claimed it first.
			if prescription.assigned_nurse_id is not None:
				return Response(
					{
						'detail': (
							'This prescription has already been '
							'claimed by another nurse.'
						),
						'assigned_nurse': (
							prescription.assigned_nurse.full_name
						),
						'pharmacy_counter': (
							prescription.get_pharmacy_counter_display()
						),
					},
					status=status.HTTP_409_CONFLICT,
				)

			prescription.assigned_nurse = request.user
			prescription.assigned_at = timezone.now()
			prescription.pharmacy_counter = pharmacy_counter
			prescription.pharmacy_status = (
				Prescription.PharmacyStatus.ASSIGNED
			)

			prescription.save(
				update_fields=[
					'assigned_nurse',
					'assigned_at',
					'pharmacy_counter',
					'pharmacy_status',
					'updated_at',
				]
			)

		detail_serializer = NursePharmacyDetailSerializer(
			prescription,
			context={'request': request},
		)

		return Response(
			{
				'detail': 'Prescription claimed successfully.',
				'prescription': detail_serializer.data,
			},
			status=status.HTTP_200_OK,
		)
