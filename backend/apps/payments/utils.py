import hashlib
import hmac
import time
from decimal import Decimal
from urllib.parse import quote_plus
import requests
from django.conf import settings


class VNPay:
	def __init__(self):
		self.vnp_TmnCode = settings.VNPAY_TMN_CODE
		self.vnp_HashSecret = settings.VNPAY_HASH_SECRET
		self.vnp_PayUrl = settings.VNPAY_PAYMENT_URL
		self.vnp_ReturnUrl = settings.VNPAY_RETURN_URL

	def build_payment_url(self, payment_id, amount, order_info, ip_addr):
		params = {
			'vnp_Version': '2.1.0',
			'vnp_Command': 'pay',
			'vnp_TmnCode': self.vnp_TmnCode,
			'vnp_Amount': int(Decimal(amount) * 100),
			'vnp_CurrCode': 'VND',
			'vnp_TxnRef': str(payment_id),
			'vnp_OrderInfo': order_info,
			'vnp_OrderType': 'billpayment',
			'vnp_Locale': 'vn',
			'vnp_ReturnUrl': self.vnp_ReturnUrl,
			'vnp_IpAddr': ip_addr,
			'vnp_CreateDate': time.strftime('%Y%m%d%H%M%S'),
		}

		sorted_params = sorted(params.items())

		hash_data = '&'.join(
			f'{key}={quote_plus(str(value))}'
			for key, value in sorted_params
		)

		secure_hash = hmac.new(
			self.vnp_HashSecret.encode('utf-8'),
			hash_data.encode('utf-8'),
			hashlib.sha512
		).hexdigest()

		query = '&'.join(
			f'{key}={quote_plus(str(value))}'
			for key, value in sorted_params
		)

		return f'{self.vnp_PayUrl}?{query}&vnp_SecureHash={secure_hash}'

	def validate_return(self, data):
		vnp_secure_hash = data.get('vnp_SecureHash')

		if not vnp_secure_hash:
			return False

		filtered_data = {
			key: value
			for key, value in data.items()
			if key not in ('vnp_SecureHash', 'vnp_SecureHashType')
		}

		sorted_data = sorted(filtered_data.items())

		hash_data = '&'.join(
			f'{key}={quote_plus(str(value))}'
			for key, value in sorted_data
		)

		signed = hmac.new(
			self.vnp_HashSecret.encode('utf-8'),
			hash_data.encode('utf-8'),
			hashlib.sha512
		).hexdigest()

		return signed == vnp_secure_hash

import requests


class PayPalClient:
	def __init__(self):
		self.client_id = settings.PAYPAL_CLIENT_ID
		self.client_secret = settings.PAYPAL_CLIENT_SECRET
		self.base_url = settings.PAYPAL_BASE_URL
		self.access_token = None

	def get_access_token(self):
		url = f'{self.base_url}/v1/oauth2/token'

		headers = {
			'Accept': 'application/json',
			'Accept-Language': 'en_US',
		}

		data = {
			'grant_type': 'client_credentials',
		}

		response = requests.post(
			url,
			headers=headers,
			data=data,
			auth=(self.client_id, self.client_secret),
			timeout=20,
		)

		if response.status_code != 200:
			raise Exception(f'Failed to get PayPal access token: {response.text}')

		self.access_token = response.json()['access_token']
		return self.access_token

	def create_order(self, amount, currency, reference_id, return_url, cancel_url):
		if not self.access_token:
			self.get_access_token()

		url = f'{self.base_url}/v2/checkout/orders'

		headers = {
			'Content-Type': 'application/json',
			'Authorization': f'Bearer {self.access_token}',
		}

		payload = {
			'intent': 'CAPTURE',
			'purchase_units': [
				{
					'reference_id': str(reference_id),
					'description': f'MediCare order {reference_id}',
					'amount': {
						'currency_code': currency,
						'value': f'{amount:.2f}',
					},
				}
			],
			'application_context': {
				'return_url': return_url,
				'cancel_url': cancel_url,
				'brand_name': 'MediCare',
				'landing_page': 'BILLING',
				'user_action': 'PAY_NOW',
			},
		}

		response = requests.post(
			url,
			json=payload,
			headers=headers,
			timeout=20,
		)

		if response.status_code != 201:
			raise Exception(f'Failed to create PayPal order: {response.text}')

		return response.json()

	def capture_order(self, paypal_order_id):
		if not self.access_token:
			self.get_access_token()

		url = f'{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture'

		headers = {
			'Content-Type': 'application/json',
			'Authorization': f'Bearer {self.access_token}',
		}

		response = requests.post(
			url,
			headers=headers,
			timeout=20,
		)

		if response.status_code not in (200, 201):
			raise Exception(f'Failed to capture PayPal order: {response.text}')

		return response.json()