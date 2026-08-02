from dataclasses import dataclass
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.orders.models import MedicineOrder

from apps.notifications.models import Notification
from apps.notifications.services import notify_order_event

from .statuses import GHTK_INFORMATIONAL_STATUS_IDS, get_ghtk_status_mapping



@dataclass(frozen=True)
class GHTKStatusUpdateResult:
	order: MedicineOrder
	changed: bool
	previous_status: str
	current_status: str
	status_id: int
	informational: bool


def parse_ghtk_action_time(value):
	if not value:
		return timezone.now()

	parsed_value = parse_datetime(str(value))

	if parsed_value is None:
		return timezone.now()

	if timezone.is_naive(parsed_value):
		parsed_value = timezone.make_aware(
			parsed_value,
			timezone.get_current_timezone(),
		)

	return parsed_value


def apply_ghtk_status_update(
	*,
	order,
	status_id,
	label_id='',
	action_time=None,
	reason_code='',
	reason='',
):
	try:
		normalized_status_id = int(status_id)
	except (TypeError, ValueError) as exc:
		raise ValueError(
			'GHTK status_id must be an integer.'
		) from exc

	event_time = parse_ghtk_action_time(
		action_time
	)

	mapping = get_ghtk_status_mapping(
		normalized_status_id
	)

	informational = (
		normalized_status_id
		in GHTK_INFORMATIONAL_STATUS_IDS
	)

	with transaction.atomic():
		locked_order = (
			MedicineOrder.objects
			.select_for_update()
			.get(
				medicine_order_id=(
					order.medicine_order_id
				)
			)
		)

		previous_status = locked_order.status

		# Ignore an old or duplicate webhook event.
		if (
			locked_order.ghtk_last_synced_at
			and event_time
			<= locked_order.ghtk_last_synced_at
			and str(locked_order.ghtk_status)
			== str(normalized_status_id)
		):
			return GHTKStatusUpdateResult(
				order=locked_order,
				changed=False,
				previous_status=previous_status,
				current_status=locked_order.status,
				status_id=normalized_status_id,
				informational=informational,
			)

		update_fields = [
			'ghtk_status',
			'ghtk_status_text',
			'ghtk_last_synced_at',
			'updated_at',
		]

		locked_order.ghtk_status = str(
			normalized_status_id
		)

		status_text = (
			mapping.status_text
			if mapping
			else (
				f'Unknown GHTK status '
				f'{normalized_status_id}'
			)
		)

		if reason:
			status_text = (
				f'{status_text}: {reason}'
			)

		locked_order.ghtk_status_text = (
			status_text[:255]
		)

		locked_order.ghtk_last_synced_at = (
			event_time
		)

		if (
			label_id
			and not locked_order.ghtk_order_id
		):
			locked_order.ghtk_order_id = (
				label_id
			)

			update_fields.append(
				'ghtk_order_id'
			)

		internal_status = (
			mapping.internal_status
			if mapping
			else None
		)

		if (
			not informational
			and internal_status
			and locked_order.status
			!= internal_status
		):
			locked_order.status = (
				internal_status
			)

			update_fields.append(
				'status'
			)

			if (
				internal_status
				== MedicineOrder.Status.DISPATCHED
			):
				locked_order.pickup_at = (
					event_time
				)

				update_fields.append(
					'pickup_at'
				)

			elif (
				internal_status
				== MedicineOrder.Status.DELIVERING
			):
				if not locked_order.delivering_at:
					locked_order.delivering_at = (
						event_time
					)

					update_fields.append(
						'delivering_at'
					)

			elif (
				internal_status
				== MedicineOrder.Status.DELIVERED
			):
				locked_order.delivered_at = (
					event_time
				)

				update_fields.append(
					'delivered_at'
				)

			elif (
				internal_status
				== MedicineOrder.Status.DELIVERY_FAILED
			):
				locked_order.failed_at = (
					event_time
				)

				update_fields.append(
					'failed_at'
				)

			elif (
				internal_status
				== MedicineOrder.Status.RETURNING
			):
				locked_order.returning_at = (
					event_time
				)

				update_fields.append(
					'returning_at'
				)

			elif (
				internal_status
				== MedicineOrder.Status.RETURNED
			):
				locked_order.returned_at = (
					event_time
				)

				update_fields.append(
					'returned_at'
				)

			elif (
				internal_status
				== MedicineOrder.Status.CANCELLED
			):
				locked_order.cancelled_at = (
					event_time
				)

				update_fields.append(
					'cancelled_at'
				)

		locked_order.save(
			update_fields=list(
				dict.fromkeys(update_fields)
			)
		)

		status_changed = (
			previous_status
			!= locked_order.status
		)

		status_event_map = {
			MedicineOrder.Status.DISPATCHED: (
				Notification.Event.DISPATCHED
			),
			MedicineOrder.Status.DELIVERING: (
				Notification.Event.DELIVERING
			),
			MedicineOrder.Status.DELIVERED: (
				Notification.Event.DELIVERED
			),
			MedicineOrder.Status.DELIVERY_FAILED: (
				Notification.Event.DELIVERY_FAILED
			),
			MedicineOrder.Status.RETURNING: (
				Notification.Event.RETURNING
			),
			MedicineOrder.Status.RETURNED: (
				Notification.Event.RETURNED
			),
			MedicineOrder.Status.CANCELLED: (
				Notification.Event.CANCELLED
			),
		}

		event = status_event_map.get(
			locked_order.status
		)

		if status_changed and event:
			transaction.on_commit(
				lambda: notify_order_event(
					order=locked_order,
					event=event,
				)
			)

	return GHTKStatusUpdateResult(
		order=locked_order,
		changed=status_changed,
		previous_status=previous_status,
		current_status=locked_order.status,
		status_id=normalized_status_id,
		informational=informational,
	)