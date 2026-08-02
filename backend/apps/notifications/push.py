from dataclasses import dataclass

from django.conf import settings
from firebase_admin import exceptions, messaging

from .firebase import get_firebase_app
from .models import FirebaseDevice


@dataclass(frozen=True)
class PushResult:
	success_count: int
	failure_count: int
	message_ids: list[str]
	errors: list[str]


class FirebasePushBackend:
	def send_to_user(
		self,
		*,
		user,
		title,
		message,
		data=None,
	):
		get_firebase_app()

		devices = list(
			FirebaseDevice.objects.filter(
				user=user,
				is_active=True,
			)
		)

		if not devices:
			return PushResult(
				success_count=0,
				failure_count=0,
				message_ids=[],
				errors=[],
			)

		message_ids = []
		errors = []

		# Firebase requires every data-payload value to be a string.
		string_data = {
			str(key): str(value)
			for key, value in (data or {}).items()
		}

		# Data-only message:
		# - Active tab: React onMessage() shows the foreground banner.
		# - Background tab: the service worker shows one system notification.
		#
		# This avoids duplicate Windows notifications caused by combining
		# a notification payload with service-worker showNotification().
		message_data = {
			**string_data,
			'title': str(title),
			'body': str(message),
		}

		for device in devices:
			firebase_message = messaging.Message(
				data=message_data,
				token=device.registration_token,
			)

			try:
				message_id = messaging.send(
					firebase_message
				)

				message_ids.append(message_id)

			except messaging.UnregisteredError:
				device.is_active = False
				device.save(
					update_fields=[
						'is_active',
						'updated_at',
					]
				)

				errors.append(
					'Firebase registration token '
					'is no longer valid.'
				)

			except (
				exceptions.FirebaseError,
				ValueError,
			) as exc:
				errors.append(str(exc))

		return PushResult(
			success_count=len(message_ids),
			failure_count=len(errors),
			message_ids=message_ids,
			errors=errors,
		)


def get_push_backend():
	backend_name = str(
		getattr(
			settings,
			'PUSH_NOTIFICATION_BACKEND',
			'firebase',
		)
	).lower()

	if backend_name == 'firebase':
		return FirebasePushBackend()

	raise ValueError(
		f'Unsupported push backend: '
		f'{backend_name}'
	)