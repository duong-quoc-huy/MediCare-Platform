from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display    = ('payment_id', 'reference_type', 'reference_id', 'method', 'amount', 'status', 'created_at')
    list_filter     = ('method', 'status', 'reference_type')