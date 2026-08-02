from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings

from .exceptions import (
	GHTKConfigurationError,
	GHTKRequestError,
	GHTKResponseError,
	GHTKUnsupportedAddressError,
)


@dataclass(frozen=True)
class GHTKFeeResult:
	service_name: str
	shipping_fee: Decimal
	insurance_fee: Decimal
	delivery_supported: bool
	raw_response: dict[str, Any]

	@property
	def total_fee(self):
		return (self.shipping_fee + self.insurance_fee)

@dataclass(frozen=True)
class GHTKOrderResult:
	order_id: str
	tracking_id: str
	tracking_url: str
	status: str
	status_text: str
	raw_response: dict[str, Any]


class GHTKClient:
	def __init__(self):
		self.base_url = (settings.GHTK_API_BASE_URL.rstrip('/'))

		self.api_token = settings.GHTK_API_TOKEN
		self.partner_code = (settings.GHTK_PARTNER_CODE)

		self.timeout = (settings.GHTK_REQUEST_TIMEOUT)
		self.mock_mode = settings.GHTK_MOCK_MODE

	def _validate_configuration(self):
		if self.mock_mode:
			return

		missing_fields = []

		if not self.api_token:
			missing_fields.append('GHTK_API_TOKEN')

		if not self.partner_code:
			missing_fields.append('GHTK_PARTNER_CODE')

		if missing_fields:
			raise GHTKConfigurationError('Missing GHTK configuration: ' + ', '.join(missing_fields))

	def _headers(self):
		return {
			'Token': self.api_token,
			'X-Client-Source': (
				self.partner_code
			),
			'Accept': 'application/json',
		}

	def calculate_fee(
		self,
		*,
		destination_address,
		destination_ward,
		destination_province,
		package_weight_grams,
		order_value,
		destination_district='',
		destination_street='',
		transport='road',
	):
		self._validate_configuration()

		if not destination_ward:
			raise GHTKResponseError('Destination ward is required.')

		if not destination_province:
			raise GHTKResponseError('Destination province is required.')

		if package_weight_grams <= 0:
			raise GHTKResponseError('Package weight must be greater than zero.')

		if self.mock_mode:
			return self._calculate_mock_fee(
				destination_province=(destination_province),
				package_weight_grams=(package_weight_grams)
			)

		params = {
			'pick_address': (settings.GHTK_PICK_ADDRESS),
			'pick_ward': (settings.GHTK_PICK_WARD),
			'pick_province': (settings.GHTK_PICK_PROVINCE),

			'address': destination_address,
			'ward': destination_ward,
			'province': destination_province,

			'weight': int(package_weight_grams),
			'value': int(Decimal(order_value)),
			'transport': transport,
		}

		if settings.GHTK_PICK_DISTRICT:
			params['pick_district'] = (settings.GHTK_PICK_DISTRICT)

		if destination_district:
			params['district'] = (destination_district)

		if destination_street:
			params['street'] = (destination_street)

		url = (
			f'{self.base_url}'
			'/services/shipment/fee'
		)

		try:
			response = requests.get(
				url,
				headers=self._headers(),
				params=params,
				timeout=self.timeout,
			)
		except requests.RequestException as exc:
			raise GHTKRequestError(
				'Could not connect to GHTK.'
			) from exc

		try:
			response_data = response.json()
		except ValueError as exc:
			raise GHTKResponseError(
				'GHTK returned an invalid response.'
			) from exc

		if not response.ok:
			message = (
				response_data.get('message')
				or 'GHTK fee request failed.'
			)

			raise GHTKResponseError(
				message
			)

		if not response_data.get('success'):
			raise GHTKResponseError(
				response_data.get(
					'message',
					'GHTK could not calculate '
					'the shipping fee.',
				)
			)

		fee_data = response_data.get('fee',{},)
		delivery_supported = fee_data.get('delivery',True,)

		if not delivery_supported:
			raise GHTKUnsupportedAddressError(
				'GHTK does not currently support '
				'delivery to this address.'
			)

		return GHTKFeeResult(
			service_name=fee_data.get(
				'name',
				'',
			),
			shipping_fee=Decimal(
				str(
					fee_data.get(
						'fee',
						0,
					)
				)
			),
			insurance_fee=Decimal(
				str(
					fee_data.get(
						'insurance_fee',
						0,
					)
				)
			),
			delivery_supported=(
				delivery_supported
			),
			raw_response=response_data,
		)

	def _calculate_mock_fee(
		self,
		*,
		destination_province,
		package_weight_grams,
	):
		normalized_province = (
			destination_province
			.strip()
			.lower()
		)

		same_city_names = {
			'hồ chí minh',
			'thành phố hồ chí minh',
			'tp. hồ chí minh',
			'tp hồ chí minh',
			'ho chi minh',
		}

		if normalized_province in same_city_names:
			base_fee = Decimal('22000.00')
			service_name = 'mock_local'
		else:
			base_fee = Decimal('35000.00')
			service_name = 'mock_interprovince'

		extra_weight = max(
			package_weight_grams - 500,
			0,
		)

		extra_blocks = (
			extra_weight + 499
		) // 500

		weight_surcharge = (
			Decimal(extra_blocks)
			* Decimal('5000.00')
		)

		final_fee = (
			base_fee +
			weight_surcharge
		)

		mock_response = {
			'success': True,
			'mock': True,
			'fee': {
				'name': service_name,
				'fee': int(final_fee),
				'insurance_fee': 0,
				'delivery': True,
			},
		}

		return GHTKFeeResult(
			service_name=service_name,
			shipping_fee=final_fee,
			insurance_fee=Decimal('0.00'),
			delivery_supported=True,
			raw_response=mock_response,
		)

	def create_order(self, *, payload):
		self._validate_configuration()

		if self.mock_mode:
			return self._create_mock_order(payload=payload)

		url = (
			f'{self.base_url}'
			'/services/shipment/order/'
		)

		try:
			response = requests.post(
				url,
				params={
					'ver': '1.5',
				},
				headers={
					**self._headers(),
					'Content-Type': 'application/json',
				},
				json=payload,
				timeout=self.timeout,
			)
		except requests.RequestException as exc:
			raise GHTKRequestError(
				'Could not connect to GHTK while '
				'creating the shipment.'
			) from exc

		try:
			response_data = response.json()
		except ValueError as exc:
			raise GHTKResponseError(
				'GHTK returned an invalid order response.'
			) from exc

		if not response.ok:
			message = (
				response_data.get('message')
				or response_data.get('error')
				or 'GHTK order creation failed.'
			)

			raise GHTKResponseError(message)

		if response_data.get('success') is False:
			raise GHTKResponseError(
				response_data.get(
					'message',
					'GHTK rejected the shipment.',
				)
			)

		order_data = response_data.get('order') or {}

		tracking_id = (
			order_data.get('label')
			or order_data.get('tracking_id')
			or order_data.get('id')
			or ''
		)

		if not tracking_id:
			raise GHTKResponseError(
				'GHTK accepted the request but did not '
				'return a tracking identifier.'
			)

		tracking_url = (
			order_data.get('tracking_url')
			or ''
		)

		return GHTKOrderResult(
			order_id=str(
				order_data.get('partner_id')
				or payload['order']['id']
			),
			tracking_id=str(tracking_id),
			tracking_url=str(tracking_url),
			status=str(
				order_data.get('status')
				or 'ready_for_pickup'
			),
			status_text=str(
				order_data.get('status_text')
				or 'Shipment created successfully.'
			),
			raw_response=response_data,
		)

	def _create_mock_order(self, *, payload):
		partner_order_id = str(
			payload['order']['id']
		)

		short_id = (
			partner_order_id
			.replace('-', '')
			[:12]
			.upper()
		)

		tracking_id = (
			f'MOCK.GHTK.{short_id}'
		)

		tracking_url = (
			'https://tracking.ghtk.vn/'
			f'?code={tracking_id}'
		)

		mock_response = {
			'success': True,
			'mock': True,
			'order': {
				'partner_id': partner_order_id,
				'label': tracking_id,
				'tracking_id': tracking_id,
				'tracking_url': tracking_url,
				'status': 'ready_for_pickup',
				'status_text': (
					'Mock shipment created successfully.'
				),
			},
		}

		return GHTKOrderResult(
			order_id=partner_order_id,
			tracking_id=tracking_id,
			tracking_url=tracking_url,
			status='ready_for_pickup',
			status_text=(
				'Mock shipment created successfully.'
			),
			raw_response=mock_response,
		)