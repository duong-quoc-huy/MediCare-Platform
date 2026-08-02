from dataclasses import dataclass
from typing import Optional

from apps.orders.models import MedicineOrder


@dataclass(frozen=True)
class GHTKStatusMapping:
	internal_status: Optional[str]
	status_text: str


GHTK_STATUS_MAP = {
	-1: GHTKStatusMapping(
		MedicineOrder.Status.CANCELLED,
		'Order cancelled',
	),

	# Shipment exists but has not been picked up.
	1: GHTKStatusMapping(
		None,
		'Not yet received by GHTK',
	),
	2: GHTKStatusMapping(
		None,
		'Accepted by GHTK',
	),
	8: GHTKStatusMapping(
		None,
		'Pickup delayed',
	),
	12: GHTKStatusMapping(
		None,
		'Courier is picking up the package',
	),

	# Package has entered the GHTK network.
	3: GHTKStatusMapping(
		MedicineOrder.Status.DISPATCHED,
		'Package picked up by GHTK',
	),

	4: GHTKStatusMapping(
		MedicineOrder.Status.DELIVERING,
		'Package is being delivered',
	),

	5: GHTKStatusMapping(
		MedicineOrder.Status.DELIVERED,
		'Package delivered',
	),
	6: GHTKStatusMapping(
		MedicineOrder.Status.DELIVERED,
		'Package delivered and reconciled',
	),

	# Pickup failure does not mean delivery failure.
	7: GHTKStatusMapping(
		None,
		'GHTK could not pick up the package',
	),

	9: GHTKStatusMapping(
		MedicineOrder.Status.DELIVERY_FAILED,
		'Delivery failed',
	),

	# Delayed delivery remains in the delivery stage.
	10: GHTKStatusMapping(
		MedicineOrder.Status.DELIVERING,
		'Delivery delayed',
	),

	20: GHTKStatusMapping(
		MedicineOrder.Status.RETURNING,
		'Package is being returned',
	),

	21: GHTKStatusMapping(
		MedicineOrder.Status.RETURNED,
		'Package returned to pharmacy',
	),

	11: GHTKStatusMapping(
		MedicineOrder.Status.RETURNED,
		'Returned package reconciled',
	),

	13: GHTKStatusMapping(
		None,
		'Order compensation processed',
	),
}


# GHTK documents these as courier informational events,
# not authoritative order states.
GHTK_INFORMATIONAL_STATUS_IDS = {
	45,
	49,
	123,
	127,
	128,
	410,
}


def get_ghtk_status_mapping(status_id):
	try:
		normalized_status_id = int(status_id)
	except (TypeError, ValueError):
		return None

	return GHTK_STATUS_MAP.get(
		normalized_status_id
	)