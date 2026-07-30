import styles from './PrivacyPolicy.module.css'

const LAST_UPDATED = 'July 30, 2026'

const sections = [
  {
    title: '1. Introduction',
    body: [
      `MediCare respects your privacy and is committed to protecting the personal and medical information you share with us. This Privacy Policy explains what information we collect, how we use it, and the choices you have — whether you book a clinic checkup or a home visit checkup through our platform.`,
    ],
  },
  {
    title: '2. Information We Collect',
    body: [`We collect the following categories of information:`],
    list: [
      'Account information — full name, email address, phone number, and password.',
      'Health information — symptoms, medical history, and notes you or your doctor add during a consultation.',
      'Location information — your home address, only when you request a home visit checkup, used solely to dispatch a doctor to you.',
      'Payment information — processed securely through our payment partners; MediCare does not store full card numbers.',
      'Usage information — pages visited, appointments booked, and device/browser information collected automatically for platform reliability.',
    ],
  },
  {
    title: '3. How We Use Your Information',
    body: [`We use the information we collect to:`],
    list: [
      'Match you with an available doctor for a clinic or home visit checkup.',
      'Coordinate home visit logistics, including sharing your address with the assigned doctor only.',
      'Process payments and medicine orders, including delivery tracking.',
      'Send appointment reminders and service updates.',
      'Improve the safety, performance, and reliability of the MediCare platform.',
    ],
  },
  {
    title: '4. How We Share Your Information',
    body: [
      `We do not sell your personal or health information. We share information only in the following circumstances:`,
    ],
    list: [
      'With the doctor assigned to your appointment, so they can prepare for and conduct your checkup.',
      'With delivery partners, limited to the information needed to fulfill a medicine order.',
      'With payment processors, to complete transactions securely.',
      'When required by law, such as in response to a valid legal request from a public authority.',
    ],
  },
  {
    title: '5. Home Visit Location Data',
    body: [
      `Your home address is only collected and shared when you specifically request a home visit checkup. This information is visible to the assigned doctor for the purpose of that visit and is retained only as long as needed for scheduling, safety records, and legal record-keeping requirements for medical services.`,
    ],
  },
  {
    title: '6. Data Security',
    body: [
      `We apply industry-standard safeguards — including encrypted connections and access controls — to protect your information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is completely secure, and we encourage you to keep your account credentials confidential.`,
    ],
  },
  {
    title: '7. Data Retention',
    body: [
      `We retain your account and medical consultation records for as long as your account is active, and for a reasonable period afterward as required for medical record-keeping, legal, or regulatory purposes. You may request deletion of your account at any time, subject to these retention obligations.`,
    ],
  },
  {
    title: '8. Your Rights & Choices',
    body: [`Depending on your location, you may have the right to:`],
    list: [
      'Access a copy of the personal information we hold about you.',
      'Request correction of inaccurate or incomplete information.',
      'Request deletion of your account and associated data.',
      'Withdraw consent for non-essential communications at any time.',
    ],
    after: [
      `To exercise any of these rights, please contact us using the details on our Contact Us page.`,
    ],
  },
  {
    title: '9. Cookies & Similar Technologies',
    body: [
      `MediCare uses cookies and similar technologies to keep you signed in, remember your preferences, and understand how the platform is used so we can improve it. You can control cookies through your browser settings, though some features may not function properly if cookies are disabled.`,
    ],
  },
  {
    title: "10. Children's Privacy",
    body: [
      `MediCare may be used to book checkups on behalf of a minor by a parent or legal guardian. We do not knowingly collect personal information directly from children without guardian involvement.`,
    ],
  },
  {
    title: '11. Changes to This Policy',
    body: [
      `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes through the platform or by email before they take effect.`,
    ],
  },
  {
    title: '12. Contact Us',
    body: [
      `If you have any questions about this Privacy Policy or how your information is handled, please reach out through our Contact Us page or email us at privacy@medicare-platform.com.`,
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>
          Your health information deserves care as much as your health does.
          Here's how MediCare collects, uses, and protects your data.
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
              We know booking a checkup means trusting us with sensitive
              information — we take that responsibility seriously, whether
              you visit a clinic or invite us into your home.
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