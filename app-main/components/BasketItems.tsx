import React, { FC } from 'react';
import ExplosionEffect from './ExplosionEffect';
import { IBasketItem } from './BasketContext';

interface PackageData {
  image?: string;
  title?: string;
}

interface DrinkData {
  name?: string;
  image?: string;
}

interface BasketItemsProps {
  basketItems: IBasketItem[];
  expandedItems: Record<number, boolean>;
  toggleExpand: (index: number) => void;
  packagesData: Record<string, PackageData>;
  drinksData: Record<string, DrinkData | undefined>;
  updateQuantity: (index: number, newQuantity: number) => void;
  explodedItems: Record<number, boolean>;
  triggerExplosion?: (index: number) => void;
  removeItem: (index: number) => void;
  totalPrice: number;
  totalRecyclingFee: number;
}

const BasketItems: FC<BasketItemsProps> = ({
  basketItems,
  expandedItems,
  toggleExpand,
  packagesData,
  drinksData,
  updateQuantity,
  explodedItems,
  triggerExplosion,
  removeItem,
  totalPrice,
  totalRecyclingFee,
}) => {
  if (basketItems.length === 0) {
    return <p>Din kurv er tom. Du bliver omdirigeret til forsiden.</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Min Kurv</h1>

      {basketItems.map((item, index) => {
        const isExpanded = expandedItems[index];
        const packageData = packagesData[item.slug];
        const packageImage = packageData?.image;

        const pricePerPackage = (item.pricePerPackage ?? 0) / 100;
        const itemTotalPrice = (item.totalPrice ?? 0) / 100;
        const recyclingFee = (item.totalRecyclingFee ?? 0) / 100;

        return (
          <ExplosionEffect
            key={index}
            trigger={explodedItems[index]}
            onComplete={() => removeItem(index)}
          >
            <div className="mb-4 p-4 border rounded relative">
              <button
                onClick={() => removeItem(index)}
                className="text-red-600 absolute top-2 right-2"
              >
                Fjern
              </button>

              <div className="flex flex-col md:flex-row items-start">
                {packageImage && (
                  <img
                    src={packageImage}
                    alt={item.slug}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div className="flex-1 mt-4 md:mt-0 md:ml-4">
                  <h2 className="text-xl font-bold">
                    {packageData?.title || item.slug}
                  </h2>

                  <div className="flex items-center mt-2">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="px-2 py-1 bg-gray-200 rounded-l"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 bg-gray-100">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="px-2 py-1 bg-gray-200 rounded-r"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-gray-700 mt-2">
                    Pris pr. pakke: {pricePerPackage.toFixed(2)} kr
                  </p>
                  <p className="text-gray-700 mt-2">
                    Totalpris: {itemTotalPrice.toFixed(2)} kr (pant{' '}
                    {recyclingFee.toFixed(2)} kr)
                  </p>
                  {item.packages_size !== undefined && (
                    <p className="text-gray-700 mt-2">
                      Pakke størrelse: {item.packages_size}
                    </p>
                  )}
                  <p className="text-gray-700 mt-2">
                    Sukker præference: {item.sugarPreference || 'Ikke valgt'}
                  </p>
                  <button
                    onClick={() => toggleExpand(index)}
                    className="mt-2 text-blue-600"
                  >
                    {isExpanded ? 'Skjul detaljer' : 'Vis detaljer'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4">
                  {item.selectedDrinks &&
                    Object.keys(item.selectedDrinks).map((drinkSlug) => {
                      const drinkInfo = drinksData[drinkSlug];
                      return (
                        <div key={drinkSlug} className="flex items-center mt-2">
                          {drinkInfo?.image && (
                            <img
                              src={drinkInfo.image}
                              alt={drinkInfo.name ?? drinkSlug}
                              className="w-12 h-12 object-cover mr-4"
                            />
                          )}
                          <span>{drinkInfo?.name || drinkSlug}</span>
                          <span className="ml-auto">
                            Antal: {item.selectedDrinks?.[drinkSlug]}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </ExplosionEffect>
        );
      })}

      {/* Total Price Summary Card */}
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-bold">Sammendrag</h2>
        <p className="text-gray-700 mt-2">
          Total pris for pakker: {(totalPrice / 100).toFixed(2)} kr
        </p>
        <p className="text-gray-700 mt-2">
          Pant: {(totalRecyclingFee / 100).toFixed(2)} kr
        </p>
        <p className="text-gray-700 mt-2 font-bold">
          Samlet pris: {((totalPrice + totalRecyclingFee) / 100).toFixed(2)} kr
        </p>
      </div>
    </div>
  );
};

export default BasketItems;
