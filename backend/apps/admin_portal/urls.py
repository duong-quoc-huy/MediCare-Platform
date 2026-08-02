from django.urls import path

from .views import (
    AdminAppointmentCancelView,
    AdminAppointmentDetailView,
    AdminAppointmentListView,
    AdminAuditLogListView,
    AdminDashboardDistributionView,
    AdminDashboardRevenueView,
    AdminDashboardSummaryView,
    AdminDoctorDetailView,
    AdminDoctorListCreateView,
    AdminDoctorScheduleDetailView,
    AdminDoctorScheduleListCreateView,
    AdminMedicineCategoryDetailView,
    AdminMedicineCategoryListCreateView,
    AdminMedicineDetailView,
    AdminMedicineListCreateView,
    AdminMedicineManufacturerDetailView,
    AdminMedicineManufacturerListCreateView,
    AdminNotificationListView,
    AdminNotificationRetryView,
    AdminOrderAssignShipperView,
    AdminOrderCancelView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderReleaseShipperView,
    AdminPaymentDetailView,
    AdminPaymentListView,
    AdminPrescriptionDetailView,
    AdminPrescriptionListView,
    AdminUserActivationView,
    AdminUserDetailView,
    AdminUserListCreateView,
    AdminVitalsDetailView,
)


urlpatterns = [
    path('dashboard/summary/', AdminDashboardSummaryView.as_view()),
    path('dashboard/revenue/', AdminDashboardRevenueView.as_view()),
    path('dashboard/distributions/', AdminDashboardDistributionView.as_view()),

    path('users/', AdminUserListCreateView.as_view()),
    path('users/<uuid:user_id>/', AdminUserDetailView.as_view()),
    path('users/<uuid:user_id>/activation/', AdminUserActivationView.as_view()),

    path('doctors/', AdminDoctorListCreateView.as_view()),
    path('doctors/<int:pk>/', AdminDoctorDetailView.as_view()),
    path('doctors/<int:doctor_id>/schedules/', AdminDoctorScheduleListCreateView.as_view()),
    path('doctors/<int:doctor_id>/schedules/<int:pk>/', AdminDoctorScheduleDetailView.as_view()),

    path('medicines/', AdminMedicineListCreateView.as_view()),
    path('medicines/<uuid:medicine_id>/', AdminMedicineDetailView.as_view()),
    path('medicine-categories/', AdminMedicineCategoryListCreateView.as_view()),
    path('medicine-categories/<uuid:category_id>/', AdminMedicineCategoryDetailView.as_view()),
    path('medicine-manufacturers/', AdminMedicineManufacturerListCreateView.as_view()),
    path('medicine-manufacturers/<uuid:manufacturer_id>/', AdminMedicineManufacturerDetailView.as_view()),

    path('appointments/', AdminAppointmentListView.as_view()),
    path('appointments/<uuid:appointment_id>/', AdminAppointmentDetailView.as_view()),
    path('appointments/<uuid:appointment_id>/cancel/', AdminAppointmentCancelView.as_view()),

    path('prescriptions/', AdminPrescriptionListView.as_view()),
    path('prescriptions/<int:pk>/', AdminPrescriptionDetailView.as_view()),
    path('appointments/<uuid:appointment_id>/vitals/', AdminVitalsDetailView.as_view()),

    path('orders/', AdminOrderListView.as_view()),
    path('orders/<uuid:medicine_order_id>/', AdminOrderDetailView.as_view()),
    path('orders/<uuid:medicine_order_id>/cancel/', AdminOrderCancelView.as_view()),
    path('orders/<uuid:medicine_order_id>/release-shipper/', AdminOrderReleaseShipperView.as_view()),
    path('orders/<uuid:medicine_order_id>/assign-shipper/', AdminOrderAssignShipperView.as_view()),

    path('payments/', AdminPaymentListView.as_view()),
    path('payments/<uuid:payment_id>/', AdminPaymentDetailView.as_view()),

    path('notifications/', AdminNotificationListView.as_view()),
    path('notifications/<uuid:notification_id>/retry/', AdminNotificationRetryView.as_view()),

    path('audit-logs/', AdminAuditLogListView.as_view()),
]
