import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/main.css';

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      // User is already logged in, redirect to orders page
      navigate('/orders');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      // Check if already authenticated before attempting login
      if (user) {
        navigate('/orders');
        return;
      }
      
      setIsLoading(true);
      console.log("Starting login process...");
      
      // Try to use the login function from AuthContext
      await login();
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  // If already authenticated, don't render the login page
  if (user) {
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome to Wishful Connect</h1>
          <p>Please sign in to access your account</p>
        </div>
        
        <div className="login-body">
          {isLoading ? (
            <div className="login-loading">
              <div className="spinner"></div>
              <p>Redirecting to login...</p>
            </div>
          ) : (
            <button 
              className="login-button" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
              </svg>
              Sign in with us
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;