import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/public/Home'
import MedicineList from './pages/public/MedicineList'
import MedicineDetail from './pages/public/MedicineDetail'
import Cart from './pages/public/Cart'
import Login from './pages/public/Login'
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
          <Route path="/login" element={<Login />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </CartProvider>
  )
}