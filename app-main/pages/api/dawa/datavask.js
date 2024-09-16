// /pages/api/dawa/datavask.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Only POST requests are allowed' });
    }
  
    const { address, city, country, customerType, email, fullName, mobileNumber, postalCode, streetNumber } = req.body;
  
    if (!address || !city || !postalCode) {
      return res.status(400).json({ message: 'Address, city, and postalCode are required fields.' });
    }
  
    try {
      // Prepare the query parameter
      const fullAddress = `${address}, ${city}, ${postalCode} ${country}`;
      const query = encodeURIComponent(fullAddress);
  
      // Make the request to the DAWA API
      const dawaResponse = await fetch(`https://api.dataforsyningen.dk/datavask/adresser?betegnelse=${query}`);
  
      if (!dawaResponse.ok) {
        return res.status(dawaResponse.status).json({ message: 'Error fetching address data from DAWA.' });
      }
  
      const data = await dawaResponse.json();
  
      // Send the response back to the client
      res.status(200).json({
        customerDetails: { address, city, country, customerType, email, fullName, mobileNumber, postalCode, streetNumber },
        dawaResponse: data,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  