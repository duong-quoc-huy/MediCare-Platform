import api from './api'

export async function getMedicineReviews(medicineId) {
  const response = await api.get(`/api/medicines/${medicineId}/reviews/`)
  return response.data
}

export async function createMedicineReview(medicineId, reviewData) {
  const response = await api.post(
    `/api/medicines/${medicineId}/reviews/`,
    reviewData
  )
  return response.data
}

export async function updateMedicineReview(reviewId, reviewData) {
  const response = await api.patch(
    `/api/medicine-reviews/${reviewId}/`,
    reviewData
  )
  return response.data
}

export async function deleteMedicineReview(reviewId) {
  const response = await api.delete(`/api/medicine-reviews/${reviewId}/`)
  return response.data
}