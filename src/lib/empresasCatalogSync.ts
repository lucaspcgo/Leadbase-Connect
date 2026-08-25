const EMPRESAS_CATALOG_UPDATED_EVENT = 'empresas:catalog-updated';
const EMPRESAS_CATALOG_UPDATED_STORAGE_KEY = 'leadbase_empresas_catalog_updated_at';

const isBrowser = typeof window !== 'undefined';

export const notifyEmpresasCatalogUpdated = () => {
  if (!isBrowser) return;

  const timestamp = String(Date.now());

  try {
    window.localStorage.setItem(EMPRESAS_CATALOG_UPDATED_STORAGE_KEY, timestamp);
  } catch (error) {
    console.warn('Could not persist empresas catalog update marker:', error);
  }

  window.dispatchEvent(
    new CustomEvent(EMPRESAS_CATALOG_UPDATED_EVENT, {
      detail: { timestamp },
    })
  );
};

export const subscribeEmpresasCatalogUpdated = (callback: () => void) => {
  if (!isBrowser) {
    return () => undefined;
  }

  const handleCatalogUpdated = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === EMPRESAS_CATALOG_UPDATED_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener(EMPRESAS_CATALOG_UPDATED_EVENT, handleCatalogUpdated as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(EMPRESAS_CATALOG_UPDATED_EVENT, handleCatalogUpdated as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
};