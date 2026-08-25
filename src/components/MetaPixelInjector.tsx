import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMetaPixelPublicConfig } from '@/hooks/useMetaPixelConfig';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const MetaPixelInjector = () => {
  const { config, loading } = useMetaPixelPublicConfig();
  const location = useLocation();
  const injected = useRef(false);
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !config?.enabled || !config?.pixel_id || injected.current) return;

    const pixelId = config.pixel_id;

    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);

    injected.current = true;
  }, [config, loading]);

  // PageView on route change
  useEffect(() => {
    if (!config?.enabled || !config?.track_pageviews) return;
    if (prevPathname.current === location.pathname) return;
    prevPathname.current = location.pathname;

    const timeout = setTimeout(() => {
      window.fbq?.('track', 'PageView');
    }, 100);

    return () => clearTimeout(timeout);
  }, [location.pathname, config]);

  return null;
};

export default MetaPixelInjector;
