import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGA4PublicConfig } from '@/hooks/useGA4Config';
import { useGA4Events } from '@/hooks/useGA4Events';

export const GA4ScriptInjector = () => {
  const { config, loading } = useGA4PublicConfig();
  const { trackPageView } = useGA4Events();
  const location = useLocation();
  const scriptInjected = useRef(false);
  const prevPathname = useRef<string | null>(null);

  // Inject GA4 script when config is loaded
  useEffect(() => {
    if (loading || !config?.enabled || !config?.measurement_id || scriptInjected.current) {
      return;
    }

    const measurementId = config.measurement_id;

    // Check if script already exists
    if (document.querySelector(`script[src*="${measurementId}"]`)) {
      scriptInjected.current = true;
      return;
    }

    // Create and inject the gtag.js script
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(gtagScript);

    // Initialize gtag
    const initScript = document.createElement('script');
    initScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        send_page_view: false
      });
    `;
    document.head.appendChild(initScript);

    scriptInjected.current = true;

    return () => {
      // Cleanup is not strictly necessary as the scripts don't cause issues
    };
  }, [config, loading]);

  // Track page views on route change
  useEffect(() => {
    if (!config?.enabled || !config?.track_pageviews) return;
    
    // Only track if the pathname actually changed
    if (prevPathname.current === location.pathname) return;
    prevPathname.current = location.pathname;

    // Small delay to ensure the page title has updated
    const timeout = setTimeout(() => {
      trackPageView(location.pathname, document.title);
    }, 100);

    return () => clearTimeout(timeout);
  }, [location.pathname, config, trackPageView]);

  // This component doesn't render anything
  return null;
};

export default GA4ScriptInjector;
