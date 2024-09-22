// pages/admin/index.js
import admin from '../../lib/firebaseAdmin';
import { useRouter } from 'next/router';

export default function AdminPanel({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/sessionLogout', {
      method: 'POST',
    });
    router.push('/admin/login');
  };

  return (
    <div>
      <h1>Welcome to Admin Panel</h1>
      <p>Logged in as {user.email}</p>
      <button onClick={handleLogout}>Logout</button>
      {/* Admin content goes here */}
    </div>
  );
}

export async function getServerSideProps(context) {
  const sessionCookie = context.req.cookies.session || '';

  try {
    // Verify session cookie and check custom claims
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

    // Check if user has admin privileges
    if (decodedClaims.admin === true) {
      return {
        props: { user: decodedClaims },
      };
    } else {
      // Not an admin
      return {
        redirect: {
          destination: '/admin/login',
          permanent: false,
        },
      };
    }
  } catch (error) {
    // Invalid or expired session cookie
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }
}
