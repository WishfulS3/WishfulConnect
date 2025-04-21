// src/components/LoginForm.jsx

import React, { useState } from 'react';
import { login } from '../utils/auth';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { idToken } = await login(username, password);
      localStorage.setItem('token', idToken); // Save for later requests
      alert("Logged in!");
      // Redirect or set auth state here
    } catch (err) {
      console.error("Login failed", err);
      alert("Login failed");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
};

export default LoginForm;
