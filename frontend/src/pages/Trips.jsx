import { useState, useEffect } from 'react';
import { tripService } from '../services/tripService';
import TripForm from '../components/TripForm';
import styles from './Vehicles.module.css';

function Trips() {
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    fetchTrips();
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterTrips();
  }, [trips, searchQuery, statusFilter, vehicleFilter]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await tripService.getTrips();
      if (result.success) {
        setTrips(result.data || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const result = await tripService.getAvailableVehicles();
      if (result.success) {
        setVehicles(result.data || []);
      }
    } catch (err) {
      // Silent fail for vehicle list
    }
  };

  const filterTrips = () => {
    let filtered = [...trips];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.origin.toLowerCase().includes(query) ||
        trip.destination.toLowerCase().includes(query) ||
        trip.id.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Apply vehicle filter
    if (vehicleFilter !== 'all') {
      filtered = filtered.filter(trip => trip.vehicleId === vehicleFilter);
    }

    setFilteredTrips(filtered);
  };

  const handleCreateTrip = async (tripData) => {
    try {
      const result = await tripService.createTrip(tripData);
      if (result.success) {
        setShowForm(false);
        setSuccessMessage('Trip created successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchTrips();
      } else {
        const errorMessage = result.error || 'Failed to create trip';
        const details = result.details;
        
        if (details && Array.isArray(details)) {
          const errorMsg = details.map(d => d.message).join(', ');
          setError(errorMsg);
        } else {
          setError(errorMessage);
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      throw err; // Re-throw to keep form open
    }
  };

  const handleStatusUpdate = async (tripId, newStatus) => {
    try {
      const result = await tripService.updateTripStatus(tripId, newStatus);
      if (result.success) {
        setSuccessMessage(`Trip ${newStatus.toLowerCase()} successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchTrips();
      } else {
        setError(result.error || 'Failed to update trip status');
      }
    } catch (err) {
      setError('Failed to update trip status');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Draft':
        return styles.statusAvailable;
      case 'Dispatched':
        return styles.statusOnTrip;
      case 'Completed':
        return styles.statusAvailable;
      case 'Cancelled':
        return styles.statusInShop;
      default:
        return '';
    }
  };

  const getAvailableActions = (status) => {
    switch (status) {
      case 'Draft':
        return ['Dispatched', 'Cancelled'];
      case 'Dispatched':
        return ['Completed', 'Cancelled'];
      default:
        return [];
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading trips...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Trip Dispatcher</h1>
        <button className={styles.addButton} onClick={() => setShowForm(true)}>
          + Create Trip
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{ 
              float: 'right', 
              background: 'none', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer',
              fontSize: '1.25rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          color: '#10b981',
          marginBottom: '1rem'
        }}>
          {successMessage}
        </div>
      )}

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search by origin, destination, or trip ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.licensePlate}
            </option>
          ))}
        </select>
      </div>

      {filteredTrips.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🚚</div>
          <div className={styles.emptyText}>
            {searchQuery || statusFilter !== 'all' || vehicleFilter !== 'all'
              ? 'No trips match your filters' 
              : 'No trips created yet'}
          </div>
        </div>
      ) : (
        <div className={styles.vehicleGrid}>
          {filteredTrips.map((trip) => (
            <div key={trip.id} className={styles.vehicleCard}>
              <div className={styles.vehicleHeader}>
                <h3 className={styles.vehicleModel}>
                  {trip.origin} → {trip.destination}
                </h3>
                <span className={`${styles.statusPill} ${getStatusClass(trip.status)}`}>
                  {trip.status}
                </span>
              </div>
              <div className={styles.vehicleDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Cargo Weight:</span>
                  <span className={styles.detailValue}>{trip.cargoWeight} kg</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Vehicle:</span>
                  <span className={styles.detailValue}>
                    {trip.vehicle?.licensePlate || 'N/A'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Driver:</span>
                  <span className={styles.detailValue}>
                    {trip.driver?.name || 'N/A'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Scheduled:</span>
                  <span className={styles.detailValue}>
                    {formatDate(trip.scheduledDate)}
                  </span>
                </div>
              </div>
              
              {getAvailableActions(trip.status).length > 0 && (
                <div style={{ 
                  marginTop: '1rem', 
                  display: 'flex', 
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  {getAvailableActions(trip.status).map((action) => (
                    <button
                      key={action}
                      onClick={() => handleStatusUpdate(trip.id, action)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: action === 'Cancelled' 
                          ? 'rgba(239, 68, 68, 0.2)' 
                          : 'rgba(59, 130, 246, 0.2)',
                        color: action === 'Cancelled' ? '#ef4444' : '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = action === 'Cancelled'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(59, 130, 246, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = action === 'Cancelled'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(59, 130, 246, 0.2)';
                      }}
                    >
                      {action === 'Dispatched' ? 'Dispatch' : action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TripForm
          onSubmit={handleCreateTrip}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default Trips;
