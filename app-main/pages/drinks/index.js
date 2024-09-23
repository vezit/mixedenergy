import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Your Firebase config

export default function DrinksList() {
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrinks = async () => {
      const drinksRef = collection(db, 'drinks');
      const snapshot = await getDocs(drinksRef);
      const drinksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDrinks(drinksData);
      setLoading(false);
    };

    fetchDrinks();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Available Drinks</h1>
      <ul>
        {drinks.map((drink) => {
          const slug = drink.id; // Use the document ID as the slug
          return (
            <li key={drink.id} className="mb-4">
              <Link href={`/drinks/${slug}`}>
                <a className="text-2xl text-blue-500 hover:underline">
                  {drink.name} - {drink.size}
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
