import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NewSaleProvider, useNewSale } from '../NewSaleContext';
import { BottomNav } from './BottomNav';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function LayoutInner() {
  const { open } = useNewSale();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Topbar onNewSale={open} />
        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile-only */}
      <BottomNav onMore={() => setDrawerOpen(true)} moreActive={drawerOpen} />
      <MobileMenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
        }
        .app-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .app-content {
          padding: 26px 30px 50px;
          flex: 1;
        }
        @media (max-width: 880px) {
          .app-content {
            padding: 16px 14px;
            /* BottomNav uchun joy qoldirish */
            padding-bottom: calc(90px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  );
}

export function AppLayout() {
  return (
    <NewSaleProvider>
      <LayoutInner />
    </NewSaleProvider>
  );
}
