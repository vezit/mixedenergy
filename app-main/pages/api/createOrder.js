import { db } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method ${req.method} not allowed on /api/createOrder`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { basketItems, customerDetails, deliveryAddress } = req.body;

  const generateOrderId = async () => {
    const generateRandomString = (length) => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    };

    let orderId;
    let orderExists = true;

    while (orderExists) {
      orderId = generateRandomString(20); // Generate a 20-character random string
      const doc = await db.collection('orders').doc(orderId).get();
      orderExists = doc.exists;
    }

    return orderId;
  };

  const calculateTotalPrice = (items) => {
    return items.reduce((total, item) => total + item.quantity * item.price, 0);
  };

  try {
    const orderId = await generateOrderId();
    const totalPrice = calculateTotalPrice(basketItems);

    const orderData = {
      orderId,
      basketItems,
      customerDetails,
      deliveryAddress,
      status: 'pending',
      createdAt: new Date(),
      orderConfirmationSend: false,
      orderConfirmationSendAt: null,
      totalPrice,
    };

    await db.collection('orders').doc(orderId).set(orderData);
    res.status(200).json({ orderId, totalPrice });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
