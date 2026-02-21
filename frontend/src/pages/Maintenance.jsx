import { useState, useEffect } from 'react';
import { getMaintenanceLogs, createMaintenanceLog, completeMaintenanceLog } from '../services/maintenanceService';
import { getVehicles } from '../services/vehicleService';
import MaintenanceForm from '../components/MaintenanceForm';
import styles from './Vehicles.module.css';

function Maintenance() {
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [maintenanceLogs, vehicleFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logs, vehicleList] = await Promise.all([
        getMaintenanceLogs(),
        getVehicles()
      ]);
      setMaintenanceLogs(logs);
      setVehicles(vehicleList);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load maintenance logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...maintenanceLogs];

    // Apply vehicle filter
    if (vehicleFilter !== 'all') {
      filtered = filtered.filter(log => log.vehicleId === vehicleFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  };

  const handleAddMaintenance = async (maintenanceData) => {
    try {
      await createMaintenanceLog(maintenanceData);
      setShowForm(false);
      setSuccessMessage('Maintenance log added successfully! Vehicle status changed to "In Shop".');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to add maintenance log';
      const details = err.response?.data?.details;
      
      if (details && Array.isArray(details)) {
        const errorMsg = details.map(d => d.message).join(', ');
        setError(errorMsg);
      } else {
        setError(errorMessage);
      }
      
      throw err;
    }
  };

  const handleCompleteMaintenance = async (logId) => {
    try {
      await completeMaintenanceLog(logId);
      setSuccessMessage('Maintenance completed! Vehicle status returned to "Available".');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to complete maintenance';
      setError(errorMessage);
    }
  };

  const getVehicleInfo = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.licensePlate} - ${vehicle.model}` : 'Unknown Vehicle';
  };

  const getStatusClass = (status) => {
    return status === 'Completed' ? styles.statusAvailable : styles.statusOnTrip;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
        <div className={styles.loading}>Loading maintenance logs...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Maintenance Logs</h1>
        <button className={styles.addButton} onClick={() => setShowForm(true)}>
          + Add Maintenance Log
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
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.licensePlate} - {vehicle.model}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {filteredLogs.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔧</div>
          <div className={styles.emptyText}>
            {vehicleFilter !== 'all' || statusFilter !== 'all'
              ? 'No maintenance logs match your filters' 
              : 'No maintenance logs recorded yet'}
          </div>
        </div>
      ) : (
        <div className={styles.vehicleGrid}>
          {filteredLogs.map((log) => (
            <div key={log.id} className={styles.vehicleCard}>
              <div className={styles.vehicleHeader}>
                <h3 className={styles.vehicleModel}>{getVehicleInfo(log.vehicleId)}</h3>
                <span className={`${styles.statusPill} ${getStatusClass(log.status)}`}>
                  {log.status}
                </span>
              </div>
              <div className={styles.vehicleDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date:</span>
                  <span className={styles.detailValue}>{formatDate(log.date)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Description:</span>
                  <span className={styles.detailValue}>{log.description}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Cost:</span>
                  <span className={styles.detailValue}>${log.cost.toFixed(2)}</span>
                </div>
              </div>
              {log.status === 'In Progress' && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => handleCompleteMaintenance(log.id)}
                    className={styles.addButton}
                    style={{ width: '100%' }}
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <MaintenanceForm
          onSubmit={handleAddMaintenance}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default Maintenance;
