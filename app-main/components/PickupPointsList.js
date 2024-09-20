import React from 'react';
import PickupPointCard from './PickupPointCard';

const PickupPointsList = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const handleSelectPoint = (pointId) => {
    setSelectedPoint(pointId);
  };

  return (
    <div className="pickup-points-list">
      {pickupPoints.length > 0 ? (
        pickupPoints.map((point) => (
          <PickupPointCard 
            key={point.servicePointId} 
            point={point} 
            selectedPoint={selectedPoint}
            handleSelectPoint={handleSelectPoint}
          />
        ))
      ) : (
        <p>No pickup points found for this address.</p>
      )}
    </div>
  );
};

export default PickupPointsList;
