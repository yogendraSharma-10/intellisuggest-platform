import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useLocation
} from 'react-router-dom';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './App.css';

// --- Mock Authentication Service ---
// In a real application, this would be in a separate file (e.g., 'src/services/authService.js')
// and would make API calls to the backend.
const authService = {
  isAuthenticated: () => !!localStorage.getItem('authToken'),
  login: async (username, password) => {
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === 'admin' && password === 'password') {
          const mockToken = 'fake-jwt-token';
          localStorage.setItem('authToken', mockToken);
          resolve({ token: mockToken });
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 500);
    });
  },
  logout: () => {
    localStorage.removeItem('authToken');
  },
};

// --- UI Components ---
// In a real application, each of these would be in its own file under 'src/components/'

/**
 * Renders the main header of the application.
 * @param {object} props - The component props.
 * @param {Function} props.onLogout - Function to call when the logout button is clicked.
 */
const Header = ({ onLogout }) => (
  <header className="app-header">
    <h1>IntelliSuggest Dashboard</h1>
    <button onClick={onLogout} className="logout-button">Logout</button>
  </header>
);

/**
 * Renders the sidebar navigation.
 */
const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className="app-sidebar">
      <nav>
        <ul>
          <li className={isActive('/analytics') ? 'active' : ''}>
            <Link to="/analytics">Analytics</Link>
          </li>
          <li className={isActive('/settings') ? 'active' : ''}>
            {/* Example of a disabled/future link */}
            <Link to="/settings" onClick={(e) => e.preventDefault()} style={{ color: '#888', cursor: 'not-allowed' }}>
              Settings
            </Link>
          </li>
          <li className={isActive('/monitoring') ? 'active' : ''}>
            <Link to="/monitoring" onClick={(e) => e.preventDefault()} style={{ color: '#888', cursor: 'not-allowed' }}>
              Monitoring
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

/**
 * Renders the login page.
 * @param {object} props - The component props.
 * @param {Function} props.onLogin - Function to call upon successful login.
 */
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authService.login(username, password);
      onLogin();
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>IntelliSuggest Platform</h2>
        <p>Admin Dashboard Login</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * A simple 404 Not Found page component.
 */
const NotFoundPage = () => (
  <div className="not-found-container">
    <h1>404 - Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <Link to="/">Go to Dashboard</Link>
  </div>
);


// --- Layout and Routing Components ---

/**
 * A wrapper for protected routes that checks for authentication.
 * If the user is not authenticated, it redirects them to the login page.
 * @param {object} props - The component props.
 * @param {boolean} props.isAuthenticated - Flag indicating if the user is authenticated.
 */
const PrivateRoute = ({ isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
};

/**
 * Defines the main layout for authenticated users, including the header, sidebar,
 * and a content area for the routed page.
 */
const MainLayout = () => (
  <div className="app-container">
    <Sidebar />
    <div className="main-content">
      {/* The Outlet component renders the matched child route component */}
      <Outlet />
    </div>
  </div>
);


/**
 * The root component of the application.
 * It manages authentication state and sets up the main router.
 */
function App() {
  // State to track authentication status. Initialize from our auth service.
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [isLoading, setIsLoading] = useState(true);

  // On initial load, verify authentication status.
  // This handles cases where the user refreshes a page while logged in.
  useEffect(() => {
    // In a real app, you might want to verify the token with the backend here.
    setIsAuthenticated(authService.isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  // Display a loading indicator while checking auth status
  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <Router>
      {/* Conditionally render the header outside the Routes if you want it on every page */}
      {isAuthenticated && <Header onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
        } />

        {/* Protected Routes */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          {/* Add other protected routes here, e.g., */}
          {/* <Route path="/settings" element={<SettingsPage />} /> */}
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;