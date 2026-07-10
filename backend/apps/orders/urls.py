from django.urls import path

from .views import (
	MedicineOrderListCreateView,
	MedicineOrderDetailView,
	MedicineOrderStatusUpdateView,
	MedicineOrderCancelView,
)

urlpatterns = [
	path('', MedicineOrderListCreateView.as_view(), name='medicine-order-list-create'),
	path('<uuid:medicine_order_id>/', MedicineOrderDetailView.as_view(), name='medicine-order-detail'),
	path('<uuid:medicine_order_id>/status/', MedicineOrderStatusUpdateView.as_view(), name='medicine-order-status-update'),
	path('<uuid:medicine_order_id>/cancel/', MedicineOrderCancelView.as_view(), name='medicine-order-cancel'),
]