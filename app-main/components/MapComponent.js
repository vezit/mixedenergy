import { useEffect, useRef, useState } from "react";

const MapComponent = ({ pickupPoints }) => {
  const mapRef = useRef(null); // Reference to the map DOM element
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  // Initialize the map only once
  useEffect(() => {
    if (typeof window.google === 'undefined') {
      console.error('Google Maps API not loaded');
      return;
    }
    if (mapRef.current && !map) {
      const defaultCenter = pickupPoints && pickupPoints.length > 0
        ? {
            lat: parseFloat(pickupPoints[0].coordinates[0].northing),
            lng: parseFloat(pickupPoints[0].coordinates[0].easting),
          }
        : { lat: 55.6761, lng: 12.5683 }; // Default to Copenhagen if no pickupPoints

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
      });
      setMap(mapInstance);
    }
  }, [mapRef, map, pickupPoints]);

  // Update markers whenever pickupPoints change
  useEffect(() => {
    if (!map || !pickupPoints) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Add new markers
    const newMarkers = pickupPoints.map((point, index) => {
      const lat = parseFloat(point.coordinates[0].northing);
      const lng = parseFloat(point.coordinates[0].easting);

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: point.name,
      });

      // Optional: Add info windows or event listeners to markers
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div><strong>${point.name}</strong><br>${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}<br>${point.visitingAddress.postalCode} ${point.visitingAddress.city}</div>`,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Optional: Adjust map bounds to fit all markers
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
    }

    // Cleanup function to remove markers when pickupPoints change
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [map, pickupPoints]);

  return (
    <div>
      {/* The map container */}
      <div
        id="map"
        ref={mapRef}
        style={{
          height: "545px",
          width: "100%",
        }}
      ></div>
    </div>
  );
};

export default MapComponent;
