import React, { createContext, useState, useEffect, useContext } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession, signInWithRedirect } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  console.log("AuthProvider initialized");

  useEffect(() => {
    console.log("Running checkUser effect");
    checkUser();
  }, []);

  async function checkUser() {
    try {
      console.log("Checking current user...");
      const currentUser = await getCurrentUser();
      console.log("Current user found:", currentUser);
      
      try {
        const session = await fetchAuthSession();
        console.log("Session fetched successfully");
        
        if (session.tokens) {
          console.log("Tokens available:", 
            session.tokens.accessToken ? "Access Token: Yes" : "Access Token: No",
            session.tokens.idToken ? "ID Token: Yes" : "ID Token: No",
            session.tokens.refreshToken ? "Refresh Token: Yes" : "Refresh Token: No"
          );
          
          setUser({
            ...currentUser,
            signInUserSession: {
              accessToken: { jwtToken: session.tokens?.accessToken?.toString() }
            }
          });
        } else {
          console.warn("No tokens available in session");
          setUser(currentUser); // Still set the user even without tokens
        }
      } catch (sessionError) {
        console.error("Error fetching session:", sessionError);
        setUser(currentUser); // Still set the user even if session fetch fails
      }
      
      return currentUser;
    } catch (error) {
      console.log("No authenticated user found:", error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
      setAuthChecked(true);
      console.log("Auth check completed");
    }
  }

  async function login() {
    try {
      console.log("Initiating login...");
      await signInWithRedirect({ provider: 'COGNITO' });
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async function logoutUser() {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  function isUserAuthenticated() {
    return !!user;
  }

  function getUserAuthToken() {
    return user?.signInUserSession?.accessToken?.jwtToken || null;
  }

  const value = {
    user,
    loading,
    authChecked,
    login,
    logout: logoutUser,
    isAuthenticated: isUserAuthenticated,
    getAuthToken: getUserAuthToken,
    checkUser // Export the checkUser function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// These are NOT hooks, just regular functions that use the context internally
export const getAuthToken = () => {
  // This won't work in regular functions, only in components
  return null;
};

export const isAuthenticated = () => {
  // This won't work in regular functions, only in components
  return false;
};

export const logout = () => {
  // This won't work in regular functions, only in components
};