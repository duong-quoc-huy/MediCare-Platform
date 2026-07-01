import styles from './SimplePage.module.css'

export default function Login() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Login</h1>
        <p>
          Login page placeholder. Authentication will be connected when the backend API is ready.
        </p>

        <form className={styles.form}>
          <input type="email" placeholder="Email address" />
          <input type="password" placeholder="Password" />
          <button type="button">Sign in</button>
        </form>
      </section>
    </main>
  )
}