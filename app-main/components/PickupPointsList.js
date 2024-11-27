// components/PickupPointsList.js

import React from 'react';

const PickupPointsList = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const handleSelectPoint = (e) => {
    setSelectedPoint(e.target.value);
  };

  return (
    <div className="pickup-points-list">
      {pickupPoints.length > 0 ? (
        <div className="relative mt-2">
          <select
            value={selectedPoint || ''}
            onChange={handleSelectPoint}
            className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Vælg et afhentningssted</option>
            {pickupPoints.map((point) => (
              <option key={point.servicePointId} value={point.servicePointId}>
                {point.name} - {point.visitingAddress.streetName}{' '}
                {point.visitingAddress.streetNumber}, {point.visitingAddress.postalCode}{' '}
                {point.visitingAddress.city}
              </option>
            ))}
          </select>
          {/* Custom arrow icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.516 7.548a1 1 0 011.413 0L10 10.618l3.071-3.07a1 1 0 011.414 1.414l-3.778 3.778a1 1 0 01-1.414 0L5.516 8.962a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      ) : (
        <p>Ingen afhentningssteder fundet for denne adresse.</p>
      )}
    </div>
  );
};

export default PickupPointsList;
