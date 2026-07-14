import api from './api'


export async function getProvinces() {
  const response = await api.get('/api/locations/provinces/')
  return response.data
}


export async function getWards(provinceCode) {
  const response = await api.get('/api/locations/wards/', {
    params: { province: provinceCode }
  })
  return response.data
}