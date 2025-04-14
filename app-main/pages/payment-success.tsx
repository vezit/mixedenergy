import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/** This matches your DB row in "orders" */
interface OrderRow {
  id: number;
  session_id: string;
  order_id: string;
  status?: string;
  order_confirmation_send?: boolean;
  basket_details?: any;
  // ...
}

/**
 * A small helper to join streetName + streetNumber for homeDelivery addresses.
 */
function formatAddress(deliveryAddress: any): string {
  if (!deliveryAddress) return "";
  const { streetName, streetNumber } = deliveryAddress;
  return [streetName, streetNumber].filter(Boolean).join(" ");
}

export default function PaymentSuccess() {
  const router = useRouter();
  const { orderId } = router.query; // e.g. /payment-success?orderId=xyz

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const checkPayment = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/quickpay/payment-status?orderId=${orderId}`);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          setAccepted(false);
          setOrder(null);
        } else {
          setAccepted(data.accepted);
          setOrder(data.order);
          // ---------------------------------
          // 1) If payment accepted & confirmation not yet sent => send order confirmation
          // ---------------------------------
          if (data.accepted && data.order && !data.order.order_confirmation_send) {
            try {
              await fetch("/api/orders/send-order-confirmation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.order.id }),
              });
            } catch (err) {
              console.error("Failed sending confirmation email:", err);
            }
          }
        }
      } catch (err: any) {
        console.error("Error verifying payment:", err);
        setError("Kunne ikke hente ordre. Prøv igen.");
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold">Ingen orderId angivet</h2>
        <p>Ingen ordre at vise.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <p>Tjekker betaling, vent venligst...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-red-500">Fejl</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!accepted) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold">Betalingen er ikke gennemført!</h2>
        <p>Hvis du mener dette er en fejl, kontakt os venligst.</p>
      </div>
    );
  }

  // If we got here, payment is accepted and we have an order row
  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Tak for din bestilling!</h2>
      {order && <OrderDetails order={order} />}
    </div>
  );
}

/** A small sub-component to show order details to the customer */
function OrderDetails({ order }: { order: OrderRow }) {
  const { basket_details } = order || {};
  const items = basket_details?.items || [];
  const customer = basket_details?.customerDetails || {};
  const delivery = basket_details?.deliveryDetails || {};

  let totalPrice = 0;
  let totalRecycling = 0;
  items.forEach((item: any) => {
    totalPrice += item.totalPrice ?? 0;
    totalRecycling += item.totalRecyclingFee ?? 0;
  });

  const deliveryFee = delivery?.deliveryFee ?? 0;
  const grandTotal = totalPrice + totalRecycling + deliveryFee;

  // Join streetName + streetNumber
  const joinedAddress = formatAddress(delivery.deliveryAddress);

  return (
    <div className="bg-white shadow p-4 rounded">
      <h3 className="text-lg font-semibold mb-2">Ordreoplysninger</h3>

      <p className="text-sm text-gray-600 mb-1">
        Ordre-ID (Intern): {order.id}  
      </p>
      <p className="text-sm text-gray-600 mb-1">
        Session / Unique Key: {order.session_id}
      </p>
      <p className="text-sm text-gray-600 mb-1">Status: {order.status}</p>

      <div className="mt-4">
        <h4 className="font-bold mb-1">Produkter:</h4>
        {items.length === 0 ? (
          <p>Ingen varer i ordren</p>
        ) : (
          <ul className="list-disc list-inside">
            {items.map((item: any, idx: number) => (
              <li key={idx} className="ml-2">
                {item.slug} &times; {item.quantity}  
                {item.totalPrice && (
                  <span className="text-sm text-gray-600">
                    {' '}
                    ({(item.totalPrice / 100).toFixed(2)} kr)
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <h4 className="font-bold mb-1">Levering:</h4>
        <p>
          Type: {delivery?.deliveryType || delivery?.deliveryOption || 'Ukendt'}
        </p>
        {delivery?.deliveryAddress && (
          <>
            <p>Navn: {delivery.deliveryAddress.name}</p>
            <p>
              Adresse: {joinedAddress}
            </p>
            <p>
              {delivery.deliveryAddress.postalCode} {delivery.deliveryAddress.city}
            </p>
            <p>Land: {delivery.deliveryAddress.country}</p>
          </>
        )}
        {deliveryFee > 0 && (
          <p>Leveringsgebyr: {(deliveryFee / 100).toFixed(2)} kr</p>
        )}
      </div>

      <div className="mt-4">
        <h4 className="font-bold mb-1">Kundeoplysninger:</h4>
        <p>Navn: {customer.fullName}</p>
        <p>Email: {customer.email}</p>
        <p>Telefon: {customer.mobileNumber}</p>
      </div>

      <div className="mt-4 border-t pt-2">
        <p className="font-bold">
          I alt: {(grandTotal / 100).toFixed(2)} kr (inkl. moms)
        </p>
      </div>
    </div>
  );
}
