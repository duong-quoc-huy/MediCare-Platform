import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Download,
  FileText,
  HeartPulse,
  MapPin,
  Pill,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import {
  getAppointmentById,
  downloadAppointmentMedicalPdf,
} from '../../services/appointmentService'

import {
  getAppointmentComorbidities,
  getAppointmentSymptoms,
  getPrescription,
  getVitals,
} from '../../services/medicalRecordService'

import styles from './DoctorAppointmentRecord.module.css'

function formatTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function formatVisitType(value) {
  if (value === 'home_visit') return 'Home visit'
  return 'Clinic visit'
}

export default function DoctorAppointmentRecord() {
  const { appointmentId } = useParams()

  const [appointment, setAppointment] = useState(null)
  const [vitals, setVitals] = useState(null)
  const [symptoms, setSymptoms] = useState([])
  const [comorbidities, setComorbidities] = useState([])
  const [prescription, setPrescription] = useState(null)

  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRecord() {
      try {
        setLoading(true)
        setError('')

        const appointmentData = await getAppointmentById(appointmentId)
        setAppointment(appointmentData)

        const results = await Promise.allSettled([
          getVitals(appointmentId),
          getAppointmentSymptoms(appointmentId),
          getAppointmentComorbidities(appointmentId),
          getPrescription(appointmentId),
        ])

        if (results[0].status === 'fulfilled') {
          setVitals(results[0].value)
        }

        if (results[1].status === 'fulfilled') {
          const data = results[1].value
          setSymptoms(Array.isArray(data) ? data : data.results || [])
        }

        if (results[2].status === 'fulfilled') {
          const data = results[2].value
          setComorbidities(Array.isArray(data) ? data : data.results || [])
        }

        if (results[3].status === 'fulfilled') {
          setPrescription(results[3].value)
        }
      } catch (err) {
        console.error(err)
        setError(
          err.response?.data?.detail ||
            'Could not load appointment record.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadRecord()
  }, [appointmentId])

  async function handleDownloadPdf() {
    try {
      setDownloading(true)
      setError('')

      await downloadAppointmentMedicalPdf(appointmentId)
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Could not download medical record PDF.'
      )
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Loading medical record...</h1>
        </section>
      </main>
    )
  }

  if (error && !appointment) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <h1>Could not load record</h1>
          <p>{error}</p>
          <Link to="/doctor/dashboard">Back to dashboard</Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link to="/doctor/dashboard" className={styles.backLink}>
          <ArrowLeft size={18} />
          Back to dashboard
        </Link>

        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>Doctor record view</p>
            <h1>Medical Record</h1>
            <p>
              Read-only summary of the completed appointment.
            </p>
          </div>

          <button
            type="button"
            className={styles.downloadButton}
            onClick={handleDownloadPdf}
            disabled={downloading || !appointment?.medical_pdf_available}
          >
            <Download size={18} />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        {appointment?.status !== 'completed' && (
          <div className={styles.warningBox}>
            This appointment is not completed yet. The record may be incomplete.
          </div>
        )}
      </div>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <UserRound size={22} />
          <span>Patient</span>
          <strong>{appointment?.patient_name}</strong>
        </div>

        <div className={styles.summaryCard}>
          <Stethoscope size={22} />
          <span>Doctor</span>
          <strong>Dr. {appointment?.doctor_name}</strong>
        </div>

        <div className={styles.summaryCard}>
          <CalendarDays size={22} />
          <span>Date</span>
          <strong>{appointment?.appointment_date}</strong>
        </div>

        <div className={styles.summaryCard}>
          <Clock size={22} />
          <span>Time</span>
          <strong>
            {formatTime(appointment?.start_time)} - {formatTime(appointment?.end_time)}
          </strong>
        </div>
      </section>

      <section className={styles.layout}>
        <section className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.sectionTitle}>
              <HeartPulse size={22} />
              <h2>Vitals & Diagnosis</h2>
            </div>

            {vitals ? (
              <>
                <div className={styles.infoGrid}>
                  <div>
                    <span>Blood pressure</span>
                    <strong>
                      {vitals.blood_pressure_systolic || 'N/A'} / {vitals.blood_pressure_diastolic || 'N/A'}
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
                    <span>Weight</span>
                    <strong>{vitals.weight || 'N/A'}</strong>
                  </div>

                  <div>
                    <span>Height</span>
                    <strong>{vitals.height || 'N/A'}</strong>
                  </div>

                  <div>
                    <span>SpO2</span>
                    <strong>{vitals.spo2 || 'N/A'}</strong>
                  </div>
                </div>

                <div className={styles.diagnosisBox}>
                  <span>Diagnosis</span>
                  <p>{vitals.diagnosis || 'No diagnosis recorded.'}</p>
                </div>
              </>
            ) : (
              <p className={styles.emptyText}>No vitals recorded.</p>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionTitle}>
              <Stethoscope size={22} />
              <h2>Symptoms</h2>
            </div>

            {symptoms.length > 0 ? (
              <div className={styles.list}>
                {symptoms.map(item => (
                  <div
                    key={item.appointment_symptom_id || item.id || item.symptom_name}
                    className={styles.listItem}
                  >
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
              <p className={styles.emptyText}>No symptoms recorded.</p>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionTitle}>
              <HeartPulse size={22} />
              <h2>Comorbidities</h2>
            </div>

            {comorbidities.length > 0 ? (
              <div className={styles.list}>
                {comorbidities.map(item => (
                  <div
                    key={item.appointment_comorbidity_id || item.id || item.comorbidity_name}
                    className={styles.listItem}
                  >
                    <strong>{item.comorbidity_name}</strong>
                    {item.notes && <p>{item.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>No comorbidities recorded.</p>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.sectionTitle}>
              <Pill size={22} />
              <h2>Prescription</h2>
            </div>

            {prescription ? (
              <>
                <div className={styles.diagnosisBox}>
                  <span>Prescription diagnosis</span>
                  <p>{prescription.diagnosis || 'No prescription diagnosis.'}</p>
                </div>

                {prescription.notes && (
                  <div className={styles.diagnosisBox}>
                    <span>Notes</span>
                    <p>{prescription.notes}</p>
                  </div>
                )}

                {prescription.items?.length > 0 ? (
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Qty</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {prescription.items.map((item, index) => (
                          <tr key={`${item.medicine_name}-${index}`}>
                            <td>{item.medicine_name}</td>
                            <td>{item.dosage}</td>
                            <td>{item.frequency}</td>
                            <td>{item.duration}</td>
                            <td>{item.quantity}</td>
                            <td>{item.instructions || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles.emptyText}>No prescription items.</p>
                )}
              </>
            ) : (
              <p className={styles.emptyText}>No prescription recorded.</p>
            )}
          </section>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.card}>
            <div className={styles.sectionTitle}>
              <FileText size={22} />
              <h2>Appointment</h2>
            </div>

            <div className={styles.sideInfo}>
              <div>
                <span>Appointment ID</span>
                <strong>{appointment?.appointment_id}</strong>
              </div>

              <div>
                <span>Visit type</span>
                <strong>{formatVisitType(appointment?.visit_type)}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{appointment?.status}</strong>
              </div>

              <div>
                <span>Total fee</span>
                <strong>{formatMoney(appointment?.total_fee)} VND</strong>
              </div>

              <div>
                <span>Deposit</span>
                <strong>{formatMoney(appointment?.deposit_amount)} VND</strong>
              </div>

              <div>
                <span>Final payment</span>
                <strong>{formatMoney(appointment?.final_amount)} VND</strong>
              </div>
            </div>
          </section>

          {appointment?.address && (
            <section className={styles.card}>
              <div className={styles.sectionTitle}>
                <MapPin size={22} />
                <h2>Address</h2>
              </div>

              <p className={styles.addressText}>
                {appointment.address}
              </p>
            </section>
          )}
        </aside>
      </section>
    </main>
  )
}