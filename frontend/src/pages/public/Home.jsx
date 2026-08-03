import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, CheckCircle2, Pill, ShieldCheck, Truck } from 'lucide-react'

import ServiceCard from '../../components/ui/ServiceCard'
import DoctorCard from '../../components/ui/DoctorCard'
import MedicineCard from '../../components/ui/MedicineCard'
import { getFeaturedDoctors, getFeaturedMedicines } from '../../services/homeService'
import styles from './Home.module.css'

const SERVICES = [
  { id: 1, icon: <CalendarCheck2 />, title: 'Doctor appointments', description: 'Book clinic or home visits with verified doctors.' },
  { id: 2, icon: <Pill />, title: 'Medicine delivery', description: 'Order active medicines and deliver them to your saved address.' },
  { id: 3, icon: <ShieldCheck />, title: 'Secure payments', description: 'Pay safely with VNPay or PayPal.' },
  { id: 4, icon: <Truck />, title: 'Delivery updates', description: 'Follow medicine-order progress from your account.' },
]

const HOW_IT_WORKS = [
  ['Choose a service', 'Book a doctor or browse the medicine catalog.'],
  ['Confirm details', 'Choose a slot, quantity, and delivery address.'],
  ['Pay securely', 'Complete payment through VNPay or PayPal.'],
  ['Receive care', 'Attend your visit or follow your delivery status.'],
]

function Skeleton({ count }) {
  return Array.from({ length: count }, (_, index) => (
    <div className={styles.skeleton} key={index} aria-hidden="true" />
  ))
}

export default function Home() {
  const [doctors, setDoctors] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [loadingMedicines, setLoadingMedicines] = useState(true)
  const [doctorError, setDoctorError] = useState('')
  const [medicineError, setMedicineError] = useState('')

  useEffect(() => {
    let mounted = true

    getFeaturedDoctors()
      .then(data => mounted && setDoctors(data))
      .catch(() => mounted && setDoctorError('Featured doctors are temporarily unavailable.'))
      .finally(() => mounted && setLoadingDoctors(false))

    getFeaturedMedicines()
      .then(data => mounted && setMedicines(data))
      .catch(() => mounted && setMedicineError('Featured medicines are temporarily unavailable.'))
      .finally(() => mounted && setLoadingMedicines(false))

    return () => { mounted = false }
  }, [])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroPill}>Family healthcare, connected</span>
          <h1>Care that moves with <em>your family.</em></h1>
          <p>
            Find a doctor, book an appointment, order medicines, pay securely,
            and follow every step from one MediCare account.
          </p>
          <div className={styles.heroActions}>
            <Link to="/doctors" className={styles.primary}>Find a doctor</Link>
            <Link to="/medicine" className={styles.secondary}>Browse medicines</Link>
          </div>
          <div className={styles.trustRow}>
            <span><CheckCircle2 size={17} /> Verified doctors</span>
            <span><ShieldCheck size={17} /> Secure payments</span>
            <span><Truck size={17} /> Delivery tracking</span>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <article className={styles.statusCard}>
            <CalendarCheck2 />
            <div><small>Appointment</small><strong>Doctor consultation confirmed</strong></div>
            <span>Ready</span>
          </article>
          <article className={styles.statusCard}>
            <Pill />
            <div><small>Medicine order</small><strong>Prepared for delivery</strong></div>
            <span>Live</span>
          </article>
          <div className={styles.metrics}>
            <div><strong>2</strong><span>Visit types</span></div>
            <div><strong>2</strong><span>Payment methods</span></div>
            <div><strong>1</strong><span>Platform</span></div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.eyebrow}>What we provide</p>
        <h2>One connected healthcare workflow</h2>
        <div className={styles.servicesGrid}>
          {SERVICES.map(item => <ServiceCard key={item.id} {...item} />)}
        </div>
      </section>

      <section className={`${styles.section} ${styles.alt}`}>
        <div className={styles.headingRow}>
          <div><p className={styles.eyebrow}>Available care</p><h2>Featured doctors</h2></div>
          <Link to="/doctors">View all doctors →</Link>
        </div>
        <div className={styles.doctorsGrid}>
          {loadingDoctors ? <Skeleton count={3} /> : doctorError ? <p className={styles.state}>{doctorError}</p> : doctors.map(doctor => <DoctorCard key={doctor.id || doctor.slug} doctor={doctor} />)}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.headingRow}>
          <div><p className={styles.eyebrow}>Medicine delivery</p><h2>Recently added medicines</h2></div>
          <Link to="/medicine">Open catalog →</Link>
        </div>
        <div className={styles.medicinesGrid}>
          {loadingMedicines ? <Skeleton count={4} /> : medicineError ? <p className={styles.state}>{medicineError}</p> : medicines.map(medicine => <MedicineCard key={medicine.medicine_id} medicine={medicine} />)}
        </div>
      </section>

      <section className={styles.process}>
        <p className={styles.eyebrow}>How it works</p>
        <h2>Four clear steps from need to care</h2>
        <div className={styles.processGrid}>
          {HOW_IT_WORKS.map(([title, description], index) => (
            <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div><small>Ready when you are</small><h2>Start your MediCare journey today.</h2><p>Create an account to book appointments and order medicines.</p></div>
        <Link to="/register" className={styles.primary}>Create account</Link>
      </section>
    </main>
  )
}
