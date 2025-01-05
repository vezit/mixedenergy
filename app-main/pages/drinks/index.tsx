// pages/drinks/index.js

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Image from 'next/image';
import Loading from '../../components/Loading'; // Update to correct path if needed
import {JSX} from 'react';

interface Drink {
  slug: string;
  name: string;
  size: string;
  image: string;
  // ...add more fields if your data structure includes them
}

export default function DrinksList(): JSX.Element {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDrinks = async () => {
      try {
        const response = await axios.get('/api/firebase/1-getDrinks');
        const drinksData: Drink[] = Object.keys(response.data.drinks).map((slug) => ({
          slug,
          ...response.data.drinks[slug],
        }));
        setDrinks(drinksData);
      } catch (error) {
        console.error('Error fetching drinks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrinks();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Available Drinks</h1>
      <ul>
        {drinks.map((drink) => (
          <li key={drink.slug} className="mb-4 flex items-center">
            <Link href={`/drinks/${drink.slug}`} legacyBehavior>
              <a className="flex items-center">
                {/* Image Container */}
                <div className="w-12 aspect-[463/775] relative mr-4">
                  <Image
                    src={drink.image}
                    alt={drink.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded"
                  />
                </div>
                {/* Drink Name and Size */}
                <span className="text-2xl text-blue-500 hover:underline">
                  {drink.name} - {drink.size}
                </span>
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
