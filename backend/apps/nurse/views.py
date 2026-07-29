from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.appointments.models import Appointment
from apps.appointments.pdf_service import generate_medical_pdf
from apps.medical_records.models import Prescription
from apps.payments.models import Payment

from .serializers import NursePharmacyQueueSerializer, NursePharmacyDetailSerializer, NursePharmacyPaymentConfirmSerializer

def get_user_role(user):
	return str(getattr(user, 'role', '')).lower()

def is_nurse_or_admin(user):
	return get_user_role(user) == 'nurse' or get_user_role(user) == 'admin' or user.is_superuser

class NurseOnlyPermission(permissions.BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and is_nurse_or_admin(request.user)

class NursePharmacyQueueView(generics.ListAPIView):
	serializer_class = NursePharmacyQueueSerializer
	permissions_classes = [NurseOnlyPermission]

	def get_queryset(self): 
		queryset = ( 
			Prescription.objects 
			.select_related( 
				'appointment', 
				'appointment__patient', 
				'appointment__doctor', 
				'appointment__doctor__user', 
			) 
			.prefetch_related('items') 
			.filter( 
				sent_to_pharmacy=True, 
				appointment__visit_type=Appointment.VisitType.CLINIC, 
			) 
			.exclude(appointment__status=Appointment.Status.CANCELLED) 
		) 
 
		status_param = self.request.query_params.get('status') 
		if status_param: 
			queryset = queryset.filter(appointment__status=status_param)
		return queryset.order_by('appointment__appointment_date', 'appointment__start_time')

class NursePharmacyDetailView(generics.RetrieveAPIView):
	serializer_class = NursePharmacyDetailSerializer
	permissions_classes = [NurseOnlyPermission]
	lookup_field = 'id'
	lookup_url_kwarg = 'prescription_id'

	def get_queryset(self):
		return(
			Prescription.objects
			.select_related(
				'appointment',
				'appointment__patient',
				'appointment__doctor',
				'appointment__doctor__user',
			)
			.prefetch_related('items')
			.filter(sent_to_pharmacy=True, appointment__visit_type=Appointment.VisitType.CLINIC)
		)

class NursePharmacyConfirmPaymentView(APIView):
	permissions_classes = [NurseOnlyPermission]

	def post(self, request, prscription_id):
		serializer = NursePharmacyPaymentConfirmSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		try:
			prescription = (
				Prescription.objects
				.select_related(
					'appointment',
					'appointment__patient',
					'appointment__doctor',
					'appointment__doctor__user'
				)
				.prefetch_related('items')
				.get(id=prescription_id, sent_to_pharmacy=True)
			)
		except Prescription.DoesNoExist:
			return Response({'detail' : ' Prescription not found in pharmacy queue.'}, status=status.HTTP_404_NOT_FOUND)

		appointment = prescription.appointment
		if appointment.visit_type != Appointment.VisitType.CLINIC:
			return Response({'detail':'Nurse can only complete clinic appointments.'}, status=status.HTTP_400_BAD_REQUEST)

		if appointment.status != Appointment.Staus.IN_PROGRESS:
			return Response({'detail':'Only in-progress clinic appointments can be completed.'}, status=status.HTTP_400_BAD_REQUEST)

		if appointment.final_paid:
			return Response({'detail':'Final Payment has already been confirmed'}, status=status.HTTP_400_BAD_REQUEST)

		if not prescription.items.exists():
			return Response({'detail':'Prescription has no medicine items.'}, status=status.HTTP_400_BAD_REQUEST)

		amount_received = serializers.validated_data['amount_received']
		payment_method = serializers.validated_data['payment_method']
		receipt_number = serializers.validated_data.get('receipt_number', '')

		with transaction.atomic():
			appointment = Appointment.objects.select_for_update().get(appointment_id=appointment.appointment_id)

			payment = Payment.objects.create(
				reference_id=appointment.appointment_id,
				reference_type=Payment.ReferenceType.APPOINTMENT,
				method=payment_method,
				payment_stage=Payment.PaymentStage.FINAL,
				amount=amount_received,
				currency='VND',
				status=Payment.Status.SUCCESS,
				transaction_id=receipt_number,
			)

			appointment.final_paid = True
			appointment.final_amount = amount_received
			appointment.status = Appointment.Status.COMPLETED
			appointment.save(update_fields=['final_paid', 'final_amount', 'staus', 'updated_at'])

			generate_medical_pdf(appointment)

		detail_serializer = NursePharmacyDetailSerializer(prescription)

		return Response(
			{
				'detail' : 'Clinic appointment payment confirmed and appointment completed',
				'payment_id': payment.payment_id,
				'prescription': detail_serializer.data
			},
			status=status.HTTP_200_OK
		)
