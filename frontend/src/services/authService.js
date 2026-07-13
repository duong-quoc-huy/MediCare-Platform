import api from './api'

export async function registerUser(data) {
  const response = await api.post('/api/auth/register/', data)
  return response.data
}

export async function loginUser(email, password) {
  const response = await api.post('/api/auth/login/', { email, password })
  return response.data
}

export async function logoutUser(refreshToken) {
  const response = await api.post('/api/auth/logout/', { refresh: refreshToken })
  return response.data
}

export async function verifyOTP(email, code, purpose) {
    const response = await api.post('/api/auth/verify-otp/', { email, code, purpose })
    return response.data
}

export async function resendOTP(email, purpose) {
    const response = await api.post('/api/auth/resend-otp/', { email, purpose })
    return response.data
}