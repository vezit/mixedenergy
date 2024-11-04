// /pages/api/postnord/servicepoints.js
// eksempel http://localhost:3000/api/postnord/servicepoints?city=Bagsværd&postalCode=2880&streetName=Bagsværd Hovedgade&streetNumber=141
export default async function handler(req, res) {
    const { city, postalCode, streetName, streetNumber } = req.query;
    
    // const apiKey = 'POSTNORD_API_KEY'; // replace with your actual API key
    const apiKey = process.env.POSTNORD_API_KEY;
    const url = `https://atapi2.postnord.com/rest/businesslocation/v5/servicepoints/nearest/byaddress?apikey=${apiKey}&returnType=json&countryCode=DK&agreementCountry=DK&city=${city}&postalCode=${postalCode}&streetName=${encodeURIComponent(
      streetName
    )}&streetNumber=${streetNumber}&numberOfServicePoints=10&srId=EPSG:4326&context=optionalservicepoint&responseFilter=public`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching data from PostNord' });
    }
  }
  