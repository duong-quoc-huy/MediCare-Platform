import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, ShoppingBag, UserRound } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { createMedicineOrder } from '../../services/orderService'
import {
  createAddress,
  getAddresses,
} from '../../services/addressService'
import styles from './Checkout.module.css'
import {
  getProvinces,
  getWards,
} from '../../services/locationService'

function buildAddressString(address) {
  if (!address) return ''

  const parts = [
    address.street_address,
    address.ward_name,
    address.province_name,
    address.postal_code,
  ].filter(Boolean)

  return parts.join(', ')
}

function buildDeliveryAddress(recipientName, recipientPhone, addressText) {
  return [
    `Recipient: ${recipientName}`,
    `Phone: ${recipientPhone}`,
    `Address: ${addressText}`,
  ].join('\n')
}

export default function Checkout() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const {
    cartItems,
    totalAmount,
    totalItems,
  } = useCart()

  const [recipientName, setRecipientName] = useState(user?.full_name || '')
  const [recipientPhone, setRecipientPhone] = useState(user?.phone_number_1 || '')

  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [addressMode, setAddressMode] = useState('saved')

  const [provinces, setProvinces] = useState([])
  const [wards, setWards] = useState([])
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)

  const [newAddress, setNewAddress] = useState({
    label: '',
    street_address: '',
    ward_code: '',
    ward_name: '',
    province_code: '',
    province_name: '',
    postal_code: '',
    is_default: false,
  })

  const [saveNewAddress, setSaveNewAddress] = useState(true)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedAddress = useMemo(() => {
    return addresses.find(
      address => address.user_address_id === selectedAddressId
    )
  }, [addresses, selectedAddressId])

  useEffect(() => {
    if (user) {
      setRecipientName(user.full_name || '')
      setRecipientPhone(user.phone_number_1 || '')
    }
  }, [user])

  useEffect(() => {
    async function loadAddresses() {
      try {
        setLoadingAddresses(true)
        setError('')

        const data = await getAddresses()
        const list = Array.isArray(data) ? data : data.results || []

        setAddresses(list)

        if (list.length > 0) {
          const defaultAddress = list.find(address => address.is_default)

          setSelectedAddressId(
            defaultAddress?.user_address_id || list[0].user_address_id
          )

          setAddressMode('saved')
        } else {
          setAddressMode('new')
        }
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Could not load your address book.'
        )

        setAddressMode('new')
      } finally {
        setLoadingAddresses(false)
      }
    }

    if (isAuthenticated) {
      loadAddresses()
    }
  }, [isAuthenticated])

  useEffect(() => {
    async function loadProvinces() {
      try {
        setLoadingProvinces(true)

        const data = await getProvinces()
        const list = Array.isArray(data) ? data : data.results || []

        setProvinces(list)
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Could not load provinces.'
        )
      } finally {
        setLoadingProvinces(false)
      }
    }

    if (isAuthenticated) {
      loadProvinces()
    }
  }, [isAuthenticated])

  useEffect(() => {
    async function loadWards() {
      if (!newAddress.province_code) {
        setWards([])
        return
      }

      try {
        setLoadingWards(true)

        const data = await getWards(newAddress.province_code)
        const list = Array.isArray(data) ? data : data.results || []

        setWards(list)
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Could not load wards.'
        )
      } finally {
        setLoadingWards(false)
      }
    }

    if (addressMode === 'new') {
      loadWards()
    }
  }, [newAddress.province_code, addressMode])

  function handleNewAddressChange(e) {
    const { name, value, type, checked } = e.target

    setNewAddress(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleProvinceChange(e) {
    const provinceCode = e.target.value

    const selectedProvince = provinces.find(
      province => String(province.code) === String(provinceCode)
    )

    setNewAddress(prev => ({
      ...prev,
      province_code: provinceCode,
      province_name: selectedProvince?.full_name || selectedProvince?.name || '',
      ward_code: '',
      ward_name: '',
    }))
  }

  function handleWardChange(e) {
    const wardCode = e.target.value

    const selectedWard = wards.find(
      ward => String(ward.code) === String(wardCode)
    )

    setNewAddress(prev => ({
      ...prev,
      ward_code: wardCode,
      ward_name: selectedWard?.full_name || selectedWard?.name || '',
    }))
  }

  function validateRecipient() {
    if (!recipientName.trim()) {
      return 'Recipient name is required.'
    }

    if (!recipientPhone.trim()) {
      return 'Recipient phone number is required.'
    }

    if (!/^0\d{9}$/.test(recipientPhone.trim())) {
      return 'Phone number must be 10 digits and start with 0.'
    }

    return ''
  }

  function validateNewAddress() {
    if (!newAddress.label.trim()) {
      return 'Address label is required.'
    }

    if (!newAddress.street_address.trim()) {
      return 'Street address is required.'
    }

    if (!newAddress.province_code) {
      return 'Please select a province.'
    }

    if (!newAddress.ward_code) {
      return 'Please select a ward.'
    }

    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }

    const recipientError = validateRecipient()

    if (recipientError) {
      setError(recipientError)
      return
    }

    let addressText = ''

    try {
      setLoading(true)

      if (addressMode === 'saved') {
        if (!selectedAddress) {
          setError('Please select a delivery address.')
          setLoading(false)
          return
        }

        addressText = buildAddressString(selectedAddress)
      }

      if (addressMode === 'new') {
        const validationError = validateNewAddress()

        if (validationError) {
          setError(validationError)
          setLoading(false)
          return
        }

        const addressPayload = {
          label: newAddress.label.trim(),
          street_address: newAddress.street_address.trim(),
          ward_code: newAddress.ward_code,
          ward_name: newAddress.ward_name,
          province_code: newAddress.province_code,
          province_name: newAddress.province_name,
          postal_code: newAddress.postal_code.trim(),
          is_default: newAddress.is_default,
        }

        if (saveNewAddress) {
          const createdAddress = await createAddress(addressPayload)
          addressText = buildAddressString(createdAddress)
        } else {
          addressText = buildAddressString(addressPayload)
        }
      }

      const finalDeliveryAddress = buildDeliveryAddress(
        recipientName.trim(),
        recipientPhone.trim(),
        addressText
      )

      const orderData = {
        delivery_address: finalDeliveryAddress,
        items: cartItems.map(item => ({
          medicine: item.medicine || item.medicine_id,
          quantity: item.quantity,
        })),
      }

      const order = await createMedicineOrder(orderData)

      navigate(`/checkout/payment/${order.medicine_order_id}`, {
        replace: true,
      })
    } catch (err) {
      const data = err.response?.data

      if (data?.detail) {
        setError(data.detail)
      } else if (data?.items) {
        setError(Array.isArray(data.items) ? data.items.join(' ') : data.items)
      } else if (typeof data === 'object' && data !== null) {
        const firstError = Object.values(data).flat().join(' ')
        setError(firstError || 'Could not continue to payment.')
      } else {
        setError('Could not continue to payment. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCard}>
          <h1>Please login first</h1>
          <p>You need to login before checkout.</p>
          <Link to="/login" className={styles.primaryLink}>
            Go to login
          </Link>
        </div>
      </main>
    )
  }

  if (cartItems.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCard}>
          <ShoppingBag size={52} />
          <h1>Your cart is empty</h1>
          <p>Add medicines before checkout.</p>
          <Link to="/medicine" className={styles.primaryLink}>
            Continue shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link to="/cart" className={styles.backLink}>
          <ArrowLeft size={18} />
          Back to cart
        </Link>

        <h1>Checkout</h1>
        <p>Choose a delivery address before continuing to payment.</p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.sectionTitle}>
              <UserRound size={20} />
              <h2>Recipient Information</h2>
            </div>

            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label>Recipient name</label>
                <input
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="Nguyen Van A"
                />
              </div>

              <div className={styles.field}>
                <label>Phone number</label>
                <input
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            </div>

            <div className={styles.sectionTitle}>
              <MapPin size={20} />
              <h2>Delivery Address</h2>
            </div>

            {loadingAddresses ? (
              <div className={styles.infoBox}>
                Loading your saved addresses...
              </div>
            ) : (
              <>
                {addresses.length > 0 && (
                  <div className={styles.modeTabs}>
                    <button
                      type="button"
                      className={
                        addressMode === 'saved'
                          ? styles.activeTab
                          : styles.modeTab
                      }
                      onClick={() => setAddressMode('saved')}
                    >
                      Saved addresses
                    </button>

                    <button
                      type="button"
                      className={
                        addressMode === 'new'
                          ? styles.activeTab
                          : styles.modeTab
                      }
                      onClick={() => setAddressMode('new')}
                    >
                      Use new address
                    </button>
                  </div>
                )}

                {addressMode === 'saved' && addresses.length > 0 && (
                  <div className={styles.addressGrid}>
                    {addresses.map(address => (
                      <label
                        key={address.user_address_id}
                        className={
                          selectedAddressId === address.user_address_id
                            ? `${styles.addressCard} ${styles.selectedAddressCard}`
                            : styles.addressCard
                        }
                      >
                        <input
                          type="radio"
                          name="selectedAddress"
                          value={address.user_address_id}
                          checked={selectedAddressId === address.user_address_id}
                          onChange={() =>
                            setSelectedAddressId(address.user_address_id)
                          }
                        />

                        <div>
                          <div className={styles.addressHeader}>
                            <strong>{address.label}</strong>

                            {address.is_default && (
                              <span>Default</span>
                            )}
                          </div>

                          <p>{address.street_address}</p>
                          <p>{address.ward_name}</p>
                          <p>{address.province_name}</p>

                          {address.postal_code && (
                            <p>Postal code: {address.postal_code}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {addressMode === 'saved' && selectedAddress && (
                  <div className={styles.selectedPreview}>
                    <strong>Deliver to:</strong>
                    <p>
                      {buildDeliveryAddress(
                        recipientName || 'Recipient name',
                        recipientPhone || 'Phone number',
                        buildAddressString(selectedAddress)
                      )}
                    </p>
                  </div>
                )}

                {addressMode === 'new' && (
                  <div className={styles.newAddressForm}>
                    <div className={styles.field}>
                      <label>Label</label>
                      <input
                        name="label"
                        value={newAddress.label}
                        onChange={handleNewAddressChange}
                        placeholder="Home, Workplace, Mom's home..."
                      />
                    </div>

                    <div className={styles.field}>
                      <label>Street address</label>
                      <input
                        name="street_address"
                        value={newAddress.street_address}
                        onChange={handleNewAddressChange}
                        placeholder="House number, street name..."
                      />
                    </div>

                    <div className={styles.twoColumns}>
                      <div className={styles.field}>
                        <label>Province</label>
                        <select
                          value={newAddress.province_code}
                          onChange={handleProvinceChange}
                          disabled={loadingProvinces}
                        >
                          <option value="">
                            {loadingProvinces ? 'Loading provinces...' : 'Select province'}
                          </option>

                          {provinces.map(province => (
                            <option
                              key={province.code}
                              value={province.code}
                            >
                              {province.full_name || province.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label>Ward</label>
                        <select
                          value={newAddress.ward_code}
                          onChange={handleWardChange}
                          disabled={!newAddress.province_code || loadingWards}
                        >
                          <option value="">
                            {loadingWards ? 'Loading wards...' : 'Select ward'}
                          </option>

                          {wards.map(ward => (
                            <option
                              key={ward.code}
                              value={ward.code}
                            >
                              {ward.full_name || ward.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label>Postal code</label>
                      <input
                        name="postal_code"
                        value={newAddress.postal_code}
                        onChange={handleNewAddressChange}
                        placeholder="Optional"
                      />
                    </div>

                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={e => setSaveNewAddress(e.target.checked)}
                      />
                      <span>Save this address to my address book</span>
                    </label>

                    {saveNewAddress && (
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={newAddress.is_default}
                          onChange={handleNewAddressChange}
                        />
                        <span>Set as default address</span>
                      </label>
                    )}
                  </div>
                )}

                {addresses.length === 0 && addressMode === 'new' && (
                  <div className={styles.infoBox}>
                    You do not have any saved address yet. Add one below to continue.
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || loadingAddresses}
            >
              {loading ? 'Creating order...' : 'Continue to payment'}
            </button>
          </form>
        </section>

        <aside className={styles.summaryCard}>
          <h2>Order Summary</h2>

          <div className={styles.itemsList}>
            {cartItems.map(item => {
              const itemId = item.cart_item_id || item.medicine_id || item.medicine
              const price = Number(item.medicine_price || item.unit_price || 0)
              const subtotal = price * item.quantity

              return (
                <div key={itemId} className={styles.summaryItem}>
                  {item.medicine_image && (
                    <img
                      src={item.medicine_image}
                      alt={item.medicine_name}
                    />
                  )}

                  <div>
                    <h3>{item.medicine_name}</h3>
                    <p>
                      {item.quantity} × {price.toLocaleString()} VND
                    </p>
                  </div>

                  <strong>{subtotal.toLocaleString()} VND</strong>
                </div>
              )
            })}
          </div>

          <div className={styles.summaryRow}>
            <span>Total items</span>
            <strong>{totalItems}</strong>
          </div>

          <div className={styles.summaryRow}>
            <span>Total amount</span>
            <strong>{Number(totalAmount).toLocaleString()} VND</strong>
          </div>
        </aside>
      </div>
    </main>
  )
}