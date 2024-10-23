// pages/api/sessionLogout.js



export default async (req, res) => {
  res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict');
  res.status(200).json({ success: true });
};
