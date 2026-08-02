import { createContext, useContext, useState, useEffect } from 'react'
import { logoutUser } from '../services/authService'
import { unregisterFirebaseDevice } from '../services/notificationService'
import { removeFirebaseToken} from '../firebase'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }

    setLoading(false)
  }, [])

  function login(accessToken, refreshToken, userData) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))

    setToken(accessToken)
    setUser(userData)
  }

  async function logout() {
  const refreshToken =
    localStorage.getItem(
      'refresh_token'
    )

  const firebaseToken =
    localStorage.getItem(
      'firebase_registration_token'
    )

  try {
    if (firebaseToken) {
      try {
        await unregisterFirebaseDevice(
          firebaseToken
        )
      } catch (error) {
        console.error(
          'Firebase device unregister failed:',
          error
        )
      }

      try {
        await removeFirebaseToken()
      } catch (error) {
        console.error(
          'Firebase token deletion failed:',
          error
        )
      }
    }

    if (refreshToken) {
      await logoutUser(refreshToken)
    }
  } catch (error) {
    console.error(
      'Logout API failed:',
      error
    )
  } finally {
    localStorage.removeItem(
      'firebase_registration_token'
    )

    localStorage.removeItem(
      'access_token'
    )

    localStorage.removeItem(
      'refresh_token'
    )

    localStorage.removeItem(
      'user'
    )

    setToken(null)
    setUser(null)
  }
}

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    isPatient: user?.role === 'patient',
    isDoctor: user?.role === 'doctor',
    isNurse: user?.role === 'nurse',
    isAdmin: user?.role === 'admin',
    isShipper: user?.role === 'shipper',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}