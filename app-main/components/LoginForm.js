import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';

const LoginForm = ({ redirectPath }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if it's admin or management and set the correct environment variables
    if (redirectPath === '/admin') {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_ACCOUNT_NAME;
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_ACCOUNT_PASSWORD;

      if (adminEmail) setEmail(adminEmail);
      if (adminPassword) setPassword(adminPassword);
    } else if (redirectPath === '/management') {
      const managementEmail = process.env.NEXT_PUBLIC_MANAGEMENT_ACCOUNT_NAME;
      const managementPassword = process.env.NEXT_PUBLIC_MANAGEMENT_ACCOUNT_PASSWORD;

      if (managementEmail) setEmail(managementEmail);
      if (managementPassword) setPassword(managementPassword);
    }
  }, [redirectPath]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const response = await fetch('/api/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        // Delay navigation slightly to ensure session cookie is set properly
        setTimeout(() => {
          router.push(redirectPath);
        }, 1000); // Wait 100ms before navigating
      } else {
        throw new Error('Session login failed');
      }
    } catch (error) {
      console.error('Error logging in', error);
      // alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border mb-4 rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border mb-4 rounded"
          />
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
