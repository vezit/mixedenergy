import { useRouter } from 'next/router';
import Image from 'next/image';
import { useState } from 'react';
import { useBasket } from '../../lib/BasketContext';
import energyDrinks from '../../data/energyDrinks.json'; // Import the drinks data


export default function DrinkDetail() {
    const router = useRouter();
    const { slug } = router.query;

    // Find the drink in the JSON data using the slug
    const drink = energyDrinks.find((drink) =>
        drink.name.toLowerCase().replace(/ /g, "-") === slug
    );

    const [quantity, setQuantity] = useState(1);
    const { addItemToBasket } = useBasket();

    if (!drink) {
        return <p>Loading...</p>;
    }

    const addToBasket = () => {
        const newDrink = { ...drink, quantity };
        addItemToBasket(newDrink);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-8">
            <h1 className="text-4xl font-bold mb-8">{drink.name}</h1>
            {drink.image && (
                <Image
                    src={`/${drink.image}`}
                    alt={drink.name}
                    width={400}
                    height={400}
                    className="rounded-lg shadow-lg"
                />
            )}
            <p className="text-xl text-gray-700 mt-4">Size: {drink.size}</p>
            <p className="text-2xl font-bold mt-4">Price: {drink.price}</p>

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

            <div className="mt-4">
                <button onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} className="px-4 py-2 bg-gray-200 rounded-l">
                    -
                </button>
                <span className="px-4 py-2 bg-gray-100">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-2 bg-gray-200 rounded-r">
                    +
                </button>
            </div>

            <button onClick={addToBasket} className="mt-6 bg-red-500 text-white px-6 py-2 rounded-full shadow hover:bg-red-600 transition">
                Add to Cart
            </button>
        </div>
    );
}
