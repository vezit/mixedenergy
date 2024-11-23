import { useRouter } from 'next/router';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Loading from '/components/Loading';

export default function DrinkDetail() {
  const router = useRouter();
  const { slug } = router.query;

  const [drink, setDrink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false); // Track if the image fails to load

  useEffect(() => {
    if (!slug) return;

    const fetchDrink = async () => {
      try {
        const response = await axios.get(`/api/firebase/drinks/${slug}`);
        setDrink(response.data.drink);
      } catch (error) {
        console.error('Error fetching drink:', error);
        setDrink(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDrink();
  }, [slug]);

  if (loading) {
    return <Loading />;
  }

  if (!drink) {
    return <p>Drink not found.</p>;
  }

  const imageUrl = imageError ? '/images/default-drink.png' : drink.image;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <h1 className="text-4xl font-bold mb-8">{drink.name}</h1>
      <Image
        src={imageUrl}
        alt={drink.name}
        width={463}
        height={775}
        className="rounded-lg shadow-lg object-cover"
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
