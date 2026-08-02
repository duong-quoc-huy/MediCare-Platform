from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.notifications.models import Notification
from apps.notifications.services import notify_order_event
from apps.payments.models import Payment
from .models import MedicineOrder
from .shipper_serializers import ShipperOrderSerializer, ShipperStatusUpdateSerializer

ACTIVE_STATUSES = [MedicineOrder.Status.READY_FOR_PICKUP, MedicineOrder.Status.DISPATCHED, MedicineOrder.Status.DELIVERING, MedicineOrder.Status.DELIVERY_FAILED, MedicineOrder.Status.RETURNING]
HISTORY_STATUSES = [MedicineOrder.Status.DELIVERED, MedicineOrder.Status.RETURNED, MedicineOrder.Status.CANCELLED]

def is_shipper(user):
    return getattr(user, 'role', None) == 'shipper'

def mock_mode_error():
    return Response({'detail': 'Manual shipper operations are available only while GHTK mock mode is enabled.'}, status=status.HTTP_403_FORBIDDEN)

def shipper_queryset():
    return MedicineOrder.objects.select_related('patient', 'assigned_shipper', 'source_address').prefetch_related('items', 'items__medicine')

class ShipperAvailableOrderListView(generics.ListAPIView):
    serializer_class = ShipperOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    def list(self, request, *args, **kwargs):
        if not is_shipper(request.user): return Response({'detail': 'Only shippers can view this queue.'}, status=403)
        if not settings.GHTK_MOCK_MODE: return mock_mode_error()
        return super().list(request, *args, **kwargs)
    def get_queryset(self):
        return shipper_queryset().filter(status=MedicineOrder.Status.READY_FOR_PICKUP, assigned_shipper__isnull=True).order_by('ready_at', 'created_at')

class ShipperMyOrderListView(generics.ListAPIView):
    serializer_class = ShipperOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    def list(self, request, *args, **kwargs):
        if not is_shipper(request.user): return Response({'detail': 'Only shippers can view deliveries.'}, status=403)
        if not settings.GHTK_MOCK_MODE: return mock_mode_error()
        return super().list(request, *args, **kwargs)
    def get_queryset(self):
        scope = self.request.query_params.get('scope', 'active')
        qs = shipper_queryset().filter(assigned_shipper=self.request.user)
        if scope == 'history': qs = qs.filter(status__in=HISTORY_STATUSES)
        elif scope != 'all': qs = qs.filter(status__in=ACTIVE_STATUSES)
        return qs.order_by('-updated_at')

class ShipperOrderDetailView(generics.RetrieveAPIView):
    serializer_class = ShipperOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'medicine_order_id'
    def retrieve(self, request, *args, **kwargs):
        if not is_shipper(request.user): return Response({'detail': 'Only shippers can view this delivery.'}, status=403)
        if not settings.GHTK_MOCK_MODE: return mock_mode_error()
        return super().retrieve(request, *args, **kwargs)
    def get_queryset(self):
        return shipper_queryset().filter(assigned_shipper=self.request.user)

class ShipperClaimOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, medicine_order_id):
        if not is_shipper(request.user): return Response({'detail': 'Only shippers can claim deliveries.'}, status=403)
        if not settings.GHTK_MOCK_MODE: return mock_mode_error()
        with transaction.atomic():
            try:
                order = MedicineOrder.objects.select_for_update().get(medicine_order_id=medicine_order_id)
            except MedicineOrder.DoesNotExist:
                return Response({'detail': 'Medicine order was not found.'}, status=404)
            if order.status != MedicineOrder.Status.READY_FOR_PICKUP:
                return Response({'detail': 'This order is not available for pickup.', 'current_status': order.status}, status=409)
            if order.assigned_shipper_id is not None:
                return Response({'detail': 'This order has already been claimed by another shipper.'}, status=409)
            order.assigned_shipper = request.user
            order.shipper_assigned_at = timezone.now()
            order.save(update_fields=['assigned_shipper', 'shipper_assigned_at', 'updated_at'])
        order = shipper_queryset().get(medicine_order_id=medicine_order_id)
        return Response(ShipperOrderSerializer(order).data)

class ShipperStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def patch(self, request, medicine_order_id):
        if not is_shipper(request.user): return Response({'detail': 'Only shippers can update deliveries.'}, status=403)
        if not settings.GHTK_MOCK_MODE: return mock_mode_error()
        with transaction.atomic():
            try:
                order = MedicineOrder.objects.select_for_update().get(medicine_order_id=medicine_order_id)
            except MedicineOrder.DoesNotExist:
                return Response({'detail': 'Medicine order was not found.'}, status=404)
            if order.assigned_shipper_id != request.user.user_id:
                return Response({'detail': 'Only the assigned shipper can update this delivery.'}, status=403)
            serializer = ShipperStatusUpdateSerializer(instance=order, data=request.data)
            serializer.is_valid(raise_exception=True)
            new_status = serializer.validated_data['status']
            now = timezone.now()
            order.status = new_status
            fields = ['status', 'updated_at']
            if new_status == MedicineOrder.Status.DISPATCHED:
                order.pickup_at = now; fields.append('pickup_at')
            elif new_status == MedicineOrder.Status.DELIVERING:
                order.delivering_at = now; fields.append('delivering_at')
            elif new_status == MedicineOrder.Status.DELIVERED:
                order.delivered_at = now; fields.append('delivered_at')
                Payment.objects.filter(reference_id=order.medicine_order_id, reference_type=Payment.ReferenceType.MEDICINE_ORDER, method=Payment.Method.CASH, status=Payment.Status.PENDING).update(status=Payment.Status.SUCCESS, transaction_id=f'COD-{order.medicine_order_id}')
            elif new_status == MedicineOrder.Status.DELIVERY_FAILED:
                order.failed_at = now
                order.delivery_failure_reason = serializer.validated_data['failure_reason'].strip()
                fields += ['failed_at', 'delivery_failure_reason']
            elif new_status == MedicineOrder.Status.RETURNING:
                order.returning_at = now; fields.append('returning_at')
            elif new_status == MedicineOrder.Status.RETURNED:
                order.returned_at = now; fields.append('returned_at')
                Payment.objects.filter(reference_id=order.medicine_order_id, reference_type=Payment.ReferenceType.MEDICINE_ORDER, method=Payment.Method.CASH, status=Payment.Status.PENDING).update(status=Payment.Status.CANCELLED)
            order.save(update_fields=list(dict.fromkeys(fields)))
            event = {
                MedicineOrder.Status.DISPATCHED: Notification.Event.DISPATCHED,
                MedicineOrder.Status.DELIVERING: Notification.Event.DELIVERING,
                MedicineOrder.Status.DELIVERED: Notification.Event.DELIVERED,
                MedicineOrder.Status.DELIVERY_FAILED: Notification.Event.DELIVERY_FAILED,
                MedicineOrder.Status.RETURNING: Notification.Event.RETURNING,
                MedicineOrder.Status.RETURNED: Notification.Event.RETURNED,
            }.get(new_status)
            if event:
                transaction.on_commit(lambda order=order, event=event: notify_order_event(order=order, event=event))
        order = shipper_queryset().get(medicine_order_id=medicine_order_id)
        return Response(ShipperOrderSerializer(order).data)
