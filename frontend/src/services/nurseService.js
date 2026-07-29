import api from './api' 
 
export async function getNursePharmacyQueue(params = {}) { 
  const response = await api.get('/api/nurse/pharmacy/', { params }) 
  return response.data 
} 
 
export async function getNursePharmacyPrescription(prescriptionId) { 
  const response = await api.get(`/api/nurse/pharmacy/${prescriptionId}/`) 
  return response.data 
} 
 
export async function confirmNursePharmacyPayment(prescriptionId, payload) { 
  const response = await api.post(`/api/nurse/pharmacy/${prescriptionId}/confirm/`, payload) 
  return response.data 
} 