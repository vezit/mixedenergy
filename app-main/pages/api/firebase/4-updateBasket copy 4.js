// pages/api/firebase/4-updateBasket.js

import { admin, db } from '../../../lib/firebaseAdmin';
import cookie from 'cookie';
import { calculatePrice } from '../../../lib/priceCalculations';
import { DELIVERY_PRICES } from '../../../lib/constants'; // Import the delivery prices

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).end(); // Method Not Allowed
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId in cookies' });
    }

    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing action in request body' });
    }

    const sessionDocRef = db.collection('sessions').doc(sessionId);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    const basketDetails = sessionData.basketDetails || {};
    let items = basketDetails.items || [];


    if (action === 'updateDeliveryDetails') {
      // Handle 'updateDeliveryDetails' action
      const { deliveryOption, deliveryAddress, providerDetails } = req.body;


      if (!deliveryOption || !deliveryAddress || !providerDetails) {
        return res.status(400).json({ error: 'Missing delivery details' });
      }

      const deliveryFee = DELIVERY_PRICES[deliveryOption];

      const deliveryDetails = {
        provider: 'postnord', // Assuming PostNord is the provider
        trackingNumber: null, // This will be updated later when the shipment is created
        estimatedDeliveryDate: null, // To be updated later
        deliveryType: deliveryOption,
        deliveryFee: deliveryFee, // Calculate if needed
        currency: 'DKK',
        deliveryAddress: deliveryAddress,
        providerDetails: providerDetails,
        createdAt: new Date().toISOString(),
      };

      // Update the deliveryDetails in the session
      await sessionDocRef.update({
        'basketDetails.deliveryDetails': deliveryDetails,
      });

      res.status(200).json({ success: true });
    } else if (action === 'addItem') {
      // Handle 'addItem' action
      const { selectionId, quantity } = req.body;

      if (!selectionId) {
        return res.status(400).json({ error: 'Missing selectionId' });
      }

      const temporarySelections = sessionData.temporarySelections || {};
      const selection = temporarySelections[selectionId];

      if (!selection) {
        return res.status(400).json({ error: 'Invalid or expired selectionId' });
      }

      const { selectedProducts, sugarPreference, selectedSize, packageSlug } = selection;

      // Fetch package details
      const packageDoc = await db.collection('packages').doc(packageSlug).get();
      if (!packageDoc.exists) {
        return res.status(400).json({ error: 'Invalid package slug' });
      }
      const packageData = packageDoc.data();

      // Compute price and recycling fee using the utility function
      const { pricePerPackage, recyclingFeePerPackage } = await calculatePrice({
        packageData,
        selectedSize,
        selectedProducts,
      });

      const totalPrice = pricePerPackage * quantity;
      const totalRecyclingFee = recyclingFeePerPackage * quantity;

      let itemFound = false;
      for (let item of items) {
        if (
          item.slug === packageSlug &&
          item.packages_size === selectedSize &&
          isSameSelection(item.selectedDrinks, selectedProducts)
        ) {
          // Increment the quantity and update totalPrice and totalRecyclingFee
          item.quantity += quantity;
          item.totalPrice += totalPrice;
          item.totalRecyclingFee += totalRecyclingFee;
          itemFound = true;
          break;
        }
      }

      if (!itemFound) {
        // Add item to basket
        items.push({
          slug: packageSlug,
          quantity,
          packages_size: selectedSize,
          selectedDrinks: selectedProducts,
          pricePerPackage,
          recyclingFeePerPackage,
          totalPrice,
          totalRecyclingFee,
          sugarPreference,
        });
      }

      // Update the basket in the session
      await sessionDocRef.update({
        'basketDetails.items': items,
      });

      res.status(200).json({ success: true });
    } else if (action === 'removeItem') {
      // Handle 'removeItem' action
      const { itemIndex } = req.body;

      if (itemIndex === undefined || itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      // Remove the item from the items array
      items.splice(itemIndex, 1);

      // Update the basket in the session
      await sessionDocRef.update({
        'basketDetails.items': items,
      });

      res.status(200).json({ success: true });
    } else if (action === 'updateQuantity') {
      // Handle 'updateQuantity' action
      const { itemIndex, quantity } = req.body;

      if (itemIndex === undefined || itemIndex < 0 || itemIndex >= items.length) {
        return res.status(400).json({ error: 'Invalid item index' });
      }

      if (quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than zero' });
      }

      let item = items[itemIndex];

      // Recalculate totalPrice and totalRecyclingFee
      item.quantity = quantity;
      item.totalPrice = item.pricePerPackage * quantity;
      item.totalRecyclingFee = item.recyclingFeePerPackage * quantity;

      // Update the basket in the session
      await sessionDocRef.update({
        'basketDetails.items': items,
      });

      res.status(200).json({ success: true });
    }  else if (action === 'updateCustomerDetails') {
      const { customerDetails } = req.body;
    
      if (!customerDetails || typeof customerDetails !== 'object') {
        return res.status(400).json({ error: 'Invalid customerDetails format' });
      }
    
      const allowedFields = ['fullName', 'mobileNumber', 'email', 'address', 'postalCode', 'city'];
    
      const errors = {};
      const sanitizedCustomerDetails = {};
    
      for (const field of allowedFields) {
        if (customerDetails.hasOwnProperty(field)) {
          const value = customerDetails[field];
    
          if (typeof value !== 'string' || !value.trim()) {
            errors[field] = `${field} er påkrævet`;
          } else {
            if (field === 'mobileNumber') {
              // Validate mobileNumber
              const mobileNumberRegex = /^\d{8}$/;
              if (!mobileNumberRegex.test(value.trim())) {
                errors[field] = 'Mobilnummer skal være 8 cifre';
              } else {
                sanitizedCustomerDetails[field] = value.trim();
              }
            } else if (field === 'email') {
              // Validate email
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value.trim())) {
                errors[field] = 'E-mail format er ugyldigt';
              } else {
                sanitizedCustomerDetails[field] = value.trim();
              }
            } else if (field === 'postalCode') {
              // Validate postalCode
              const postalCodeRegex = /^\d{4}$/;
              if (!postalCodeRegex.test(value.trim())) {
                errors[field] = 'Postnummer skal være 4 cifre';
              } else {
                sanitizedCustomerDetails[field] = value.trim();
              }
            } else {
              sanitizedCustomerDetails[field] = value.trim();
            }
          }
        }
      }
    
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Invalid customerDetails', errors });
      }
    
      // Update the customerDetails in the session with sanitized data
      await sessionDocRef.set(
        {
          basketDetails: {
            customerDetails: sanitizedCustomerDetails,
          },
        },
        { merge: true }
      );
    
      res.status(200).json({ success: true });
    }
    
     else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating basket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Include the isSameSelection function here
function isSameSelection(a, b) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) {
      return false;
    }
    if (a[aKeys[i]] !== b[bKeys[i]]) {
      return false;
    }
  }

  return true;
}


