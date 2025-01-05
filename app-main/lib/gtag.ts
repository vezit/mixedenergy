// lib/gtag.js
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

interface GtagEvent {
  action: string;
  category: string;
  label: string;
  value: string | number;
}

// Function to log pageviews
export const pageview = (url: string): void => {
  if (!GA_TRACKING_ID) return;
  (window as any).gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Function to log specific events
export const event = ({ action, category, label, value }: GtagEvent): void => {
  if (!GA_TRACKING_ID) return;
  (window as any).gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
