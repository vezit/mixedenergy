import { useEffect } from 'react';
import { JSX } from 'react';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import LoginForm from '../../components/LoginForm';

export default function LoginPage(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        router.push('/management'); // Redirect to management page if already logged in
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <LoginForm redirectPath="/management" />
  );
}
