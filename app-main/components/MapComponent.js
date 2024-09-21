import { useEffect, useRef, useState } from "react";

const MapComponent = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const mapRef = useRef(null); // Reference to the map DOM element
  const [map, setMap] = useState(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);
  const markersMapRef = useRef({});

  // Define marker icons
  const defaultMarkerIcon = null; // Use default Google Maps marker icon
  const selectedMarkerIcon = null; // Use default Google Maps marker icon

  // Initialize the map only once
  useEffect(() => {
    if (typeof window.google === 'undefined') {
      console.error('Google Maps API not loaded');
      return;
    }
    if (mapRef.current && !map) {
      const defaultCenter =
        pickupPoints && pickupPoints.length > 0
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
    Object.values(markersMapRef.current).forEach(marker => marker.setMap(null));
    markersMapRef.current = {};

    // Add new markers
    const newMarkers = pickupPoints.map((point) => {
      const lat = parseFloat(point.coordinates[0].northing);
      const lng = parseFloat(point.coordinates[0].easting);

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: point.name,
        icon: selectedPoint === point.servicePointId ? selectedMarkerIcon : defaultMarkerIcon,
      });

      // Store servicePointId and infoWindow with the marker
      marker.servicePointId = point.servicePointId;

      // Create content for the info window
      const contentString = `
  <div style="font-family: Arial, sans-serif; width: 100%; max-width: 200px;">
    <div style="background-color: #fff; padding: 10px; border-radius: 8px;">
      <h2 style="font-size: 16px; font-weight: bold; margin: 0 0 10px;">${point.name}</h2>
      <p style="font-size: 14px; margin: 0;">${point.visitingAddress.postalCode} ${point.visitingAddress.city.toUpperCase()}</p>
      <p style="font-size: 14px; margin: 0;">${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}</p>
      <hr style="margin: 10px 0;">
      <b style="font-size: 14px;">Åbningstider</b>
      ${formatOpeningHours(point.openingHours.postalServices)}
    </div>
  </div>
      `;

      // Create an info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: contentString,
      });

      marker.infoWindow = infoWindow;

      // Add click listener to the marker
      marker.addListener('click', () => {
        // Close the active info window, if any
        if (activeInfoWindow) {
          activeInfoWindow.close();
        }
        // Open the clicked info window
        infoWindow.open(map, marker);
        // Set the active info window
        setActiveInfoWindow(infoWindow);

        // Update selected point
        setSelectedPoint(point.servicePointId);
      });

      // Store marker in the ref
      markersMapRef.current[point.servicePointId] = marker;

      return marker;
    });

    // Adjust map bounds to fit all markers
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
    }

    // Cleanup function to remove markers when pickupPoints change
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
      markersMapRef.current = {};
    };
  }, [map, pickupPoints, selectedPoint]);

  // Update markers when selectedPoint changes
  useEffect(() => {
    if (!map || !selectedPoint || !markersMapRef.current[selectedPoint]) return;

    // Close any active info windows
    if (activeInfoWindow) {
      activeInfoWindow.close();
    }

    // Highlight the selected marker
    Object.values(markersMapRef.current).forEach((marker) => {
      if (marker.servicePointId === selectedPoint) {
        marker.setIcon(selectedMarkerIcon);
        // Open the info window
        marker.infoWindow.open(map, marker);
        setActiveInfoWindow(marker.infoWindow);
        // Optionally pan to the selected marker
        map.panTo(marker.getPosition());
      } else {
        marker.setIcon(defaultMarkerIcon);
      }
    });
  }, [selectedPoint, map]);

  // Function to format opening hours
  const formatOpeningHours = (openingHours) => {
    if (!openingHours || openingHours.length === 0) return '<p>Ingen åbningstider tilgængelige</p>';

    let hoursHtml = '<ul style="list-style-type: none; padding: 0; margin: 0; font-size: 12px;">';
    openingHours.forEach((day) => {
      hoursHtml += `<li>${translateDay(day.openDay)}: ${day.openTime} - ${day.closeTime}</li>`;
    });
    hoursHtml += '</ul>';

    return hoursHtml;
  };

  // Function to translate day names to Danish (if needed)
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
