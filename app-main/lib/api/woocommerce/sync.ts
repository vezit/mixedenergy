// app-main/lib/api/woocommerce/sync.ts
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api'

// If you haven't yet, install the WooCommerce REST API client:
// npm install @woocommerce/woocommerce-rest-api

// Instantiate WooCommerce client
const wooApi = new WooCommerceRestApi({
  url: process.env.WOOCOMMERCE_SITE_URL!,          // e.g. "http://localhost:8080" or your domain
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY!,
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
  version: 'wc/v3',
})

/**
 * Sync a Supabase 'orders' row to WooCommerce as a new order.
 *
 * @param orderRow - The row from your 'orders' table (including basket_details, etc.)
 * @returns Created WooCommerce order response
 */
export async function syncOrderToWoo(orderRow: any) {
  try {
    // 1) Extract your items, shipping, and billing data from orderRow
    //    This example shows how you might parse the JSON in `basket_details`
    //    Adjust to your actual JSON structure and real product IDs in Woo
    const basketDetails = orderRow.basket_details || {}
    const items = basketDetails.items ?? []
    const customerDetails = basketDetails.customerDetails ?? {}
    const deliveryDetails = basketDetails.deliveryDetails ?? {}

    // 2) Build line_items from your order data
    //    Typically you'd match each item.slug to a real WooCommerce product_id,
    //    or you could create the product in Woo first. For illustration, we'll just
    //    pass a 'name' field if you don't have the real ID.
    const lineItems = items.map((item: any) => ({
      name: item.slug,                 // Fallback if you don’t have a product_id
      quantity: item.quantity,
      total: (item.totalPrice / 100).toString(), // Woo expects string for line_item totals
    }))

    // 3) Prepare billing and shipping addresses
    const billing = {
      first_name: customerDetails.fullName ?? '',
      last_name: '', // or parse name further
      address_1: customerDetails.address ?? '',
      city: customerDetails.city ?? '',
      postcode: customerDetails.postalCode ?? '',
      country: 'DK', // example
      email: customerDetails.email ?? '',
      phone: customerDetails.mobileNumber ?? '',
    }

    // If you want shipping to be the same or use different info from `deliveryDetails`
    const shipping = {
      first_name: customerDetails.fullName ?? '',
      last_name: '',
      address_1: deliveryDetails?.deliveryAddress?.streetName ?? '',
      city: deliveryDetails?.deliveryAddress?.city ?? '',
      postcode: deliveryDetails?.deliveryAddress?.postalCode ?? '',
      country: 'DK', // example
    }

    // 4) Build the final WooCommerce order payload
    const wooPayload = {
      payment_method: 'bacs',                      // or your actual payment method
      payment_method_title: 'Bank Transfer',       // or your method label
      set_paid: orderRow.status === 'paid',        // if supabase says it's "paid"
      line_items: lineItems,
      billing,
      shipping,
      meta_data: [
        { key: 'supabase_order_id', value: orderRow.id },
        { key: 'supabase_order_key', value: orderRow.order_key },
        // add any other metadata as needed
      ],
    }

    // 5) Create the order in WooCommerce
    const response = await wooApi.post('orders', wooPayload)
    console.log('[WooCommerce] Created order =>', response.data)

    return response.data
  } catch (error) {
    console.error('[WooCommerce] Error syncing order:', error)
    throw error
  }
}
