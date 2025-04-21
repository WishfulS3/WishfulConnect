import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { exchangeTikTokAuthCode, disconnectTikTokStore } from '../api/tiktok';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import Navbar from '../components/Navbar';
import '../styles/main.css';

// Create a GraphQL client
const client = generateClient({
  authMode: 'apiKey',
  apiKey: 'da2-mzdjn4b7zvd2dephbclxsdbk5a'
});

// Import GraphQL queries and mutations
const listTikTokConnections = /* GraphQL */ `
  query ListTikTokConnections($userId: String!) {
    listWishfulConnectTikToks(filter: {userId: {eq: $userId}}) {
      items {
        id
        userId
        connectionId
        platform
        status
        sellerName
        shopId
        refreshToken
        createdAt
        updatedAt
      }
    }
  }
`;

const onUpdateTikTokConnection = /* GraphQL */ `
  subscription OnUpdateTikTokConnection($userId: String!) {
    onUpdateWishfulConnectTikTok(userId: $userId) {
      id
      userId
      connectionId
      platform
      status
      sellerName
      shopId
      refreshToken
      createdAt
      updatedAt
    }
  }
`;

const TikTokConnectPage = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load connections when component mounts and user is available
  useEffect(() => {
    let subscription;

    const fetchConnections = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get user ID from Cognito or your auth context
        const userId = user.sub || user.userId || user.username;
        console.log('Fetching connections for user:', userId);
        
        // Use AppSync GraphQL API to fetch connections
        const response = await client.graphql({
          query: listTikTokConnections,
          variables: { userId }
        });
        
        const fetchedConnections = response.data.listWishfulConnectTikToks.items;
        console.log('Fetched connections:', fetchedConnections);
        setConnections(fetchedConnections);
        setLoading(false);
        
        // Set up real-time subscription
        subscription = client.graphql({
          query: onUpdateTikTokConnection,
          variables: { userId }
        }).subscribe({
          next: (result) => {
            const newData = result.data.onUpdateWishfulConnectTikTok;
            console.log('Real-time update received:', newData);
            
            setConnections(prevData => {
              const index = prevData.findIndex(item => item.id === newData.id);
              
              if (index >= 0) {
                // Update existing item
                const updatedData = [...prevData];
                updatedData[index] = newData;
                return updatedData;
              } else {
                // Add new item
                return [...prevData, newData];
              }
            });
          },
          error: (err) => {
            console.error('Subscription error:', err);
          }
        });
      } catch (err) {
        console.error('Error fetching TikTok connections:', err);
        setError('Failed to load connections: ' + err.message);
        setLoading(false);
      }
    };

    if (user) {
      fetchConnections();
    }

    // Clean up subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Handle the callback if code is present in URL
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        if (!code) {
          // No code in URL, this is a normal page load
          return;
        }
        
        console.log('Found code in URL:', code);
        setIsConnecting(true);
        setStatus('Processing TikTok authorization...');
        
        if (!user) {
          setError('User information not available. Please log in again.');
          setIsConnecting(false);
          return;
        }
        
        // Use user.userId or user.sub instead of username
        const userId = user.sub || user.userId || user.username;
        console.log('Using user ID for TikTok connection:', userId);
        
        // Call API to exchange code for token and store in DynamoDB
        setStatus('Connecting your TikTok store...');
        const response = await exchangeTikTokAuthCode(code, userId);
        
        console.log('TikTok connection response:', response);
        setStatus('Successfully connected your TikTok store!');
        
        // Clear the URL parameters after processing
        window.history.replaceState({}, document.title, '/tiktok/connect');
        
        // Reset state after a delay
        setTimeout(() => {
          setIsConnecting(false);
          setStatus('');
          // The real-time subscription should automatically update the UI
          // but we can force a refresh just to be sure
          loadConnections();
        }, 3000);
        
      } catch (err) {
        console.error('Error processing TikTok callback:', err);
        setError('Failed to connect TikTok store: ' + err.message);
        setIsConnecting(false);
      }
    };
    
    handleCallback();
  }, [location.search, user]);

  // Fallback method to manually refresh connections
  const loadConnections = async () => {
    if (!user) return;
    
    try {
      const userId = user.sub || user.userId || user.username;
      
      const response = await client.graphql({
        query: listTikTokConnections,
        variables: { userId }
      });
      
      setConnections(response.data.listWishfulConnectTikToks.items);
    } catch (err) {
      console.error('Error refreshing TikTok connections:', err);
    }
  };

  const handleConnect = () => {
    // Generate a random state value for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('tiktok_oauth_state', state);
    
    // Redirect to TikTok authorization page
    const authUrl = `https://auth.tiktok-shops.com/oauth/authorize?app_key=6fcmb81ps3dqd&state=${state}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = async (connectionId) => {
    try {
      setIsConnecting(true);
      setStatus('Disconnecting TikTok store...');
      
      const response = await disconnectTikTokStore(connectionId);
      
      console.log('Disconnect response:', response);
      setStatus('Store disconnected successfully!');
      
      // Refresh the connections list
      setTimeout(() => {
        loadConnections();
        setIsConnecting(false);
        setStatus('');
      }, 2000);
    } catch (err) {
      console.error('Error disconnecting store:', err);
      setError('Failed to disconnect store: ' + err.message);
      setIsConnecting(false);
    }
  };

  // Add this helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return dateString;
    }
  };

  return (
    <div className="orders-page">
      <Navbar />

      <div className="container">
        <div className="orders-header">
          <h1>Connect TikTok Store</h1>
        </div>
        
        {isConnecting ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{status}</p>
            {error && <div className="alert alert-danger">{error}</div>}
          </div>
        ) : loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your connections...</p>
          </div>
        ) : (
          <>
            <p>Link your TikTok Shop account to automatically sync orders.</p>
            
            {error && <div className="alert alert-danger">{error}</div>}
            
            {connections.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Store Name</th>
                    <th>Connected On</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((connection, index) => (
                    <tr key={connection.id || index}>
                      <td>{connection.sellerName || 'TikTok Store'}</td>
                      <td>{formatDate(connection.createdAt)}</td>
                      <td>
                        <span className={`status-badge ${connection.status === 'active' ? 'processing' : 'pending'}`}>
                          {connection.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-details"
                          onClick={() => handleDisconnect(connection.id)}
                        >
                          Disconnect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <h3>No Connected Stores</h3>
                <p>You don't have any connected TikTok stores yet.</p>
              </div>
            )}
            
            <div style={{ marginTop: '20px' }}>
              <button 
                className="btn btn-confirm"
                onClick={handleConnect}
              >
                Connect TikTok Shop
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TikTokConnectPage;