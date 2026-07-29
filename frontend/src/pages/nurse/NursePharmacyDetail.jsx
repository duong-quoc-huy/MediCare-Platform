import { useEffect, useState } from 'react' 
import { Link, useNavigate, useParams } from 'react-router-dom' 
import { ArrowLeft, CheckCircle2 } from 'lucide-react' 
import { 
  confirmNursePharmacyPayment, 
  getNursePharmacyPrescription, 
  } from '../../services/nurseService' 
import styles from './NursePharmacyDetail.module.css' 
 
function formatMoney(value) { 
  return Number(value || 0).toLocaleString('vi-VN') 
} 
 
export default function NursePharmacyDetail() { 
  const { prescriptionId } = useParams() 
  const navigate = useNavigate() 
 
  const [prescription, setPrescription] = useState(null) 
  const [form, setForm] = useState({ 
    amount_received: '', 
    payment_method: 'cash', 
    receipt_number: '', 
    notes: '', 
  }) 
  const [loading, setLoading] = useState(true) 
  const [confirming, setConfirming] = useState(false) 
  const [error, setError] = useState('') 
  const [success, setSuccess] = useState('') 
 
  useEffect(() => { 
    async function loadDetail() { 
      try { 
        setLoading(true) 
        setError('') 
        const data = await getNursePharmacyPrescription(prescriptionId) 
        setPrescription(data) 
        setForm(prev => ({ ...prev, amount_received: data.amount_due })) 
      } catch (err) { 
        console.error(err) 
        setError(err.response?.data?.detail || 'Could not load prescription detail.') 
      } finally { 
        setLoading(false) 
      } 
    } 
 
    loadDetail() 
  }, [prescriptionId]) 
 
  function handleChange(event) { 
    const { name, value } = event.target 
    setForm(prev => ({ ...prev, [name]: value })) 
  } 
 
  async function handleConfirm(event) { 
    event.preventDefault() 
 
    try { 
      setConfirming(true) 
      setError('') 
      setSuccess('') 
 
      await confirmNursePharmacyPayment(prescriptionId, form) 
      setSuccess('Payment confirmed. Appointment completed successfully.') 
 
      setTimeout(() => { 
        navigate('/nurse/pharmacy') 
}, 1200) 
    } catch (err) { 
      console.error(err) 
      setError(err.response?.data?.detail || 'Could not confirm payment.') 
    } finally { 
      setConfirming(false) 
    } 
  } 
 
  if (loading) { 
    return <main className={styles.page}><section className={styles.stateCard}><h1>Loading prescription...</h1></section></main> 
  } 
 
  if (!prescription) { 
    return <main className={styles.page}><section className={styles.stateCard}><h1>Prescription not found</h1></section></main> 
  } 
 
  const alreadyCompleted = prescription.appointment_status === 'completed' || prescription.final_paid 
 
  return ( 
    <main className={styles.page}> 
      <section className={styles.header}> 
        <Link to="/nurse/pharmacy" className={styles.backLink}> 
          <ArrowLeft size={18} /> Back to queue 
        </Link> 
        <h1>Prescription Detail</h1> 
        <p>Review prescription items and confirm clinic counter payment.</p> 
      </section> 
 
      {error && <div className={styles.errorBox}>{error}</div>} 
      {success && <div className={styles.successBox}>{success}</div>} 
 
      <section className={styles.layout}> 
        <section className={styles.card}> 
          <h2>Patient and Appointment</h2> 
          <div className={styles.infoGrid}> 
            <div><span>Patient</span><strong>{prescription.patient_name}</strong></div> 
            <div><span>Email</span><strong>{prescription.patient_email}</strong></div> 
            <div><span>Phone</span><strong>{prescription.patient_phone_1 || 'N/A'}</strong></div> 
            <div><span>Doctor</span><strong>Dr. {prescription.doctor_name}</strong></div> 
            <div><span>Date</span><strong>{prescription.appointment_date}</strong></div> 
            <div><span>Status</span><strong>{prescription.appointment_status}</strong></div> 
          </div> 
 
          <h2>Diagnosis</h2> 
          <p className={styles.textBox}>{prescription.diagnosis || 'No diagnosis recorded.'}</p> 
 
          <h2>Prescription Items</h2> 
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
                {prescription.items.map(item => ( 
                  <tr key={item.id}> 
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
        </section> 
 
        <aside className={styles.card}> 
          <h2>Payment Confirmation</h2> 
 
          <div className={styles.paymentSummary}> 
            <div><span>Total fee</span><strong>{formatMoney(prescription.total_fee)} VND</strong></div> 
            <div><span>Deposit paid</span><strong>{formatMoney(prescription.deposit_amount)} VND</strong></div> 
            <div><span>Amount due now</span><strong>{formatMoney(prescription.amount_due)} VND</strong></div> 
          </div> 
 
          {alreadyCompleted ? ( 
            <div className={styles.completedBox}> 
              <CheckCircle2 size={24} /> 
              This appointment is already completed. 
            </div> 
          ) : ( 
            <form onSubmit={handleConfirm} className={styles.form}> 
              <label> 
                Amount received 
                <input 
                  name="amount_received" 
                  value={form.amount_received} 
                  onChange={handleChange} 
                  required 
                /> 
              </label> 
 
              <label> 
                Payment method 
                <select name="payment_method" value={form.payment_method} onChange={handleChange}> 
                  <option value="cash">Cash</option> 
                  <option value="vnpay">VNPay</option> 
                  <option value="other">Other</option> 
                </select> 
              </label> 
 
              <label> 
                Receipt number 
                <input name="receipt_number" value={form.receipt_number} onChange={handleChange} /> 
              </label>
               <label> 
                Notes 
                <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" /> 
              </label> 
 
              <button type="submit" disabled={confirming}> 
                {confirming ? 'Confirming...' : 'Confirm & Complete Appointment'} 
              </button> 
            </form> 
          )} 
        </aside> 
      </section> 
    </main> 
  ) 
}