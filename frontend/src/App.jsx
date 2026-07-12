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
          
          <Route path="/account" element={<div style={{ padding: '4rem 2rem' }}>Account Management</div>} />
          <Route path="/placeholder-1" element={<div style={{ padding: '4rem 2rem' }}>Placeholder 1</div>} />
          <Route path="/placeholder-2" element={<div style={{ padding: '4rem 2rem' }}>Placeholder 2</div>} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </CartProvider>
  )
}