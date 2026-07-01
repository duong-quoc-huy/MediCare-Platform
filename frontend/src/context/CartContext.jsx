import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('medicare_cart')
    return savedCart ? JSON.parse(savedCart) : []
  })

  useEffect(() => {
    localStorage.setItem('medicare_cart', JSON.stringify(cartItems))
  }, [cartItems])

  function addToCart(medicine) {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(
        item => item.medicine_id === medicine.medicine_id
      )

      if (existingItem) {
        return prevItems.map(item =>
          item.medicine_id === medicine.medicine_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prevItems, { ...medicine, quantity: 1 }]
    })
  }

  function increaseQuantity(id) {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    )
  }

  function decreaseQuantity(id) {
    setCartItems(prevItems =>
      prevItems
        .map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  function removeFromCart(id) {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id))
  }

  function clearCart() {
    setCartItems([])
  }

  const totalQuantity = cartItems.reduce((sum, item) => {
    return sum + item.quantity
  }, 0)

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + Number(item.medicine_price) * item.quantity
  }, 0)

  const value = {
    cartItems,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    totalQuantity,
    totalPrice,
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