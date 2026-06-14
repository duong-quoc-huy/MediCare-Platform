import { Link } from 'react-router-dom'
import ServiceCard from '../../components/ui/ServiceCard'
import DoctorCard from '../../components/ui/DoctorCard'
import styles from './Home.module.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserDoctor } from "@fortawesome/free-solid-svg-icons";
import { faCapsules } from "@fortawesome/free-solid-svg-icons";
import { faClipboard } from "@fortawesome/free-solid-svg-icons";
import { faSyringe } from "@fortawesome/free-solid-svg-icons";
import { faVial } from "@fortawesome/free-solid-svg-icons";
import { faPersonCane } from "@fortawesome/free-solid-svg-icons";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";
import { faPills } from "@fortawesome/free-solid-svg-icons";
import { faTruckMedical } from "@fortawesome/free-solid-svg-icons";

const SERVICES = [
  {
    id: 1,
    icon: <FontAwesomeIcon icon={faUserDoctor} />,
    title: 'Home doctor visits',
    description: 'Book a licensed family doctor to visit your home for checkups, minor illness treatment, and health monitoring.',
  },
  {
    id: 2,
    icon: <FontAwesomeIcon icon={faCapsules} />,
    title: 'Medicine delivery',
    description: 'Order prescription and OTC medicines online. Delivered to your door via GHTK, same day.',
  },
  {
    id: 3,
    icon: <FontAwesomeIcon icon={faClipboard} />,
    title: 'Health monitoring',
    description: 'Regular scheduled visits from your dedicated family doctor to track long-term health conditions.',
  },
  {
    id: 4,
    icon: <FontAwesomeIcon icon={faSyringe} />,
    title: 'Home vaccination',
    description: 'Get vaccinated at home — for children, elderly, or anyone who prefers comfortable private care.',
  },
  {
    id: 5,
    icon: <FontAwesomeIcon icon={faVial} />,
    title: 'Lab sample collection',
    description: 'A nurse visits to collect blood or urine samples at home. Results delivered digitally to your account.',
  },
  {
    id: 6,
    icon: <FontAwesomeIcon icon={faPersonCane} />,
    title: 'Elderly care visits',
    description: 'Specialised regular visits for bedridden or elderly patients — wound care, physiotherapy, health checks.',
  },
]

const SAMPLE_DOCTORS = [
  {
    id: 1,
    full_name: 'Nguyễn Thảo',
    specialty: 'General Practice',
    rating: 4.9,
    experience_years: 8,
    consultation_fee: 350000,
  },
  {
    id: 2,
    full_name: 'Lê Minh',
    specialty: 'Internal Medicine',
    rating: 4.8,
    experience_years: 12,
    consultation_fee: 400000,
  },
  {
    id: 3,
    full_name: 'Trần Hương',
    specialty: 'Paediatrics',
    rating: 5.0,
    experience_years: 6,
    consultation_fee: 380000,
  },
]

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Choose a doctor',
    desc: 'Browse verified family doctors by specialty, rating, and availability in your district.',
  },
  {
    step: 2,
    title: 'Pick a time slot',
    desc: 'Select a convenient date and time. Home visit or clinic — your choice.',
  },
  {
    step: 3,
    title: 'Pay securely',
    desc: 'Pay via VNPAY or PayPal. Your booking is confirmed instantly after payment.',
  },
  {
    step: 4,
    title: 'Doctor arrives',
    desc: 'Your doctor visits at the scheduled time. Track their arrival in real time.',
  },
]

// ─── Sections ─────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Bác sĩ gia đình · Home healthcare</p>
        <h1 className={styles.heroTitle}>
          Your family doctor,{' '}
          <span className={styles.heroAccent}>at your door</span>
        </h1>
        <p className={styles.heroSub}>
          Book a dedicated family doctor for home visits, routine checkups,
          and minor diagnosis. Medicine delivered to your address the same day.
        </p>
        <div className={styles.heroCta}>
          <Link to="/doctors" className={styles.btnPrimary}>
            Book a doctor
          </Link>
          <Link to="/medicine" className={styles.btnSecondary}>
            Order medicine
          </Link>
        </div>
      </div>

      <div className={styles.heroVisual}>
        {/* Appointment preview card */}
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.previewAvatar} style={{ background: '#E1F5EE', color: '#0F6E56' }}>
              NT
            </div>
            <div>
              <p className={styles.previewName}>Dr. Nguyễn Thảo</p>
              <p className={styles.previewSpec}>General Practice · Family Medicine</p>
            </div>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}><FontAwesomeIcon icon={faCalendar} /> Today, 14:30 — Home visit</span>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>Confirmed</span>
          </div>
        </div>

        {/* Medicine order card */}
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.previewAvatar} style={{ background: '#FAEEDA', color: '#854F0B' }}>
              <FontAwesomeIcon icon={faPills} />
            </div>
            <div>
              <p className={styles.previewName}>Paracetamol 500mg × 20</p>
              <p className={styles.previewSpec}>Medicine order · GHTK delivery</p>
            </div>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}><FontAwesomeIcon icon={faTruckMedical} /> Estimated 45 min</span>
            <span className={`${styles.badge} ${styles.badgeAmber}`}>Delivering</span>
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          {[
            { num: '120+', label: 'Doctors' },
            { num: '4.9',  label: 'Avg rating' },
            { num: '24/7', label: 'Available' },
          ].map(s => (
            <div key={s.label} className={styles.statBox}>
              <p className={styles.statNum}>{s.num}</p>
              <p className={styles.statLabel}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section className={styles.section}>
      <p className={styles.sectionEyebrow}>What we offer</p>
      <h2 className={styles.sectionTitle}>Two services, one platform</h2>
      <p className={styles.sectionSub}>Healthcare at home — from diagnosis to delivery.</p>
      <div className={styles.servicesGrid}>
        {SERVICES.map(s => (
          <ServiceCard
            key={s.id}
            icon={s.icon}
            title={s.title}
            description={s.description}
          />
        ))}
      </div>
    </section>
  )
}

function DoctorsSection() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <p className={styles.sectionEyebrow}>Our doctors</p>
      <h2 className={styles.sectionTitle}>Meet your family doctors</h2>
      <p className={styles.sectionSub}>All doctors are licensed, verified, and experienced in home-visit care.</p>
      <div className={styles.doctorsGrid}>
        {SAMPLE_DOCTORS.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
      <div className={styles.viewAll}>
        <Link to="/doctors" className={styles.btnSecondary}>
          View all doctors →
        </Link>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className={styles.section}>
      <p className={styles.sectionEyebrow}>How it works</p>
      <h2 className={styles.sectionTitle}>Four steps to care</h2>
      <p className={styles.sectionSub}>From booking to your door in under an hour.</p>
      <div className={styles.howGrid}>
        {HOW_IT_WORKS.map(item => (
          <div key={item.step} className={styles.howCard}>
            <div className={styles.howNum}>{item.step}</div>
            <h3 className={styles.howTitle}>{item.title}</h3>
            <p className={styles.howDesc}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CTABanner() {
  return (
    <section className={styles.banner}>
      <h2 className={styles.bannerTitle}>Healthcare at home, starting today</h2>
      <p className={styles.bannerSub}>
        Join thousands of families in Ho Chi Minh City already using MediCare.
      </p>
      <Link to="/register" className={styles.bannerBtn}>
        Book your first visit
      </Link>
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ServicesSection />
      <DoctorsSection />
      <HowItWorksSection />
      <CTABanner />
    </main>
  )
}