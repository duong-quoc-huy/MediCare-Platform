from django.conf import settings
from rest_framework import serializers


DEFAULT_PACKAGING_WEIGHT_GRAMS = 100


def calculate_package_weight(items_data):
	total_medicine_weight = 0

	for item_data in items_data:
		medicine = item_data['medicine']
		quantity = item_data['quantity']

		unit_weight = medicine.shipping_weight_grams

		if not unit_weight:
			raise serializers.ValidationError(
				{
					'items': (
						f'Shipping weight has not been configured for '
						f'{medicine.medicine_name}.'
					)
				}
			)

		total_medicine_weight += (
			unit_weight * quantity
		)

	packaging_weight = getattr(
		settings,
		'MEDICINE_ORDER_PACKAGING_WEIGHT_GRAMS',
		DEFAULT_PACKAGING_WEIGHT_GRAMS,
	)

	return total_medicine_weight + packaging_weight