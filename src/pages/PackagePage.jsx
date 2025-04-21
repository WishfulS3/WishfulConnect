import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../utils/AuthContext';
import { fetchPackages, debugPackageStructure, createShippingOrder } from '../api/package';
import '../styles/main.css';

/**
 * Package page component
 * Displays a list of packages and their shipping status
 */
const PackagePage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Fetch packages on component mount
  useEffect(() => {
    const loadPackages = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const packagesData = await fetchPackages();
        console.log("Fetched packages:", packagesData);
        setPackages(packagesData);
        setError(null);
      } catch (err) {
        console.error('Error loading packages:', err);
        setError('Failed to load your packages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPackages();
  }, [user]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle view package details - show modal instead of navigating
  const handleViewDetails = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      console.log("Selected package for modal:", pkg); // Debug log
      setSelectedPackage(pkg);
      setShowModal(true);
    }
  };

  // Close the modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedPackage(null);
  };

  // Handle tracking
  const handleViewTracking = (packageId, trackingNumber, carrier) => {
    if (!trackingNumber || trackingNumber === 'N/A') {
      window.alert(`No tracking number available for package ${packageId}`);
      return;
    }
    
    // You could either navigate to a tracking page or open the carrier's tracking page
    let trackingUrl;
    
    switch(carrier.toLowerCase()) {
      case 'ups':
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
        break;
      case 'sda':
        trackingUrl = `https://www.sda.it/wps/portal/Servizi/ricerca-spedizioni?tracking=${trackingNumber}`;
        break;
      default:
        // If carrier is not recognized, just show an alert
        window.alert(`Tracking details for package ${packageId}: ${trackingNumber} (${carrier})`);
        return;
    }
    
    // Open tracking URL in a new tab
    window.open(trackingUrl, '_blank');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Debug function to inspect package structure
  const handleDebug = async () => {
    setDebugMode(true);
    try {
      const samplePackage = await debugPackageStructure();
      console.log('Debug package structure:', samplePackage);
      window.alert('Check console for package structure debug information');
    } catch (err) {
      console.error('Debug error:', err);
      window.alert('Error debugging package structure. Check console for details.');
    } finally {
      setDebugMode(false);
    }
  };

  // Handle shipping package
  const handleShipPackage = async (packageId) => {
    if (!window.confirm('Are you sure you want to ship this package?')) {
      return;
    }
    
    try {
      setIsShipping(true);
      console.log(`Creating shipping order for package: ${packageId}`);
      
      const result = await createShippingOrder(packageId);
      console.log('Shipping order created:', result);
      /*
      // Update the package in the local state
      setPackages(prevPackages => 
        prevPackages.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, status: 'SHIPPED', trackingNumber: result.trackingNumber, carrier: result.carrier } 
            : pkg
        )
      );
      
      // Update the selected package if it's currently displayed
      if (selectedPackage && selectedPackage.id === packageId) {
        setSelectedPackage(prev => ({
          ...prev,
          status: 'SHIPPED',
          trackingNumber: result.trackingNumber,
          carrier: result.carrier
        }));
      }
      */
      window.alert(`Package ${packageId} has been shipped successfully! Tracking number: ${result.trackingNumber}`);
    } catch (err) {
      console.error('Error shipping package:', err);
      window.alert(`Failed to ship package: ${err.message || 'Unknown error'}`);
    } finally {
      setIsShipping(false);
    }
  };

  return (
    <div className="orders-page">
      <Navbar />
      <div className="container">
        <div className="orders-header">
          <h1>Your Packages</h1>
          {error && <div className="alert alert-danger">{error}</div>}
          {process.env.NODE_ENV === 'development' && (
            <button 
              className="btn btn-debug" 
              onClick={handleDebug}
              disabled={debugMode}
              style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '5px 10px' }}
            >
              {debugMode ? 'Debugging...' : 'Debug Package Structure'}
            </button>
          )}
        </div>
  
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="no-orders">
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <h3>No Packages Found</h3>
              <p>When you have packages in transit, they will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Package ID</th>
                  <th>Order ID</th>
                  <th>Created</th>
                  <th>Carrier</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Est. Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => (
                  <tr key={pkg.id}>
                    <td><span className="order-id">{pkg.id}</span></td>
                    <td>{pkg.orderId}</td>
                    <td>{formatDate(pkg.createTime)}</td>
                    <td>{pkg.carrier}</td>
                    <td>
                      {typeof pkg.items === 'number' 
                        ? `${pkg.items} items` 
                        : Array.isArray(pkg.items) 
                          ? `${pkg.items.length} items` 
                          : '0 items'} 
                      ({pkg.weight && typeof pkg.weight === 'string' 
                        ? pkg.weight 
                        : '0 kg'})
                    </td>
                    <td>
                      <span className={`status-badge ${(pkg.status || '').toLowerCase().replace(' ', '-')}`}>
                        {pkg.status}
                      </span>
                    </td>
                    <td>{formatDate(pkg.estimatedDelivery)}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn btn-details"
                        onClick={() => handleViewDetails(pkg.id)}
                      >
                        View Details
                      </button>
                      {pkg.trackingNumber && pkg.trackingNumber !== 'N/A' && (
                        <button 
                          className="btn btn-track"
                          onClick={() => handleViewTracking(pkg.id, pkg.trackingNumber, pkg.carrier)}
                        >
                          Track
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Package Details Modal */}
        {showModal && selectedPackage && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>Package Details</h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="package-details">
                  <div className="detail-row">
                    <span className="detail-label">Package ID:</span>
                    <span className="detail-value">{selectedPackage.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Order ID:</span>
                    <span className="detail-value">{selectedPackage.orderId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                      <span className={`status-badge ${(selectedPackage.status || '').toLowerCase().replace(' ', '-')}`}>
                        {selectedPackage.status}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{formatDate(selectedPackage.createTime)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Carrier:</span>
                    <span className="detail-value">{selectedPackage.carrier}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tracking Number:</span>
                    <span className="detail-value">{selectedPackage.trackingNumber || 'N/A'}</span>
                  </div>
                  {/*
                  <div className="detail-row">
                    <span className="detail-label">Items:</span>
                    <span className="detail-value">
                      {typeof selectedPackage.items === 'number' 
                        ? `${selectedPackage.items} items` 
                        : Array.isArray(selectedPackage.items) 
                          ? `${selectedPackage.items.length} items` 
                          : '0 items'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Weight:</span>
                    <span className="detail-value">
                      {selectedPackage.weight && typeof selectedPackage.weight === 'string'
                        ? selectedPackage.weight
                        : '0 kg'}
                    </span>
                  </div>
                  */}
                  <div className="detail-row">
                    <span className="detail-label">Est. Delivery:</span>
                    <span className="detail-value">{formatDate(selectedPackage.estimatedDelivery)}</span>
                  </div>
                  {selectedPackage.address && (
                    <div className="detail-row">
                      <span className="detail-label">Shipping Address:</span>
                      <span className="detail-value">{selectedPackage.address}</span>
                    </div>
                  )}
                  {selectedPackage.shopId && (
                    <div className="detail-row">
                      <span className="detail-label">Shop ID:</span>
                      <span className="detail-value">{selectedPackage.shopId}</span>
                    </div>
                  )}
                  {selectedPackage.updateTime && (
                    <div className="detail-row">
                      <span className="detail-label">Last Updated:</span>
                      <span className="detail-value">{formatDate(selectedPackage.updateTime)}</span>
                    </div>
                  )}
                  {selectedPackage.notes && (
                    <div className="detail-row">
                      <span className="detail-label">Notes:</span>
                      <span className="detail-value">{selectedPackage.notes}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                {selectedPackage.trackingNumber && selectedPackage.trackingNumber !== 'N/A' && (
                  <button 
                    className="btn btn-track"
                    onClick={() => handleViewTracking(selectedPackage.id, selectedPackage.trackingNumber, selectedPackage.carrier)}
                  >
                    Track Package
                  </button>
                )}
                {/* Add Ship Package button if status is not already shipped */}
                {selectedPackage.status !== 'SHIPPED' && selectedPackage.status !== 'DELIVERED' && (
                  <button 
                    className="btn btn-ship"
                    onClick={() => handleShipPackage(selectedPackage.id)}
                  >
                    Ship Package
                  </button>
                )}
                <button className="btn btn-close" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackagePage;