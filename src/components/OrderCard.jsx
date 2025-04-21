import React from 'react';
import '../styles/main.css';

/**
 * Component to display order information in a card format
 * @param {Object} props - Component props
 * @param {Object} props.order - Order data to display
 * @param {Function} props.onSelectShipping - Function to call when shipping method is changed
 */
const OrderCard = ({ order, onSelectShipping }) => {
  // Calculate total price of all items in the order
  const totalPrice = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity, 
    0
  );

  return (
    <div className="order-card">
      <div className="order-header">
        <h3>Order #{order.id}</h3>
        <span className={`status-badge ${order.status.toLowerCase()}`}>
          {order.status}
        </span>
      </div>
      
      <div className="order-details">
        <p><strong>Customer:</strong> {order.customerName}</p>
        <p><strong>Order Date:</strong> {order.orderDate}</p>
        <p>
          <strong>Shipping Method:</strong> {order.shippingMethod}
          {order.status === 'Processing' && (
            <select 
              className="shipping-select"
              value={order.shippingMethod}
              onChange={(e) => onSelectShipping(order.id, e.target.value)}
            >
              <option value="UPS">UPS</option>
              <option value="SDA">SDA</option>
            </select>
          )}
        </p>
        {order.trackingNumber && (
          <p><strong>Tracking Number:</strong> {order.trackingNumber}</p>
        )}
      </div>
      
      <div className="order-items">
        <h4>Items</h4>
        <ul>
          {order.items.map(item => (
            <li key={item.id}>
              {item.name} - ${item.price.toFixed(2)} x {item.quantity}
            </li>
          ))}
        </ul>
        <p className="total-price"><strong>Total:</strong> ${totalPrice.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default OrderCard;