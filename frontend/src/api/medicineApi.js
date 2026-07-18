import api from '../services/api'

export async function getMedicines({
  page = 1,
  search = '',
  category = '',
  ordering = '',
} = {}) {
  const params = { page }

  if (search) {
    params.search = search
  }

  if (category && category !== 'All') {
    params.medicine_category = category
  }

  if (ordering) {
    params.ordering = ordering
  }

  const response = await api.get('/api/medicines/', {
    params,
  })

  return response.data
}

export async function getMedicineById(id) {
  const response = await api.get(`/api/medicines/${id}/`)
  return response.data
}

export async function getMedicineCategories() {
  const response = await api.get('/api/medicine-categories/')
  return response.data
}