from django.conf import settings

from apps.orders.models import MedicineOrder


def build_ghtk_order_payload(order: MedicineOrder):
	from apps.payments.models import Payment
	products = []

	for item in order.items.select_related('medicine').all():
		medicine = item.medicine

		if not medicine.shipping_weight_grams:
			raise ValueError(
				f'Shipping weight has not been configured for '
				f'{medicine.medicine_name}.'
			)

		products.append(
			{
				'name': medicine.medicine_name,

				# GHTK product weight is documented in kilograms.
				'weight': (
					medicine.shipping_weight_grams
					/ 1000
				),

				'quantity': item.quantity,

				'product_code': str(
					medicine.medicine_id
				),

				'price': int(item.unit_price),
			}
		)

	cash_payment = (
		Payment.objects
			.filter(
				reference_id=(
					order.medicine_order_id
				),
				reference_type=(
					Payment.ReferenceType
					.MEDICINE_ORDER
				),
				method=Payment.Method.CASH,
				status=Payment.Status.PENDING,
			)
			.first()
	)

	is_cash_on_delivery = (
		cash_payment is not None
	)

	pick_money = (
		int(order.total_amount)
		if is_cash_on_delivery
		else 0
	)

	order_data = {
		# MediCare's own order ID
		'id': str(order.medicine_order_id),


		# Pharmacy pickup information
		'pick_name': settings.GHTK_PICK_NAME,
		'pick_address': settings.GHTK_PICK_ADDRESS,
		'pick_province': settings.GHTK_PICK_PROVINCE,
		'pick_ward': settings.GHTK_PICK_WARD,
		'pick_tel': settings.GHTK_PICK_PHONE,


		# Patient delivery information
		'name': order.delivery_recipient_name,
		'tel': order.delivery_phone,
		'address': order.delivery_street_address,
		'province': order.delivery_province_name,
		'ward': order.delivery_ward_name,
		'street': order.delivery_street_address,

		# Fully prepaid order: GHTK collects no cash.
		'pick_money': pick_money,

		# Patient does not pay the GHTK courier directly.
		'is_freeship': 1,

		# Declared medicine value for insurance purposes.
		'value': int(order.medicine_subtotal),

		'transport': 'road',

		# GHTK pickup method. This does not mean that
		# the recipient pays cash.
		'pick_option': 'cod',

		'total_weight': (
			order.package_weight_grams / 1000
		),

		'total_box': 1,

		'use_return_address': 0,
	}

	if order.delivery_notes:
		order_data['note'] = (
			order.delivery_notes[:120]
		)

	return {
		'products': products,
		'order': order_data,
	}