import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/management/login'); // Redirect to login if not authenticated
      } else if (user.email !== 'management@mixedenergy.dk') {
        router.push('/'); // Redirect if not admin
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div>
      <h1>Welcome to the Management Page</h1>
    </div>
  );
}
