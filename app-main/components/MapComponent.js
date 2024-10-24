// components/MapComponent.js
import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const MapComponent = ({ pickupPoints, selectedPoint, setSelectedPoint }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const infoWindowsRef = useRef({});

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['marker'],
    });

    let isMounted = true;

    loader.load().then(() => {
      if (!isMounted) return;

      const { google } = window;
      const { Map } = google.maps;
      const { AdvancedMarkerElement } = google.maps.marker;

      const center =
        pickupPoints.length > 0
          ? {
              lat: parseFloat(pickupPoints[0].coordinates[0].northing),
              lng: parseFloat(pickupPoints[0].coordinates[0].easting),
            }
          : {
              lat: 55.6761,
              lng: 12.5683,
            };

      mapInstance.current = new Map(mapRef.current, {
        center,
        zoom: 12,
        mapId: 'ba67a4a565ab9000',
      });

      pickupPoints.forEach((point) => {
        const lat = parseFloat(point.coordinates[0].northing);
        const lng = parseFloat(point.coordinates[0].easting);
        const position = { lat, lng };

        // Create the AdvancedMarkerElement
        const marker = new AdvancedMarkerElement({
          position,
          map: mapInstance.current,
          title: point.name,
        });

        // Store marker
        markersRef.current[point.servicePointId] = marker;

        // Create InfoWindow
        const infoWindow = new google.maps.InfoWindow({
          content: createInfoWindowContent(point),
        });

        infoWindowsRef.current[point.servicePointId] = infoWindow;

        // Add event listener for marker click
        marker.addListener('click', () => {
          setSelectedPoint(point.servicePointId);
          openInfoWindow(point.servicePointId);
        });
      });

      // Open InfoWindow for the selected point
      if (selectedPoint) {
        openInfoWindow(selectedPoint);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, [pickupPoints]);

  const openInfoWindow = (servicePointId) => {
    // Close all InfoWindows
    Object.values(infoWindowsRef.current).forEach((infoWindow) => infoWindow.close());

    // Open the InfoWindow for the selectedPoint
    if (infoWindowsRef.current[servicePointId]) {
      infoWindowsRef.current[servicePointId].open({
        anchor: markersRef.current[servicePointId],
        map: mapInstance.current,
      });
    }
  };

  // Function to create InfoWindow content
  const createInfoWindowContent = (point) => {
    const content = document.createElement('div');
    content.style.fontFamily = 'Arial, sans-serif';
    content.style.width = '100%';
    content.style.maxWidth = '200px';

    const container = document.createElement('div');
    container.style.backgroundColor = '#fff';
    container.style.padding = '10px';
    container.style.borderRadius = '8px';

    const title = document.createElement('h2');
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';
    title.style.margin = '0 0 10px';
    title.textContent = point.name;

    const address1 = document.createElement('p');
    address1.style.fontSize = '14px';
    address1.style.margin = '0';
    address1.textContent = `${point.visitingAddress.postalCode} ${point.visitingAddress.city.toUpperCase()}`;

    const address2 = document.createElement('p');
    address2.style.fontSize = '14px';
    address2.style.margin = '0';
    address2.textContent = `${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}`;

    const hr = document.createElement('hr');
    hr.style.margin = '10px 0';

    const openingHoursTitle = document.createElement('b');
    openingHoursTitle.style.fontSize = '14px';
    openingHoursTitle.textContent = 'Åbningstider';

    const openingHours = formatOpeningHours(point.openingHours.postalServices);

    container.appendChild(title);
    container.appendChild(address1);
    container.appendChild(address2);
    container.appendChild(hr);
    container.appendChild(openingHoursTitle);
    container.appendChild(openingHours);

    content.appendChild(container);

    return content;
  };

  // Function to format opening hours
  const formatOpeningHours = (openingHours) => {
    const list = document.createElement('ul');
    list.style.listStyleType = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    list.style.fontSize = '12px';

    if (!openingHours || openingHours.length === 0) {
      const listItem = document.createElement('li');
      listItem.textContent = 'Ingen åbningstider tilgængelige';
      list.appendChild(listItem);
      return list;
    }

    openingHours.forEach((day) => {
      const listItem = document.createElement('li');
      listItem.textContent = `${translateDay(day.openDay)}: ${day.openTime} - ${day.closeTime}`;
      list.appendChild(listItem);
    });

    return list;
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

  // Update the map when selectedPoint changes
  useEffect(() => {
    if (selectedPoint && mapInstance.current) {
      const marker = markersRef.current[selectedPoint];
      if (marker) {
        mapInstance.current.panTo(marker.position);
        // Open the InfoWindow
        Object.values(infoWindowsRef.current).forEach((infoWindow) => infoWindow.close());
        infoWindowsRef.current[selectedPoint].open({
          anchor: marker,
          map: mapInstance.current,
        });
      }
    }
  }, [selectedPoint]);

  return <div ref={mapRef} style={{ width: '100%', height: '545px' }}></div>;
};

export default MapComponent;
