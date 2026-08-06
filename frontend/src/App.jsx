import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react';
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
import ShipperOrderDetail from './pages/shipper/ShipperOrderDetail'
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
import DoctorDetail from './pages/patient/DoctorDetail'
import BookingForm from './pages/patient/BookingForm'
import AppointmentPaymentPage from './pages/patient/AppointmentPaymentPage'
import BookingConfirmation from './pages/patient/BookingConfirmation'
import AppointmentPayPalReturn from './pages/patient/AppointmentPayPalReturn'
import MyAppointments from './pages/patient/MyAppointments'
import DoctorList from './pages/patient/DoctorList'
import DoctorCheckupPage from './pages/doctor/DoctorCheckupPage'
import PatientPrescription from './pages/patient/PatientPrescription'
import AppointmentFinalPaymentPage from './pages/payment/AppointmentFinalPaymentPage'
import AppointmentFinalPaymentResult from './pages/payment/AppointmentFinalPaymentResult'
import AppointmentFinalPayPalReturn from './pages/payment/AppointmentFinalPayPalReturn'
import DoctorAppointmentRecord from './pages/doctor/DoctorAppointmentRecord'
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage'
import DoctorSchedulePage from './pages/doctor/DoctorSchedulePage'
import NurseDashboard from './pages/nurse/NurseDashboard' 
import NursePharmacyQueue from './pages/nurse/NursePharmacyQueue' 
import NursePharmacyDetail from './pages/nurse/NursePharmacyDetail'
import NursePharmacyPayPalReturn from './pages/nurse/NursePharmacyPayPalReturn'
import TermsOfService from './pages/public/TermsOfService'
import PrivacyPolicy from './pages/public/PrivacyPolicy'
import ContactUs from './pages/public/ContactUs'
import Services from './pages/public/Services'
import About from './pages/public/About'
import {
  listenForForegroundMessages,
} from './firebase';
import NurseMedicineOrders from './pages/nurse/NurseMedicineOrders'
import NurseMedicineOrderDetail from './pages/nurse/NurseMedicineOrderDetail'
import PatientMedicineOrders from './pages/patient/PatientMedicineOrders'
import NotificationsPage from './pages/shared/NotificationsPage'
import ForegroundNotification from './components/ForegroundNotification'
import AdminUsers from './pages/admin/AdminUsers'
import AdminDoctors from './pages/admin/AdminDoctors'
import AdminMedicines from './pages/admin/AdminMedicines'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminPrescriptions from './pages/admin/AdminPrescriptions'
import AdminOrders from './pages/admin/AdminOrders'
import AdminPayments from './pages/admin/AdminPayments'
import AdminNotifications from './pages/admin/AdminNotifications'

export default function App() {
  const [
      foregroundNotification,
      setForegroundNotification,
    ] = useState(null)

    useEffect(() => {
      let unsubscribe = () => {}

      async function startListener() {
        unsubscribe =
          await listenForForegroundMessages(
            payload => {
              setForegroundNotification(
                payload
              )

              window.dispatchEvent(
                new CustomEvent(
                  'medicare:notification-received',
                  {
                    detail: payload,
                  }
                )
              )
            }
          )
      }

      startListener()

      return () => {
        unsubscribe()
      }
    }, [])

  return (
    <CartProvider>
      <BrowserRouter>
        <Navbar />
        <ForegroundNotification payload={foregroundNotification} onClose={() => setForegroundNotification(null)}/>
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
            path="/shipper/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={['shipper']}>
                <ShipperOrderDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'nurse', 'admin', 'shipper']}>
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

          <Route path="/doctors/:slug" element={<DoctorDetail />} />

          <Route
            path="/booking/:slug"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <BookingForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointment-payment/:appointmentId"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppointmentPaymentPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/confirmation/:id"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/appointment-paypal/return"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppointmentPayPalReturn />
              </ProtectedRoute>
            }
          />


          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />


          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorSchedulePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/appointments"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAppointmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/appointments/today"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAppointmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/appointments/history"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAppointmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/appointments/:appointmentId/checkup"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorCheckupPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor/appointments/:appointmentId/record"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAppointmentRecord />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/appointments/:id/prescription"
            element={<PatientPrescription />}
          />
          

          <Route
            path="/appointment-final-payment/:appointmentId"
            element={<AppointmentFinalPaymentPage />}
          />

          <Route
            path="/appointment-final-payment/:appointmentId/success"
            element={<AppointmentFinalPaymentResult statusType="success" />}
          />

          <Route
            path="/appointment-final-payment/:appointmentId/failed"
            element={<AppointmentFinalPaymentResult statusType="failed" />}
          />

          <Route
            path="/appointment-final-paypal/return"
            element={<AppointmentFinalPayPalReturn />}
          />

          <Route 
            path="/nurse/dashboard" 
            element={ 
              <ProtectedRoute allowedRoles={['nurse']}> 
                <NurseDashboard /> 
              </ProtectedRoute> 
            } 
          /> 
           
          <Route 
            path="/nurse/pharmacy" 
            element={ 
              <ProtectedRoute allowedRoles={['nurse']}> 
                <NursePharmacyQueue /> 
              </ProtectedRoute> 
            } 
          /> 
           
          <Route 
            path="/nurse/pharmacy/:prescriptionId" 
            element={ 
              <ProtectedRoute allowedRoles={['nurse']}> 
                <NursePharmacyDetail /> 
              </ProtectedRoute> 
            } 
          />

          <Route
            path="/nurse-payment/paypal-return"
            element={<NursePharmacyPayPalReturn />}
          />

          <Route
            path="/nurse/medicine-orders"
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseMedicineOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nurse/medicine-orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseMedicineOrderDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient/medicine-orders"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientMedicineOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                allowedRoles={['patient']}
              >
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/doctors" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDoctors /></ProtectedRoute>
          } />
          <Route path="/admin/medicines" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminMedicines /></ProtectedRoute>
          } />
          <Route path="/admin/appointments" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminAppointments /></ProtectedRoute>
          } />
          <Route path="/admin/prescriptions" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminPrescriptions /></ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminPayments /></ProtectedRoute>
          } />
          <Route path="/admin/notifications" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>
          } />


          <Route path="/doctors" element={<DoctorList />} />
          <Route path="/account" element={<div style={{ padding: '4rem 2rem' }}>Account Management</div>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </CartProvider>
  )
}