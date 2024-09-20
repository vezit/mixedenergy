import { useEffect, useRef, useState } from "react";

const MapComponent = ({ pickupPoints }) => {
  const mapRef = useRef(null); // Reference to the map DOM element
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);

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

      // Create content for the info window
      // Create content for the info window
      const contentString = `
  <div style="font-family: Arial, sans-serif; width: 200px;">
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
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Adjust map bounds to fit all markers
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
