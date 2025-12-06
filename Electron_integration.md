# Electron/React Integration Guide

Complete guide for integrating your Electron/React frontend with the Tactivo Server backend at `http://localhost:3000`.

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [API Client Configuration](#api-client-configuration)
3. [Authentication System](#authentication-system)
4. [React Context & Hooks](#react-context--hooks)
5. [WebSocket Integration](#websocket-integration)
6. [Example Components](#example-components)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## 1. Project Setup

### 1.1 Install Dependencies

```bash
npm install axios
npm install @tanstack/react-query  # For data fetching
npm install zustand  # Or your preferred state management
npm install ws  # For WebSocket (Node.js side in Electron)
```

### 1.2 Project Structure

```
src/
├── api/
│   ├── client.js          # Axios instance
│   ├── auth.js            # Auth endpoints
│   ├── fuel.js            # Fuel endpoints
│   ├── shop.js            # Shop endpoints
│   ├── reports.js         # Reports endpoints
│   └── ...
├── hooks/
│   ├── useAuth.js         # Auth hook
│   ├── useWebSocket.js    # WebSocket hook
│   └── useApi.js          # Generic API hook
├── context/
│   ├── AuthContext.jsx    # Auth context
│   └── AppContext.jsx     # App-wide context
├── utils/
│   ├── storage.js          # Local storage helpers
│   └── errors.js          # Error handling
└── components/
    └── ...
```

---

## 2. API Client Configuration

### 2.1 Base API Client (`src/api/client.js`)

```javascript
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Handle successful responses
    if (response.data.error === false) {
      return response.data.data;
    }
    // Handle API-level errors
    throw new Error(response.data.message || 'API Error');
  },
  (error) => {
    // Handle HTTP errors
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('employee');
        window.location.href = '/login';
      }
      
      throw new Error(data?.message || `HTTP ${status}: ${error.message}`);
    }
    
    // Network errors
    if (error.request) {
      throw new Error('Network error: Could not connect to server');
    }
    
    throw error;
  }
);

export default apiClient;
```

### 2.2 API Endpoint Modules

#### Authentication API (`src/api/auth.js`)

```javascript
import apiClient from './client';

export const authApi = {
  /**
   * Login user
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{token: string, user: object, employee: object|null}>}
   */
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    return response;
  },

  /**
   * Get current user info
   * @returns {Promise<object>}
   */
  getMe: async () => {
    return await apiClient.get('/auth/me');
  },

  /**
   * Logout (client-side only)
   */
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('employee');
  },
};
```

#### Fuel API (`src/api/fuel.js`)

```javascript
import apiClient from './client';

export const fuelApi = {
  /**
   * Get all pump statuses
   * @returns {Promise<object>}
   */
  getPumps: async () => {
    return await apiClient.get('/fuel/pumps');
  },

  /**
   * Get pump status
   * @param {number} pumpNumber
   * @returns {Promise<object>}
   */
  getPumpStatus: async (pumpNumber) => {
    return await apiClient.get(`/fuel/pumps/${pumpNumber}`);
  },

  /**
   * Authorize pump
   * @param {number} pumpNumber
   * @param {object} params - {nozzleNumber, presetType?, presetDose?, price?}
   * @returns {Promise<object>}
   */
  authorizePump: async (pumpNumber, params) => {
    return await apiClient.post(`/fuel/pumps/${pumpNumber}/authorize`, params);
  },

  /**
   * Stop pump
   * @param {number} pumpNumber
   * @returns {Promise<object>}
   */
  stopPump: async (pumpNumber) => {
    return await apiClient.post(`/fuel/pumps/${pumpNumber}/stop`);
  },

  /**
   * Emergency stop pump
   * @param {number} pumpNumber
   * @returns {Promise<object>}
   */
  emergencyStop: async (pumpNumber) => {
    return await apiClient.post(`/fuel/pumps/${pumpNumber}/emergency-stop`);
  },

  /**
   * Get pump totals
   * @param {number} pumpNumber
   * @param {number} nozzleNumber
   * @returns {Promise<object>}
   */
  getPumpTotals: async (pumpNumber, nozzleNumber = 1) => {
    return await apiClient.get(`/fuel/pumps/${pumpNumber}/totals`, {
      params: { nozzle: nozzleNumber },
    });
  },

  /**
   * Get pump prices
   * @param {number} pumpNumber
   * @returns {Promise<object>}
   */
  getPumpPrices: async (pumpNumber) => {
    return await apiClient.get(`/fuel/pumps/${pumpNumber}/prices`);
  },

  /**
   * Set pump prices
   * @param {number} pumpNumber
   * @param {number[]} prices - Array of 6 prices
   * @returns {Promise<object>}
   */
  setPumpPrices: async (pumpNumber, prices) => {
    return await apiClient.post(`/fuel/pumps/${pumpNumber}/prices`, { prices });
  },

  /**
   * Get all tank statuses
   * @returns {Promise<object>}
   */
  getTanks: async () => {
    return await apiClient.get('/fuel/tanks');
  },
};
```

#### Shop API (`src/api/shop.js`)

```javascript
import apiClient from './client';

export const shopApi = {
  /**
   * Get all products
   * @param {object} filters - {station_id?, active?}
   * @returns {Promise<array>}
   */
  getProducts: async (filters = {}) => {
    return await apiClient.get('/shop/products', { params: filters });
  },

  /**
   * Get product by ID
   * @param {string} id
   * @returns {Promise<object>}
   */
  getProduct: async (id) => {
    return await apiClient.get(`/shop/products/${id}`);
  },

  /**
   * Create product
   * @param {object} product
   * @returns {Promise<object>}
   */
  createProduct: async (product) => {
    return await apiClient.post('/shop/products', product);
  },

  /**
   * Update product
   * @param {string} id
   * @param {object} product
   * @returns {Promise<object>}
   */
  updateProduct: async (id, product) => {
    return await apiClient.put(`/shop/products/${id}`, product);
  },

  /**
   * Delete product
   * @param {string} id
   * @returns {Promise<void>}
   */
  deleteProduct: async (id) => {
    return await apiClient.delete(`/shop/products/${id}`);
  },

  /**
   * Get all sales
   * @param {object} filters - {station_id?, employee_id?, start_date?, end_date?}
   * @returns {Promise<array>}
   */
  getSales: async (filters = {}) => {
    return await apiClient.get('/shop/sales', { params: filters });
  },

  /**
   * Get sale by ID
   * @param {string} id
   * @returns {Promise<object>}
   */
  getSale: async (id) => {
    return await apiClient.get(`/shop/sales/${id}`);
  },

  /**
   * Create sale
   * @param {object} sale - {station_id, employee_id?, terminal_id?, total_amount, items[], payments?}
   * @returns {Promise<object>}
   */
  createSale: async (sale) => {
    return await apiClient.post('/shop/sales', sale);
  },
};
```

#### Reports API (`src/api/reports.js`)

```javascript
import apiClient from './client';

export const reportsApi = {
  /**
   * Get sales report
   * @param {object} filters - {station_id, start_date, end_date, group_by?}
   * @returns {Promise<object>}
   */
  getSalesReport: async (filters) => {
    return await apiClient.get('/reports/sales', { params: filters });
  },

  /**
   * Get fuel report
   * @param {object} filters - {station_id, start_date, end_date, grade?}
   * @returns {Promise<object>}
   */
  getFuelReport: async (filters) => {
    return await apiClient.get('/reports/fuel', { params: filters });
  },

  /**
   * Get inventory report
   * @param {object} filters - {station_id, start_date?, end_date?}
   * @returns {Promise<object>}
   */
  getInventoryReport: async (filters) => {
    return await apiClient.get('/reports/inventory', { params: filters });
  },

  /**
   * Get financial report
   * @param {object} filters - {station_id, start_date, end_date}
   * @returns {Promise<object>}
   */
  getFinancialReport: async (filters) => {
    return await apiClient.get('/reports/financial', { params: filters });
  },

  /**
   * Get employee performance report
   * @param {object} filters - {employee_id?, station_id, start_date, end_date}
   * @returns {Promise<array>}
   */
  getEmployeeReport: async (filters) => {
    return await apiClient.get('/reports/employee', { params: filters });
  },

  /**
   * Get pump readings report
   * @param {object} filters - {station_id, pump_id?, start_date, end_date}
   * @returns {Promise<array>}
   */
  getPumpReadingsReport: async (filters) => {
    return await apiClient.get('/reports/pump-readings', { params: filters });
  },
};
```

#### Organizations API (`src/api/organizations.js`)

```javascript
import apiClient from './client';

export const organizationsApi = {
  getAll: async () => {
    return await apiClient.get('/organizations');
  },

  getById: async (id) => {
    return await apiClient.get(`/organizations/${id}`);
  },

  create: async (data) => {
    return await apiClient.post('/organizations', data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/organizations/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/organizations/${id}`);
  },
};
```

#### Stations API (`src/api/stations.js`)

```javascript
import apiClient from './client';

export const stationsApi = {
  getAll: async (companyId = null) => {
    const params = companyId ? { company_id: companyId } : {};
    return await apiClient.get('/stations', { params });
  },

  getById: async (id) => {
    return await apiClient.get(`/stations/${id}`);
  },

  create: async (data) => {
    return await apiClient.post('/stations', data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/stations/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/stations/${id}`);
  },
};
```

#### Employees API (`src/api/employees.js`)

```javascript
import apiClient from './client';

export const employeesApi = {
  getAll: async (filters = {}) => {
    return await apiClient.get('/employees', { params: filters });
  },

  getById: async (id) => {
    return await apiClient.get(`/employees/${id}`);
  },

  create: async (data) => {
    return await apiClient.post('/employees', data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/employees/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/employees/${id}`);
  },
};
```

#### Shifts API (`src/api/shifts.js`)

```javascript
import apiClient from './client';

export const shiftsApi = {
  getAll: async (filters = {}) => {
    return await apiClient.get('/shifts', { params: filters });
  },

  getOpenShift: async (stationId, employeeId) => {
    return await apiClient.get('/shifts/open', {
      params: { station_id: stationId, employee_id: employeeId },
    });
  },

  getById: async (id) => {
    return await apiClient.get(`/shifts/${id}`);
  },

  start: async (data) => {
    return await apiClient.post('/shifts/start', data);
  },

  end: async (id, data) => {
    return await apiClient.post(`/shifts/${id}/end`, data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/shifts/${id}`, data);
  },
};
```

#### Handovers API (`src/api/handovers.js`)

```javascript
import apiClient from './client';

export const handoversApi = {
  getAll: async (filters = {}) => {
    return await apiClient.get('/handovers', { params: filters });
  },

  getById: async (id) => {
    return await apiClient.get(`/handovers/${id}`);
  },

  create: async (data) => {
    return await apiClient.post('/handovers', data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/handovers/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/handovers/${id}`);
  },
};
```

---

## 3. Authentication System

### 3.1 Auth Context (`src/context/AuthContext.jsx`)

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');
    const storedEmployee = localStorage.getItem('employee');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedEmployee) {
        setEmployee(JSON.parse(storedEmployee));
      }
      // Verify token is still valid
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      setLoading(false);
    } catch (error) {
      // Token invalid, clear auth
      logout();
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authApi.login(username, password);
      
      setToken(response.token);
      setUser(response.user);
      setEmployee(response.employee || null);

      // Store in localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      if (response.employee) {
        localStorage.setItem('employee', JSON.stringify(response.employee));
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
    setEmployee(null);
    setLoading(false);
  };

  const hasPermission = (permissionCode) => {
    // Superusers have all permissions
    if (user?.is_superuser) {
      return true;
    }
    // Check employee permissions
    if (employee?.permissions) {
      return employee.permissions.includes(permissionCode);
    }
    return false;
  };

  const hasAnyPermission = (...permissionCodes) => {
    if (user?.is_superuser) {
      return true;
    }
    if (employee?.permissions) {
      return permissionCodes.some(code => employee.permissions.includes(code));
    }
    return false;
  };

  const value = {
    user,
    employee,
    token,
    loading,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 3.2 Protected Route Component

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requirePermission = null }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

---

## 4. React Context & Hooks

### 4.1 Custom Hooks

#### `useApi` Hook (`src/hooks/useApi.js`)

```javascript
import { useState, useEffect } from 'react';

/**
 * Generic API hook for data fetching
 * @param {Function} apiFunction - API function to call
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @returns {object} - {data, loading, error, refetch}
 */
export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
};
```

#### `useMutation` Hook (`src/hooks/useMutation.js`)

```javascript
import { useState } from 'react';

/**
 * Hook for mutation operations (create, update, delete)
 * @param {Function} mutationFunction - API function to call
 * @returns {object} - {mutate, loading, error, data}
 */
export const useMutation = (mutationFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error, data };
};
```

### 4.2 React Query Setup (Alternative)

If using React Query:

```javascript
// src/App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

#### React Query Hooks Example

```javascript
// src/hooks/usePumps.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fuelApi } from '../api/fuel';

export const usePumps = () => {
  return useQuery({
    queryKey: ['pumps'],
    queryFn: () => fuelApi.getPumps(),
    refetchInterval: 1000, // Poll every second
  });
};

export const useAuthorizePump = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ pumpNumber, ...params }) => 
      fuelApi.authorizePump(pumpNumber, params),
    onSuccess: () => {
      // Invalidate pumps query to refetch
      queryClient.invalidateQueries({ queryKey: ['pumps'] });
    },
  });
};
```

---

## 5. WebSocket Integration

### 5.1 WebSocket Hook (`src/hooks/useWebSocket.js`)

```javascript
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = 'ws://localhost:3000/ws';

export const useWebSocket = (onMessage) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('auth_token');
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Send token if available (if server requires auth)
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle different message types
          if (message.type === 'pong') {
            // Keep-alive response
            return;
          }

          // Call custom message handler
          if (onMessage) {
            onMessage(message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        } else {
          setError('Failed to reconnect to server');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(err.message);
    }
  }, [onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const send = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping server every 30 seconds to keep connection alive
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(() => {
      send({ type: 'ping' });
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [connected, send]);

  return { connected, error, send, disconnect, reconnect: connect };
};
```

### 5.2 WebSocket Context (`src/context/WebSocketContext.jsx`)

```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [pumpStatuses, setPumpStatuses] = useState({});
  const [tankStatuses, setTankStatuses] = useState({});
  const [transactions, setTransactions] = useState([]);

  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'initialStatus':
        // Initial pump statuses on connection
        if (message.data) {
          setPumpStatuses(message.data);
        }
        break;

      case 'pumpStatus':
        // Update specific pump status
        if (message.data && message.data.pump) {
          setPumpStatuses((prev) => ({
            ...prev,
            [message.data.pump]: message.data.status,
          }));
        }
        break;

      case 'tankStatus':
        // Update tank status
        if (message.data && message.data.tank) {
          setTankStatuses((prev) => ({
            ...prev,
            [message.data.tank]: message.data.status,
          }));
        }
        break;

      case 'transaction':
        // New transaction completed
        if (message.data) {
          setTransactions((prev) => [message.data, ...prev].slice(0, 100)); // Keep last 100
        }
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }, []);

  const { connected, error, send } = useWebSocket(handleMessage);

  const value = {
    connected,
    error,
    pumpStatuses,
    tankStatuses,
    transactions,
    send,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};
```

---

## 6. Example Components

### 6.1 Login Component

```javascript
// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
```

### 6.2 Pump Dashboard Component

```javascript
// src/components/PumpDashboard.jsx
import { useEffect, useState } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';
import { fuelApi } from '../api/fuel';
import { useAuth } from '../context/AuthContext';

export const PumpDashboard = () => {
  const { pumpStatuses, connected } = useWebSocketContext();
  const { hasPermission } = useAuth();
  const [pumps, setPumps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    loadPumps();

    // Refresh every 5 seconds as backup
    const interval = setInterval(loadPumps, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPumps = async () => {
    try {
      const data = await fuelApi.getPumps();
      setPumps(Object.keys(data).map(key => ({ number: key, ...data[key] })));
    } catch (error) {
      console.error('Error loading pumps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (pumpNumber, nozzleNumber) => {
    if (!hasPermission('fuel.authorize')) {
      alert('You do not have permission to authorize pumps');
      return;
    }

    try {
      await fuelApi.authorizePump(pumpNumber, {
        nozzleNumber,
        presetType: null, // Or 'Volume'/'Amount'
      });
      alert(`Pump ${pumpNumber} authorized`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleStop = async (pumpNumber) => {
    if (!hasPermission('fuel.stop')) {
      alert('You do not have permission to stop pumps');
      return;
    }

    try {
      await fuelApi.stopPump(pumpNumber);
      alert(`Pump ${pumpNumber} stopped`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading pumps...</div>;
  }

  return (
    <div className="pump-dashboard">
      <div className="connection-status">
        WebSocket: {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="pumps-grid">
        {pumps.map((pump) => {
          const status = pumpStatuses[pump.number] || pump;
          return (
            <div key={pump.number} className="pump-card">
              <h3>Pump {pump.number}</h3>
              <div className="status">
                Status: <strong>{status.Status || 'Unknown'}</strong>
              </div>
              {status.Volume !== undefined && (
                <div>Volume: {status.Volume} L</div>
              )}
              {status.Amount !== undefined && (
                <div>Amount: ${status.Amount.toFixed(2)}</div>
              )}
              {status.Transaction && (
                <div>Transaction: #{status.Transaction}</div>
              )}

              <div className="actions">
                <button
                  onClick={() => handleAuthorize(pump.number, 1)}
                  disabled={status.Status === 'Filling'}
                >
                  Authorize
                </button>
                <button
                  onClick={() => handleStop(pump.number)}
                  disabled={status.Status === 'Idle'}
                >
                  Stop
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### 6.3 Shop POS Component

```javascript
// src/components/ShopPOS.jsx
import { useState, useEffect } from 'react';
import { shopApi } from '../api/shop';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '../hooks/useMutation';

export const ShopPOS = ({ stationId }) => {
  const { employee } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const { mutate: createSale, loading: creatingSale } = useMutation(shopApi.createSale);

  useEffect(() => {
    loadProducts();
  }, [stationId]);

  const loadProducts = async () => {
    try {
      const data = await shopApi.getProducts({ station_id: stationId, active: true });
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, qty: item.qty + 1, line_total: (item.qty + 1) * item.unit_price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        qty: 1,
        unit_price: parseFloat(product.price),
        line_total: parseFloat(product.price),
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, qty, line_total: qty * item.unit_price }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.line_total, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const sale = await createSale({
        station_id: stationId,
        employee_id: employee?.id,
        total_amount: getCartTotal(),
        items: cart,
        payments: [{ type: 'cash', amount: getCartTotal() }],
      });

      alert('Sale completed!');
      setCart([]);
      // Optionally print receipt or navigate
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="shop-pos">
      <div className="products-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className="product-card"
            onClick={() => addToCart(product)}
          >
            <h4>{product.name}</h4>
            <p>${product.price}</p>
            <p>Stock: {product.stock_qty}</p>
          </div>
        ))}
      </div>

      <div className="cart">
        <h3>Cart</h3>
        {cart.map((item) => {
          const product = products.find(p => p.id === item.product_id);
          return (
            <div key={item.product_id} className="cart-item">
              <span>{product?.name}</span>
              <input
                type="number"
                value={item.qty}
                onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                min="1"
              />
              <span>${item.line_total.toFixed(2)}</span>
              <button onClick={() => removeFromCart(item.product_id)}>Remove</button>
            </div>
          );
        })}
        <div className="cart-total">
          Total: ${getCartTotal().toFixed(2)}
        </div>
        <button onClick={handleCheckout} disabled={creatingSale || cart.length === 0}>
          {creatingSale ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    </div>
  );
};
```

### 6.4 Reports Component

```javascript
// src/components/Reports.jsx
import { useState } from 'react';
import { reportsApi } from '../api/reports';
import { useApi } from '../hooks/useApi';

export const Reports = ({ stationId }) => {
  const [reportType, setReportType] = useState('sales');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, loading, error } = useApi(
    () => {
      const filters = { station_id: stationId, start_date: startDate, end_date: endDate };
      
      switch (reportType) {
        case 'sales':
          return reportsApi.getSalesReport(filters);
        case 'fuel':
          return reportsApi.getFuelReport(filters);
        case 'financial':
          return reportsApi.getFinancialReport(filters);
        case 'employee':
          return reportsApi.getEmployeeReport(filters);
        default:
          return Promise.resolve(null);
      }
    },
    [reportType, startDate, endDate, stationId]
  );

  return (
    <div className="reports">
      <div className="report-filters">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="sales">Sales Report</option>
          <option value="fuel">Fuel Report</option>
          <option value="financial">Financial Report</option>
          <option value="employee">Employee Report</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {loading && <div>Loading report...</div>}
      {error && <div className="error">Error: {error}</div>}
      {data && (
        <div className="report-data">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
```

---

## 7. Error Handling

### 7.1 Error Boundary Component

```javascript
// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 7.2 Error Toast Component

```javascript
// src/components/Toast.jsx
import { useState, useEffect } from 'react';

export const Toast = ({ message, type = 'error', duration = 5000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {message}
      <button onClick={onClose}>×</button>
    </div>
  );
};

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'error') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(toast => toast.id !== id));
  };

  return (
    <>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};
```

---

## 8. Best Practices

### 8.1 App Structure

```javascript
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PumpDashboard from './components/PumpDashboard';
import ShopPOS from './components/ShopPOS';
import Reports from './components/Reports';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pumps"
                element={
                  <ProtectedRoute requirePermission="fuel.authorize">
                    <PumpDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop"
                element={
                  <ProtectedRoute requirePermission="shop.sale.create">
                    <ShopPOS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requirePermission="reports.view">
                    <Reports />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
```

### 8.2 Environment Configuration

```javascript
// src/config.js
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws',
  appName: 'Tactivo POS',
  version: '1.0.0',
};
```

### 8.3 TypeScript Types (Optional)

```typescript
// src/types/api.ts
export interface User {
  id: string;
  username: string;
  email?: string;
  is_superuser: boolean;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name?: string;
  employee_code?: string;
  station_id?: string;
  company_id?: string;
  roles?: Role[];
  permissions?: string[];
}

export interface PumpStatus {
  Status: 'Idle' | 'Filling' | 'EndOfTransaction' | 'Offline';
  Transaction?: number;
  Nozzle?: number;
  Volume?: number;
  Amount?: number;
}

export interface ShopProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stock_qty: number;
  active: boolean;
}
```

### 8.4 Loading States

```javascript
// src/components/LoadingSpinner.jsx
export const LoadingSpinner = ({ size = 'medium' }) => {
  return (
    <div className={`spinner spinner-${size}`}>
      <div className="spinner-circle"></div>
    </div>
  );
};

// Usage
{loading && <LoadingSpinner />}
```

### 8.5 Form Validation

```javascript
// src/utils/validation.js
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== '';
};

export const validateNumber = (value, min = null, max = null) => {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
};
```

---

## 9. Electron-Specific Considerations

### 9.1 IPC Communication (if needed)

```javascript
// electron/main.js
const { ipcMain } = require('electron');

ipcMain.handle('get-station-id', async () => {
  // Get station ID from Electron store or config
  return 'station-id-from-config';
});

// renderer process
const { ipcRenderer } = window.require('electron');
const stationId = await ipcRenderer.invoke('get-station-id');
```

### 9.2 Offline Detection

```javascript
// src/hooks/useOffline.js
import { useState, useEffect } from 'react';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};
```

### 9.3 Local Storage for Offline

```javascript
// src/utils/offlineQueue.js
export const offlineQueue = {
  queue: [],

  add: (action, data) => {
    const item = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(item);
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  },

  process: async () => {
    const queue = 