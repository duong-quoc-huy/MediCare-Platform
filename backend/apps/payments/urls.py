from django.urls import path

from .views import (
	PaymentListCreateView,
	PaymentDetailView,
	PaymentStatusUpdateView,
	VNPayCreatePaymentView,
	VNPayReturnView,
	PayPalCreatePaymentView,
	PayPalCapturePaymentView,
	CashOnDeliveryCreateView,

	AppointmentVNPayCreatePaymentView,
	AppointmentPayPalCreatePaymentView,
	AppointmentPayPalCapturePaymentView,

	AppointmentFinalPaymentSessionCreateView,
	AppointmentFinalPaymentSessionDetailView,
	AppointmentFinalSessionVNPayCreateView,

	AppointmentFinalSessionPayPalCreateView,
	AppointmentFinalSessionPayPalCaptureView,
)

urlpatterns = [
	path('', PaymentListCreateView.as_view(), name='payment-list-create'),
	path('<uuid:payment_id>/', PaymentDetailView.as_view(), name='payment-detail'),
	path('<uuid:payment_id>/status/', PaymentStatusUpdateView.as_view(), name='payment-status-update'),

	path('vnpay/create/', VNPayCreatePaymentView.as_view(), name='vnpay-create'),
	path('vnpay/return/', VNPayReturnView.as_view(), name='vnpay-return'),

	path('paypal/create/', PayPalCreatePaymentView.as_view(), name='paypal-create'),
	path('paypal/capture/', PayPalCapturePaymentView.as_view(), name='paypal-capture'),

	path('appointments/vnpay/create/', AppointmentVNPayCreatePaymentView.as_view(), name='appointment-vnpay-create'),
	path('appointments/paypal/create/', AppointmentPayPalCreatePaymentView.as_view(), name='appointment-paypal-create'),
	path('appointments/paypal/capture/', AppointmentPayPalCapturePaymentView.as_view(), name='appointment-paypal-capture'),

	path('appointments/<uuid:appointment_id>/final-session/create/', AppointmentFinalPaymentSessionCreateView.as_view(), name='appointment-final-session-create'),
	path('appointments/<uuid:appointment_id>/final-session/', AppointmentFinalPaymentSessionDetailView.as_view(), name='appointment-final-session-detail'),
	path('appointments/<uuid:appointment_id>/final-session/vnpay/create/', AppointmentFinalSessionVNPayCreateView.as_view(), name='appointment-final-session-vnpay-create'),
	
	path('appointments/<uuid:appointment_id>/final-session/paypal/create/', AppointmentFinalSessionPayPalCreateView.as_view(), name='appointment-final-session-paypal-create'),
	path('appointments/<uuid:appointment_id>/final-session/paypal/capture/', AppointmentFinalSessionPayPalCaptureView.as_view(), name='appointment-final-session-paypal-capture'),
	path('cash/create/', CashOnDeliveryCreateView.as_view(), name='cash-on-delivery-create',),
]