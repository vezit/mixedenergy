// /pages/api/gls/servicepoints.js
// Placeholder endpoint returning nearest GLS parcel shops
// Example: /api/gls/servicepoints?city=Lyngby&postalCode=2800&streetName=Vinkelvej&streetNumber=12D
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { city = '', postalCode = '', streetName = '', streetNumber = '' } = req.query;

  // In a real implementation you would call the GLS API here. Since the
  // official API requires credentials and network access, we return a
  // static sample response so the frontend can be developed and tested.
  try {
    const samplePath = path.join(process.cwd(), '..', 'postnord_response.json');
    const json = fs.readFileSync(samplePath, 'utf8');
    const data = JSON.parse(json);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from GLS' });
  }
}
