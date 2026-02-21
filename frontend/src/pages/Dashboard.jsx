import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getVehicleROI, getFuelEfficiency } from '../services/analyticsService';
import { tripService } from '../services/tripService';
import styles from './Dashboard.module.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    availableVehicles: 0,
    onTripVehicles: 0,
    inShopVehicles: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalDrivers: 0,
    onDutyDrivers: 0
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch vehicles
      const vehiclesResponse = await api.get('/vehicles');
      const vehicles = vehiclesResponse.data.vehicles || [];
      
      // Fetch trips
      const tripsResult = await tripService.getTrips();
      const trips = tripsResult.success ? tripsResult.data || [] : [];
      
      // Fetch drivers
      const driversResponse = await api.get('/drivers');
      const drivers = driversResponse.data.drivers || [];

      // Fetch ROI data for top performers
      const roiResponse = await getVehicleROI();
      const roiData = roiResponse.roi || [];

      // Calculate stats
      setStats({
        totalVehicles: vehicles.length,
        availableVehicles: vehicles.filter(v => v.status === 'Available').length,
        onTripVehicles: vehicles.filter(v => v.status === 'On Trip').length,
        inShopVehicles: vehicles.filter(v => v.status === 'In Shop').length,
        activeTrips: trips.filter(t => t.status === 'Dispatched').length,
        completedTrips: trips.filter(t => t.status === 'Completed').length,
        totalDrivers: drivers.length,
        onDutyDrivers: drivers.filter(d => d.status === 'On Duty').length
      });

      // Get recent trips (last 5)
      const sortedTrips = [...trips].sort((a, b) => 
        new Date(b.scheduledDate) - new Date(a.scheduledDate)
      );
      setRecentTrips(sortedTrips.slice(0, 5));

      // Get top 3 performers by ROI
      const topRoi = [...roiData]
        .filter(v => v.roi !== null && v.roi !== undefined)
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 3);
      setTopPerformers(topRoi);

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Available':
      case 'Completed':
      case 'On Duty':
        return styles.statusGreen;
      case 'On Trip':
      case 'Dispatched':
        return styles.statusYellow;
      case 'In Shop':
      case 'Off Duty':
      case 'Cancelled':
        return styles.statusRed;
      default:
        return styles.statusGray;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>FleetFlow Dashboard</h1>
        <p className={styles.subtitle}>Real-time fleet management overview</p>
      </div>

      <div className={styles.bentoGrid}>
        {/* Fleet Overview - Large Widget */}
        <div className={`${styles.widget} ${styles.widgetLarge}`}>
          <h2 className={styles.widgetTitle}>Fleet Overview</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Total Vehicles</div>
                <div className={styles.statValue}>{stats.totalVehicles}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Available</div>
                <div className={styles.statValue} style={{ color: 'var(--status-green)' }}>{stats.availableVehicles}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>On Trip</div>
                <div className={styles.statValue} style={{ color: 'var(--status-amber)' }}>{stats.onTripVehicles}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>In Shop</div>
                <div className={styles.statValue} style={{ color: 'var(--status-amber)' }}>{stats.inShopVehicles}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Trips - Medium Widget */}
        <div className={`${styles.widget} ${styles.widgetMedium}`}>
          <div className={styles.widgetHeader}>
            <h2 className={styles.widgetTitle}>Active Trips</h2>
            <Link to="/trips" className={styles.widgetLink}>View All →</Link>
          </div>
          <div className={styles.bigNumber}>{stats.activeTrips}</div>
          <div className={styles.widgetSubtext}>Currently dispatched</div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Completed:</span>
            <span className={styles.miniStatValue}>{stats.completedTrips}</span>
          </div>
        </div>

        {/* Drivers Status - Medium Widget */}
        <div className={`${styles.widget} ${styles.widgetMedium}`}>
          <div className={styles.widgetHeader}>
            <h2 className={styles.widgetTitle}>Drivers</h2>
            <Link to="/drivers" className={styles.widgetLink}>View All →</Link>
          </div>
          <div className={styles.bigNumber}>{stats.onDutyDrivers}</div>
          <div className={styles.widgetSubtext}>On duty now</div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatLabel}>Total:</span>
            <span className={styles.miniStatValue}>{stats.totalDrivers}</span>
          </div>
        </div>

        {/* Recent Trips - Tall Widget */}
        <div className={`${styles.widget} ${styles.widgetTall}`}>
          <div className={styles.widgetHeader}>
            <h2 className={styles.widgetTitle}>Recent Trips</h2>
            <Link to="/trips" className={styles.widgetLink}>View All →</Link>
          </div>
          {recentTrips.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>No trips yet</div>
            </div>
          ) : (
            <div className={styles.tripList}>
              {recentTrips.map((trip) => (
                <div key={trip.id} className={styles.tripItem}>
                  <div className={styles.tripRoute}>
                    {trip.origin} → {trip.destination}
                  </div>
                  <div className={styles.tripMeta}>
                    <span className={`${styles.tripStatus} ${getStatusClass(trip.status)}`}>
                      {trip.status}
                    </span>
                    <span className={styles.tripDate}>{formatDate(trip.scheduledDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performers - Wide Widget */}
        <div className={`${styles.widget} ${styles.widgetWide}`}>
          <div className={styles.widgetHeader}>
            <h2 className={styles.widgetTitle}>Top Performers (ROI)</h2>
            <Link to="/analytics" className={styles.widgetLink}>View Analytics →</Link>
          </div>
          {topPerformers.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>No ROI data available</div>
            </div>
          ) : (
            <div className={styles.performerList}>
              {topPerformers.map((vehicle, index) => (
                <div key={vehicle.vehicleId} className={styles.performerItem}>
                  <div className={styles.performerRank}>{index + 1}</div>
                  <div className={styles.performerInfo}>
                    <div className={styles.performerPlate}>{vehicle.licensePlate}</div>
                    <div className={styles.performerModel}>{vehicle.model}</div>
                  </div>
                  <div className={styles.performerRoi}>
                    <span className={vehicle.roi > 0 ? styles.roiPositive : styles.roiNegative}>
                      {vehicle.roi.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Small Widget */}
        <div className={`${styles.widget} ${styles.widgetSmall}`}>
          <h2 className={styles.widgetTitle}>Quick Actions</h2>
          <div className={styles.actionList}>
            <Link to="/vehicles" className={styles.actionButton}>
              <span>Add Vehicle</span>
            </Link>
            <Link to="/trips" className={styles.actionButton}>
              <span>Create Trip</span>
            </Link>
            <Link to="/maintenance" className={styles.actionButton}>
              <span>Log Maintenance</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
