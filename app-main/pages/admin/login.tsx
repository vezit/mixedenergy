// /pages/admin/login.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import LoginForm from '../../components/LoginForm';
import {JSX} from 'react';

export default function LoginPage(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        router.push('/admin'); // Redirect to admin page if already logged in
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <LoginForm redirectPath="/admin" />;
}
