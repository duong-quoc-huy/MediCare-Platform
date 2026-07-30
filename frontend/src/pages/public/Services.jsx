import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Services.module.css'

const serviceTypes = [
  {
    icon: '🏥',
    title: 'Clinic Checkup',
    description:
      'Visit one of our partner clinics for a full consultation with a licensed doctor. Choose a specialty, pick a time slot, and walk in with confidence.',
    points: [
      'Same-day and scheduled appointments',
      'Access to lab tests and imaging on-site',
      'Follow-up visits with the same doctor',
    ],
    cta: { label: 'Find a Doctor', to: '/doctors' },
  },
  {
    icon: '🚗',
    title: 'Home Visit Checkup',
    description:
      "Can't make it to a clinic? A doctor or nurse comes to you — ideal for elderly family members, young children, or anyone who prefers care at home.",
    points: [
      'Available every day, 7:00 AM – 9:00 PM',
      'Doctor arrives with a portable exam kit',
      'Prescription and delivery coordinated on the spot',
    ],
    cta: { label: 'Book a Home Visit', to: '/doctors' },
  },
]

const steps = [
  {
    title: 'Choose your service',
    text: 'Pick a clinic checkup or a home visit, based on what fits your day.',
  },
  {
    title: 'Pick a doctor & time',
    text: 'Browse by specialty, rating, or availability and confirm a slot.',
  },
  {
    title: 'Consultation',
    text: 'Meet your doctor in person — at the clinic or at your door.',
  },
  {
    title: 'Prescription & follow-up',
    text: 'Get medicine delivered if needed, and track your visit history anytime.',
  },
]

const specialties = [
  { icon: '🩺', name: 'General Practice' },
  { icon: '🧒', name: 'Pediatrics' },
  { icon: '❤️', name: 'Cardiology' },
  { icon: '🦴', name: 'Orthopedics' },
  { icon: '🧠', name: 'Neurology' },
  { icon: '🤰', name: 'Obstetrics' },
  { icon: '👁️', name: 'Ophthalmology' },
  { icon: '🦷', name: 'Dentistry' },
]

const pricing = [
  {
    label: 'Clinic Checkup',
    range: 'From 250,000₫',
    note: 'Varies by specialty and doctor experience',
  },
  {
    label: 'Home Visit Checkup',
    range: 'From 450,000₫',
    note: 'Includes travel within service area',
  },
  {
    label: 'Medicine Delivery',
    range: 'From 20,000₫',
    note: 'Delivery fee depends on distance and order size',
  },
]

const faqs = [
  {
    q: 'How fast can a doctor arrive for a home visit?',
    a: 'In most service areas, doctors arrive within 60–90 minutes of a confirmed booking. Exact timing depends on your location and current doctor availability, which you can see before confirming.',
  },
  {
    q: 'Is home visit checkup available in my area?',
    a: 'Home visits currently cover Ho Chi Minh City and surrounding districts. When you enter your address at booking, we\'ll let you know immediately if a doctor is available near you.',
  },
  {
    q: 'Can I get a prescription and have medicine delivered?',
    a: 'Yes. If your doctor prescribes medicine during a clinic or home visit checkup, you can order it directly through MediCare and track delivery from the Orders page.',
  },
  {
    q: 'What if I need to cancel or reschedule?',
    a: 'You can cancel or reschedule from My Appointments. Home visit cancellations made less than 4 hours before the scheduled time may include a small service fee.',
  },
]

export default function Services() {
  const [openFaq, setOpenFaq] = useState(null)

  function toggleFaq(index) {
    setOpenFaq((prev) => (prev === index ? null : index))
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Our Services</p>
        <h1 className={styles.title}>
          Care that comes to you, or a clinic when you need one.
        </h1>
        <p className={styles.subtitle}>
          MediCare connects you with licensed doctors for in-clinic
          consultations or home visits, plus medicine delivery — all managed
          from one place.
        </p>
        <div className={styles.heroActions}>
          <Link to="/doctors" className={styles.primaryButton}>
            Book a Home Visit
          </Link>
          <Link to="/doctors" className={styles.secondaryButton}>
            Find a Doctor
          </Link>
        </div>
      </section>

      {/* Service type cards */}
      <section className={styles.section}>
        <div className={styles.serviceGrid}>
          {serviceTypes.map((service) => (
            <div key={service.title} className={styles.serviceCard}>
              <span className={styles.serviceIcon} aria-hidden="true">
                {service.icon}
              </span>
              <h2 className={styles.serviceTitle}>{service.title}</h2>
              <p className={styles.serviceDescription}>
                {service.description}
              </p>
              <ul className={styles.servicePoints}>
                {service.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
              <Link to={service.cta.to} className={styles.serviceCta}>
                {service.cta.label} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Medicine delivery banner */}
      <section className={styles.section}>
        <div className={styles.medicineBanner}>
          <div className={styles.medicineText}>
            <p className={styles.eyebrowLight}>Also available</p>
            <h2 className={styles.bannerTitle}>Medicine Delivery</h2>
            <p className={styles.bannerDescription}>
              Order prescribed or over-the-counter medicine and track your
              delivery in real time, from checkout to your door.
            </p>
            <Link to="/medicine" className={styles.bannerCta}>
              Browse Medicine →
            </Link>
          </div>
          <div className={styles.medicineIcon} aria-hidden="true">
            💊
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsGrid}>
          {steps.map((step, i) => (
            <div key={step.title} className={styles.stepCard}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Specialties */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Specialties We Cover</h2>
        <div className={styles.specialtyGrid}>
          {specialties.map((s) => (
            <div key={s.name} className={styles.specialtyCard}>
              <span aria-hidden="true">{s.icon}</span>
              <p>{s.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing overview */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pricing Overview</h2>
        <p className={styles.sectionSubtitle}>
          Exact fees depend on the doctor and specialty — here's a general
          idea before you book.
        </p>
        <div className={styles.pricingGrid}>
          {pricing.map((p) => (
            <div key={p.label} className={styles.pricingCard}>
              <p className={styles.pricingLabel}>{p.label}</p>
              <p className={styles.pricingRange}>{p.range}</p>
              <p className={styles.pricingNote}>{p.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div key={faq.q} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(i)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className={styles.faqToggle} aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA banner */}
      <section className={styles.ctaBanner}>
        <h2>Ready to get the care you need?</h2>
        <p>Book a clinic checkup or a home visit in just a few minutes.</p>
        <div className={styles.heroActions}>
          <Link to="/register" className={styles.primaryButtonInverse}>
            Get Started
          </Link>
          <Link to="/doctors" className={styles.secondaryButtonInverse}>
            Browse Doctors
          </Link>
        </div>
      </section>
    </div>
  )
}