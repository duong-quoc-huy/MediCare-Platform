from django.urls import path

from .views import (
	PaymentListCreateView,
	PaymentDetailView,
	PaymentStatusUpdateView,
)

urlpatterns = [
	path('', PaymentListCreateView.as_view(), name='payment-list-create'),
	path('<uuid:payment_id>/', PaymentDetailView.as_view(), name='payment-detail'),
	path('<uuid:payment_id>/status/', PaymentStatusUpdateView.as_view(), name='payment-status-update'),
]