from pathlib import Path

import firebase_admin
from django.conf import settings
from firebase_admin import credentials, messaging


def get_firebase_app():
	try:
		return firebase_admin.get_app()
	except ValueError:
		pass

	credentials_path = (
		settings.FIREBASE_CREDENTIALS_PATH
	)

	if not credentials_path:
		raise ValueError(
			'FIREBASE_CREDENTIALS_PATH '
			'is not configured.'
		)

	path = Path(credentials_path)

	if not path.is_absolute():
		path = settings.BASE_DIR / path

	if not path.exists():
		raise FileNotFoundError(
			f'Firebase credentials file '
			f'was not found: {path}'
		)

	firebase_credentials = (
		credentials.Certificate(str(path))
	)

	return firebase_admin.initialize_app(
		firebase_credentials
	)


def get_firebase_messaging():
	app = get_firebase_app()
	return messaging, app