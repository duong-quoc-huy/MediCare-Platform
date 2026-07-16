import hashlib
import hmac
import time
from decimal import Decimal
from urllib.parse import quote_plus

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