import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/main.css';
import { signOut } from 'aws-amplify/auth';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Sign out from Amplify Auth
      await signOut();
      
      // Also clear any local storage items
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('auth_code');
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">WishfulConnector</Link>
        
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/orders" className="nav-link">Orders</Link>
          <Link to="/packages" className="nav-link">Packages</Link>
          <Link to="/tiktok/connect" className="nav-link">Connect TikTok</Link>
          <button onClick={handleLogout} className="nav-btn nav-btn-logout">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;