import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Analytics from './pages/Analytics';
import './App.css';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {isAuthenticated && (
        <>
          <Header onMenuToggle={toggleSidebar} />
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={closeSidebar}
            userRole={user?.role}
          />
        </>
      )}
      
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/vehicles" element={
          <ProtectedRoute>
            <Vehicles />
          </ProtectedRoute>
        } />
        <Route path="/drivers" element={
          <ProtectedRoute>
            <Drivers />
          </ProtectedRoute>
        } />
        <Route path="/trips" element={
          <ProtectedRoute>
            <Trips />
          </ProtectedRoute>
        } />
        <Route path="/maintenance" element={
          <ProtectedRoute>
            <Maintenance />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
