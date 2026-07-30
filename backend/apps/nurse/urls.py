from django.urls import path
from .views import (
    NursePharmacyQueueView, NursePharmacyDetailView,
    NursePharmacyCreatePaymentView, NursePharmacyPayPalCaptureView,
    NursePharmacyClaimView,
)

urlpatterns = [
    path('pharmacy/', NursePharmacyQueueView.as_view(), name='nurse-pharmacy-queue'),
    path('pharmacy/<int:prescription_id>/', NursePharmacyDetailView.as_view(), name='nurse-pharmacy-detail'),
    path('pharmacy/<int:prescription_id>/payment/', NursePharmacyCreatePaymentView.as_view(), name='nurse-pharmacy-payment'),
    path('pharmacy/paypal/capture/', NursePharmacyPayPalCaptureView.as_view(), name='nurse-pharmacy-paypal-capture'),
    path('pharmacy/<int:prescription_id>/claim/', NursePharmacyClaimView.as_view(), name='nurse-pharmacy-claim',),
]
