
/**
 * Simple engagement tracking for Google Analytics.
 * In a real production environment, 'gtag' is defined in index.html.
 */
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  } else {
    console.log(`[Analytics Simulation] Event: ${action}, Category: ${category}, Label: ${label}`);
  }
};
