// components/MapComponent.js
import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import Loading from './Loading';

const containerStyle = {
  width: '100%',
  height: '545px',
};

// Move libraries array outside the component to prevent reloading
const libraries = ['marker'];

const MapComponent = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Determine the center of the map
  const center =
    pickupPoints && pickupPoints.length > 0
      ? {
          lat: parseFloat(pickupPoints[0].coordinates[0].northing),
          lng: parseFloat(pickupPoints[0].coordinates[0].easting),
        }
      : {
          lat: 55.6761,
          lng: 12.5683,
        };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries,
    version: 'weekly', // Use 'weekly' to get the latest features
  });

  useEffect(() => {
    if (isLoaded && mapRef.current) {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.map = null);
      markersRef.current = [];

      pickupPoints.forEach((point) => {
        const lat = parseFloat(point.coordinates[0].northing);
        const lng = parseFloat(point.coordinates[0].easting);
        const position = { lat, lng };

        // Create the AdvancedMarkerElement
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position,
          map: mapRef.current,
          title: point.name,
        });

        // Add event listener for marker click
        marker.addListener('gmp-click', () => {
          setSelectedPoint(point.servicePointId);
          setActiveInfoWindow(point.servicePointId);
        });

        // Store marker
        markersRef.current.push(marker);
      });
    }
  }, [isLoaded, pickupPoints]);

  // Function to format opening hours
  const formatOpeningHours = (openingHours) => {
    if (!openingHours || openingHours.length === 0) return <p>Ingen åbningstider tilgængelige</p>;

    return (
      <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
        {openingHours.map((day, index) => (
          <li key={index}>
            {translateDay(day.openDay)}: {day.openTime} - {day.closeTime}
          </li>
        ))}
      </ul>
    );
  };

  // Function to translate days to Danish
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

  if (!isLoaded) {
    return <Loading />;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      onLoad={(map) => (mapRef.current = map)}
    >
      {pickupPoints.map((point) => {
        const lat = parseFloat(point.coordinates[0].northing);
        const lng = parseFloat(point.coordinates[0].easting);
        const position = { lat, lng };

        return (
          activeInfoWindow === point.servicePointId && (
            <InfoWindow
              key={point.servicePointId}
              position={position}
              onCloseClick={() => setActiveInfoWindow(null)}
            >
              <div style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '200px' }}>
                <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px' }}>
                    {point.name}
                  </h2>
                  <p style={{ fontSize: '14px', margin: '0' }}>
                    {point.visitingAddress.postalCode}{' '}
                    {point.visitingAddress.city.toUpperCase()}
                  </p>
                  <p style={{ fontSize: '14px', margin: '0' }}>
                    {point.visitingAddress.streetName}{' '}
                    {point.visitingAddress.streetNumber}
                  </p>
                  <hr style={{ margin: '10px 0' }} />
                  <b style={{ fontSize: '14px' }}>Åbningstider</b>
                  {formatOpeningHours(point.openingHours.postalServices)}
                </div>
              </div>
            </InfoWindow>
          )
        );
      })}
    </GoogleMap>
  );
};

export default React.memo(MapComponent);
