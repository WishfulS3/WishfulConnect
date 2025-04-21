import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { generateClient } from 'aws-amplify/api';
import Navbar from '../components/Navbar';
import { updateShippingProvider } from '../api/tiktok'; // Import the new function
import '../styles/main.css';

// Create a GraphQL client
const client = generateClient({
  authMode: 'apiKey',
  apiKey: 'da2-mzdjn4b7zvd2dephbclxsdbk5a'
});

// Define shipping provider IDs as constants
const SHIPPING_PROVIDERS = {
  SDA: '7359087909633246981',
  UPS: '7345645330412603141'
};

const HomePage = () => {
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleShippingMethodChange = (e) => {
    setSelectedShippingMethod(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedShippingMethod) {
      setError('Please select a shipping method');
      return;
    }

    // Check if user is logged in
    if (!user || !user.userId) {
      setError('You must be logged in to save shipping preferences');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get the shipping provider ID based on the selected method
      const shippingProviderId = SHIPPING_PROVIDERS[selectedShippingMethod];
      
      // Call the API to update the shipping provider
      await updateShippingProvider(user.userId, shippingProviderId);
      
      console.log('Shipping provider updated:', selectedShippingMethod, shippingProviderId);
      
      // Show success message
      setSuccess(true);
      setLoading(false);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error saving shipping preference:', err);
      setError('Failed to save shipping preference: ' + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div className="orders-page">
      <Navbar />

      <div className="container">
        <div className="orders-header">
          <h1>Welcome to WishConnect</h1>
          {user && <p>Hello, {user.name || user.email || user.userId || 'User'}</p>}
        </div>
        
        <div className="home-content">
          <div className="shipping-selection-card">
            <h2>Select Your Preferred Shipping Method</h2>
            <p>Choose the shipping carrier you want to use for your orders.</p>
            
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">Shipping preference saved successfully!</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="shipping-options">
                <div className="shipping-option">
                  <input
                    type="radio"
                    id="sda"
                    name="shippingMethod"
                    value="SDA"
                    checked={selectedShippingMethod === 'SDA'}
                    onChange={handleShippingMethodChange}
                  />
                  <label htmlFor="sda">
                    <div className="shipping-logo sda-logo">SDA</div>
                    <div className="shipping-details">
                      <h3>SDA Express Courier</h3>
                      <p>Fast domestic shipping with tracking</p>
                    </div>
                  </label>
                </div>
                
                <div className="shipping-option">
                  <input
                    type="radio"
                    id="ups"
                    name="shippingMethod"
                    value="UPS"
                    checked={selectedShippingMethod === 'UPS'}
                    onChange={handleShippingMethodChange}
                  />
                  <label htmlFor="ups">
                    <div className="shipping-logo ups-logo">UPS</div>
                    <div className="shipping-details">
                      <h3>UPS</h3>
                      <p>Reliable international shipping with tracking</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-confirm"
                  disabled={loading || !selectedShippingMethod}
                >
                  {loading ? 'Saving...' : 'Save Preference'}
                </button>
              </div>
            </form>
            
            <div className="quick-links">
              <h3>Quick Links</h3>
              <div className="quick-links-grid">
                <Link to="/orders" className="quick-link-card">
                  <div className="quick-link-icon">📦</div>
                  <h4>View Orders</h4>
                  <p>Manage and track your orders</p>
                </Link>
                
                <Link to="/tiktok/connect" className="quick-link-card">
                  <div className="quick-link-icon">🔗</div>
                  <h4>Connect Store</h4>
                  <p>Link your TikTok Shop account</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;