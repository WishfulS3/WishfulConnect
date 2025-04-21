import React from 'react';
import '../styles/main.css';

/**
 * Component for selecting shipping methods
 * @param {Object} props - Component props
 * @param {string} props.selectedMethod - Currently selected shipping method
 * @param {Function} props.onSelectMethod - Function to call when shipping method is changed
 * @param {boolean} props.disabled - Whether the selector is disabled
 */
const ShippingSelector = ({ selectedMethod, onSelectMethod, disabled = false }) => {
  const shippingOptions = [
    { id: 'UPS', name: 'UPS', description: 'Standard shipping (2-3 days)' },
    { id: 'SDA', name: 'SDA', description: 'Express shipping (1-2 days)' }
  ];

  return (
    <div className="shipping-selector">
      {shippingOptions.map(option => (
        <div 
          key={option.id}
          className={`shipping-option ${selectedMethod === option.id ? 'selected' : ''}`}
          onClick={() => !disabled && onSelectMethod(option.id)}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }}
        >
          <div>{option.name}</div>
          <small>{option.description}</small>
        </div>
      ))}
    </div>
  );
};

export default ShippingSelector;