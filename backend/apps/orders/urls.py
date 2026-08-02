from django.urls import path

from .shipper_views import (
	ShipperAvailableOrderListView, ShipperMyOrderListView,
	ShipperOrderDetailView, ShipperClaimOrderView, ShipperStatusUpdateView,
)


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
	path('shipper/available/', ShipperAvailableOrderListView.as_view(), name='shipper-available-orders'),
	path('shipper/mine/', ShipperMyOrderListView.as_view(), name='shipper-my-orders'),
	path('shipper/<uuid:medicine_order_id>/', ShipperOrderDetailView.as_view(), name='shipper-order-detail'),
	path('shipper/<uuid:medicine_order_id>/claim/', ShipperClaimOrderView.as_view(), name='shipper-claim-order'),
	path('shipper/<uuid:medicine_order_id>/status/', ShipperStatusUpdateView.as_view(), name='shipper-order-status'),
]