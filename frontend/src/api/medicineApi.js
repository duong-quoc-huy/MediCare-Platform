import axiosClient from './axiosClient'

export async function getMedicines() {
  const response = await axiosClient.get('/medicines/')

  // If Django REST Framework pagination is enabled
  if (Array.isArray(response.data.results)) {
    return response.data.results
  }

  // If API returns normal array
  if (Array.isArray(response.data)) {
    return response.data
  }

  return []
}

export async function getMedicineById(id) {
  const response = await axiosClient.get(`/medicines/${id}/`)
  return response.data
}