import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Your Firebase config
import Loading from '/components/Loading';

export default function DrinksList() {
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrinks = async () => {
      const drinksRef = collection(db, 'drinks_public');
      const snapshot = await getDocs(drinksRef);
      const drinksData = snapshot.docs.map(doc => ({
        docID: doc.id, // Use Firestore's document ID, which will be the slug (e.g., "faxe-kondi-booster-original")
        ...doc.data(),
      }));
      setDrinks(drinksData);
      setLoading(false);
    };

    fetchDrinks();
  }, []);

  if (loading) {
    return  <Loading />;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Available Drinks</h1>
      <ul>
        {drinks.map((drink) => {
          const slug = drink.docID; // Use the document docID, e.g., "faxe-kondi-booster-original"
          return (
            <li key={drink.docID} className="mb-4">
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
