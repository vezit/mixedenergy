// pages/admin/login.js
import { useState } from 'react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get the ID token
      const idToken = await user.getIdToken();

      // Send token to the server to create a session cookie
      const response = await fetch('/api/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        // Redirect to admin page
        router.push('/admin');
      } else {
        throw new Error('Session login failed');
      }
    } catch (error) {
      console.error('Error logging in', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div>
      <h1>Admin Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        /><br/>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        /><br/>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
