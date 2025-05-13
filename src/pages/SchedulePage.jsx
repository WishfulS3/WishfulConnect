import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../utils/AuthContext';
import { fetchScheduledPickups, getScheduledPickupDetails } from '../api/schedule';
import '../styles/main.css';

/**
 * Schedule page component
 * Displays a list of scheduled pickups
 */
const SchedulePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // Add pagination state variables
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [schedulesPerPage] = useState(20);
  // Add state to track authentication check
  const [authChecking, setAuthChecking] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check authentication status
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        setAuthChecking(true);
        // Wait a moment to ensure auth state is loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (isMounted) {
          setAuthChecking(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Add pagination handler functions
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
  
  // Fetch scheduled pickups on component mount and when page changes
  useEffect(() => {
    let isMounted = true;
    
    const loadSchedules = async () => {
      if (!user || authChecking) return;
      
      try {
        setLoading(true);
        const result = await fetchScheduledPickups(currentPage, schedulesPerPage);
        console.log("Fetched scheduled pickups:", result);
        
        if (isMounted) {
          setSchedules(result.schedules);
          setTotalPages(result.totalPages);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading scheduled pickups:', err);
        if (isMounted) {
          setError('Failed to load your scheduled pickups. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadSchedules();
    
    return () => {
      isMounted = false;
    };
  }, [user, currentPage, schedulesPerPage, authChecking]);

  // Only redirect to login if auth check is complete and user is not authenticated
  if (!authChecking && !user) {
    return <Navigate to="/login" state={{ from: '/schedule' }} replace />;
  }

  // Handle view schedule details
  const handleViewDetails = (pickupId) => {
    const schedule = schedules.find(s => s.id === pickupId);
    if (schedule) {
      console.log("Selected schedule for modal:", schedule);
      setSelectedSchedule(schedule);
      setShowModal(true);
    }
  };

  // Close the modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedSchedule(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle the specific format "20250515"
      if (dateString.length === 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Format time like "0900" to "09:00"
      if (timeString.length === 4) {
        const hours = timeString.substring(0, 2);
        const minutes = timeString.substring(2, 4);
        return `${hours}:${minutes}`;
      }
      return timeString;
    } catch (e) {
      return 'Invalid Time';
    }
  };

  // Format address for display
  const formatAddress = (addressObj) => {
    if (!addressObj) return 'N/A';
    
    try {
      const parts = [];
      if (addressObj.addressLine) parts.push(addressObj.addressLine);
      if (addressObj.city) parts.push(addressObj.city);
      if (addressObj.postalCode) parts.push(addressObj.postalCode);
      if (addressObj.stateProvince) parts.push(addressObj.stateProvince);
      if (addressObj.countryCode) parts.push(addressObj.countryCode);
      
      return parts.length > 0 ? parts.join(', ') : 'N/A';
    } catch (e) {
      return 'Invalid Address';
    }
  };

  return (
    <div className="orders-page">
      <Navbar />
      <div className="container">
        <div className="orders-header">
          <h1>Your Scheduled Pickups</h1>
          {error && <div className="alert alert-danger">{error}</div>}
        </div>
  
        {(loading || authChecking) ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your scheduled pickups...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="no-orders">
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <h3>No Scheduled Pickups Found</h3>
              <p>When you schedule package pickups, they will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Pickup ID</th>
                  <th>Address</th>
                  <th>Pickup Date</th>
                  <th>Ready Time</th>
                  <th>Close Time</th>
                  <th>Items Count</th>
                  <th>Weight (kg)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(schedule => (
                  <tr key={schedule.id}>
                    <td><span className="order-id">{schedule.id}</span></td>
                    <td>{formatAddress(schedule.addressObj)}</td>
                    <td>{formatDate(schedule.pickupDate)}</td>
                    <td>{formatTime(schedule.readyTime)}</td>
                    <td>{formatTime(schedule.closeTime)}</td>
                    <td>{schedule.itemCount}</td>
                    <td>{schedule.weight}</td>
                    <td>
                      <button 
                        className="btn btn-details"
                        onClick={() => handleViewDetails(schedule.id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination controls */}
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
        
        {/* Schedule Details Modal */}
        {showModal && selectedSchedule && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>Scheduled Pickup Details</h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="modal-body">
                <div className="package-details">
                  <div className="detail-row">
                    <span className="detail-label">Pickup ID:</span>
                    <span className="detail-value">{selectedSchedule.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{formatAddress(selectedSchedule.addressObj)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Pickup Date:</span>
                    <span className="detail-value">{formatDate(selectedSchedule.pickupDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Ready Time:</span>
                    <span className="detail-value">{formatTime(selectedSchedule.readyTime)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Close Time:</span>
                    <span className="detail-value">{formatTime(selectedSchedule.closeTime)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Items Count:</span>
                    <span className="detail-value">{selectedSchedule.itemCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Weight:</span>
                    <span className="detail-value">{selectedSchedule.weight} kg</span>
                  </div>
                  {selectedSchedule.contactName && (
                    <div className="detail-row">
                      <span className="detail-label">Contact Name:</span>
                      <span className="detail-value">{selectedSchedule.contactName}</span>
                    </div>
                  )}
                  {selectedSchedule.phoneNumber && (
                    <div className="detail-row">
                      <span className="detail-label">Phone Number:</span>
                      <span className="detail-value">{selectedSchedule.phoneNumber}</span>
                    </div>
                  )}
                  {selectedSchedule.referenceNumber && (
                    <div className="detail-row">
                      <span className="detail-label">Reference Number:</span>
                      <span className="detail-value">{selectedSchedule.referenceNumber}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{formatDate(selectedSchedule.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-close" onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;