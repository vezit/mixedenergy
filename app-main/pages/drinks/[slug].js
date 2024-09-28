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
      const docRef = doc(db, 'drinks', slug); // Fetching drink by slug (document ID)
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
    : `/images/drinks/${drink.image}`; // Local image path

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <h1 className="text-4xl font-bold mb-8">{drink.name}</h1>
      {drink.image && (
        <Image
          src={imageUrl}
          alt={drink.name}
          width={400}
          height={400}
          className="rounded-lg shadow-lg"
          onError={() => setImageError(true)} // Handle image load errors
        />
      )}
      <p className="text-xl text-gray-700 mt-4">Size: {drink.size}</p>
      <p className="text-2xl font-bold mt-4">Price: {drink.salePrice}</p>

      <div className="mt-4">
        <h2 className="text-xl font-bold">Nutritional Information (per 100 mL):</h2>
        <ul className="list-disc list-inside">
          <li>Energy: {drink.nutrition.per100ml.energy}</li>
          <li>Fat: {drink.nutrition.per100ml.fat}</li>
          <li>Saturated Fat: {drink.nutrition.per100ml.saturatedFat}</li>
          <li>Carbohydrates: {drink.nutrition.per100ml.carbohydrates}</li>
          <li>Sugar: {drink.nutrition.per100ml.sugar}</li>
          <li>Protein: {drink.nutrition.per100ml.protein}</li>
          <li>Salt: {drink.nutrition.per100ml.salt}</li>
        </ul>
      </div>
    </div>
  );
}
