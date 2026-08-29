import { Outlet } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  return (
    <div>
      <Topbar />
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1 p-3 p-md-4" style={{ minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
