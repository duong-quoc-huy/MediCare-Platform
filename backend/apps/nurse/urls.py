from django.urls import path 
 
from .views import ( 
    NursePharmacyQueueView, 
    NursePharmacyDetailView, 
    NursePharmacyConfirmPaymentView, 
) 
 
urlpatterns = [ 
    path('pharmacy/', NursePharmacyQueueView.as_view(), name='nurse-pharmacy-queue'),
    path('pharmacy/<int:prescription_id>/', NursePharmacyDetailView.as_view(), name='nurse-pharmacy-detail'), 
    path('pharmacy/<int:prescription_id>/confirm/', NursePharmacyConfirmPaymentView.as_view(), name='nurse-pharmacy-confirm'), 
] 