from django.urls import path

from .views import (
	CreateGHTKShipmentView,
	MedicineOrderCancelView,
	MedicineOrderDetailView,
	MedicineOrderListCreateView,
	MedicineOrderStatusUpdateView,
	NurseMedicineOrderStatusUpdateView,
	ShippingFeeCalculateView,
	ShippingFeeResponseSerializer,
	GHTKWebhookView,
	MockGHTKStatusUpdateView,
)


urlpatterns = [
	path('', MedicineOrderListCreateView.as_view(), name='medicine-order-list-create',),
	path('shipping-fee/', ShippingFeeCalculateView.as_view(), name='medicine-order-shipping-fee',),
	path('<uuid:medicine_order_id>/', MedicineOrderDetailView.as_view(), name='medicine-order-detail',),
	path('<uuid:medicine_order_id>/status/', MedicineOrderStatusUpdateView.as_view(), name='medicine-order-status-update',),
	path('<uuid:medicine_order_id>/nurse-status/', NurseMedicineOrderStatusUpdateView.as_view(), name='medicine-order-nurse-status-update',),
	path('<uuid:medicine_order_id>/cancel/', MedicineOrderCancelView.as_view(), name='medicine-order-cancel',),
	path('<uuid:medicine_order_id>/create-shipment/', CreateGHTKShipmentView.as_view(), name='medicine-order-create-shipment',),
	path('ghtk/webhook/', GHTKWebhookView.as_view(), name='ghtk-webhook',),
	path('ghtk/mock-status/', MockGHTKStatusUpdateView.as_view(), name='ghtk-mock-status',),
]