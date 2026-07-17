import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/public/Home'
import MedicineList from './pages/public/MedicineList'
import MedicineDetail from './pages/public/MedicineDetail'
import Cart from './pages/cart/Cart'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ProtectedRoute from './components/ProtectedRoute'
import PatientDashboard from './pages/patient/PatientDashboard'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import ShipperDashboard from './pages/shipper/ShipperDashboard'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import './index.css'
import VerifyOTP from './pages/public/VerifyOTP'
import Profile from './pages/shared/Profile'
import ProfileOverview from './pages/shared/ProfileOverview'
import ProfilePersonalInfo from './pages/shared/ProfilePersonalInfo'
import ProfileAddressBook from './pages/shared/ProfileAddressBook'
import ProfileSecurity from './pages/shared/ProfileSecurity'
import Checkout from './pages/checkout/Checkout'
import PaymentPage from './pages/checkout/PaymentPage'
import PaymentHistory from './pages/payment/PaymentHistory'
import OrderDetail from './pages/orders/OrderDetail'
import PayPalReturn from './pages/payment/PayPalReturn'

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/medicine" element={<MedicineList />} />
          <Route path="/medicine/:id" element={<MedicineDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          <Route path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          
          <Route path="/patient/dashboard" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/shipper/dashboard"
            element={
              <ProtectedRoute allowedRoles={['shipper']}>
                <ShipperDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin', 'shipper']}>
                <Profile />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProfileOverview />} />
            <Route path="personal-info" element={<ProfilePersonalInfo />} />
            <Route path="address-book" element={<ProfileAddressBook />} />
            <Route path="security" element={<ProfileSecurity />} />
          </Route>
                
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout/payment/:orderId"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['patient', 'admin']}>
                <PaymentHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={['patient', 'admin', 'shipper']}>
                <OrderDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/paypal/return"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PayPalReturn />
              </ProtectedRoute>
            }
          />
          
          <Route path="/account" element={<div style={{ padding: '4rem 2rem' }}>Account Management</div>} />
          <Route path="/placeholder-1" element={<div style={{ padding: '4rem 2rem' }}>Placeholder 1</div>} />
          <Route path="/placeholder-2" element={<div style={{ padding: '4rem 2rem' }}>Placeholder 2</div>} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </CartProvider>
  )
}