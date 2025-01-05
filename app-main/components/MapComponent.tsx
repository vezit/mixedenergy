import React, { useEffect, useRef, FC } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

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
  coordinates: Coordinates[];         // Required
  visitingAddress: VisitingAddress;
  openingHours: OpeningHours;
  // add other fields if needed
}

interface MapComponentProps {
  pickupPoints: PickupPoint[];
  selectedPoint?: string | null;      // allow null
  setSelectedPoint: (servicePointId: string) => void;
}

declare global {
  interface Window {
    google?: any; // if no official @types/google.maps installed
  }
}

const MapComponent: FC<MapComponentProps> = ({
  pickupPoints,
  selectedPoint,
  setSelectedPoint,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const infoWindowsRef = useRef<Record<string, google.maps.InfoWindow>>({});

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['marker'],
    });

    let isMounted = true;

    loader.load().then(() => {
      if (!isMounted) return;
      const { google } = window;
      if (!google?.maps) return;

      const { Map } = google.maps;

      const center = {
        lat: 55.6761,
        lng: 12.5683,
      };

      mapInstance.current = new Map(mapRef.current as HTMLDivElement, {
        center,
        zoom: 18,
        mapId: 'ba67a4a565ab9000',
      });

      if (pickupPoints.length > 0) {
        addMarkers(pickupPoints);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Whenever pickupPoints or selectedPoint changes, re-add markers
    if (mapInstance.current && pickupPoints.length > 0) {
      // Clear existing markers
      Object.values(markersRef.current).forEach((marker) => {
        marker.map = null; // remove from map
      });
      markersRef.current = {};
      infoWindowsRef.current = {};

      addMarkers(pickupPoints);

      const pointToCenter =
        pickupPoints.find((p) => p.servicePointId === selectedPoint) || pickupPoints[0];
      if (pointToCenter) {
        const lat = parseFloat(pointToCenter.coordinates[0].northing);
        const lng = parseFloat(pointToCenter.coordinates[0].easting);
        mapInstance.current.setCenter({ lat, lng });
      }
    }
  }, [pickupPoints, selectedPoint]);

  const addMarkers = (points: PickupPoint[]) => {
    const { google } = window;
    if (!google?.maps) return;

    const { AdvancedMarkerElement } = google.maps.marker;

    points.forEach((point) => {
      const lat = parseFloat(point.coordinates[0].northing);
      const lng = parseFloat(point.coordinates[0].easting);
      const position = { lat, lng };

      const marker = new AdvancedMarkerElement({
        position,
        map: mapInstance.current!,
        title: point.name,
      });

      markersRef.current[point.servicePointId] = marker;

      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(point),
      });
      infoWindowsRef.current[point.servicePointId] = infoWindow;

      marker.addListener('click', () => {
        setSelectedPoint(point.servicePointId);
      });
    });

    // If there's already a selectedPoint, open that marker’s infowindow
    if (selectedPoint) {
      openInfoWindow(selectedPoint);
    }
  };

  const openInfoWindow = (servicePointId: string) => {
    // Close all open info windows
    Object.values(infoWindowsRef.current).forEach((infoWindow) => infoWindow.close());
    const marker = markersRef.current[servicePointId];
    if (infoWindowsRef.current[servicePointId] && marker) {
      infoWindowsRef.current[servicePointId].open({
        anchor: marker,
        map: mapInstance.current!,
      });
      mapInstance.current?.panTo(marker.position as google.maps.LatLng);
    }
  };

  useEffect(() => {
    if (selectedPoint && mapInstance.current) {
      const marker = markersRef.current[selectedPoint];
      if (marker) {
        mapInstance.current.panTo(marker.position as google.maps.LatLng);
        Object.values(infoWindowsRef.current).forEach((infoWindow) => infoWindow.close());
        infoWindowsRef.current[selectedPoint].open({
          anchor: marker,
          map: mapInstance.current!,
        });
      }
    }
  }, [selectedPoint]);

  const createInfoWindowContent = (point: PickupPoint): HTMLElement => {
    const content = document.createElement('div');
    content.style.fontFamily = 'Arial, sans-serif';
    content.style.width = '100%';
    content.style.maxWidth = '220px';

    const container = document.createElement('div');
    container.style.backgroundColor = '#fff';
    container.style.padding = '10px';
    container.style.borderRadius = '8px';
    container.style.overflowY = 'auto';

    const title = document.createElement('h2');
    title.style.fontSize = '13px';
    title.style.fontWeight = '700';
    title.style.margin = '0 0 10px';
    title.style.whiteSpace = 'normal';
    title.style.lineHeight = '1.2em';
    title.textContent = point.name;

    const address1 = document.createElement('p');
    address1.style.fontSize = '13px';
    address1.style.margin = '0';
    address1.style.color = '#7b7b7b';
    address1.style.fontWeight = '300';
    address1.textContent = `${point.visitingAddress.postalCode} ${point.visitingAddress.city.toUpperCase()}`;

    const address2 = document.createElement('p');
    address2.style.fontSize = '13px';
    address2.style.margin = '0';
    address2.style.color = '#7b7b7b';
    address2.style.fontWeight = '300';
    address2.textContent = `${point.visitingAddress.streetName} ${point.visitingAddress.streetNumber}`;

    const hr = document.createElement('hr');
    hr.style.margin = '10px 0';

    const openingHoursTitle = document.createElement('b');
    openingHoursTitle.style.fontSize = '10px';
    openingHoursTitle.style.fontWeight = '700';
    openingHoursTitle.style.color = '#7b7b7b';
    openingHoursTitle.textContent = 'Åbningstider';

    const openingHours = formatOpeningHours(point.openingHours?.postalServices);

    container.appendChild(title);
    container.appendChild(address1);
    container.appendChild(address2);
    container.appendChild(hr);
    container.appendChild(openingHoursTitle);
    container.appendChild(openingHours);

    content.appendChild(container);

    return content;
  };

  const formatOpeningHours = (openingHours?: OpeningHour[]): HTMLElement => {
    const list = document.createElement('ul');
    list.style.listStyleType = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    list.style.fontSize = '10px';
    list.style.color = '#7b7b7b';

    if (!openingHours || openingHours.length === 0) {
      const listItem = document.createElement('li');
      listItem.textContent = 'Ingen åbningstider tilgængelige';
      list.appendChild(listItem);
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
      const listItem = document.createElement('li');
      listItem.style.display = 'flex';
      listItem.style.justifyContent = 'space-between';
      listItem.style.alignItems = 'center';
      listItem.style.whiteSpace = 'nowrap';

      const dayName = document.createElement('span');
      dayName.textContent = translateDay(day.openDay);
      dayName.style.flex = '1';
      dayName.style.textAlign = 'left';

      const hours = document.createElement('span');
      hours.textContent = `${day.openTime} - ${day.closeTime}`;
      hours.style.flex = '1';
      hours.style.textAlign = 'left';

      listItem.appendChild(dayName);
      listItem.appendChild(hours);
      list.appendChild(listItem);
    });

    return list;
  };

  return <div ref={mapRef} style={{ width: '100%', height: '545px' }} />;
};

export default MapComponent;
