// components/PickupPointCard.js

import React from 'react';

const PickupPointCard = ({ point, selectedPoint, handleSelectPoint }) => {
  return (
    <label 
      className={`block p-4 border rounded mb-4 cursor-pointer ${selectedPoint === point.servicePointId ? 'bg-blue-200' : ''}`}
      onClick={() => handleSelectPoint(point.servicePointId)}
    >
      <div className="flex items-center">
        <input
          type="radio"
          name="pickupPoint"
          value={point.servicePointId}
          checked={selectedPoint === point.servicePointId}
          onChange={() => handleSelectPoint(point.servicePointId)}
          className="mr-4"
        />
        <div>
          <h3 className="font-bold">{point.name}</h3>
          <p>{`${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}, ${point.visitingAddress.postalCode} ${point.visitingAddress.city}`}</p>
        </div>
      </div>
    </label>
  );
};

export default PickupPointCard;
