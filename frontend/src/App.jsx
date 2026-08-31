import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RequirePermission from './components/layout/RequirePermission.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/admin/Users.jsx';
import Roles from './pages/admin/Roles.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/admin/users"
                  element={
                    <RequirePermission permission="USER_VIEW">
                      <Users />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/admin/roles"
                  element={
                    <RequirePermission permission="ROLE_VIEW">
                      <Roles />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <RequirePermission permission="AUDIT_VIEW">
                      <AuditLogs />
                    </RequirePermission>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
