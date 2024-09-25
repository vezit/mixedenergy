import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/admin'); // Redirect to admin page if already logged in
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <LoginForm redirectPath="/admin" />

  );
}
