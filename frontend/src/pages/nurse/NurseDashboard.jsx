import { Link } from 'react-router-dom' 
import { ClipboardList, Users, HeartPulse } from 'lucide-react' 
import styles from './NurseDashboard.module.css' 
 
export default function NurseDashboard() { 
  return ( 
    <main className={styles.page}> 
      <section className={styles.hero}> 
        <div> 
          <p className={styles.eyebrow}>Nurse dashboard</p> 
          <h1>Welcome back, Nurse</h1> 
          <p>
            Manage pharmacy prescriptions, confirm clinic payments, 
            and support patient checkup workflows. 
          </p> 
        </div> 
 
        <Link to="/nurse/pharmacy" className={styles.heroButton}> 
          <ClipboardList size={18} /> 
          Open pharmacy queue 
        </Link> 
      </section> 
 
      <section className={styles.grid}> 
        <Link to="/nurse/pharmacy" className={styles.card}> 
          <ClipboardList size={32} /> 
          <h2>Pharmacy Queue</h2> 
          <p>View prescriptions sent by doctors and confirm counter payments.</p> 
        </Link> 
 
        <div className={styles.cardMuted}> 
          <Users size={32} /> 
          <h2>Patient Management</h2> 
          <p>Coming next: view patients, update basic info, and book appointments.</p> 
        </div> 
 
        <div className={styles.cardMuted}> 
          <HeartPulse size={32} /> 
          <h2>Vitals</h2> 
          <p>Coming next: record and update vitals for in-progress checkups.</p> 
        </div> 
      </section> 
    </main> 
  ) 
} 
