import { useState, useEffect } from 'react';
import api from '../services/api';
import VehicleForm from '../components/VehicleForm';
import styles from './Vehicles.module.css';

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchQuery, statusFilter]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/vehicles');
      setVehicles(response.data.vehicles || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.licensePlate.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
    }

    setFilteredVehicles(filtered);
  };

  const handleAddVehicle = async (vehicleData) => {
    try {
      await api.post('/vehicles', vehicleData);
      setShowForm(false);
      setSuccessMessage('Vehicle added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchVehicles();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to add vehicle';
      const details = err.response?.data?.details;
      
      if (details && Array.isArray(details)) {
        // Display validation errors
        const errorMsg = details.map(d => d.message).join(', ');
        setError(errorMsg);
      } else {
        setError(errorMessage);
      }
      
      throw err; // Re-throw to keep form open
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Available':
        return styles.statusAvailable;
      case 'On Trip':
        return styles.statusOnTrip;
      case 'In Shop':
        return styles.statusInShop;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading vehicles...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vehicle Registry</h1>
        <button className={styles.addButton} onClick={() => setShowForm(true)}>
          + Add Vehicle
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
          placeholder="Search by license plate or model..."
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
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="In Shop">In Shop</option>
        </select>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyText}>
            {searchQuery || statusFilter !== 'all' 
              ? 'No vehicles match your filters' 
              : 'No vehicles registered yet'}
          </div>
        </div>
      ) : (
        <div className={styles.vehicleGrid}>
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className={styles.vehicleCard}>
              <div className={styles.vehicleHeader}>
                <h3 className={styles.vehicleModel}>{vehicle.model}</h3>
                <span className={`${styles.statusPill} ${getStatusClass(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </div>
              <div className={styles.vehicleDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>License Plate:</span>
                  <span className={styles.detailValue}>{vehicle.licensePlate}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Max Capacity:</span>
                  <span className={styles.detailValue}>
                    {vehicle.maxLoadCapacity} {vehicle.capacityUnit}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Odometer:</span>
                  <span className={styles.detailValue}>{vehicle.odometer} km</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <VehicleForm
          onSubmit={handleAddVehicle}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default Vehicles;
