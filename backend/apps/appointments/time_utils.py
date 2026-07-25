from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime


def get_current_time():
    fake_now = getattr(settings, 'DEV_FAKE_NOW', None)

    if settings.DEBUG and fake_now:
        parsed = parse_datetime(fake_now)

        if parsed is None:
            return timezone.localtime()

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(
                parsed,
                timezone.get_current_timezone()
            )

        return timezone.localtime(parsed)

    return timezone.localtime()