import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import '../styles/main.css';

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { checkUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redirectToOrders, setRedirectToOrders] = useState(false);

  useEffect(() => {
    const completeAuth = async () => {
      try {
        console.log("Starting auth callback processing...");
        console.log("Full URL:", window.location.href);
        console.log("Search params:", location.search);
        
        // Get the code from URL parameters
        const code = searchParams.get('code');
        console.log("Authorization code:", code);
        
        if (!code) {
          throw new Error('No authorization code received');
        }
        
        // Fetch the session which will trigger the token exchange automatically
        try {
          const session = await fetchAuthSession();
          console.log("Auth session fetched successfully");
        } catch (sessionError) {
          console.error("Error fetching session:", sessionError);
        }
        
        // Now refresh the auth state
        try {
          await checkUser();
          console.log("User auth state refreshed");
        } catch (checkError) {
          console.error("Error checking user:", checkError);
        }
        
        // Redirect to orders page
        setRedirectToOrders(true);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };
    
    completeAuth();
  }, [searchParams, location, checkUser]);

  if (redirectToOrders) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <div className="container callback-container">
      <div className="callback-content">
        <h1>Authentication in Progress</h1>
        
        {loading ? (
          <div className="loading-indicator">
            <p>Processing your login...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <h2>Authentication Failed</h2>
            <p className="form-error">{error}</p>
            <a href="/login" className="btn btn-primary">
              Try Again
            </a>
          </div>
        ) : (
          <div className="success-message">
            <h2>Authentication Successful!</h2>
            <p>Redirecting to your orders...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;