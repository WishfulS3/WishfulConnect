import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { fetchOrders } from '../api/orders'; // Remove cancelOrder import
import { useAuth } from '../utils/AuthContext';
import '../styles/main.css';
import { generateClient } from 'aws-amplify/api';
import { onUpdateOrder } from '../api/graphql';

// Create a GraphQL client
const client = generateClient();

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuth();
  
  // Update the useEffect hook to use GraphQL subscriptions
  useEffect(() => {
    let subscription;
    
    const fetchUserOrders = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch initial orders
        const data = await fetchOrders();
        console.log('Fetched orders:', data);
        setOrders(data || []);
        setLoading(false);
        
        // Set up real-time subscription
        const userId = user.sub || user.userId || user.username;
        console.log('Setting up subscription for user:', userId);
        
        try {
          subscription = client.graphql({
            query: onUpdateOrder,
            variables: { userId }
          }).subscribe({
            next: (result) => {
              console.log('Subscription data received:', result);
              const updatedItem = result.data.onUpdateWishfulConnectOrderItems;
              console.log('Real-time order update received:', updatedItem);
              
              // Parse the price JSON
              let priceObj = {};
              try {
                priceObj = typeof updatedItem.price === 'string' ? JSON.parse(updatedItem.price) : updatedItem.price;
              } catch (e) {
                console.error('Error parsing price JSON:', e);
              }
              
              // Update the orders state
              setOrders(prevOrders => {
                // Find the order this item belongs to
                const orderIndex = prevOrders.findIndex(order => order.id === updatedItem.orderId);
                
                if (orderIndex >= 0) {
                  // Update existing order
                  const updatedOrders = [...prevOrders];
                  const order = {...updatedOrders[orderIndex]};
                  
                  // Find the item in the order
                  const itemIndex = order.items.findIndex(item => item.id === updatedItem.itemId);
                  
                  const price = parseFloat(priceObj?.sale || priceObj?.original || 0);
                  const quantity = parseInt(updatedItem.quantity) || 1;
                  
                  if (itemIndex >= 0) {
                    // Update existing item
                    order.items[itemIndex] = {
                      id: updatedItem.itemId,
                      name: updatedItem.productName || 'Product',
                      price: price,
                      quantity: quantity
                    };
                  } else {
                    // Add new item
                    order.items.push({
                      id: updatedItem.itemId,
                      name: updatedItem.productName || 'Product',
                      price: price,
                      quantity: quantity
                    });
                  }
                  
                  // Update order status if needed
                  if (updatedItem.status) {
                    order.status = updatedItem.status;
                  }
                  
                  // Recalculate total
                  order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  
                  updatedOrders[orderIndex] = order;
                  return updatedOrders;
                } else {
                  // This is a new order, fetch all orders again to be safe
                  fetchOrders().then(newOrders => setOrders(newOrders));
                  return prevOrders;
                }
              });
            },
            error: (err) => {
              console.error('Subscription error:', err);
            }
          });
        } catch (subError) {
          console.error('Failed to set up subscription:', subError);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError('Failed to load orders. Please try again.');
        setLoading(false);
      }
    };
    
    if (user) {
      fetchUserOrders();
    }
    
    // Clean up subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle view details
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // Format status for display
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    
    // Convert from SNAKE_CASE to Title Case
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Filter orders based on search term and status filter
  const filteredOrders = orders.filter(order => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer?.name && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by status - case insensitive comparison
    const matchesStatus = filterStatus === 'all' || 
      order.status?.toUpperCase() === filterStatus.toUpperCase();
    
    return matchesSearch && matchesStatus;
  });

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
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
          <h1>Your Orders</h1>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="orders-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-container">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="AWAITING_SHIPMENT">Awaiting Shipment</option>
                <option value="PARTIALLY_SHIPPING">Partially Shipping</option>
                <option value="AWAITING_COLLECTION">Awaiting Collection</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
  
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-orders">
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"></path>
                <path d="m3 5 9 9 9-9"></path>
              </svg>
              <h3>No Orders Found</h3>
              <p>
                {searchTerm || filterStatus !== 'all' 
                  ? 'No orders match your search criteria. Try adjusting your filters.' 
                  : 'When you place orders, they will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td><span className="order-id">{order.id}</span></td>
                    <td>{formatDate(order.date)}</td>
                    <td>{order.items?.length || 0} items</td>
                    <td><span className="order-total">${order.total?.toFixed(2) || '0.00'}</span></td>
                    <td>
                      <span className={`status-badge ${(order.status || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`}>
                        {formatStatus(order.status) || 'Processing'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-details"
                        onClick={() => handleViewDetails(order)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="order-details-header">
                <div>
                  <h3>Order #{selectedOrder.id}</h3>
                  <p>Placed on {formatDate(selectedOrder.date)}</p>
                </div>
                <span className={`status-badge ${(selectedOrder.status || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`}>
                  {formatStatus(selectedOrder.status) || 'Processing'}
                </span>
              </div>
              
              <div className="order-items">
                <h4>Items</h4>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>{item.quantity}</td>
                        <td>${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="text-right"><strong>Total</strong></td>
                      <td><strong>${selectedOrder.total.toFixed(2)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {selectedOrder.shippingMethod && (
                <div className="shipping-info">
                  <h4>Shipping Information</h4>
                  <p><strong>Method:</strong> {selectedOrder.shippingMethod}</p>
                  {selectedOrder.trackingNumber && (
                    <p><strong>Tracking Number:</strong> {selectedOrder.trackingNumber}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;