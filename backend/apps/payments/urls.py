from django.urls import path

from .views import (
    PaymentListCreateView,
    PaymentDetailView,
    PaymentStatusUpdateView,
    VNPayCreatePaymentView,
    VNPayReturnView,
    PayPalCreatePaymentView,
    PayPalCapturePaymentView,

    AppointmentVNPayCreatePaymentView,
    AppointmentPayPalCreatePaymentView,
    AppointmentPayPalCapturePaymentView,
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
]