from django.contrib import admin

from .models import (
	MedicineOrder,
	MedicineOrderItem,
)


class MedicineOrderItemInline(admin.TabularInline):
	model = MedicineOrderItem
	extra = 0
	readonly_fields = (
		'medicine_order_item_id',
		'sub_total',
	)


@admin.register(MedicineOrder)
class MedicineOrderAdmin(admin.ModelAdmin):
	list_display = (
		'short_order_id',
		'patient',
		'status',
		'medicine_subtotal',
		'shipping_fee',
		'shipping_discount',
		'total_amount',
		'ghtk_order_id',
		'created_at',
	)

	list_filter = (
		'status',
		'created_at',
	)

	search_fields = (
		'medicine_order_id',
		'patient__full_name',
		'patient__phone_number_1',
		'delivery_recipient_name',
		'delivery_phone',
		'ghtk_order_id',
	)

	readonly_fields = (
		'medicine_order_id',
		'created_at',
		'updated_at',
		'final_shipping_fee',
	)

	fieldsets = (
		(
			'Order',
			{
				'fields': (
					'medicine_order_id',
					'patient',
					'status',
				)
			},
		),
		(
			'Financial information',
			{
				'fields': (
					'medicine_subtotal',
					'shipping_fee',
					'shipping_discount',
					'final_shipping_fee',
					'total_amount',
				)
			},
		),
		(
			'Delivery information',
			{
				'fields': (
					'source_address',
					'delivery_recipient_name',
					'delivery_phone',
					'delivery_phone_2',
					'delivery_address',
					'delivery_street_address',
					'delivery_ward_code',
					'delivery_ward_name',
					'delivery_province_code',
					'delivery_province_name',
					'delivery_postal_code',
					'delivery_notes',
					'package_weight_grams',
				)
			},
		),
		(
			'GHTK',
			{
				'fields': (
					'ghtk_order_id',
					'ghtk_tracking_url',
					'ghtk_status',
					'ghtk_status_text',
					'ghtk_last_synced_at',
				)
			},
		),
		(
			'Timeline',
			{
				'fields': (
					'confirmed_at',
					'preparing_at',
					'ready_at',
					'pickup_at',
					'delivering_at',
					'delivered_at',
					'failed_at',
					'returning_at',
					'returned_at',
					'cancelled_at',
					'created_at',
					'updated_at',
				)
			},
		),
	)

	inlines = [MedicineOrderItemInline]

	def short_order_id(self, obj):
		return str(obj.medicine_order_id)[:8]

	short_order_id.short_description = 'Order ID'


@admin.register(MedicineOrderItem)
class MedicineOrderItemAdmin(admin.ModelAdmin):
	list_display = (
		'medicine_order_item_id',
		'order',
		'medicine',
		'quantity',
		'unit_price',
		'sub_total',
	)

	search_fields = (
		'order__medicine_order_id',
		'medicine__medicine_name',
	)