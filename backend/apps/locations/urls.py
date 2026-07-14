from django.urls import path
from .views import ProvinceListView, WardListView

urlpatterns = [
    path('provinces/', ProvinceListView.as_view(), name='province-list'),
    path('wards/',     WardListView.as_view(),     name='ward-list'),
]