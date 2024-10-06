// components/MapComponent.js
import React, { useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const MapComponent = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);

  const containerStyle = {
    width: '100%',
    height: '545px'
  };

  const center = pickupPoints && pickupPoints.length > 0 ? {
    lat: parseFloat(pickupPoints[0].coordinates[0].northing),
    lng: parseFloat(pickupPoints[0].coordinates[0].easting)
  } : {
    lat: 55.6761,
    lng: 12.5683
  };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY' // Udskift med din faktiske API-nøgle
  });

  if (!isLoaded) {
    return <div>Indlæser kort...</div>;
  }

  // Funktion til at formatere åbningstider
  const formatOpeningHours = (openingHours) => {
    if (!openingHours || openingHours.length === 0) return <p>Ingen åbningstider tilgængelige</p>;

    return (
      <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
        {openingHours.map((day, index) => (
          <li key={index}>{translateDay(day.openDay)}: {day.openTime} - {day.closeTime}</li>
        ))}
      </ul>
    );
  };

  // Funktion til at oversætte ugedage til dansk
  const translateDay = (day) => {
    const days = {
      Monday: 'Mandag',
      Tuesday: 'Tirsdag',
      Wednesday: 'Onsdag',
      Thursday: 'Torsdag',
      Friday: 'Fredag',
      Saturday: 'Lørdag',
      Sunday: 'Søndag',
    };
    return days[day] || day;
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
    >
      {pickupPoints.map((point) => {
        const lat = parseFloat(point.coordinates[0].northing);
        const lng = parseFloat(point.coordinates[0].easting);
        return (
          <Marker
            key={point.servicePointId}
            position={{ lat, lng }}
            onClick={() => {
              setSelectedPoint(point.servicePointId);
              setActiveInfoWindow(point.servicePointId);
            }}
          >
            {activeInfoWindow === point.servicePointId && (
              <InfoWindow
                position={{ lat, lng }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '200px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px' }}>{point.name}</h2>
                    <p style={{ fontSize: '14px', margin: '0' }}>{point.visitingAddress.postalCode} {point.visitingAddress.city.toUpperCase()}</p>
                    <p style={{ fontSize: '14px', margin: '0' }}>{point.visitingAddress.streetName} {point.visitingAddress.streetNumber}</p>
                    <hr style={{ margin: '10px 0' }} />
                    <b style={{ fontSize: '14px' }}>Åbningstider</b>
                    {formatOpeningHours(point.openingHours.postalServices)}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  );
};

export default React.memo(MapComponent);
