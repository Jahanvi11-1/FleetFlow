import { useState, useEffect } from 'react';
import { driverService } from '../services/driverService';
import StatusPill from '../components/StatusPill';
import styles from './Vehicles.module.css';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    licenseExpiration: '',
    status: 'Off Duty'
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadDrivers();
  }, [statusFilter, searchQuery, eligibleOnly]);

  const loadDrivers = async () => {
    setLoading(true);
    setError('');
    
    const filters = {};
    if (statusFilter) filters.status = statusFilter;
    if (searchQuery) filters.search = searchQuery;
    if (eligibleOnly) filters.eligible = true;
    
    const result = await driverService.getDrivers(filters);
    
    if (result.success) {
      setDrivers(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.licenseNumber.trim()) {
      errors.licenseNumber = 'License number is required';
    }
    
    if (!formData.licenseExpiration) {
      errors.licenseExpiration = 'License expiration date is required';
    }
    
    if (!formData.status) {
      errors.status = 'Status is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setFormLoading(true);
    setError('');
    
    const result = editingDriver
      ? await driverService.updateDriver(editingDriver.id, formData)
      : await driverService.createDriver(formData);
    
    if (result.success) {
      setShowForm(false);
      setEditingDriver(null);
      setFormData({
        name: '',
        licenseNumber: '',
        licenseExpiration: '',
        status: 'Off Duty'
      });
      setFormErrors({});
      setSuccessMessage(editingDriver ? 'Driver updated successfully!' : 'Driver created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDrivers();
    } else {
      setError(result.error);
      if (result.details && Array.isArray(result.details)) {
        const serverErrors = {};
        result.details.forEach(detail => {
          serverErrors[detail.field] = detail.message;
        });
        setFormErrors(serverErrors);
      }
    }
    
    setFormLoading(false);
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      licenseExpiration: driver.licenseExpiration,
      status: driver.status
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) {
      return;
    }
    
    const result = await driverService.deleteDriver(id);
    
    if (result.success) {
      setSuccessMessage('Driver deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDrivers();
    } else {
      setError(result.error);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingDriver(null);
    setFormData({
      name: '',
      licenseNumber: '',
      licenseExpiration: '',
      status: 'Off Duty'
    });
    setFormErrors({});
    setError('');
  };

  const isLicenseExpired = (expirationDate) => {
    return new Date(expirationDate) <= new Date();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Driver Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={styles.addButton}
        >
          {showForm ? 'Cancel' : '+ Add Driver'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button 
            onClick={() => setError('')}
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
        <div className={styles.success}>
          {successMessage}
        </div>
      )}

      {showForm && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-xl)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h2 style={{ 
            marginTop: 0, 
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: 600
          }}>
            {editingDriver ? 'Edit Driver' : 'Add New Driver'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-sm)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className={styles.searchInput}
                style={{
                  width: '100%',
                  border: formErrors.name ? '1px solid var(--status-red-border)' : undefined
                }}
              />
              {formErrors.name && (
                <div style={{ color: 'var(--status-red-text)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.name}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-sm)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                License Number *
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleFormChange}
                className={styles.searchInput}
                style={{
                  width: '100%',
                  border: formErrors.licenseNumber ? '1px solid var(--status-red-border)' : undefined
                }}
              />
              {formErrors.licenseNumber && (
                <div style={{ color: 'var(--status-red-text)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.licenseNumber}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-sm)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                License Expiration Date *
              </label>
              <input
                type="date"
                name="licenseExpiration"
                value={formData.licenseExpiration}
                onChange={handleFormChange}
                className={styles.searchInput}
                style={{
                  width: '100%',
                  border: formErrors.licenseExpiration ? '1px solid var(--status-red-border)' : undefined
                }}
              />
              {formErrors.licenseExpiration && (
                <div style={{ color: 'var(--status-red-text)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.licenseExpiration}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-sm)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className={styles.filterSelect}
                style={{
                  width: '100%',
                  border: formErrors.status ? '1px solid var(--status-red-border)' : undefined
                }}
              >
                <option value="On Duty">On Duty</option>
                <option value="Off Duty">Off Duty</option>
              </select>
              {formErrors.status && (
                <div style={{ color: 'var(--status-red-text)', fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>
                  {formErrors.status}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button
                type="submit"
                disabled={formLoading}
                className={styles.addButton}
                style={{ flex: 1 }}
              >
                {formLoading ? 'Saving...' : (editingDriver ? 'Update Driver' : 'Create Driver')}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={formLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-white)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-base)'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className={styles.controls}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="On Duty">On Duty</option>
          <option value="Off Duty">Off Duty</option>
        </select>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9375rem',
          cursor: 'pointer',
          padding: '0.75rem 1rem',
          background: 'var(--bg-white)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          fontWeight: 500
        }}>
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
            style={{ marginRight: 'var(--spacing-sm)' }}
          />
          Eligible Only
        </label>
      </div>

      {/* Driver List */}
      {loading ? (
        <div className={styles.loading}>Loading drivers...</div>
      ) : drivers.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyText}>
            No drivers found. {showForm ? '' : 'Click "Add Driver" to create one.'}
          </div>
        </div>
      ) : (
        <div className={styles.vehicleGrid}>
          {drivers.map((driver) => (
            <div key={driver.id} className={styles.vehicleCard}>
              <div className={styles.vehicleHeader}>
                <h3 className={styles.vehicleModel}>{driver.name}</h3>
                <StatusPill status={driver.status} type="driver" />
              </div>
              <div className={styles.vehicleDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>License Number:</span>
                  <span className={styles.detailValue}>{driver.licenseNumber}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>License Expiration:</span>
                  <span className={styles.detailValue}>
                    {new Date(driver.licenseExpiration).toLocaleDateString()}
                    {isLicenseExpired(driver.licenseExpiration) && (
                      <span style={{
                        color: 'var(--status-red-text)',
                        fontSize: '0.75rem',
                        marginLeft: 'var(--spacing-xs)',
                        fontWeight: 600
                      }}>
                        (Expired)
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div style={{ 
                marginTop: 'var(--spacing-md)', 
                display: 'flex', 
                gap: 'var(--spacing-sm)'
              }}>
                <button
                  onClick={() => handleEdit(driver)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--accent-primary-light)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(driver.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--status-red-bg)',
                    color: 'var(--status-red-text)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Drivers;
