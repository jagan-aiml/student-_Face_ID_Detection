import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import DepartmentDashboard from './pages/Department/DepartmentDashboard';
import StudentRegistration from './pages/Department/StudentRegistration';
import ScannerPage from './pages/Scanner/ScannerPage';
import StudentDashboard from './pages/Student/StudentDashboard';
import Reports from './pages/Reports/Reports';
import Analytics from './pages/Analytics/Analytics';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Create router with future flags enabled
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/admin/*",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/admin/registration",
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <StudentRegistration />
      </ProtectedRoute>
    )
  },
  {
    path: "/department/*",
    element: (
      <ProtectedRoute allowedRoles={['department']}>
        <DepartmentDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/department/scanner",
    element: (
      <ProtectedRoute allowedRoles={['department']}>
        <ScannerPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/department/registration",
    element: (
      <ProtectedRoute allowedRoles={['department']}>
        <StudentRegistration />
      </ProtectedRoute>
    )
  },
  {
    path: "/student/*",
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <StudentDashboard />
      </ProtectedRoute>
    )
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'department']}>
        <Reports />
      </ProtectedRoute>
    )
  },
  {
    path: "/analytics",
    element: (
      <ProtectedRoute allowedRoles={['admin', 'department']}>
        <Analytics />
      </ProtectedRoute>
    )
  },
  {
    path: "/",
    element: <Navigate to="/login" replace />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
