import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is already logged in on app start
  useEffect(() => {
    const validateStoredAuth = async () => {
      // FOR DEVELOPMENT: Always clear stored auth to start fresh
      // Remove these lines in production if you want persistent login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
      return;
      
      /* 
      // PRODUCTION CODE: Uncomment below for persistent login
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Validate token by making a test API call
          const response = await axios.get('http://localhost:8000/system/status', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          // If successful, token is valid
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } catch (error) {
          // Token is invalid or expired, clear stored data
          console.log('Stored token invalid, clearing auth data');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
      */
    };
    
    validateStoredAuth();
  }, []);

  const login = async (credentials, loginType = 'general') => {
    try {
      let response;
      
      // Different login endpoints based on type
      switch (loginType) {
        case 'admin':
          response = await axios.post('http://localhost:8000/auth/admin', {
            username: credentials.username,
            password: credentials.password
          });
          break;
        case 'department':
          response = await axios.post('http://localhost:8000/auth/department', {
            department_code: credentials.departmentCode,
            password: credentials.password
          });
          break;
        case 'student':
          response = await axios.post('http://localhost:8000/auth/student', {
            register_number: credentials.registerNumber,
            date_of_birth: credentials.dateOfBirth
          });
          break;
        default:
          response = await axios.post('http://localhost:8000/login', {
            username: credentials.username,
            password: credentials.password
          });
      }

      const { access_token, user: userData } = response.data;
      
      // Store token and user data
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
      
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Clear stored data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset state
    setToken(null);
    setUser(null);
    
    // Clear authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
