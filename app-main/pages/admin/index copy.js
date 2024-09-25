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
    </div>
  );
}

export async function getServerSideProps(context) {
  const sessionCookie = context.req.cookies.session || '';

  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

    if (decodedClaims.admin === true) {
      return {
        props: { user: decodedClaims },
      };
    } else {
      return {
        redirect: {
          destination: '/admin/login',
          permanent: false,
        },
      };
    }
  } catch (error) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }
}
