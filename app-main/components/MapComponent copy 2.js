// components/MapComponent.js
import React, { useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import Loading from './Loading';

const libraries = ['marker'];

const MapComponent = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries,
    version: 'weekly', // Ensure you have the latest version
  });

  useEffect(() => {
    if (isLoaded && mapRef.current) {
      const map = mapRef.current;

      // Clear existing markers
      if (map.markers) {
        map.markers.forEach((marker) => marker.map = null);
      }

      // Initialize markers array
      map.markers = [];

      // Check if pickupPoints are available
      if (pickupPoints && pickupPoints.length > 0) {
        pickupPoints.forEach((point) => {
          try {
            const lat = parseFloat(point.coordinates[0].northing);
            const lng = parseFloat(point.coordinates[0].easting);

            const position = { lat, lng };

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
              map,
              position,
              title: point.name,
            });

            // Add event listener for marker click
            marker.addListener('click', () => {
              setSelectedPoint(point.servicePointId);
              // Handle InfoWindow if needed
            });

            // Store marker
            map.markers.push(marker);
          } catch (error) {
            console.error('Error adding marker:', error);
          }
        });
      } else {
        console.warn('No pickup points available to display markers.');
      }
    }
  }, [isLoaded, pickupPoints]);

  if (!isLoaded) {
    return <Loading />;
  }

  return (
    <GoogleMap
      onLoad={(mapInstance) => (mapRef.current = mapInstance)}
      mapContainerStyle={{ width: '100%', height: '545px' }}
      center={
        pickupPoints && pickupPoints.length > 0
          ? {
              lat: parseFloat(pickupPoints[0].coordinates[0].northing),
              lng: parseFloat(pickupPoints[0].coordinates[0].easting),
            }
          : {
              lat: 55.6761,
              lng: 12.5683,
            }
      }
      zoom={12}
    >
      {/* Markers are added directly to the map */}
    </GoogleMap>
  );
};

export default React.memo(MapComponent);
