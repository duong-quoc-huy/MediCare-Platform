import { useState } from 'react'
import styles from './ContactUs.module.css'


const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mldbkgab'

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4884.547252412265!2d106.69896047588341!3d10.743148059804954!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f9fa1b72f8b%3A0x26780c08db949052!2sNguyen%20Tat%20Thanh%20University%20-%20Nguyen%20Huu%20Tho%20Campus!5e1!3m2!1sen!2sus!4v1785383825248!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin'
const contactCards = [
  {
    icon: '📍',
    label: 'Clinic Address',
    lines: ['123 Nguyen Van Linh Street', 'District 7, Ho Chi Minh City'],
  },
  {
    icon: '📞',
    label: 'Phone / Hotline',
    lines: ['(028) 3771 0000', 'Home visit hotline: (028) 3771 0111'],
  },
  {
    icon: '✉️',
    label: 'Email',
    lines: ['support@medicare-platform.com'],
  },
  {
    icon: '🕐',
    label: 'Hours',
    lines: ['Clinic: Mon–Sat, 7:00 AM – 8:00 PM', 'Home visits: Every day, 7:00 AM – 9:00 PM'],
  },
]

const topics = [
  'Book a clinic checkup',
  'Book a home visit checkup',
  'Order / delivery issue',
  'Billing question',
  'Something else',
]

export default function ContactUs() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    topic: topics[0],
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const data = await response.json().catch(() => null)
        setError(
          data?.errors?.[0]?.message ||
            'Something went wrong sending your message. Please try again.'
        )
      }
    } catch (err) {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>We're here to help</p>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.subtitle}>
          Questions about a clinic checkup, a home visit, or an order? Reach
          out — our care team typically replies within one business day.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.cardsGrid}>
          {contactCards.map((card) => (
            <div key={card.label} className={styles.card}>
              <span className={styles.cardIcon} aria-hidden="true">
                {card.icon}
              </span>
              <p className={styles.cardLabel}>{card.label}</p>
              {card.lines.map((line, i) => (
                <p key={i} className={styles.cardLine}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Send us a message</h2>
            <p className={styles.sectionSubtitle}>
              Fill in the form below and our team will get back to you shortly.
            </p>

            {submitted ? (
              <div className={styles.successBox} role="status">
                <span className={styles.successIcon} aria-hidden="true">
                  ✓
                </span>
                <div>
                  <p className={styles.successTitle}>Message sent</p>
                  <p className={styles.successText}>
                    Thanks for reaching out — we'll get back to you at{' '}
                    {form.email || 'your email'} soon.
                  </p>
                </div>
              </div>
            ) : (
              <div className={styles.form}>
                <div className={styles.fieldRow}>
                  <label className={styles.field}>
                    <span>Full name</span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Nguyen Van A"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Phone number</span>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="09xx xxx xxx"
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>What can we help with?</span>
                  <select name="topic" value={form.topic} onChange={handleChange}>
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Message</span>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Tell us a bit about what you need..."
                    required
                  />
                </label>

                {error && (
                  <p className={styles.errorText} role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </button>
              </div>
            )}
          </section>

          <aside className={styles.sideSection}>
            <div className={styles.sideBlock}>
              <h3>Prefer to talk to someone directly?</h3>
              <p>
                Call our hotline for urgent scheduling questions, or use the
                in-app chat once you're signed in — a support agent is
                usually available during clinic hours.
              </p>
            </div>

            <div className={styles.sideBlock}>
              <h3>Requesting a home visit?</h3>
              <p>
                Home visit checkups can be booked directly from your account
                under{' '}
                <span className={styles.inlineHighlight}>
                  Book Appointment → Home Visit
                </span>
                . For same-day requests, calling our home visit hotline is
                the fastest way to reach a doctor.
              </p>
            </div>

            <div className={styles.mapWrapper}>
              <iframe
                title="MediCare clinic location"
                src={MAP_EMBED_SRC}
                className={styles.mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}