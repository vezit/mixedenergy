// /pages/api/postnord/servicepoints.js
// Example: http://localhost:3000/api/postnord/servicepoints?city=Lyngby&postalCode=2800&streetName=Vinkelvej&streetNumber=12D
export default async function handler(req, res) {
  const { city, postalCode, streetName, streetNumber } = req.query;

  // Use the API key from your environment variables
  const apiKey = process.env.POSTNORD_API_KEY;

  // Construct the URL for the PostNord API endpoint
  const url = `https://api2.postnord.com/rest/businesslocation/v5/servicepoints/nearest/byaddress?returnType=json&countryCode=DK&agreementCountry=DK&city=${encodeURIComponent(
    city
  )}&postalCode=${encodeURIComponent(
    postalCode
  )}&streetName=${encodeURIComponent(
    streetName
  )}&streetNumber=${encodeURIComponent(
    streetNumber
  )}&numberOfServicePoints=5&srId=EPSG:4326&context=optionalservicepoint&responseFilter=public&located=all&whiteLabelName=false&apikey=${apiKey}`;

  try {
    // Fetch data from the PostNord API
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const data = await response.json();

    // Return the data in the response
    res.status(200).json(data);
  } catch (error) {
    // Handle any errors that occur during the fetch
    res.status(500).json({ error: 'Error fetching data from PostNord' });
  }
}
