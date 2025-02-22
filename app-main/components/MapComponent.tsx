import React, { useEffect, useRef, useState, FC } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

/** Types for your coordinates and pickup point structure. */
interface Coordinates {
  northing: string; // e.g. "55.123456"
  easting: string;  // e.g. "12.123456"
}

interface VisitingAddress {
  postalCode: string;
  city: string;
  streetName: string;
  streetNumber: string;
}

interface OpeningHour {
  openDay: string;   // e.g. "Monday"
  openTime: string;  // e.g. "08:00"
  closeTime: string; // e.g. "17:00"
}

interface OpeningHours {
  postalServices: OpeningHour[];
}

export interface PickupPoint {
  servicePointId: string;
  name: string;
  coordinates: Coordinates[];
  visitingAddress: VisitingAddress;
  openingHours: OpeningHours;
}

/** Props for our MapComponent. */
interface MapComponentProps {
  pickupPoints: PickupPoint[];
  selectedPoint?: string | null;
  setSelectedPoint: (servicePointId: string) => void;
}

/** If you're missing types for the Google object, you can declare a global interface. */
declare global {
  interface Window {
    google?: any;
  }
}

const MapComponent: FC<MapComponentProps> = ({
  pickupPoints,
  selectedPoint,
  setSelectedPoint,
}) => {
  // References to our DOM node and the map instance
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);

  // References for markers and infowindows
  const markersRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const infoWindowsRef = useRef<Record<string, google.maps.InfoWindow>>({});

  // NEW: Track whether the map has fully loaded
  const [mapReady, setMapReady] = useState(false);

  /**
   * 1) First effect: Load Google Maps JS using @googlemaps/js-api-loader.
   */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      console.warn('[MapComponent] WARNING: No Google Maps API key found in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['marker'],
    });

    let isMounted = true;

    loader
      .load()
      .then(() => {
        if (!isMounted) return;
        if (!window.google?.maps) {
          console.error('[MapComponent] Google Maps not available on window.google');
          return;
        }

        if (!mapRef.current) {
          console.error('[MapComponent] mapRef is null; the container div is missing.');
          return;
        }

        // Create the actual map
        const { Map } = window.google.maps;
        const center = { lat: 55.6761, lng: 12.5683 };
        mapInstance.current = new Map(mapRef.current, {
          center,
          zoom: 12,
        });

        // Mark the map as fully ready. The second effect will pick this up.
        setMapReady(true);
      })
      .catch((err) => {
        console.error('[MapComponent] Error loading Google Maps:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * 2) Second effect: Only add or update markers
   *    AFTER we know the map is loaded (mapReady === true).
   */
  useEffect(() => {
    if (!mapReady || !mapInstance.current) {
      // The map is not ready yet; skip
      return;
    }

    if (pickupPoints.length === 0) {
      // If no points, just clear markers
      clearMarkers();
      return;
    }

    // Clear existing markers and add new ones
    clearMarkers();
    addMarkers(pickupPoints);

    // Center map on the selected or the first point
    const pointToCenter =
      pickupPoints.find((p) => p.servicePointId === selectedPoint) || pickupPoints[0];
    if (pointToCenter) {
      const lat = parseFloat(pointToCenter.coordinates[0].northing);
      const lng = parseFloat(pointToCenter.coordinates[0].easting);
      mapInstance.current.setCenter({ lat, lng });
    }
  }, [mapReady, pickupPoints, selectedPoint]);

  /**
   * Clear markers from the map
   */
  const clearMarkers = () => {
    Object.values(markersRef.current).forEach((marker) => {
      marker.map = null; // remove from map
    });
    markersRef.current = {};
    infoWindowsRef.current = {};
  };

  /**
   * Add markers for each pickup point
   */
  const addMarkers = (points: PickupPoint[]) => {
    if (!mapInstance.current || !window.google?.maps) return;

    const { AdvancedMarkerElement } = window.google.maps.marker;

    points.forEach((point) => {
      if (!point.coordinates[0]) return;

      const lat = parseFloat(point.coordinates[0].northing);
      const lng = parseFloat(point.coordinates[0].easting);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        map: mapInstance.current,
        title: point.name,
      });

      // Save the marker reference
      markersRef.current[point.servicePointId] = marker;

      // Create an InfoWindow
      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(point),
      });
      infoWindowsRef.current[point.servicePointId] = infoWindow;

      // On marker click => select this pickup point
      marker.addListener('click', () => {
        setSelectedPoint(point.servicePointId);
      });
    });

    // If we already have a selectedPoint, open that marker’s infowindow
    if (selectedPoint) {
      openInfoWindow(selectedPoint);
    }
  };

  /**
   * Open the InfoWindow for a given marker
   */
  const openInfoWindow = (servicePointId: string) => {
    Object.values(infoWindowsRef.current).forEach((iw) => iw.close());

    const marker = markersRef.current[servicePointId];
    const infoWindow = infoWindowsRef.current[servicePointId];
    if (marker && infoWindow && mapInstance.current) {
      infoWindow.open({
        anchor: marker,
        map: mapInstance.current,
      });
      mapInstance.current.panTo(marker.position as google.maps.LatLng);
    }
  };

  /**
   * 3) If selectedPoint changes, open that marker’s InfoWindow
   */
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !selectedPoint) return;
    openInfoWindow(selectedPoint);
  }, [selectedPoint, mapReady]);

  /**
   * Create HTML content for the marker’s info window
   */
  const createInfoWindowContent = (point: PickupPoint): HTMLElement => {
    const content = document.createElement('div');
    content.style.fontFamily = 'Arial, sans-serif';
    content.style.maxWidth = '220px';

    const container = document.createElement('div');
    container.style.backgroundColor = '#fff';
    container.style.padding = '10px';
    container.style.borderRadius = '8px';

    const title = document.createElement('h2');
    title.style.fontSize = '13px';
    title.style.fontWeight = '700';
    title.style.margin = '0 0 10px';
    title.textContent = point.name;

    const addressLine1 = document.createElement('p');
    addressLine1.style.fontSize = '13px';
    addressLine1.style.margin = '0';
    addressLine1.style.color = '#7b7b7b';
    addressLine1.textContent = `${point.visitingAddress.postalCode} ${point.visitingAddress.city}`;

    const addressLine2 = document.createElement('p');
    addressLine2.style.fontSize = '13px';
    addressLine2.style.margin = '0';
    addressLine2.style.color = '#7b7b7b';
    addressLine2.textContent = `${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}`;

    container.appendChild(title);
    container.appendChild(addressLine1);
    container.appendChild(addressLine2);

    const hr = document.createElement('hr');
    hr.style.margin = '10px 0';
    container.appendChild(hr);

    const ohTitle = document.createElement('b');
    ohTitle.style.fontSize = '10px';
    ohTitle.style.fontWeight = '700';
    ohTitle.style.color = '#7b7b7b';
    ohTitle.textContent = 'Åbningstider';
    container.appendChild(ohTitle);

    const ohList = formatOpeningHours(point.openingHours?.postalServices);
    container.appendChild(ohList);

    content.appendChild(container);

    return content;
  };

  /**
   * Format opening hours into a small <ul> element
   */
  const formatOpeningHours = (openingHours?: OpeningHour[]): HTMLElement => {
    const list = document.createElement('ul');
    list.style.listStyleType = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    list.style.fontSize = '10px';
    list.style.color = '#7b7b7b';

    if (!openingHours || openingHours.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Ingen åbningstider tilgængelige';
      list.appendChild(li);
      return list;
    }

    const translateDay = (day: string) => {
      const days: Record<string, string> = {
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

    openingHours.forEach((day) => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.margin = '2px 0';

      const dayName = document.createElement('span');
      dayName.textContent = translateDay(day.openDay);

      const hours = document.createElement('span');
      hours.textContent = `${day.openTime} - ${day.closeTime}`;

      li.appendChild(dayName);
      li.appendChild(hours);
      list.appendChild(li);
    });

    return list;
  };

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '545px',
        border: '1px solid #ccc',
      }}
    />
  );
};

export default MapComponent;
