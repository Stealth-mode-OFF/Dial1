import { EchoSidebar, type NavItem } from '../EchoSidebar';
import { TopBar } from '../TopBar';

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: NavItem;
  onNavigate: (nav: NavItem) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen figma-grid-bg font-sans text-black overflow-hidden">
      <EchoSidebar activeTab={active} setActiveTab={onNavigate} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar onNavigateSettings={() => onNavigate('settings')} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden figma-grid-bg">{children}</main>
      </div>
    </div>
  );
}

