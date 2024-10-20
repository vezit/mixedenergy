// components/ProductCard.js
import { useState } from 'react';

const ProductCard = ({ product }) => {
  const [showDrinks, setShowDrinks] = useState(false);

  const toggleDrinks = () => {
    setShowDrinks(!showDrinks);
  };

  return (
    <div className="border p-4">
      <img src={product.image} alt={product.title} className="w-full h-auto" />
      <h2 className="text-xl font-bold">{product.title}</h2>
      <p>{product.description}</p>
      <button
        onClick={toggleDrinks}
        className="mt-2 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        Se drikke {showDrinks ? '▲' : '▼'}
      </button>
      {showDrinks && (
        <ul className="mt-2 list-disc list-inside">
          {product.drinks.map((drink, index) => (
            <li key={index}>{drink.name}</li>
          ))}
        </ul>
      )}
      {/* ... other product details and actions ... */}
    </div>
  );
};

export default ProductCard;
