from django.contrib import admin
from .models import MedicineOrder, MedicineOrderItem


class MedicineOrderItemInline(admin.TabularInline):
    model   = MedicineOrderItem
    extra   = 0


@admin.register(MedicineOrder)
class MedicineOrderAdmin(admin.ModelAdmin):
    list_display    = ('medicine_order_id', 'patient', 'status', 'total_amount', 'created_at')
    list_filter     = ('status',)
    search_fields   = ('patient__full_name',)
    inlines         = [MedicineOrderItemInline]