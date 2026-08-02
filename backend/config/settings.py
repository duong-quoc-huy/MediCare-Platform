from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    #third-party libraries
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "ckeditor",
    'rest_framework_simplejwt.token_blacklist',
    "django_extensions",

    #local apps
    "apps.users",
    "apps.doctors",
    "apps.appointments",
    "apps.medicines",
    "apps.orders",
    "apps.payments",
    "apps.shipping",
    "apps.carts",
    "apps.locations",
    "apps.medical_records",
    "apps.nurse",
    "apps.notifications",
    "apps.admin_portal",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
        'CONN_MAX_AGE': 0,
        'OPTIONS': {
            'sslmode': 'require',
            'sslrootcert': os.path.join(BASE_DIR, 'ca.pem'),
            'connect_timeout': 60,
        },
    }
}


#Auth
AUTH_USER_MODEL = 'users.User'


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),

    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

    'DEFAULT_PAGINATION_CLASS':
        'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE':10

}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'user_id',
    'USER_ID_FIELD': 'user_id',
}

# CORS — allow React frontend
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
]


#swagger
SPECTACULAR_SETTINGS = {
    'TITLE': 'MediCare API',
    'DESCRIPTION': 'Family Doctor Booking & Medicine Delivery Platform',
    'VERSION': '1.0.0',
    'COMPONENT_SPLIT_REQUEST': True,
}


#ckeditor
CKEDITOR_CONFIGS = {
    'default': {
        'toolbar': 'Custom',
        'toolbar_Custom': [
            ['Bold', 'Italic', 'Underline'],
            ['NumberedList', 'BulletedList'],
            ['Link', 'Unlink'],
            ['RemoveFormat', 'Source']
        ],
        'height': 300,
        'width': '100%',
    }
}


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Ho_Chi_Minh"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER     = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL  = os.getenv('EMAIL_HOST_USER')


# VNPAY
VNPAY_TMN_CODE = os.getenv('VNPAY_TMN_CODE', '')
VNPAY_HASH_SECRET = os.getenv('VNPAY_HASH_SECRET', '')
VNPAY_PAYMENT_URL = os.getenv('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
VNPAY_RETURN_URL = os.getenv('VNPAY_RETURN_URL', 'https://localhost:8000/api/payments/vnpay/return/')


FRONTEND_BASE_URL = 'http://localhost:5173'

FRONTEND_CART_URL = os.getenv('FRONTEND_CART_URL', 'http://localhost:5173/cart')


# PAYPAL
PAYPAL_CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET', '')
PAYPAL_BASE_URL = os.getenv('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com')

PAYPAL_RETURN_URL = os.getenv('PAYPAL_RETURN_URL', 'http://localhost:5173/paypal/return')

PAYPAL_CANCEL_URL = os.getenv('PAYPAL_CANCEL_URL', 'http://localhost:5173/cart?payment=failed&reason=paypal_cancelled')

PAYPAL_VND_TO_USD_RATE = os.getenv('PAYPAL_VND_TO_USD_RATE', '25000')
PAYPAL_MODE = os.getenv("PAYPAL_MODE")


#APPOINTMENT PAYMENT
FRONTEND_APPOINTMENT_PAYMENT_URL = os.getenv('FRONTEND_APPOINTMENT_PAYMENT_URL', 'http://localhost:5173/appointment-payment')

FRONTEND_APPOINTMENT_CONFIRMATION_URL = os.getenv('FRONTEND_APPOINTMENT_CONFIRMATION_URL', 'http://localhost:5173/booking/confirmation')
PAYPAL_APPOINTMENT_RETURN_URL = os.getenv('PAYPAL_APPOINTMENT_RETURN_URL', 'http://localhost:5173/appointment-paypal/return')



# GHTK shipping integration
GHTK_API_BASE_URL = os.getenv('GHTK_API_BASE_URL', 'https://services.giaohangtietkiem.vn')
GHTK_API_TOKEN = os.getenv('GHTK_API_TOKEN', '')
GHTK_PARTNER_CODE = os.getenv('GHTK_PARTNER_CODE','')
GHTK_REQUEST_TIMEOUT = int(os.getenv('GHTK_REQUEST_TIMEOUT', '15'))

# Set this to True while no real GHTK token is available.
GHTK_MOCK_MODE = (os.getenv('GHTK_MOCK_MODE', 'True').lower() == 'true')

# Pharmacy pickup information
GHTK_PICK_NAME = os.getenv('GHTK_PICK_NAME', 'MediCare Pharmacy')
GHTK_PICK_PHONE = os.getenv('GHTK_PICK_PHONE', '')
GHTK_PICK_ADDRESS = os.getenv('GHTK_PICK_ADDRESS','')
GHTK_PICK_WARD = os.getenv('GHTK_PICK_WARD','')
GHTK_PICK_DISTRICT = os.getenv('GHTK_PICK_DISTRICT','')
GHTK_PICK_PROVINCE = os.getenv('GHTK_PICK_PROVINCE','')
GHTK_WEBHOOK_SECRET = os.getenv('GHTK_WEBHOOK_SECRET','')

#SMS
PUSH_NOTIFICATION_BACKEND = os.getenv('PUSH_NOTIFICATION_BACKEND', 'firebase')

FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH', '')


#Information to import to PDF
HOSPITAL_NAME = 'Firefly Hospital'
HOSPITAL_NAME_VI = 'Bệnh viện Firefly'

HOSPITAL_HOTLINE = '1900 2026'
HOSPITAL_EMAIL = 'contact@fireflyhospital.vn'
HOSPITAL_ADDRESS = '123 Health Street, District 1, Ho Chi Minh City, Vietnam'
HOSPITAL_WEBSITE = 'https://medicare-firefly.duckdns.org'

HOSPITAL_LOGO_PATH = BASE_DIR / 'static' / 'images' / 'hospital-logo.png'   