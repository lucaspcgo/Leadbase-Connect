import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SubscriptionWarningBanner, SubscriptionWarningPopup } from '@/components/subscription/SubscriptionWarning';

interface MainLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export const MainLayout = ({ children, hideFooter = false }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SubscriptionWarningBanner />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <SubscriptionWarningPopup />
    </div>
  );
};
