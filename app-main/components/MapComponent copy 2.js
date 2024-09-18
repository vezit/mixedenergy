import { useEffect, useRef, useState } from "react";

const MapComponent = () => {
  const mapRef = useRef(null); // Reference to the map DOM element
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  const locations = [
    { lat: 55.6761, lng: 12.5683 }, // Copenhagen
    { lat: 55.7037, lng: 12.4854 }, // Lyngby
    { lat: 55.6425, lng: 12.4852 }, // Hvidovre
  ];

  useEffect(() => {
    if (typeof window.google === 'undefined') {
      console.error('Google Maps API not loaded');
      return;
    }
  
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: 55.6761, lng: 12.5683 },
      zoom: 12,
    });
    setMap(mapInstance);
  
    // Add markers to the map
    const markerInstances = locations.map((location, index) => {
      return new window.google.maps.Marker({
        position: location,
        map: mapInstance,
        title: `Location ${index + 1}`,
      });
    });
    setMarkers(markerInstances);
  }, []);
  

  // Function to highlight a marker when a radio button is clicked
  const highlightMarker = (index) => {
    markers.forEach((marker) => {
      marker.setIcon(null); // Reset all icons
    });
    markers[index].setIcon("http://maps.google.com/mapfiles/ms/icons/green-dot.png");
    map.setCenter(markers[index].getPosition()); // Center the map on the selected marker
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
