import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { DashboardLayout } from './layout/DashboardLayout';

type ResponsiveWrapperProps = {
  children: React.ReactNode;
  dailyCount: number;
  userName: string;
  currentScreen: string;
  onNavigate: (screen: any) => void;
  [key: string]: any;
};

export function ResponsiveWrapper({
  children,
  dailyCount,
  userName,
  currentScreen,
  onNavigate,
  ...layoutProps
}: ResponsiveWrapperProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // For mobile, we still use DashboardLayout but with adjusted styling
  return (
    <DashboardLayout
      dailyCount={dailyCount}
      userName={userName}
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      {...layoutProps}
    >
      {children}
    </DashboardLayout>
  );
}
