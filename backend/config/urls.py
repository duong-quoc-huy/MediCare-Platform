from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui",),


    #Apps
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.doctors.urls')),
    path('api/', include('apps.medicines.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/cart/', include('apps.carts.urls')),
    path('api/locations/', include('apps.locations.urls')),
    path('api/medical-records/', include('apps.medical_records.urls')),
    path('api/nurse/', include('apps.nurse.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/admin-portal/', include('apps.admin_portal.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)