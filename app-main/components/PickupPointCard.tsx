// components/PickupPointCard.tsx
import React, { FC } from 'react';

interface VisitingAddress {
  streetName: string;
  streetNumber: string;
  postalCode: string;
  city: string;
}

interface PickupPoint {
  servicePointId: string;
  name: string;
  visitingAddress: VisitingAddress;
  // Add other fields if needed
}

interface PickupPointCardProps {
  point: PickupPoint;
  selectedPoint: string | null; // or undefined
  handleSelectPoint: (servicePointId: string) => void;
}

const PickupPointCard: FC<PickupPointCardProps> = ({
  point,
  selectedPoint,
  handleSelectPoint,
}) => {
  return (
    <label
      className={`block p-4 border rounded mb-4 cursor-pointer ${
        selectedPoint === point.servicePointId ? 'bg-blue-200' : ''
      }`}
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
