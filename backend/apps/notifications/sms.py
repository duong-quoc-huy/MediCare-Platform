import base64
import uuid
from dataclasses import dataclass

import requests
from django.conf import settings


@dataclass(frozen=True)
class SMSResult:
	success: bool
	provider_message_id: str = ''
	error_message: str = ''


class MockSMSBackend:
	def send(self, *, phone_number, message):
		message_id = f'MOCK-SMS-{uuid.uuid4()}'

		print('')
		print('================ MOCK SMS ================')
		print(f'To: {phone_number}')
		print(f'Message: {message}')
		print(f'Message ID: {message_id}')
		print('==========================================')
		print('')

		return SMSResult(
			success=True,
			provider_message_id=message_id,
		)


class SpeedSMSBackend:
	API_URL = (
		'https://api.speedsms.vn/'
		'index.php/sms/send'
	)

	def __init__(self):
		self.access_token = (
			settings.SPEEDSMS_ACCESS_TOKEN
		)

		self.sms_type = (
			settings.SPEEDSMS_SMS_TYPE
		)

		self.sender = (
			settings.SPEEDSMS_SENDER
		)

		self.timeout = (
			settings.SPEEDSMS_REQUEST_TIMEOUT
		)

		if not self.access_token:
			raise ValueError(
				'SPEEDSMS_ACCESS_TOKEN is not configured.'
			)

		if self.sms_type not in {2, 3, 4, 5}:
			raise ValueError(
				'SPEEDSMS_SMS_TYPE must be 2, 3, 4, or 5.'
			)

		if self.sms_type in {3, 5} and not self.sender:
			raise ValueError(
				'SPEEDSMS_SENDER is required for '
				'SMS types 3 and 5.'
			)

	@staticmethod
	def normalize_phone(phone_number):
		phone = ''.join(
			character
			for character in str(phone_number)
			if character.isdigit()
		)

		if phone.startswith('84'):
			return phone

		if phone.startswith('0'):
			return f'84{phone[1:]}'

		raise ValueError(
			'Vietnamese phone number must '
			'start with 0 or 84.'
		)

	def send(self, *, phone_number, message):
		normalized_phone = (
			self.normalize_phone(
				phone_number
			)
		)

		credentials = base64.b64encode(
			f'{self.access_token}:x'.encode(
				'utf-8'
			)
		).decode('utf-8')

		payload = {
			'to': [
				normalized_phone,
			],
			'content': message,
			'sms_type': self.sms_type,
			'sender': self.sender,
		}

		if self.sender:
			payload['sender'] = self.sender

		try:
			response = requests.post(
				self.API_URL,
				json=payload,
				headers={
					'Authorization': (
						f'Basic {credentials}'
					),
					'Content-Type': (
						'application/json'
					),
					'Accept': 'application/json',
				},
				timeout=self.timeout,
			)
			print('SpeedSMS HTTP status:', response.status_code)
			print('SpeedSMS raw response:', response.text)
		except requests.RequestException as exc:
			return SMSResult(
				success=False,
				error_message=(
					'Could not connect to '
					f'SpeedSMS: {exc}'
				),
			)

		try:
			response_data = response.json()
		except ValueError:
			return SMSResult(
				success=False,
				error_message=(
					'SpeedSMS returned '
					'invalid JSON.'
				),
			)

		if not response.ok:
			return SMSResult(
				success=False,
				error_message=(
					response_data.get('message')
					or response_data.get('error')
					or (
						f'SpeedSMS HTTP '
						f'{response.status_code}'
					)
				),
			)

		if (
			response_data.get('status')
			!= 'success'
		):
			return SMSResult(
				success=False,
				error_message=(
					response_data.get('message')
					or (
						'SpeedSMS rejected '
						'the message.'
					)
				),
			)

		result_data = (
			response_data.get('data')
			or {}
		)

		transaction_id = (
			result_data.get('tranId')
			or result_data.get('transaction_id')
			or response_data.get('tranId')
			or ''
		)

		return SMSResult(
			success=True,
			provider_message_id=str(
				transaction_id
			),
		)



def get_sms_backend():
	backend_name = str(
		getattr(
			settings,
			'SMS_BACKEND',
			'mock',
		)
	).lower()

	if backend_name == 'mock':
		return MockSMSBackend()

	if backend_name == 'speedsms':
		return SpeedSMSBackend()

	raise ValueError(
		f'Unsupported SMS backend: '
		f'{backend_name}'
	)