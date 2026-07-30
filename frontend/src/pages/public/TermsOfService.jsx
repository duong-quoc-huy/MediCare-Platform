import styles from './TermsOfService.module.css'

const LAST_UPDATED = 'July 30, 2026'

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: [
      `By creating an account or using any part of the MediCare platform — including booking a clinic appointment, requesting a home visit checkup, or ordering medicine — you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.`,
    ],
  },
  {
    title: '2. Description of Service',
    body: [
      `MediCare connects patients with licensed doctors for two types of consultations:`,
    ],
    list: [
      'Clinic Checkup — an in-person appointment at one of our partner clinic locations.',
      'Home Visit Checkup — a doctor or nurse travels to your registered address to conduct the examination.',
    ],
    after: [
      `We also facilitate the ordering and delivery of medicine prescribed as part of a consultation. MediCare acts as a platform connecting patients with healthcare providers and does not itself practice medicine.`,
    ],
  },
  {
    title: '3. Eligibility & Account Registration',
    body: [
      `You must be at least 18 years old, or be registering on behalf of a minor as their parent or legal guardian, to create a MediCare account. You agree to provide accurate, current, and complete information during registration and to keep this information up to date. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.`,
    ],
  },
  {
    title: '4. Booking, Rescheduling & Cancellations',
    body: [
      `Appointments — whether clinic-based or home visit — are subject to doctor availability at the time of booking. You may reschedule or cancel an appointment from the "My Appointments" section of your account. Home visit checkups require cancellation at least 4 hours before the scheduled time; cancellations made after this window may be subject to a service fee to cover the doctor's travel arrangement.`,
    ],
  },
  {
    title: '5. Home Visit Checkup Terms',
    body: [
      `When you request a home visit checkup, you agree to:`,
    ],
    list: [
      'Provide an accurate address and be reasonably reachable at the scheduled time.',
      'Ensure a safe, reasonably private, and well-lit space is available for the examination.',
      'Have a responsible adult present if the patient is a minor or requires assistance.',
    ],
    after: [
      `MediCare reserves the right to decline or reschedule a home visit if our staff determines that the location poses a safety concern.`,
    ],
  },
  {
    title: '6. Payments & Refunds',
    body: [
      `Consultation fees, delivery charges, and medicine prices are displayed before you confirm a booking or order. Payments are processed through our supported payment partners. Refunds for cancelled appointments or undelivered orders are issued in accordance with our refund schedule, which is available on request from our support team.`,
    ],
  },
  {
    title: '7. Medical Disclaimer',
    body: [
      `MediCare is a booking and coordination platform. All diagnoses, treatment plans, and prescriptions are the sole responsibility of the licensed medical professional who conducts your consultation. In case of a medical emergency, please contact local emergency services immediately rather than booking through MediCare.`,
    ],
  },
  {
    title: '8. User Conduct',
    body: [
      `You agree not to misuse the platform, including but not limited to: providing false medical information, harassing doctors or delivery staff, attempting to access another user's account, or using the service for any unlawful purpose.`,
    ],
  },
  {
    title: '9. Limitation of Liability',
    body: [
      `To the fullest extent permitted by law, MediCare and its affiliates shall not be liable for indirect, incidental, or consequential damages arising from your use of the platform, including delays in home visit arrival or medicine delivery caused by circumstances beyond our reasonable control.`,
    ],
  },
  {
    title: '10. Changes to These Terms',
    body: [
      `We may update these Terms of Service from time to time. If we make material changes, we will notify you through the platform or by email prior to the changes taking effect. Continued use of MediCare after changes take effect constitutes acceptance of the revised terms.`,
    ],
  },
  {
    title: '11. Contact Us',
    body: [
      `If you have questions about these Terms of Service, please reach out through our Contact Us page or email us at support@medicare-platform.com.`,
    ],
  },
]

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>
          Please read these terms carefully before using MediCare's clinic and
          home visit checkup services.
        </p>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>
      </div>

      <div className={styles.content}>
        <nav className={styles.toc} aria-label="Table of contents">
          <p className={styles.tocLabel}>On this page</p>
          <ul>
            {sections.map((section) => (
              <li key={section.title}>
                <a href={`#${slugify(section.title)}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.articleWrapper}>
          <article className={styles.article}>
            {sections.map((section) => (
              <section
                key={section.title}
                id={slugify(section.title)}
                className={styles.section}
              >
                <h2>{section.title}</h2>
                {section.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
                {section.list && (
                  <ul className={styles.list}>
                    {section.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.after &&
                  section.after.map((paragraph, i) => (
                    <p key={`after-${i}`}>{paragraph}</p>
                  ))}
              </section>
            ))}

            <p className={styles.closingNote}>
              Thank you for trusting MediCare with your care. We're committed
              to making both clinic and home visit checkups safe, transparent,
              and easy to manage.
            </p>
          </article>
        </div>
      </div>
    </div>
  )
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}