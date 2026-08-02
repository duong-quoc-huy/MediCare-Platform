from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.orders.models import MedicineOrder
from apps.payments.models import Payment
from apps.users.models import User


def money(value):
    return str(value or Decimal('0.00'))


def get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def write_admin_audit(*, request, action, resource_type, resource_id='', previous_data=None, new_data=None):
    from .models import AdminAuditLog

    return AdminAuditLog.objects.create(
        admin=request.user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id or ''),
        previous_data=previous_data or {},
        new_data=new_data or {},
        ip_address=get_client_ip(request),
    )


def dashboard_summary():
    today = timezone.localdate()
    success_payments = Payment.objects.filter(status=Payment.Status.SUCCESS,)

    medicine_revenue = success_payments.filter(reference_type=Payment.ReferenceType.MEDICINE_ORDER,).aggregate(total=Sum('amount'))['total']

    appointment_revenue = success_payments.filter(reference_type=Payment.ReferenceType.APPOINTMENT,).aggregate(total=Sum('amount'))['total']

    active_delivery_statuses = [
        MedicineOrder.Status.READY_FOR_PICKUP,
        MedicineOrder.Status.DISPATCHED,
        MedicineOrder.Status.DELIVERING,
        MedicineOrder.Status.DELIVERY_FAILED,
        MedicineOrder.Status.RETURNING,
    ]

    return {
        'users': {
            'patients': User.objects.filter(role=User.Role.PATIENT).count(),
            'doctors': User.objects.filter(role=User.Role.DOCTOR).count(),
            'nurses': User.objects.filter(role=User.Role.NURSE).count(),
            'shippers': User.objects.filter(role=User.Role.SHIPPER).count(),
            'active': User.objects.filter(is_active=True).count(),
        },
        'appointments': {
            'today': Appointment.objects.filter(
                appointment_date=today
            ).count(),
            'pending': Appointment.objects.filter(
                status=Appointment.Status.PENDING
            ).count(),
            'completed': Appointment.objects.filter(
                status=Appointment.Status.COMPLETED
            ).count(),
            'missed': Appointment.objects.filter(
                status=Appointment.Status.MISSED
            ).count(),
        },
        'orders': {
            'pending': MedicineOrder.objects.filter(
                status=MedicineOrder.Status.PENDING
            ).count(),
            'active_deliveries': MedicineOrder.objects.filter(
                status__in=active_delivery_statuses
            ).count(),
            'failed_deliveries': MedicineOrder.objects.filter(
                status=MedicineOrder.Status.DELIVERY_FAILED
            ).count(),
            'delivered': MedicineOrder.objects.filter(
                status=MedicineOrder.Status.DELIVERED
            ).count(),
        },
        'revenue': {
            'medicine': money(medicine_revenue),
            'appointments': money(appointment_revenue),
            'total': money(
                (medicine_revenue or Decimal('0.00'))
                + (appointment_revenue or Decimal('0.00'))
            ),
        },
    }


def revenue_series(days=30):
    end_date = timezone.localdate()
    start_date = end_date - timezone.timedelta(days=days - 1)

    rows = (
        Payment.objects
        .filter(
            status=Payment.Status.SUCCESS,
            created_at__date__range=[start_date, end_date],
        )
        .annotate(day=TruncDate('created_at'))
        .values('day', 'reference_type')
        .annotate(total=Sum('amount'))
        .order_by('day')
    )

    by_day = {}
    current = start_date
    while current <= end_date:
        by_day[str(current)] = {
            'date': str(current),
            'appointment': Decimal('0.00'),
            'medicine_order': Decimal('0.00'),
        }
        current += timezone.timedelta(days=1)

    for row in rows:
        key = str(row['day'])
        if key in by_day:
            by_day[key][row['reference_type']] = (
                row['total'] or Decimal('0.00')
            )

    return [
        {
            'date': item['date'],
            'appointment': money(item['appointment']),
            'medicine_order': money(item['medicine_order']),
            'total': money(
                item['appointment'] + item['medicine_order']
            ),
        }
        for item in by_day.values()
    ]


def distributions():
    return {
        'appointments': list(
            Appointment.objects.values('status')
            .annotate(count=Count('appointment_id'))
            .order_by('status')
        ),
        'orders': list(
            MedicineOrder.objects.values('status')
            .annotate(count=Count('medicine_order_id'))
            .order_by('status')
        ),
        'payment_methods': list(
            Payment.objects.values('method')
            .annotate(count=Count('payment_id'))
            .order_by('method')
        ),
    }
