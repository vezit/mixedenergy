// pages/drinks/index.js

import Link from 'next/link';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Loading from '/components/Loading';

export default function DrinksList() {
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrinks = async () => {
      try {
        const response = await axios.get('/api/firebase/1-getDrinks');
        const drinksData = Object.keys(response.data.drinks).map((slug) => ({
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
        {drinks.map((drink) => {
          const slug = drink.slug;
          return (
            <li key={drink.slug} className="mb-4">
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
