import api from './api'


export async function getProfile() {
  const response = await api.get('/api/auth/profile/')
  return response.data
}


export async function updateProfile(data) {
  const response = await api.patch('/api/auth/profile/', data)
  return response.data
}


export async function requestPasswordOTP() {
  const response = await api.post('/api/auth/request-password-otp/')
  return response.data
}


export async function verifyPasswordChange(data) {
  const response = await api.post('/api/auth/verify-password-change/', data)
  return response.data
}


export async function changeEmail(data) {
  const response = await api.post('/api/auth/change-email/', data)
  return response.data
}


export async function verifyEmailChange(data) {
  const response = await api.post('/api/auth/verify-email-change/', data)
  return response.data
}