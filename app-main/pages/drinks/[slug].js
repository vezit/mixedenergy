// /pages/drinks/[slug].js
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // Your Firebase config

export default function DrinkDetail() {
  const router = useRouter();
  const { slug } = router.query;

  const [drink, setDrink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false); // Track if the image fails to load

  useEffect(() => {
    if (!slug) return;

    const fetchDrink = async () => {
      const docRef = doc(db, 'drinks_public', slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDrink({ id: docSnap.id, ...docSnap.data() });
      } else {
        setDrink(null);
      }
      setLoading(false);
    };

    fetchDrink();
  }, [slug]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!drink) {
    return <p>Drink not found.</p>;
  }

  const imageUrl = imageError
    ? '/images/default-drink.png' // Use fallback image if an error occurs
    : `https://firebasestorage.googleapis.com/v0/b/mixedenergy-dk.appspot.com/o/drinks_public%2F${slug}.png?alt=media&token=44912f2b-7d35-4e80-93e8-166fd56b0e82`;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <h1 className="text-4xl font-bold mb-8">{drink.name}</h1>
      <Image
        src={imageUrl}
        alt={drink.name}
        width={400}
        height={400}
        className="rounded-lg shadow-lg"
        onError={() => setImageError(true)} // Handle image load errors
      />
      <p className="text-xl text-gray-700 mt-4">Size: {drink.size}</p>

      <div className="mt-4">
        <h2 className="text-xl font-bold">Nutritional Information (per 100 mL):</h2>
        <ul className="list-disc list-inside">
          {drink.nutrition && drink.nutrition.per100ml ? (
            Object.entries(drink.nutrition.per100ml).map(([key, value]) => (
              <li key={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
              </li>
            ))
          ) : (
            <li>No nutritional information available.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
