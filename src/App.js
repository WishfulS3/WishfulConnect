import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import OrdersPage from './pages/OrdersPage';
import PackagePage from './pages/PackagePage';
import TikTokConnectPage from './pages/TikTokConnectPage';
import TikTokCallbackPage from './pages/TikTokCallbackPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import './styles/main.css';
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';

// Initialize Amplify with your configuration
Amplify.configure(awsConfig);

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Loading...</div>;
  
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

// Add a new component to redirect authenticated users away from login
const RedirectIfAuthenticated = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="loading-screen">Loading...</div>;
  
  return isAuthenticated() ? <Navigate to="/" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/packages" element={
            <ProtectedRoute>
              <PackagePage />
            </ProtectedRoute>
          } />
          <Route path="/tiktok/connect" element={
            <ProtectedRoute>
              <TikTokConnectPage />
            </ProtectedRoute>
          } />
          <Route path="/tiktok/callback" element={<TikTokCallbackPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;