import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../utils/AuthContext';
import { fetchPackages, debugPackageStructure, createShippingOrder, schedulePickup } from '../api/package';
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [pickupDate, setPickupDate] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [itemsCount, setItemsCount] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  // Add pagination state variables
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [packagesPerPage] = useState(20);
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Get tomorrow's date for minimum selectable date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  // Check if a date is a weekend
  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };
  
  // Disable weekends in the date picker
  const disableWeekends = (e) => {
    const date = new Date(e.target.value);
    if (isWeekend(date)) {
      window.alert('Weekends are not available for pickup. Please select a weekday.');
      e.target.value = '';
      setPickupDate(null);
    } else {
      setPickupDate(e.target.value);
    }
  };
  
  // Add pagination handler functions inside the component
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Fetch packages on component mount
  useEffect(() => {
    const loadPackages = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const result = await fetchPackages(currentPage, packagesPerPage);
        console.log("Fetched packages:", result);
        setPackages(result.packages);
        setTotalPages(result.totalPages);
        setError(null);
      } catch (err) {
        console.error('Error loading packages:', err);
        setError('Failed to load your packages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadPackages();
  }, [user, currentPage, packagesPerPage]);

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
      // If no tracking number, still redirect to UPS tracking page
      window.open('https://www.ups.com/track?loc=en_IT&requester=ST', '_blank');
      return;
    }
    
    // You could either navigate to a tracking page or open the carrier's tracking page
    let trackingUrl;
    
    switch(carrier.toLowerCase()) {
      case 'ups':
        trackingUrl = `https://www.ups.com/track?loc=en_IT&requester=ST&tracknum=${trackingNumber}`;
        break;
      case 'sda':
        trackingUrl = `https://www.sda.it/wps/portal/Servizi/ricerca-spedizioni?tracking=${trackingNumber}`;
        break;
      default:
        // For any other carrier, redirect to UPS tracking page
        trackingUrl = `https://www.ups.com/track?loc=en_IT&requester=ST&tracknum=${trackingNumber}`;
        break;
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
      
      // Update the selected package to show loading state
      if (selectedPackage && selectedPackage.id === packageId) {
        setSelectedPackage(prev => ({
          ...prev,
          isShipping: true
        }));
      }
      
      const result = await createShippingOrder(packageId);
      console.log('Shipping order created:', result);
      
      window.alert(`Package ${packageId} has been shipped successfully!`);
      
      // Close the modal after successful shipping
      setShowModal(false);
      
      // Refresh packages list to show updated status
      const packagesResult = await fetchPackages(currentPage, packagesPerPage);
      setPackages(packagesResult.packages);
      setTotalPages(packagesResult.totalPages);
      
      // Set up auto-refresh interval for 30 seconds to check for status updates
      const refreshInterval = setInterval(async () => {
        try {
          console.log('Auto-refreshing package list...');
          const refreshResult = await fetchPackages(currentPage, packagesPerPage);
          setPackages(refreshResult.packages);
          setTotalPages(refreshResult.totalPages);
          
          // Check if the shipped package status has been updated
          const shippedPackage = refreshResult.packages.find(p => p.id === packageId);
          if (shippedPackage && shippedPackage.status === 'SHIPPED') {
            console.log('Package status updated to SHIPPED, stopping auto-refresh');
            clearInterval(refreshInterval);
          }
        } catch (refreshErr) {
          console.error('Error during auto-refresh:', refreshErr);
          clearInterval(refreshInterval);
        }
      }, 5000); // Check every 5 seconds
      
      // Clear the interval after 30 seconds regardless
      setTimeout(() => {
        clearInterval(refreshInterval);
        console.log('Auto-refresh stopped after timeout');
      }, 30000);
    } catch (err) {
      console.error('Error shipping package:', err);
      window.alert('Failed to ship package, please try again.');
      
      // Reset shipping state on the selected package
      if (selectedPackage && selectedPackage.id === packageId) {
        setSelectedPackage(prev => ({
          ...prev,
          isShipping: false
        }));
      }
    } finally {
      setIsShipping(false);
    }
  };

  // Close calendar modal
  const closeCalendarModal = () => {
    setShowCalendar(false);
    setPickupDate(null);
    setItemsCount('');
    setTotalWeight('');
  };

  // Submit pickup schedule
  const submitPickupSchedule = async () => {
    if (!pickupDate || !itemsCount || !totalWeight) {
      window.alert('Please fill in all required fields');
      return;
    }

    try {
      setIsScheduling(true);
      console.log(`Scheduling pickup for date: ${pickupDate}, items: ${itemsCount}, weight: ${totalWeight}kg`);
      
      const result = await schedulePickup(null, pickupDate, itemsCount, totalWeight);
      console.log('Pickup scheduled:', result);
      
      window.alert(`Pickup has been scheduled for ${new Date(pickupDate).toLocaleDateString()}`);
      closeCalendarModal();
    } catch (err) {
      console.error('Error scheduling pickup:', err);
      window.alert(`Failed to schedule pickup: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="orders-page">
      <Navbar />
      <div className="container">
        <div className="orders-header">
          <h1>Your Packages</h1>
          <div className="header-actions">
            <button 
              className="btn btn-pickup"
              onClick={() => setShowCalendar(true)}
            >
              Schedule Pickup
            </button>
            
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
        </div>
        
        {error && <div className="alert alert-danger">{error}</div>}
  
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
                  <th>Status</th>                 
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
                      <span className={`status-badge ${(pkg.status || '').toLowerCase().replace(' ', '-')}`}>
                        {pkg.status}
                      </span>
                    </td>
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
            
            {/* Add pagination controls here, inside the component */}
            <div className="pagination-controls">
              <button 
                className="btn btn-pagination" 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn btn-pagination" 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
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
                  {/* Removing the Last Updated section */}
                  {/* Always show shipping label section */}
                  <div className="detail-row">
                    <span className="detail-label">Shipping Label:</span>
                    <span className="detail-value">
                      {selectedPackage.label_url ? (
                        <a href={selectedPackage.label_url} target="_blank" rel="noopener noreferrer">
                          View Shipping Label
                        </a>
                      ) : (
                        "No shipping label available"
                      )}
                    </span>
                  </div>
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
                    disabled={selectedPackage.isShipping || isShipping}
                  >
                    {selectedPackage.isShipping ? (
                      <>
                        <span className="spinner-small"></span>
                        Creating Shipping Label...
                      </>
                    ) : (
                      'Ship Package'
                    )}
                  </button>
                )}
                <button className="btn btn-close" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Pickup Calendar Modal with additional fields */}
        {showCalendar && (
          <div className="modal-overlay">
            <div className="modal-container calendar-modal">
              <div className="modal-header">
                <h2>Schedule Pickup</h2>
                <button className="modal-close" onClick={closeCalendarModal}>×</button>
              </div>
              <div className="modal-body">
                <p>Please enter the details for your pickup request</p>
                <div className="pickup-calendar">
                  <label htmlFor="pickup-date">Pickup Date:</label>
                  <input 
                    type="date" 
                    id="pickup-date"
                    min={getTomorrowDate()}
                    value={pickupDate || ''}
                    onChange={disableWeekends}
                    required
                    className="date-picker"
                  />
                  <small className="date-hint">Note: Weekends are not available for pickup</small>
                </div>
                
                {/* Fields for items count and weight */}
                <div className="pickup-items">
                  <label htmlFor="items-count">Number of Items:</label>
                  <input 
                    type="number" 
                    id="items-count"
                    min="1"
                    value={itemsCount}
                    onChange={(e) => setItemsCount(e.target.value)}
                    required
                  />
                </div>
                
                <div className="pickup-weight">
                  <label htmlFor="total-weight">Total Weight (kg):</label>
                  <input 
                    type="number" 
                    id="total-weight"
                    min="0.1"
                    step="0.1"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-schedule"
                  onClick={submitPickupSchedule}
                  disabled={isScheduling || !pickupDate || !itemsCount || !totalWeight}
                >
                  {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
                <button className="btn btn-close" onClick={closeCalendarModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackagePage;
