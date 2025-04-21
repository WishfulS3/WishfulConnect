import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { exchangeTikTokAuthCode } from '../api/tiktok';
import '../styles/main.css';

const TikTokCallbackPage = () => {
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Inside the processCallback function, add more detailed logging
        console.log('Starting TikTok callback processing...');
        console.log('URL search params:', location.search);
        
        // Parse URL parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        console.log('Extracted code:', code);
        console.log('Extracted state:', state);
        const savedState = localStorage.getItem('tiktok_oauth_state');

        // Validate state parameter to prevent CSRF attacks
        if (!state || state !== savedState) {
          setError('Invalid state parameter. Authorization request may have been tampered with.');
          return;
        }

        // Clear the state from localStorage
        localStorage.removeItem('tiktok_oauth_state');

        if (!code) {
          setError('No authorization code received from TikTok.');
          return;
        }

        console.log('Authorization code received:', code);
        
        if (!user || !user.username) {
          setError('User information not available. Please log in again.');
          return;
        }
        
        // Call API to exchange code for token and store in DynamoDB
        setStatus('Connecting your TikTok store...');
        const response = await exchangeTikTokAuthCode(code, user.username);
        
        console.log('TikTok connection response:', response);
        setStatus('Successfully connected your TikTok store!');
        
        // Redirect back to the connect page after a short delay
        setTimeout(() => {
          navigate('/tiktok/connect');
        }, 3000);
        
      } catch (err) {
        console.error('Error processing TikTok callback:', err);
        setError('Failed to connect TikTok store. Please try again.');
      }
    };

    processCallback();
  }, [location, navigate, user]);

  // Rest of component remains the same
  return (
    <div className="container callback-container">
      <div className="callback-content">
        <h1>TikTok Authorization</h1>
        
        {error ? (
          <div className="error-message">
            <p>{error}</p>
            <button 
              onClick={() => navigate('/tiktok/connect')}
              className="btn btn-primary"
            >
              Back to Connect Page
            </button>
          </div>
        ) : (
          <div className="success-message">
            <p>{status}</p>
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TikTokCallbackPage;