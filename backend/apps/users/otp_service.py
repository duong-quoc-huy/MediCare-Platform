from django.core.mail import send_mail
from django.conf import settings
from .models import OTP
from .utils import generate_otp_code

def send_otp(user, purpose, new_email=None):
	OTP.objects.filter(
		user=user,
		purpose=purpose,
		is_used=False
	).update(is_used=True)

	# Generate new OTP
	code = generate_otp_code()
	otp  = OTP.objects.create(
		user      = user,
		code      = code,
		purpose   = purpose,
		new_email = new_email or '',
	)

	# Determine recipient email
	recipient = new_email if new_email else user.email

	# Email subject and message per purpose
	subjects = {
		'register':        'MediCare — Verify your account',
		'change_email':    'MediCare — Verify your new email',
		'change_password': 'MediCare — Verify password change',
	}

	message = f"""
Hello {user.full_name},

Your MediCare verification code is:

	{code}

This code expires in 5 minutes.
Do not share this code with anyone.

If you did not request this, please ignore this email.

— MediCare Team
	"""

	send_mail(
		subject      = subjects.get(purpose, 'MediCare — Verification Code'),
		message      = message,
		from_email   = settings.DEFAULT_FROM_EMAIL,
		recipient_list = [recipient],
		fail_silently  = False,
	)

	return otp


def verify_otp(user, code, purpose):
	try:
		otp = OTP.objects.filter(
			user    = user,
			code    = code,
			purpose = purpose,
			is_used = False,
		).latest('created_at')

	except OTP.DoesNotExist:
		return False, 'Invalid or expired OTP.'

	if otp.is_expired:
		return False, 'OTP has expired. Please request a new one.'

	# Mark as used
	otp.is_used = True

	otp.save()

	return True, otp