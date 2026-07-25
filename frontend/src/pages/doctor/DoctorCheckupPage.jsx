import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  HeartPulse,
  MapPin,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  UserRound,
  FileText,
  Pill,
  Send,
  X,
} from 'lucide-react'

import { 
  completeAppointmentCheckup,
  getAppointmentById,
} from '../../services/appointmentService'
import {
  addAppointmentComorbidity,
  addAppointmentSymptom,
  createVitals,
  deleteAppointmentComorbidity,
  deleteAppointmentSymptom,
  getAppointmentComorbidities,
  getAppointmentSymptoms,
  getMasterComorbidities,
  getMasterSymptoms,
  getVitals,
  updateVitals,
  getPrescription,
  createPrescription,
  updatePrescription,
  sendPrescriptionToPharmacy,
  getHospitalMedicines,
} from '../../services/medicalRecordService'

import styles from './DoctorCheckupPage.module.css'
import { QRCodeCanvas } from 'qrcode.react'
import { createAppointmentFinalPaymentSession } from '../../services/paymentService'


function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

export default function DoctorCheckupPage() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    {
      key: 'overview',
      label: 'Ca khám',
      icon: CalendarDays,
    },
    {
      key: 'vitals',
      label: 'Sinh hiệu',
      icon: HeartPulse,
    },
    {
      key: 'symptoms',
      label: 'Triệu chứng',
      icon: Stethoscope,
    },
    {
      key: 'comorbidities',
      label: 'Bệnh nền',
      icon: HeartPulse,
    },
    {
      key: 'prescription',
      label: 'Đơn thuốc',
      icon: FileText,
    },
    {
      key: 'review',
      label: 'Xác nhận',
      icon: Send,
    },
  ]

  const [vitalsExists, setVitalsExists] = useState(false)
  const [vitals, setVitals] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    weight: '',
    height: '',
    spo2: '',
    diagnosis: '',
  })

  const [hospitalMedicines, setHospitalMedicines] = useState([])

  const [prescriptionItems, setPrescriptionItems] = useState([
    {
      hospital_medicine: '',
      medicine_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 1,
    },
  ])

  const [masterSymptoms, setMasterSymptoms] = useState([])
  const [appointmentSymptoms, setAppointmentSymptoms] = useState([])
  const [selectedSymptomId, setSelectedSymptomId] = useState('')
  const [symptomSeverity, setSymptomSeverity] = useState('')
  const [symptomDuration, setSymptomDuration] = useState('')
  const [symptomNotes, setSymptomNotes] = useState('')

  const [masterComorbidities, setMasterComorbidities] = useState([])
  const [appointmentComorbidities, setAppointmentComorbidities] = useState([])
  const [selectedComorbidityId, setSelectedComorbidityId] = useState('')
  const [comorbidityNotes, setComorbidityNotes] = useState('')

  const [savingSymptom, setSavingSymptom] = useState(false)
  const [savingComorbidity, setSavingComorbidity] = useState(false)

  const [loading, setLoading] = useState(true)
  const [savingVitals, setSavingVitals] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [prescriptionExists, setPrescriptionExists] = useState(false)
  const [prescriptionSent, setPrescriptionSent] = useState(false)
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState('')
  const [prescriptionNotes, setPrescriptionNotes] = useState('')
  const [searchingMedicine, setSearchingMedicine] = useState(false)
  const [medicineSearch, setMedicineSearch] = useState('')

  const [generatingFinalPayment, setGeneratingFinalPayment] = useState(false)
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [sendingPrescription, setSendingPrescription] = useState(false)

  const [finalPaymentSession, setFinalPaymentSession] = useState(null)
  const [pollingPayment, setPollingPayment] = useState(false)

  const [completingCheckup, setCompletingCheckup] = useState(false)

  const isCompleted = appointment?.status === 'completed'
  const isReadOnly = appointment?.status !== 'in_progress'
  const isHomeVisit = appointment?.visit_type === 'home_visit'
  const canGenerateFinalPayment =
    isHomeVisit &&
    appointment?.status === 'in_progress' &&
    appointment?.deposit_paid === true &&
    appointment?.final_paid !== true

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchHospitalMedicines(medicineSearch)
    }, 350)

    return () => clearTimeout(timeoutId)
  }, [medicineSearch])

  useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true)
      setError('')

      const appointmentData = await getAppointmentById(appointmentId)
      setAppointment(appointmentData)

      if (appointmentData.status !== 'in_progress') {
        setError('This appointment is not in progress.')
      }

      try {
        const vitalsData = await getVitals(appointmentId)

        setVitals({
          blood_pressure_systolic: vitalsData.blood_pressure_systolic || '',
          blood_pressure_diastolic: vitalsData.blood_pressure_diastolic || '',
          heart_rate: vitalsData.heart_rate || '',
          temperature: vitalsData.temperature || '',
          weight: vitalsData.weight || '',
          height: vitalsData.height || '',
          spo2: vitalsData.spo2 || '',
          diagnosis: vitalsData.diagnosis || '',
        })

        setVitalsExists(true)
      } catch (err) {
        if (err.response?.status === 404) {
          setVitalsExists(false)
        } else {
          throw err
        }
      }

      const [
        masterSymptomsData,
        appointmentSymptomsData,
        masterComorbiditiesData,
        appointmentComorbiditiesData,
      ] = await Promise.all([
        getMasterSymptoms({ is_common: 'true' }),
        getAppointmentSymptoms(appointmentId),
        getMasterComorbidities({ is_common: 'true' }),
        getAppointmentComorbidities(appointmentId),
      ])

      setMasterSymptoms(normalizeList(masterSymptomsData))
      setAppointmentSymptoms(normalizeList(appointmentSymptomsData))
      setMasterComorbidities(normalizeList(masterComorbiditiesData))
      setAppointmentComorbidities(normalizeList(appointmentComorbiditiesData))

      const hospitalMedicinesData = await getHospitalMedicines({
        is_active: 'true',
      })

      setHospitalMedicines(normalizeList(hospitalMedicinesData))

      // Add prescription loading here
      try {
        const prescriptionData = await getPrescription(appointmentId)

        setPrescriptionExists(true)
        setPrescriptionSent(Boolean(prescriptionData.sent_to_pharmacy))
        setPrescriptionDiagnosis(prescriptionData.diagnosis || '')
        setPrescriptionNotes(prescriptionData.notes || '')
        setPrescriptionItems(
          prescriptionData.items?.length > 0
            ? prescriptionData.items.map(item => ({
                hospital_medicine: item.hospital_medicine || '',
                medicine_name: item.medicine_name || '',
                dosage: item.dosage || '',
                frequency: item.frequency || '',
                duration: item.duration || '',
                instructions: item.instructions || '',
                quantity: item.quantity || 1,
              }))
            : [
                {
                  hospital_medicine: '',
                  medicine_name: '',
                  dosage: '',
                  frequency: '',
                  duration: '',
                  instructions: '',
                  quantity: 1,
                },
              ]
        )
      } catch (err) {
        if (err.response?.status === 404) {
          setPrescriptionExists(false)
        } else {
          throw err
        }
      }
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not load checkup page.'
      )
    } finally {
      setLoading(false)
    }
  }

  fetchData()
}, [appointmentId])

async function handleAddSymptom(event) {
  event.preventDefault()

  if (!selectedSymptomId) {
    setError('Please select a symptom.')
    return
  }

  try {
    setSavingSymptom(true)
    setError('')
    setSuccess('')

    const payload = {
      symptom: Number(selectedSymptomId),
      severity_score: symptomSeverity || null,
      duration_hours: symptomDuration || null,
      notes: symptomNotes.trim(),
    }

    const created = await addAppointmentSymptom(appointmentId, payload)

    setAppointmentSymptoms(prev => [...prev, created])
    setSelectedSymptomId('')
    setSymptomSeverity('')
    setSymptomDuration('')
    setSymptomNotes('')
    setSuccess('Symptom added successfully.')
  } catch (err) {
    console.error(err)
    setError(
      err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Could not add symptom.'
    )
  } finally {
    setSavingSymptom(false)
  }
}


async function searchHospitalMedicines(keyword = '') {
  try {
    setSearchingMedicine(true)

    const data = await getHospitalMedicines({
      search: keyword.trim(),
      is_active: 'true',
    })

    setHospitalMedicines(normalizeList(data))
  } catch (err) {
    console.error(err)
    setError('Could not search hospital medicines.')
  } finally {
    setSearchingMedicine(false)
  }
}

async function handleAddComorbidity(event) {
  event.preventDefault()

  if (!selectedComorbidityId) {
    setError('Please select a comorbidity.')
    return
  }

  try {
    setSavingComorbidity(true)
    setError('')
    setSuccess('')

    const payload = {
      comorbidity: Number(selectedComorbidityId),
      notes: comorbidityNotes.trim(),
    }

    const created = await addAppointmentComorbidity(appointmentId, payload)

    setAppointmentComorbidities(prev => [...prev, created])
    setSelectedComorbidityId('')
    setComorbidityNotes('')
    setSuccess('Comorbidity added successfully.')
  } catch (err) {
    console.error(err)
    setError(
      err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Could not add comorbidity.'
    )
  } finally {
    setSavingComorbidity(false)
  }
}

async function handleDeleteComorbidity(comorbidityId) {
  try {
    setError('')
    setSuccess('')

    await deleteAppointmentComorbidity(appointmentId, comorbidityId)

    setAppointmentComorbidities(prev =>
      prev.filter(item => item.appointment_comorbidity_id !== comorbidityId)
    )

    setSuccess('Comorbidity removed.')
  } catch (err) {
    console.error(err)
    setError(err.response?.data?.detail || 'Could not remove comorbidity.')
  }
}  

async function handleDeleteSymptom(symptomId) {
  try {
    setError('')
    setSuccess('')

    await deleteAppointmentSymptom(appointmentId, symptomId)

    setAppointmentSymptoms(prev =>
      prev.filter(item => item.appointment_symptom_id !== symptomId)
    )

    setSuccess('Symptom removed.')
  } catch (err) {
    console.error(err)
    setError(err.response?.data?.detail || 'Could not remove symptom.')
  }
}

  function normalizeList(data) {
    if (Array.isArray(data)) return data
    return data.results || []
  }

  function handleVitalsChange(event) {
    const { name, value } = event.target

    setVitals(prev => ({
      ...prev,
      [name]: value,
    }))

    setSuccess('')
    setError('')
  }

async function handleGenerateFinalPaymentSession() {
  try {
    setGeneratingFinalPayment(true)
    setError('')
    setSuccess('')

    const data = await createAppointmentFinalPaymentSession(appointmentId)

    setFinalPaymentSession(data)
    setPollingPayment(true)
    setSuccess('Final payment QR generated. Ask the patient to scan it.')
  } catch (err) {
    console.error(err)
    setError(
      err.response?.data?.detail ||
        'Could not generate final payment QR.'
    )
  } finally {
    setGeneratingFinalPayment(false)
  }
}

useEffect(() => {
  if (!pollingPayment) return

  const intervalId = setInterval(async () => {
    try {
      const freshAppointment = await getAppointmentById(appointmentId)

      setAppointment(freshAppointment)

      if (
        freshAppointment.status === 'completed' &&
        freshAppointment.final_paid === true
      ) {
        setPollingPayment(false)
        setSuccess('Final payment received. Appointment completed successfully.')
      }
    } catch (err) {
      console.error(err)
    }
  }, 4000)

  return () => clearInterval(intervalId)
}, [pollingPayment, appointmentId])


async function handleConfirmFinalPaymentForTest() {
  try {
    setConfirmingFinalPayment(true)
    setError('')
    setSuccess('')

    const response = await confirmHomeVisitFinalPayment(appointmentId)

    setSuccess(response.detail || 'Final payment confirmed.')

    setTimeout(() => {
      navigate('/doctor/dashboard')
    }, 900)
  } catch (err) {
    console.error(err)
    setError(
      err.response?.data?.detail ||
        'Could not confirm final payment.'
    )
  } finally {
    setConfirmingFinalPayment(false)
  }
}

async function handleCompleteCheckup() {
  try {
    setCompletingCheckup(true)
    setError('')
    setSuccess('')

    const response = await completeAppointmentCheckup(appointmentId)

    setSuccess(response.detail || 'Appointment completed successfully.')

    setTimeout(() => {
      navigate('/doctor/dashboard')
    }, 900)
  } catch (err) {
    console.error(err)

    setError(
      err.response?.data?.detail ||
        'Could not complete appointment.'
    )
  } finally {
    setCompletingCheckup(false)
  }
}

  function cleanVitalsPayload() {
    return {
      blood_pressure_systolic: vitals.blood_pressure_systolic || null,
      blood_pressure_diastolic: vitals.blood_pressure_diastolic || null,
      heart_rate: vitals.heart_rate || null,
      temperature: vitals.temperature || null,
      weight: vitals.weight || null,
      height: vitals.height || null,
      spo2: vitals.spo2 || null,
      diagnosis: vitals.diagnosis.trim(),
    }
  }

  function handlePrescriptionItemChange(index, field, value) {
    setPrescriptionItems(prev =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )

    setError('')
    setSuccess('')
  }

  function handleAddPrescriptionItem() {
    setPrescriptionItems(prev => [
      ...prev,
      {
        hospital_medicine: '',
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: 1,
      },
    ])
  }

  function handleHospitalMedicineSelect(index, medicineId) {
    const selectedMedicine = hospitalMedicines.find(
      medicine => String(medicine.medicine_id) === String(medicineId)
    )

    setPrescriptionItems(prev =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        if (!selectedMedicine) {
          return {
            ...item,
            hospital_medicine: '',
          }
        }

        return {
          ...item,
          hospital_medicine: selectedMedicine.medicine_id,
          medicine_name: selectedMedicine.medicine_name || '',
          dosage: selectedMedicine.default_dosage || selectedMedicine.strength || '',
          frequency: selectedMedicine.default_frequency || '',
          duration: selectedMedicine.default_duration || '',
          instructions: selectedMedicine.default_instructions || '',
        }
      })
    )

    setError('')
    setSuccess('')
  }

  function handleRemovePrescriptionItem(index) {
    setPrescriptionItems(prev => {
      if (prev.length === 1) return prev
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  function buildPrescriptionPayload() {
    return {
      diagnosis: prescriptionDiagnosis.trim(),
      notes: prescriptionNotes.trim(),
      items: prescriptionItems.map(item => ({
        hospital_medicine: item.hospital_medicine || null,
        medicine_name: item.medicine_name.trim(),
        dosage: item.dosage.trim(),
        frequency: item.frequency.trim(),
        duration: item.duration.trim(),
        instructions: item.instructions.trim(),
        quantity: Number(item.quantity || 1),
      })),
    }
  }

  async function handleSavePrescription(event) {
    event.preventDefault()

    const hasInvalidItem = prescriptionItems.some(
      item =>
        !item.hospital_medicine ||
        !item.medicine_name.trim() ||
        !item.dosage.trim() ||
        !item.frequency.trim() ||
        !item.duration.trim() ||
        Number(item.quantity || 0) <= 0
    )

    if (hasInvalidItem) {
      setError(
        'Please select hospital medicine and fill dosage, frequency, duration, and quantity.'
      )
      return
    }

    try {
      setSavingPrescription(true)
      setError('')
      setSuccess('')

      const payload = buildPrescriptionPayload()

      if (prescriptionExists) {
        await updatePrescription(appointmentId, payload)
      } else {
        await createPrescription(appointmentId, payload)
        setPrescriptionExists(true)
      }

      setSuccess('Prescription saved successfully.')
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          err.response?.data?.items?.[0] ||
          'Could not save prescription.'
      )
    } finally {
      setSavingPrescription(false)
    }
  }

  async function handleSendPrescription() {
    try {
      setSendingPrescription(true)
      setError('')
      setSuccess('')

      const response = await sendPrescriptionToPharmacy(appointmentId)

      setPrescriptionSent(true)
      setSuccess(response.detail || 'Prescription sent to pharmacy.')
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not send prescription to pharmacy.'
      )
    } finally {
      setSendingPrescription(false)
    }
  }

  async function handleSaveVitals(event) {
    event.preventDefault()

    try {
      setSavingVitals(true)
      setError('')
      setSuccess('')

      const payload = cleanVitalsPayload()

      if (vitalsExists) {
        await updateVitals(appointmentId, payload)
      } else {
        await createVitals(appointmentId, payload)
        setVitalsExists(true)
      }

      setSuccess('Vitals saved successfully.')
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not save vitals.'
      )
    } finally {
      setSavingVitals(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Loading checkup page...</p>
      </main>
    )
  }

  if (!appointment) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyBox}>
          <p>Appointment not found.</p>
          <Link to="/doctor/dashboard">Back to dashboard</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate('/doctor/dashboard')}
      >
        <ArrowLeft size={18} />
        Back to dashboard
      </button>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Doctor checkup</p>
          <h1>Patient checkup session</h1>
          <p>
            Record vitals, diagnosis, symptoms, comorbidities, and prescription
            for this appointment.
          </p>
        </div>

        <span className={styles.statusBadge}>
          {appointment.status}
        </span>
      </section>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successBox}>
          {success}
        </div>
      )}

      <section className={styles.layout}>
        <aside className={styles.summaryCard}>
          <div className={styles.patientHeader}>
            <div className={styles.avatar}>
              {appointment.patient_name?.charAt(0) || 'P'}
            </div>

            <div>
              <h2>{appointment.patient_name}</h2>
              <p>Patient information</p>
            </div>
          </div>

          <div className={styles.infoList}>
            <div>
              <span>
                <UserRound size={17} />
                Phone
              </span>
              <strong>{appointment.patient_phone_1 || 'N/A'}</strong>
            </div>

            <div>
              <span>
                <CalendarDays size={17} />
                Date
              </span>
              <strong>{appointment.appointment_date}</strong>
            </div>

            <div>
              <span>
                <Clock size={17} />
                Time
              </span>
              <strong>
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </strong>
            </div>

            <div>
              <span>
                <Stethoscope size={17} />
                Visit type
              </span>
              <strong>{formatVisitType(appointment.visit_type)}</strong>
            </div>

            {appointment.visit_type === 'home_visit' && (
              <div>
                <span>
                  <MapPin size={17} />
                  Address
                </span>
                <strong>{appointment.address || 'N/A'}</strong>
              </div>
            )}
          </div>
        </aside>

        <section className={styles.mainCard}>
          <div className={styles.tabBar}>
            {tabs.map(tab => {
              const Icon = tab.icon

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles.tabButton} ${
                    activeTab === tab.key ? styles.activeTab : ''
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'overview' && (
            <section className={styles.tabPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>
                    <CalendarDays size={22} />
                    Ca khám
                  </h2>
                  <p>Thông tin tổng quan của ca khám hiện tại.</p>
                </div>
              </div>

              <div className={styles.overviewGrid}>
                <div>
                  <span>Patient</span>
                  <strong>{appointment.patient_name}</strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>{appointment.patient_phone_1 || 'N/A'}</strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>{appointment.appointment_date}</strong>
                </div>

                <div>
                  <span>Time</span>
                  <strong>
                    {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                  </strong>
                </div>

                <div>
                  <span>Visit type</span>
                  <strong>{formatVisitType(appointment.visit_type)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{appointment.status}</strong>
                </div>

                {appointment.visit_type === 'home_visit' && (
                  <div>
                    <span>Address</span>
                    <strong>{appointment.address || 'N/A'}</strong>
                  </div>
                )}

                <div>
                  <span>Notes</span>
                  <strong>{appointment.notes || 'No notes'}</strong>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'vitals' && (
            <section className={styles.tabPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>
                    <HeartPulse size={22} />
                    Vitals and diagnosis
                  </h2>
                  <p>
                    Save the patient’s basic vitals before creating prescription.
                  </p>
                </div>
              </div>

              <form className={styles.vitalsForm} onSubmit={handleSaveVitals}>
                <div className={styles.gridTwo}>
                  <div className={styles.fieldGroup}>
                    <label>Systolic BP</label>
                    <input
                      type="number"
                      name="blood_pressure_systolic"
                      value={vitals.blood_pressure_systolic}
                      onChange={handleVitalsChange}
                      placeholder="120"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Diastolic BP</label>
                    <input
                      type="number"
                      name="blood_pressure_diastolic"
                      value={vitals.blood_pressure_diastolic}
                      onChange={handleVitalsChange}
                      placeholder="80"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Heart rate</label>
                    <input
                      type="number"
                      name="heart_rate"
                      value={vitals.heart_rate}
                      onChange={handleVitalsChange}
                      placeholder="72"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      name="temperature"
                      value={vitals.temperature}
                      onChange={handleVitalsChange}
                      placeholder="37.0"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      name="weight"
                      value={vitals.weight}
                      onChange={handleVitalsChange}
                      placeholder="65.0"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>Height</label>
                    <input
                      type="number"
                      step="0.1"
                      name="height"
                      value={vitals.height}
                      onChange={handleVitalsChange}
                      placeholder="170.0"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>SpO2</label>
                    <input
                      type="number"
                      name="spo2"
                      value={vitals.spo2}
                      onChange={handleVitalsChange}
                      placeholder="98"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label>Diagnosis</label>
                  <textarea
                    name="diagnosis"
                    rows="5"
                    value={vitals.diagnosis}
                    onChange={handleVitalsChange}
                    placeholder="Enter diagnosis..."
                  />
                </div>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={savingVitals || appointment.status !== 'in_progress'}
                >
                  <Save size={18} />
                  {savingVitals ? 'Saving...' : 'Save vitals'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'symptoms' && (
            <section className={styles.tabPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>
                    <Stethoscope size={22} />
                    Symptoms
                  </h2>
                  <p>Add symptoms reported during this appointment.</p>
                </div>
              </div>

              <form className={styles.inlineForm} onSubmit={handleAddSymptom}>
                <div className={styles.fieldGroup}>
                  <label>Symptom</label>
                  <select
                    value={selectedSymptomId}
                    onChange={event => setSelectedSymptomId(event.target.value)}
                  >
                    <option value="">Select symptom</option>
                    {masterSymptoms.map(symptom => (
                      <option key={symptom.symptom_id} value={symptom.symptom_id}>
                        {symptom.symptom_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label>Severity 1-10</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={symptomSeverity}
                    onChange={event => setSymptomSeverity(event.target.value)}
                    placeholder="5"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Duration hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={symptomDuration}
                    onChange={event => setSymptomDuration(event.target.value)}
                    placeholder="24"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Notes</label>
                  <input
                    type="text"
                    value={symptomNotes}
                    onChange={event => setSymptomNotes(event.target.value)}
                    placeholder="Optional notes"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.addButton}
                  disabled={savingSymptom || appointment.status !== 'in_progress'}
                >
                  <Plus size={17} />
                  {savingSymptom ? 'Adding...' : 'Add'}
                </button>
              </form>

              {appointmentSymptoms.length > 0 ? (
                <div className={styles.recordList}>
                  {appointmentSymptoms.map(item => (
                    <div
                      key={item.appointment_symptom_id}
                      className={styles.recordItem}
                    >
                      <div>
                        <strong>{item.symptom_name}</strong>
                        <span>
                          Severity: {item.severity_score || 'N/A'} · Duration:{' '}
                          {item.duration_hours || 'N/A'} hours
                        </span>
                        {item.notes && <p>{item.notes}</p>}
                      </div>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDeleteSymptom(item.appointment_symptom_id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No symptoms added yet.</p>
              )}
            </section>
          )}

          {activeTab === 'comorbidities' && (
            <section className={styles.tabPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>
                    <HeartPulse size={22} />
                    Comorbidities
                  </h2>
                  <p>Add relevant patient conditions for this appointment.</p>
                </div>
              </div>

              <form className={styles.inlineForm} onSubmit={handleAddComorbidity}>
                <div className={styles.fieldGroup}>
                  <label>Comorbidity</label>
                  <select
                    value={selectedComorbidityId}
                    onChange={event => setSelectedComorbidityId(event.target.value)}
                  >
                    <option value="">Select comorbidity</option>
                    {masterComorbidities.map(comorbidity => (
                      <option
                        key={comorbidity.comorbidity_id}
                        value={comorbidity.comorbidity_id}
                      >
                        {comorbidity.comorbidity_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label>Notes</label>
                  <input
                    type="text"
                    value={comorbidityNotes}
                    onChange={event => setComorbidityNotes(event.target.value)}
                    placeholder="Optional notes"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.addButton}
                  disabled={savingComorbidity || appointment.status !== 'in_progress'}
                >
                  <Plus size={17} />
                  {savingComorbidity ? 'Adding...' : 'Add'}
                </button>
              </form>

              {appointmentComorbidities.length > 0 ? (
                <div className={styles.recordList}>
                  {appointmentComorbidities.map(item => (
                    <div
                      key={item.appointment_comorbidity_id}
                      className={styles.recordItem}
                    >
                      <div>
                        <strong>{item.comorbidity_name}</strong>
                        {item.notes && <p>{item.notes}</p>}
                      </div>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() =>
                          handleDeleteComorbidity(item.appointment_comorbidity_id)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>No comorbidities added yet.</p>
              )}
            </section>
          )}

          {activeTab === 'prescription' && (
            <section className={styles.tabPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>
                    <FileText size={22} />
                    Prescription
                  </h2>
                  <p>
                    Create medicine instructions for this appointment. Vitals must be
                    saved first.
                  </p>
                </div>

                {prescriptionSent && (
                  <span className={styles.sentBadge}>
                    Sent to pharmacy
                  </span>
                )}
              </div>

              <form className={styles.prescriptionForm} onSubmit={handleSavePrescription}>
                <div className={styles.fieldGroup}>
                  <label>Prescription diagnosis</label>
                  <textarea
                    rows="4"
                    value={prescriptionDiagnosis}
                    onChange={event => setPrescriptionDiagnosis(event.target.value)}
                    placeholder="Diagnosis for prescription..."
                    disabled={prescriptionSent}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label>Prescription notes</label>
                  <textarea
                    rows="3"
                    value={prescriptionNotes}
                    onChange={event => setPrescriptionNotes(event.target.value)}
                    placeholder="General prescription notes..."
                    disabled={prescriptionSent}
                  />
                </div>

                <div className={styles.prescriptionHeader}>
                  <h3>
                    <Pill size={20} />
                    Medicine items
                  </h3>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleAddPrescriptionItem}
                    disabled={prescriptionSent}
                  >
                    Add medicine
                  </button>
                </div>

                <div className={styles.prescriptionItems}>
                  {prescriptionItems.map((item, index) => (
                    <div key={index} className={styles.prescriptionItem}>
                      <div className={styles.itemTitle}>
                        <strong>Medicine #{index + 1}</strong>

                        {prescriptionItems.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => handleRemovePrescriptionItem(index)}
                            disabled={prescriptionSent}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      <div className={styles.gridTwo}>
                        <div className={styles.fieldGroup}>
                          <label>Search medicine</label>

                          <input
                            type="text"
                            value={medicineSearch}
                            onChange={event => setMedicineSearch(event.target.value)}
                            placeholder="Search by name, generic name, or code..."
                            disabled={prescriptionSent}
                          />
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Hospital medicine</label>

                          <select
                            value={item.hospital_medicine || ''}
                            onChange={event =>
                              handleHospitalMedicineSelect(index, event.target.value)
                            }
                            disabled={prescriptionSent || searchingMedicine}
                          >
                            <option value="">
                              {searchingMedicine ? 'Searching medicines...' : 'Select hospital medicine'}
                            </option>

                            {hospitalMedicines.map(medicine => (
                              <option
                                key={medicine.medicine_id}
                                value={medicine.medicine_id}
                              >
                                {medicine.medicine_name}
                                {medicine.strength ? ` - ${medicine.strength}` : ''}
                                {medicine.generic_name ? ` (${medicine.generic_name})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {item.medicine_name && (
                          <div className={styles.snapshotBox}>
                            <span>Medicine snapshot</span>
                            <strong>{item.medicine_name}</strong>
                          </div>
                        )}

                        <div className={styles.fieldGroup}>
                          <label>Dosage</label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={event =>
                              handlePrescriptionItemChange(
                                index,
                                'dosage',
                                event.target.value
                              )
                            }
                            placeholder="500mg"
                            disabled={prescriptionSent}
                          />
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Frequency</label>
                          <input
                            type="text"
                            value={item.frequency}
                            onChange={event =>
                              handlePrescriptionItemChange(
                                index,
                                'frequency',
                                event.target.value
                              )
                            }
                            placeholder="3 times daily"
                            disabled={prescriptionSent}
                          />
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Duration</label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={event =>
                              handlePrescriptionItemChange(
                                index,
                                'duration',
                                event.target.value
                              )
                            }
                            placeholder="3 days"
                            disabled={prescriptionSent}
                          />
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={event =>
                              handlePrescriptionItemChange(
                                index,
                                'quantity',
                                event.target.value
                              )
                            }
                            disabled={prescriptionSent}
                          />
                        </div>

                        <div className={styles.fieldGroup}>
                          <label>Instructions</label>
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={event =>
                              handlePrescriptionItemChange(
                                index,
                                'instructions',
                                event.target.value
                              )
                            }
                            placeholder="Take after meals"
                            disabled={prescriptionSent}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.prescriptionActions}>
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={
                      savingPrescription ||
                      prescriptionSent ||
                      appointment.status !== 'in_progress'
                    }
                  >
                    <Save size={18} />
                    {savingPrescription ? 'Saving...' : 'Save prescription'}
                  </button>
                </div>

                {appointment.visit_type === 'home_visit' && (
                  <p className={styles.muted}>
                    Home-visit prescriptions are handled by the doctor directly.
                    Pharmacy sending is only for clinic visits.
                  </p>
                )}
              </form>
            </section>
            )}

            {activeTab === 'review' && (
              <section className={styles.tabPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>
                      <Send size={22} />
                      Xác nhận thông tin
                    </h2>
                    <p>
                      Review all checkup information before sending the prescription to pharmacy.
                    </p>
                  </div>

                  {prescriptionSent && (
                    <span className={styles.sentBadge}>
                      Sent to pharmacy
                    </span>
                  )}
                </div>

                <div className={styles.reviewStack}>
                  <section className={styles.reviewBlock}>
                    <h3>Ca khám</h3>

                    <div className={styles.reviewGrid}>
                      <div>
                        <span>Patient</span>
                        <strong>{appointment.patient_name}</strong>
                      </div>

                      <div>
                        <span>Phone</span>
                        <strong>{appointment.patient_phone_1 || 'N/A'}</strong>
                      </div>

                      <div>
                        <span>Date</span>
                        <strong>{appointment.appointment_date}</strong>
                      </div>

                      <div>
                        <span>Time</span>
                        <strong>
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </strong>
                      </div>

                      <div>
                        <span>Visit type</span>
                        <strong>{formatVisitType(appointment.visit_type)}</strong>
                      </div>

                      <div>
                        <span>Status</span>
                        <strong>{appointment.status}</strong>
                      </div>
                    </div>
                  </section>

                  <section className={styles.reviewBlock}>
                    <h3>Sinh hiệu & chẩn đoán</h3>

                    <div className={styles.reviewGrid}>
                      <div>
                        <span>Blood pressure</span>
                        <strong>
                          {vitals.blood_pressure_systolic || 'N/A'} /{' '}
                          {vitals.blood_pressure_diastolic || 'N/A'}
                        </strong>
                      </div>

                      <div>
                        <span>Heart rate</span>
                        <strong>{vitals.heart_rate || 'N/A'}</strong>
                      </div>

                      <div>
                        <span>Temperature</span>
                        <strong>{vitals.temperature || 'N/A'}</strong>
                      </div>

                      <div>
                        <span>SpO2</span>
                        <strong>{vitals.spo2 || 'N/A'}</strong>
                      </div>

                      <div>
                        <span>Weight</span>
                        <strong>{vitals.weight || 'N/A'}</strong>
                      </div>

                      <div>
                        <span>Height</span>
                        <strong>{vitals.height || 'N/A'}</strong>
                      </div>
                    </div>

                    <div className={styles.reviewText}>
                      <span>Diagnosis</span>
                      <p>{vitals.diagnosis || 'No diagnosis recorded.'}</p>
                    </div>
                  </section>

                  <section className={styles.reviewBlock}>
                    <h3>Triệu chứng</h3>

                    {appointmentSymptoms.length > 0 ? (
                      <div className={styles.reviewList}>
                        {appointmentSymptoms.map(item => (
                          <div key={item.appointment_symptom_id}>
                            <strong>{item.symptom_name}</strong>
                            <span>
                              Severity: {item.severity_score || 'N/A'} · Duration:{' '}
                              {item.duration_hours || 'N/A'} hours
                            </span>
                            {item.notes && <p>{item.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.muted}>No symptoms added.</p>
                    )}
                  </section>

                  <section className={styles.reviewBlock}>
                    <h3>Bệnh nền</h3>

                    {appointmentComorbidities.length > 0 ? (
                      <div className={styles.reviewList}>
                        {appointmentComorbidities.map(item => (
                          <div key={item.appointment_comorbidity_id}>
                            <strong>{item.comorbidity_name}</strong>
                            {item.notes && <p>{item.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.muted}>No comorbidities added.</p>
                    )}
                  </section>

                  <section className={styles.reviewBlock}>
                    <h3>Đơn thuốc</h3>

                    {prescriptionItems.length > 0 ? (
                      <div className={styles.reviewList}>
                        {prescriptionItems.map((item, index) => (
                          <div key={index}>
                            <strong>{item.medicine_name || `Medicine #${index + 1}`}</strong>
                            <span>
                              {item.dosage || 'N/A'} · {item.frequency || 'N/A'} ·{' '}
                              {item.duration || 'N/A'} · Qty: {item.quantity || 1}
                            </span>
                            {item.instructions && <p>{item.instructions}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.muted}>No prescription items added.</p>
                    )}
                  </section>

                  <section className={styles.reviewActions}>
                    {appointment.visit_type === 'clinic' && (
                      <>
                        <button
                          type="button"
                          className={styles.sendButton}
                          onClick={handleSendPrescription}
                          disabled={
                            sendingPrescription ||
                            prescriptionSent ||
                            !prescriptionExists ||
                            appointment.status !== 'in_progress'
                          }
                        >
                          <Send size={18} />
                          {sendingPrescription ? 'Sending...' : 'Send to pharmacy'}
                        </button>

                        {!prescriptionExists && (
                          <p className={styles.warningText}>
                            Please save the prescription before sending it to pharmacy.
                          </p>
                        )}

                        {prescriptionSent && (
                          <p className={styles.successText}>
                            Prescription has already been sent to pharmacy.
                          </p>
                        )}
                      </>
                    )}

                    {appointment?.visit_type === 'home_visit' && (
                      <div className={styles.paymentPanel}>
                        <h3>Home Visit Final Payment</h3>

                        {appointment.final_paid ? (
                          <div className={styles.successBox}>
                            Final payment has been completed.
                          </div>
                        ) : (
                          <>
                            <p>
                              Generate a QR code for the patient. The patient will scan it, choose
                              VNPay or PayPal, and complete the final payment on their own device.
                            </p>

                            <button
                              type="button"
                              className={styles.primaryButton}
                              onClick={handleGenerateFinalPaymentSession}
                              disabled={!canGenerateFinalPayment || generatingFinalPayment}
                            >
                              {generatingFinalPayment
                                ? 'Generating QR...'
                                : 'Generate Final Payment QR'}
                            </button>

                            {finalPaymentSession?.final_payment_url && (
                              <div className={styles.qrSection}>
                                <div className={styles.qrBox}>
                                  <QRCodeCanvas
                                    value={finalPaymentSession.final_payment_url}
                                    size={210}
                                    includeMargin
                                  />
                                </div>

                                <div className={styles.qrInfo}>
                                  <span>Amount</span>
                                  <strong>
                                    {Number(finalPaymentSession.session?.amount || 0).toLocaleString('vi-VN')} VND
                                  </strong>

                                  <p>
                                    Waiting for patient payment confirmation...
                                  </p>

                                  <a
                                    href={finalPaymentSession.final_payment_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open payment page
                                  </a>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className={styles.completeBox}>
                      <button
                        type="button"
                        className={styles.completeButton}
                        onClick={handleCompleteCheckup}
                        disabled={
                          completingCheckup ||
                          appointment.status !== 'in_progress' ||
                          !vitalsExists ||
                          !prescriptionExists ||
                          (appointment.visit_type === 'clinic' && !prescriptionSent)
                        }
                      >
                        <Save size={18} />
                        {completingCheckup ? 'Completing...' : 'Complete checkup'}
                      </button>

                      {!vitalsExists && (
                        <p className={styles.warningText}>
                          Please save vitals before completing the checkup.
                        </p>
                      )}

                      {!prescriptionExists && (
                        <p className={styles.warningText}>
                          Please save prescription before completing the checkup.
                        </p>
                      )}

                      {appointment.visit_type === 'clinic' && !prescriptionSent && (
                        <p className={styles.warningText}>
                          Please send prescription to pharmacy before completing clinic appointment.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </section>
            )}
        </section>
      </section>
    </main>
  )
}