import { Outlet } from 'react-router-dom';
import { NewSaleProvider, useNewSale } from '../NewSaleContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function LayoutInner() {
  const { open } = useNewSale();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Topbar onNewSale={open} />
        <div className="app-content">
          <Outlet />
        </div>
      </main>

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
        @media (max-width: 780px) {
          .app-content { padding: 18px; }
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
