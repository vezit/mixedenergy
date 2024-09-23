import Link from 'next/link';
import energyDrinks from '../../data/energyDrinks.json'; // Import the drinks data

export default function DrinksList() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Available Drinks</h1>
      <ul>
        {energyDrinks.map((drink) => {
          const slug = drink.name.toLowerCase().replace(/ /g, "-");
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
