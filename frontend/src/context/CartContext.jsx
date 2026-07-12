import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearServerCart,
  mergeCart,
} from '../services/cartService'

const CartContext = createContext(null)

const CART_KEY = 'medicare_cart'

function getLocalCart() {
  try {
    const savedCart = localStorage.getItem(CART_KEY)
    return savedCart ? JSON.parse(savedCart) : []
  } catch {
    return []
  }
}

function saveLocalCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

function clearLocalCart() {
  localStorage.removeItem(CART_KEY)
}

function normalizeServerCart(serverCart) {
  return serverCart?.items || []
}

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth()

  const [cartItems, setCartItems] = useState([])
  const [serverCart, setServerCart] = useState(null)
  const [loadingCart, setLoadingCart] = useState(false)
  const [cartError, setCartError] = useState('')

  const isPatient = user?.role?.toLowerCase() === 'patient'

  useEffect(() => {
    async function loadCart() {
      setCartError('')

      if (!isAuthenticated) {
        setCartItems(getLocalCart())
        setServerCart(null)
        return
      }

      if (!isPatient) {
        setCartItems([])
        setServerCart(null)
        return
      }

      try {
        setLoadingCart(true)

        const localItems = getLocalCart()

        if (localItems.length > 0) {
          const mergeItems = localItems.map(item => ({
            medicine: item.medicine_id || item.medicine,
            quantity: item.quantity,
          }))

          const mergedCart = await mergeCart(mergeItems)

          setServerCart(mergedCart)
          setCartItems(normalizeServerCart(mergedCart))
          clearLocalCart()
          return
        }

        const cart = await getCart()

        setServerCart(cart)
        setCartItems(normalizeServerCart(cart))
      } catch (err) {
        setCartError(
          err.response?.data?.detail ||
            'Could not load cart.'
        )
      } finally {
        setLoadingCart(false)
      }
    }

    loadCart()
  }, [isAuthenticated, isPatient])

  async function refreshServerCart() {
    const cart = await getCart()
    setServerCart(cart)
    setCartItems(normalizeServerCart(cart))
    return cart
  }

  async function addToCart(medicine, quantity = 1) {
    setCartError('')

    const medicineId = medicine.medicine_id || medicine.medicine

    if (!medicineId) {
      setCartError('Invalid medicine.')
      return
    }

    if (!isAuthenticated) {
      setCartItems(prevItems => {
        const existingItem = prevItems.find(
          item => item.medicine_id === medicineId || item.medicine === medicineId
        )

        let updatedItems

        if (existingItem) {
          updatedItems = prevItems.map(item => {
            const itemMedicineId = item.medicine_id || item.medicine

            if (itemMedicineId !== medicineId) return item

            const stock = medicine.medicine_stock ?? item.medicine_stock ?? 9999

            return {
              ...item,
              quantity: Math.min(item.quantity + quantity, stock),
            }
          })
        } else {
          updatedItems = [
            ...prevItems,
            {
              medicine_id: medicine.medicine_id,
              medicine: medicine.medicine_id,
              medicine_name: medicine.medicine_name,
              medicine_price: medicine.medicine_price,
              medicine_image: medicine.medicine_image,
              medicine_stock: medicine.medicine_stock,
              quantity,
            },
          ]
        }

        saveLocalCart(updatedItems)
        return updatedItems
      })

      return
    }

    if (!isPatient) {
      setCartError('Only patients can add medicines to cart.')
      return
    }

    try {
      const cart = await addCartItem(medicineId, quantity)

      setServerCart(cart)
      setCartItems(normalizeServerCart(cart))
    } catch (err) {
      setCartError(
        err.response?.data?.quantity ||
          err.response?.data?.detail ||
          'Could not add item to cart.'
      )
    }
  }

  async function updateQuantity(itemId, quantity) {
    setCartError('')

    const newQuantity = Number(quantity)

    if (newQuantity <= 0) {
      await removeFromCart(itemId)
      return
    }

    if (!isAuthenticated) {
      setCartItems(prevItems => {
        const updatedItems = prevItems.map(item => {
          const localItemId = item.medicine_id || item.medicine

          if (localItemId !== itemId) return item

          const stock = item.medicine_stock ?? 9999

          return {
            ...item,
            quantity: Math.min(newQuantity, stock),
          }
        })

        saveLocalCart(updatedItems)
        return updatedItems
      })

      return
    }

    try {
      await updateCartItem(itemId, newQuantity)
      await refreshServerCart()
    } catch (err) {
      setCartError(
        err.response?.data?.quantity ||
          err.response?.data?.detail ||
          'Could not update cart item.'
      )
    }
  }

  async function removeFromCart(itemId) {
    setCartError('')

    if (!isAuthenticated) {
      setCartItems(prevItems => {
        const updatedItems = prevItems.filter(item => {
          const localItemId = item.medicine_id || item.medicine
          return localItemId !== itemId
        })

        saveLocalCart(updatedItems)
        return updatedItems
      })

      return
    }

    try {
      await removeCartItem(itemId)
      await refreshServerCart()
    } catch (err) {
      setCartError(
        err.response?.data?.detail ||
          'Could not remove cart item.'
      )
    }
  }

  async function clearCart() {
    setCartError('')

    if (!isAuthenticated) {
      setCartItems([])
      clearLocalCart()
      return
    }

    try {
      await clearServerCart()
      setCartItems([])
      setServerCart(prev =>
        prev
          ? {
              ...prev,
              items: [],
              total_amount: '0.00',
              total_items: 0,
            }
          : null
      )
    } catch (err) {
      setCartError(
        err.response?.data?.detail ||
          'Could not clear cart.'
      )
    }
  }

  const totalAmount = useMemo(() => {
    if (serverCart?.total_amount && isAuthenticated) {
      return Number(serverCart.total_amount)
    }

    return cartItems.reduce((total, item) => {
      const price = Number(item.medicine_price || 0)
      return total + price * item.quantity
    }, 0)
  }, [cartItems, serverCart, isAuthenticated])

  const totalItems = useMemo(() => {
    if (serverCart?.total_items && isAuthenticated) {
      return Number(serverCart.total_items)
    }

    return cartItems.reduce((total, item) => {
      return total + item.quantity
    }, 0)
  }, [cartItems, serverCart, isAuthenticated])

  const value = {
    cartItems,
    serverCart,
    loadingCart,
    cartError,
    totalAmount,
    totalItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshServerCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used inside CartProvider')
  }

  return context
}