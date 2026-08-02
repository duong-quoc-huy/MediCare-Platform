import {useEffect, useMemo, useState} from 'react'
import { Link, useNavigate} from 'react-router-dom'
import { ArrowLeft, MapPin, ShoppingBag, UserRound} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { calculateMedicineShippingFee,  createMedicineOrder } from '../../services/orderService'
import { createAddress, getAddresses} from '../../services/addressService'
import { getProvinces, getWards} from '../../services/locationService'
import styles from './Checkout.module.css'

function buildAddressString(address) {
  if (!address) {
    return ''
  }

  return [
    address.street_address,
    address.ward_name,
    address.province_name,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(', ')
}

function normalizeListResponse(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

function getMedicineId(item) {
  return (
    item.medicine ||
    item.medicine_id ||
    item.id ||
    ''
  )
}

function getErrorMessage(error) {
  const data = error.response?.data

  if (!data) {
    return (
      'Could not continue to payment. ' +
      'Please try again.'
    )
  }

  if (typeof data === 'string') {
    return data
  }

  if (data.detail) {
    return Array.isArray(data.detail)
      ? data.detail.join(' ')
      : String(data.detail)
  }

  if (data.user_address_id) {
    return Array.isArray(data.user_address_id)
      ? data.user_address_id.join(' ')
      : String(data.user_address_id)
  }

  if (data.shipping) {
    return Array.isArray(data.shipping)
      ? data.shipping.join(' ')
      : String(data.shipping)
  }

  if (data.items) {
    if (Array.isArray(data.items)) {
      return data.items
        .map(itemError => {
          if (
            typeof itemError === 'object' &&
            itemError !== null
          ) {
            return Object.values(itemError)
              .flat(Infinity)
              .join(' ')
          }

          return String(itemError)
        })
        .join(' ')
    }

    return String(data.items)
  }

  if (
    typeof data === 'object' &&
    data !== null
  ) {
    const message = Object.values(data)
      .flat(Infinity)
      .map(value => String(value))
      .join(' ')

    if (message) {
      return message
    }
  }

  return (
    'Could not continue to payment. ' +
    'Please try again.'
  )
}

export default function Checkout() {
  const navigate = useNavigate()

  const {isAuthenticated, user} = useAuth()
  const { cartItems, totalAmount, totalItems } = useCart()
  const [ recipientName, setRecipientName ] = useState( user?.full_name || '')
  const [ recipientPhone, setRecipientPhone ] = useState( user?.phone_number_1 || '')
  const [ addresses, setAddresses ] = useState([])
  const [ selectedAddressId, setSelectedAddressId] = useState('')
  const [ addressMode, setAddressMode] = useState('saved')
  const [ provinces, setProvinces] = useState([])
  const [ wards, setWards] = useState([])
  const [ loadingProvinces, setLoadingProvinces] = useState(false)
  const [ loadingWards, setLoadingWards ] = useState(false)
  const [
    newAddress,
    setNewAddress,
  ] = useState({
    label: '',
    street_address: '',
    ward_code: '',
    ward_name: '',
    province_code: '',
    province_name: '',
    postal_code: '',
    is_default: false,
  })

  const [ loadingAddresses, setLoadingAddresses] = useState(true)
  const [ loading, setLoading] = useState(false)
  const [ error, setError ] = useState('')

  const [ shippingQuote, setShippingQuote ] = useState(null)
  const [ loadingShipping, setLoadingShipping ] = useState(false)
  const [ shippingError, setShippingError ] = useState('')

  const selectedAddress = useMemo(() => {
    return addresses.find(
      address =>
        String(address.user_address_id) ===
        String(selectedAddressId)
    )
  }, [
    addresses,
    selectedAddressId,
  ])

  const checkoutItems = useMemo(() => {
    return cartItems.map(item => ({
      medicine: getMedicineId(item),
      quantity: Number(item.quantity),
    }))
  }, [cartItems])

  useEffect(() => {
    if (!user) {
      return
    }

    setRecipientName(
      user.full_name || ''
    )

    setRecipientPhone(
      user.phone_number_1 || ''
    )
  }, [user])

  useEffect(() => {
    async function loadAddresses() {
      try {
        setLoadingAddresses(true)
        setError('')

        const data = await getAddresses()
        const list =
          normalizeListResponse(data)

        setAddresses(list)

        if (list.length > 0) {
          const defaultAddress =
            list.find(
              address =>
                address.is_default
            ) || list[0]

          setSelectedAddressId(
            defaultAddress.user_address_id
          )

          setAddressMode('saved')
        } else {
          setSelectedAddressId('')
          setAddressMode('new')
        }
      } catch (err) {
        console.error(
          'Could not load addresses:',
          err
        )

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
    let cancelled = false

    async function loadShippingQuote() {
      if (
        !isAuthenticated ||
        addressMode !== 'saved' ||
        !selectedAddressId ||
        checkoutItems.length === 0
      ) {
        setShippingQuote(null)
        setShippingError('')
        return
      }

      const hasInvalidItem =
        checkoutItems.some(
          item =>
            !item.medicine ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        )

      if (hasInvalidItem) {
        setShippingQuote(null)
        setShippingError(
          'Could not calculate shipping because ' +
          'one or more cart items are invalid.'
        )
        return
      }

      try {
        setLoadingShipping(true)
        setShippingError('')

        const data =
          await calculateMedicineShippingFee({
            user_address_id:
              selectedAddressId,

            items: checkoutItems,

            transport: 'road',
          })

        if (!cancelled) {
          setShippingQuote(data)
        }
      } catch (err) {
        console.error(
          'Could not calculate shipping fee:',
          err.response?.data || err
        )

        if (!cancelled) {
          setShippingQuote(null)

          setShippingError(
            getErrorMessage(err)
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingShipping(false)
        }
      }
    }

    loadShippingQuote()

    return () => {
      cancelled = true
    }
  }, [
    isAuthenticated,
    addressMode,
    selectedAddressId,
    checkoutItems,
  ])

  useEffect(() => {
    async function loadProvinces() {
      try {
        setLoadingProvinces(true)

        const data =
          await getProvinces()

        setProvinces(
          normalizeListResponse(data)
        )
      } catch (err) {
        console.error(
          'Could not load provinces:',
          err
        )

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
      if (
        !newAddress.province_code
      ) {
        setWards([])
        return
      }

      try {
        setLoadingWards(true)

        const data =
          await getWards(
            newAddress.province_code
          )

        setWards(
          normalizeListResponse(data)
        )
      } catch (err) {
        console.error(
          'Could not load wards:',
          err
        )

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
  }, [
    newAddress.province_code,
    addressMode,
  ])

  function handleNewAddressChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setNewAddress(previous => ({
      ...previous,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))

    setError('')
  }

  function handleProvinceChange(event) {
    const provinceCode =
      event.target.value

    const selectedProvince =
      provinces.find(
        province =>
          String(province.code) ===
          String(provinceCode)
      )

    setNewAddress(previous => ({
      ...previous,
      province_code: provinceCode,
      province_name:
        selectedProvince?.full_name ||
        selectedProvince?.name ||
        '',
      ward_code: '',
      ward_name: '',
    }))

    setWards([])
    setError('')
  }

  function handleWardChange(event) {
    const wardCode =
      event.target.value

    const selectedWard =
      wards.find(
        ward =>
          String(ward.code) ===
          String(wardCode)
      )

    setNewAddress(previous => ({
      ...previous,
      ward_code: wardCode,
      ward_name:
        selectedWard?.full_name ||
        selectedWard?.name ||
        '',
    }))

    setError('')
  }

  function validateProfileInformation() {
    if (!recipientName.trim()) {
      return (
        'Your profile does not contain ' +
        'a recipient name.'
      )
    }

    if (!recipientPhone.trim()) {
      return (
        'Your profile does not contain ' +
        'a phone number.'
      )
    }

    if (
      !/^0\d{9}$/.test(
        recipientPhone.trim()
      )
    ) {
      return (
        'Your profile phone number must ' +
        'contain 10 digits and start with 0.'
      )
    }

    return ''
  }

  function validateNewAddress() {
    if (!newAddress.label.trim()) {
      return 'Address label is required.'
    }

    if (
      !newAddress.street_address.trim()
    ) {
      return 'Street address is required.'
    }

    if (
      !newAddress.province_code ||
      !newAddress.province_name
    ) {
      return 'Please select a province.'
    }

    if (
      !newAddress.ward_code ||
      !newAddress.ward_name
    ) {
      return 'Please select a ward.'
    }

    return ''
  }

  async function createCheckoutAddress() {
    const validationError =
      validateNewAddress()

    if (validationError) {
      throw new Error(validationError)
    }

    const addressPayload = {
      label:
        newAddress.label.trim(),

      street_address:
        newAddress.street_address.trim(),

      ward_code:
        newAddress.ward_code,

      ward_name:
        newAddress.ward_name,

      province_code:
        newAddress.province_code,

      province_name:
        newAddress.province_name,

      postal_code:
        newAddress.postal_code.trim(),

      is_default:
        newAddress.is_default,
    }

    const createdAddress =
      await createAddress(
        addressPayload
      )

    if (
      !createdAddress?.user_address_id
    ) {
      throw new Error(
        'The new address was created, but ' +
        'the backend did not return its ID.'
      )
    }

    setAddresses(previous => [
      ...previous,
      createdAddress,
    ])

    setSelectedAddressId(
      createdAddress.user_address_id
    )

    return createdAddress
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.')
      return
    }

    const profileError =
      validateProfileInformation()

    if (profileError) {
      setError(profileError)
      return
    }

    try {
      setLoading(true)

      let finalAddressId = ''

      if (addressMode === 'saved') {
          if (!selectedAddress) {
            throw new Error(
              'Please select a delivery address.'
            )
          }

          if (loadingShipping) {
            throw new Error(
              'Please wait while the shipping fee ' +
              'is being calculated.'
            )
          }

          if (!shippingQuote) {
            throw new Error(
              shippingError ||
              'The shipping fee could not be calculated.'
            )
          }

          finalAddressId =
            selectedAddress.user_address_id
        } else {
        const createdAddress =
          await createCheckoutAddress()

        finalAddressId =
          createdAddress.user_address_id
      }

      if (!finalAddressId) {
        throw new Error(
          'A valid delivery address is required.'
        )
      }

      const items = checkoutItems

      const invalidItem =
        items.find(
          item =>
            !item.medicine ||
            !Number.isInteger(
              item.quantity
            ) ||
            item.quantity < 1
        )

      if (invalidItem) {
        throw new Error(
          'One or more cart items contain ' +
          'invalid medicine or quantity data.'
        )
      }

      const orderData = {
        user_address_id:
          finalAddressId,

        delivery_notes: '',

        items,
      }

      console.log(
        'Creating medicine order:',
        orderData
      )

      const order =
        await createMedicineOrder(
          orderData
        )

      if (
        !order?.medicine_order_id
      ) {
        throw new Error(
          'The order was created, but the ' +
          'backend did not return an order ID.'
        )
      }

      navigate(
        `/checkout/payment/${order.medicine_order_id}`,
        {
          replace: true,
        }
      )
    } catch (err) {
      console.error(
        'Medicine order creation failed:',
        err.response?.status,
        err.response?.data,
        err
      )

      if (
        !err.response &&
        err.message
      ) {
        setError(err.message)
      } else {
        setError(
          getErrorMessage(err)
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const previewMedicineSubtotal = Number(shippingQuote?.medicine_subtotal ?? totalAmount ?? 0)
  const previewShippingFee = Number(shippingQuote?.total_shipping_fee ?? 0)
  const previewGrandTotal = previewMedicineSubtotal + previewShippingFee

  if (!isAuthenticated) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyCard}>
          <h1>Please login first</h1>

          <p>
            You need to log in before
            checkout.
          </p>

          <Link
            to="/login"
            className={styles.primaryLink}
          >
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

          <p>
            Add medicines before checkout.
          </p>

          <Link
            to="/medicine"
            className={styles.primaryLink}
          >
            Continue shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link
          to="/cart"
          className={styles.backLink}
        >
          <ArrowLeft size={18} />
          Back to cart
        </Link>

        <h1>Checkout</h1>

        <p>
          Choose a delivery address before
          continuing to payment.
        </p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <form
            onSubmit={handleSubmit}
            className={styles.form}
          >
            <div
              className={styles.sectionTitle}
            >
              <UserRound size={20} />
              <h2>Recipient Information</h2>
            </div>

            <div
              className={styles.twoColumns}
            >
              <div className={styles.field}>
                <label>Recipient name</label>

                <input
                  value={recipientName}
                  readOnly
                  placeholder="Nguyen Van A"
                />
              </div>

              <div className={styles.field}>
                <label>Phone number</label>

                <input
                  value={recipientPhone}
                  readOnly
                  placeholder="0901234567"
                />
              </div>
            </div>

            <div className={styles.infoBox}>
              Recipient information is taken
              from your MediCare profile. Update
              your profile before checkout when
              this information is incorrect.
            </div>

            <div
              className={styles.sectionTitle}
            >
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
                  <div
                    className={styles.modeTabs}
                  >
                    <button
                      type="button"
                      className={
                        addressMode === 'saved'
                          ? styles.activeTab
                          : styles.modeTab
                      }
                      onClick={() => {
                        setAddressMode('saved')
                        setError('')
                      }}
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
                      onClick={() => {
                        setAddressMode('new')
                        setShippingQuote(null)
                        setShippingError('')
                        setError('')
                      }}
                    >
                      Add new address
                    </button>
                  </div>
                )}

                {addressMode === 'saved' &&
                  addresses.length > 0 && (
                    <div
                      className={
                        styles.addressGrid
                      }
                    >
                      {addresses.map(
                        address => (
                          <label
                            key={
                              address.user_address_id
                            }
                            className={
                              String(
                                selectedAddressId
                              ) ===
                              String(
                                address.user_address_id
                              )
                                ? `${styles.addressCard} ${styles.selectedAddressCard}`
                                : styles.addressCard
                            }
                          >
                            <input
                              type="radio"
                              name="selectedAddress"
                              value={
                                address.user_address_id
                              }
                              checked={
                                String(
                                  selectedAddressId
                                ) ===
                                String(
                                  address.user_address_id
                                )
                              }
                              onChange={() => {
                                setSelectedAddressId(
                                  address.user_address_id
                                )

                                setError('')
                              }}
                            />

                            <div>
                              <div
                                className={
                                  styles.addressHeader
                                }
                              >
                                <strong>
                                  {address.label ||
                                    'Saved address'}
                                </strong>

                                {address.is_default && (
                                  <span>
                                    Default
                                  </span>
                                )}
                              </div>

                              <p>
                                {
                                  address.street_address
                                }
                              </p>

                              <p>
                                {address.ward_name}
                              </p>

                              <p>
                                {
                                  address.province_name
                                }
                              </p>

                              {address.postal_code && (
                                <p>
                                  Postal code:{' '}
                                  {
                                    address.postal_code
                                  }
                                </p>
                              )}
                            </div>
                          </label>
                        )
                      )}
                    </div>
                  )}

                {addressMode === 'saved' &&
                  selectedAddress && (
                    <div
                      className={
                        styles.selectedPreview
                      }
                    >
                      <strong>
                        Deliver to:
                      </strong>

                      <p>
                        {recipientName}
                        {'\n'}
                        {recipientPhone}
                        {'\n'}
                        {buildAddressString(
                          selectedAddress
                        )}
                      </p>
                    </div>
                  )}

                {addressMode === 'new' && (
                  <div
                    className={
                      styles.newAddressForm
                    }
                  >
                    {addresses.length === 0 && (
                      <div
                        className={
                          styles.infoBox
                        }
                      >
                        You do not have a saved
                        address yet. Add one below
                        to continue.
                      </div>
                    )}

                    <div
                      className={styles.field}
                    >
                      <label>
                        Address label
                      </label>

                      <input
                        name="label"
                        value={
                          newAddress.label
                        }
                        onChange={
                          handleNewAddressChange
                        }
                        placeholder="Home, Workplace..."
                      />
                    </div>

                    <div
                      className={styles.field}
                    >
                      <label>
                        Street address
                      </label>

                      <input
                        name="street_address"
                        value={
                          newAddress.street_address
                        }
                        onChange={
                          handleNewAddressChange
                        }
                        placeholder="House number, street name..."
                      />
                    </div>

                    <div
                      className={
                        styles.twoColumns
                      }
                    >
                      <div
                        className={styles.field}
                      >
                        <label>Province</label>

                        <select
                          value={
                            newAddress.province_code
                          }
                          onChange={
                            handleProvinceChange
                          }
                          disabled={
                            loadingProvinces
                          }
                        >
                          <option value="">
                            {loadingProvinces
                              ? 'Loading provinces...'
                              : 'Select province'}
                          </option>

                          {provinces.map(
                            province => (
                              <option
                                key={
                                  province.code
                                }
                                value={
                                  province.code
                                }
                              >
                                {province.full_name ||
                                  province.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div
                        className={styles.field}
                      >
                        <label>Ward</label>

                        <select
                          value={
                            newAddress.ward_code
                          }
                          onChange={
                            handleWardChange
                          }
                          disabled={
                            !newAddress.province_code ||
                            loadingWards
                          }
                        >
                          <option value="">
                            {loadingWards
                              ? 'Loading wards...'
                              : 'Select ward'}
                          </option>

                          {wards.map(ward => (
                            <option
                              key={ward.code}
                              value={ward.code}
                            >
                              {ward.full_name ||
                                ward.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div
                      className={styles.field}
                    >
                      <label>
                        Postal code
                      </label>

                      <input
                        name="postal_code"
                        value={
                          newAddress.postal_code
                        }
                        onChange={
                          handleNewAddressChange
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <label
                      className={
                        styles.checkboxRow
                      }
                    >
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={
                          newAddress.is_default
                        }
                        onChange={
                          handleNewAddressChange
                        }
                      />

                      <span>
                        Set as default address
                      </span>
                    </label>

                    <div
                      className={styles.infoBox}
                    >
                      This address will be saved
                      to your address book because
                      medicine orders must reference
                      a verified saved address.
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={
                loading ||
                loadingAddresses ||
                loadingShipping ||
                (
                  addressMode === 'saved' &&
                  !shippingQuote
                )
              }
            >
              {loading
                ? 'Creating order...'
                : loadingShipping
                  ? 'Calculating shipping...'
                  : 'Continue to payment'}
            </button>
          </form>
        </section>

        <aside className={styles.summaryCard}>
          <h2>Order Summary</h2>

          <div className={styles.itemsList}>
            {cartItems.map(item => {
              const itemId =
                item.cart_item_id ||
                item.medicine_id ||
                item.medicine

              const price = Number(
                item.medicine_price ||
                item.unit_price ||
                0
              )

              const subtotal =
                price *
                Number(item.quantity || 0)

              return (
                <div
                  key={itemId}
                  className={
                    styles.summaryItem
                  }
                >
                  {item.medicine_image && (
                    <img
                      src={
                        item.medicine_image
                      }
                      alt={
                        item.medicine_name
                      }
                    />
                  )}

                  <div>
                    <h3>
                      {item.medicine_name}
                    </h3>

                    <p>
                      {item.quantity} ×{' '}
                      {price.toLocaleString(
                        'vi-VN'
                      )}{' '}
                      VND
                    </p>
                  </div>

                  <strong>
                    {subtotal.toLocaleString(
                      'vi-VN'
                    )}{' '}
                    VND
                  </strong>
                </div>
              )
            })}
          </div>

          <div className={styles.summaryRow}>
            <span>Total items</span>

            <strong>{totalItems}</strong>
          </div>

          <div className={styles.summaryRow}>
            <span>Medicine subtotal</span>

            <strong>
              {Number(
                totalAmount
              ).toLocaleString('vi-VN')}{' '}
              VND
            </strong>
          </div>

          {addressMode === 'new' ? (
            <div className={styles.infoBox}>
              Save the new address to calculate its
              shipping fee. The backend will calculate
              the final amount before creating the
              order.
            </div>
          ) : (
            <>
              <div className={styles.summaryRow}>
                <span>Shipping fee</span>

                <strong>
                  {loadingShipping
                    ? 'Calculating...'
                    : shippingQuote
                      ? `${previewShippingFee.toLocaleString(
                          'vi-VN'
                        )} VND`
                      : 'Unavailable'}
                </strong>
              </div>

              {shippingError && (
                <div className={styles.errorBox}>
                  {shippingError}
                </div>
              )}

              {shippingQuote && (
                <>
                  <div className={styles.summaryRow}>
                    <span>Package weight</span>

                    <strong>
                      {shippingQuote.package_weight_grams} g
                    </strong>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>Delivery service</span>

                    <strong>
                      {shippingQuote.service_name}
                    </strong>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>Grand total</span>

                    <strong>
                      {previewGrandTotal.toLocaleString(
                        'vi-VN'
                      )}{' '}
                      VND
                    </strong>
                  </div>

                  {shippingQuote.mock && (
                    <div className={styles.infoBox}>
                      This is an estimated mock GHTK
                      shipping fee used during local
                      development.
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  )
}