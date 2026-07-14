import AddressBook from './AddressBook'
import styles from './Profile.module.css'

export default function ProfileAddressBook() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Address Book</h2>
      <AddressBook />
    </section>
  )
}