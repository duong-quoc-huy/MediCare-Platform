import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getDashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'doctor') return '/doctor/dashboard'
  if (role === 'shipper') return '/shipper/dashboard'
  if (role === 'nurse') return '/nurse/dashboard'
  return '/patient/dashboard'
}

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        Loading...
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />
  }

  return children
}