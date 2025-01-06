// pages/test-packageDrinks.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface IDrink {
  slug: string;
  name?: string;
  size?: string;
  // Add any other fields if you'd like to display them
}

export default function TestPackageDrinksPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [drinks, setDrinks] = useState<IDrink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchDrinks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/packages/${slug}/drinks`);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const json = await response.json();
        setDrinks(json.drinks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDrinks();
  }, [slug]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Package-Drinks Relationship</h1>
      {slug ? (
        <p>Showing drinks for package: <strong>{slug}</strong></p>
      ) : (
        <p>Please provide a <code>?slug=package_slug</code> in the URL.</p>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {drinks.length > 0 ? (
        <ul>
          {drinks.map((drink) => (
            <li key={drink.slug}>
              <strong>{drink.slug}</strong> - {drink.name} ({drink.size})
            </li>
          ))}
        </ul>
      ) : (
        !loading && <p>No drinks found or none loaded yet.</p>
      )}
    </div>
  );
}
