import api from './api'

const get = async (url, params = {}) =>
  (await api.get(url, { params })).data

const post = async (url, payload = {}) =>
  (await api.post(url, payload)).data

const patch = async (url, payload = {}) =>
  (await api.patch(url, payload)).data

const remove = async url =>
  (await api.delete(url)).data

export const getAdminDashboardSummary = () =>
  get('/api/admin-portal/dashboard/summary/')

export const getAdminRevenue = (days = 30) =>
  get('/api/admin-portal/dashboard/revenue/', { days })

export const getAdminDistributions = () =>
  get('/api/admin-portal/dashboard/distributions/')

export const getAdminUsers = params =>
  get('/api/admin-portal/users/', params)

export const createAdminUser = payload =>
  post('/api/admin-portal/users/', payload)

export const updateAdminUser = (id, payload) =>
  patch(`/api/admin-portal/users/${id}/`, payload)

export const setAdminUserActive = (id, isActive) =>
  post(`/api/admin-portal/users/${id}/activation/`, {
    is_active: isActive,
  })

export const getAdminDoctors = params =>
  get('/api/admin-portal/doctors/', params)

export const createAdminDoctor = payload =>
  post('/api/admin-portal/doctors/', payload)

export const updateAdminDoctor = (id, payload) =>
  patch(`/api/admin-portal/doctors/${id}/`, payload)

export const getDoctorSchedules = id =>
  get(`/api/admin-portal/doctors/${id}/schedules/`)

export const createDoctorSchedule = (id, payload) =>
  post(`/api/admin-portal/doctors/${id}/schedules/`, payload)

export const updateDoctorSchedule = (doctorId, scheduleId, payload) =>
  patch(
    `/api/admin-portal/doctors/${doctorId}/schedules/${scheduleId}/`,
    payload
  )

export const deleteDoctorSchedule = (doctorId, scheduleId) =>
  remove(
    `/api/admin-portal/doctors/${doctorId}/schedules/${scheduleId}/`
  )

export const getAdminMedicines = params =>
  get('/api/admin-portal/medicines/', params)

export const createAdminMedicine = payload =>
  post('/api/admin-portal/medicines/', payload)

export const updateAdminMedicine = (id, payload) =>
  patch(`/api/admin-portal/medicines/${id}/`, payload)

export const getMedicineCategories = () =>
  get('/api/admin-portal/medicine-categories/')

export const createMedicineCategory = payload =>
  post('/api/admin-portal/medicine-categories/', payload)

export const getMedicineManufacturers = () =>
  get('/api/admin-portal/medicine-manufacturers/')

export const createMedicineManufacturer = payload =>
  post('/api/admin-portal/medicine-manufacturers/', payload)

export const getAdminAppointments = params =>
  get('/api/admin-portal/appointments/', params)

export const cancelAdminAppointment = id =>
  post(`/api/admin-portal/appointments/${id}/cancel/`)

export const getAdminPrescriptions = params =>
  get('/api/admin-portal/prescriptions/', params)

export const getAdminOrders = params =>
  get('/api/admin-portal/orders/', params)

export const cancelAdminOrder = id =>
  post(`/api/admin-portal/orders/${id}/cancel/`)

export const releaseOrderShipper = id =>
  post(`/api/admin-portal/orders/${id}/release-shipper/`)

export const assignOrderShipper = (id, shipperId) =>
  post(`/api/admin-portal/orders/${id}/assign-shipper/`, {
    shipper_id: shipperId,
  })

export const getAdminPayments = params =>
  get('/api/admin-portal/payments/', params)

export const getAdminNotifications = params =>
  get('/api/admin-portal/notifications/', params)

export const retryAdminNotification = id =>
  post(`/api/admin-portal/notifications/${id}/retry/`)
