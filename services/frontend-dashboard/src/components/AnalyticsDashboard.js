import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Note: For a production app, ensure 'axios' and 'recharts' are added to package.json
// npm install axios recharts

/**
 * @component AnalyticsDashboard
 * @description Main dashboard component for displaying recommendation engine analytics.
 * It fetches data from the API gateway and visualizes key metrics using charts and stat cards.
 */
const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    /**
     * Fetches analytics data from the backend API.
     */
    const fetchAnalyticsData = async () => {
      // In a real application, this URL should come from environment variables
      const apiUrl = process.env.REACT_APP_API_URL || '/api/v1/analytics';

      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(apiUrl);
        setAnalyticsData(response.data);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Could not load analytics data. Please try again later.");
        // In a real app, you might want to set some mock data for UI development
        // setAnalyticsData(mockData); 
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []); // Empty dependency array ensures this runs only once on component mount

  if (loading) {
    return <div style={styles.centered}>Loading Analytics...</div>;
  }

  if (error) {
    return <div style={{ ...styles.centered, ...styles.errorText }}>{error}</div>;
  }

  if (!analyticsData) {
    return <div style={styles.centered}>No analytics data available.</div>;
  }

  const { kpis, performanceOverTime, topItems } = analyticsData;

  return (
    <div style={styles.dashboardContainer}>
      <h1 style={styles.header}>IntelliSuggest Analytics Dashboard</h1>

      {/* KPI Cards Section */}
      <div style={styles.kpiGrid}>
        <KpiCard title="Total Recommendations Served" value={kpis.totalRecommendations.toLocaleString()} />
        <KpiCard title="Click-Through Rate (CTR)" value={`${(kpis.clickThroughRate * 100).toFixed(2)}%`} />
        <KpiCard title="Conversion Rate" value={`${(kpis.conversionRate * 100).toFixed(2)}%`} />
        <KpiCard title="Active Models" value={kpis.activeModels} />
      </div>

      {/* Charts Section */}
      <div style={styles.chartsGrid}>
        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>Recommendation Performance Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="served" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="clicked" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>Top 5 Recommended Items</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="recommendations" fill="#4a90e2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/**
 * @component KpiCard
 * @description A reusable card component to display a single Key Performance Indicator.
 * @param {{title: string, value: string|number}} props
 */
const KpiCard = ({ title, value }) => (
  <div style={styles.kpiCard}>
    <h3 style={styles.kpiTitle}>{title}</h3>
    <p style={styles.kpiValue}>{value}</p>
  </div>
);

// Basic styling for the dashboard. In a larger application, this would be moved
// to CSS Modules, a CSS-in-JS library (like styled-components), or a utility-first framework (like Tailwind CSS).
const styles = {
  dashboardContainer: {
    padding: '2rem',
    backgroundColor: '#f4f7f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    fontSize: '2rem',
    color: '#333',
    marginBottom: '2rem',
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '80vh',
    fontSize: '1.5rem',
  },
  errorText: {
    color: '#d9534f',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  kpiCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    borderLeft: '4px solid #4a90e2',
  },
  kpiTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1rem',
    color: '#666',
    fontWeight: '600',
  },
  kpiValue: {
    margin: 0,
    fontSize: '2.25rem',
    fontWeight: 'bold',
    color: '#333',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  chartTitle: {
    fontSize: '1.2rem',
    color: '#333',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
};

export default AnalyticsDashboard;