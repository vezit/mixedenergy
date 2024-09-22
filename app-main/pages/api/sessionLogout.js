// pages/api/sessionLogout.js
export default async function handler(req, res) {
    res.setHeader('Set-Cookie', `session=; Max-Age=0; HttpOnly; Secure; Path=/`);
    res.status(200).send({ status: 'success' });
  }
  