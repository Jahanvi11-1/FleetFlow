import { useState, useEffect } from 'react';
import { driverService } from '../services/driverService';
import StatusPill from '../components/StatusPill';

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
    // Clear error for this field
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
      loadDrivers();
    } else {
      setError(result.error);
      // Handle field-specific errors from server
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
    <div style={{
      padding: '2rem',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{ margin: 0 }}>Driver Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {showForm ? 'Cancel' : 'Add Driver'}
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#ff4444',
            color: '#fff',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {showForm && (
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '2rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ marginTop: 0 }}>
              {editingDriver ? 'Edit Driver' : 'Add New Driver'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem'
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: formErrors.name ? '1px solid #ff4444' : '1px solid #444',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                />
                {formErrors.name && (
                  <div style={{ color: '#ff4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem'
                }}>
                  License Number *
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: formErrors.licenseNumber ? '1px solid #ff4444' : '1px solid #444',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                />
                {formErrors.licenseNumber && (
                  <div style={{ color: '#ff4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {formErrors.licenseNumber}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem'
                }}>
                  License Expiration Date *
                </label>
                <input
                  type="date"
                  name="licenseExpiration"
                  value={formData.licenseExpiration}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: formErrors.licenseExpiration ? '1px solid #ff4444' : '1px solid #444',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                />
                {formErrors.licenseExpiration && (
                  <div style={{ color: '#ff4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {formErrors.licenseExpiration}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  color: '#ccc',
                  marginBottom: '0.5rem'
                }}>
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: formErrors.status ? '1px solid #ff4444' : '1px solid #444',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                >
                  <option value="On Duty">On Duty</option>
                  <option value="Off Duty">Off Duty</option>
                </select>
                {formErrors.status && (
                  <div style={{ color: '#ff4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {formErrors.status}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: formLoading ? '#555' : '#4CAF50',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: formLoading ? 'not-allowed' : 'pointer'
                  }}
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
                    borderRadius: '4px',
                    border: '1px solid #666',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    fontSize: '1rem',
                    cursor: formLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div style={{
          backgroundColor: '#2a2a2a',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{
              display: 'block',
              color: '#ccc',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              Search by Name
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter driver name..."
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{
              display: 'block',
              color: '#ccc',
              marginBottom: '0.5rem',
              fontSize: '0.875rem'
            }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            >
              <option value="">All</option>
              <option value="On Duty">On Duty</option>
              <option value="Off Duty">Off Duty</option>
            </select>
          </div>

          <div style={{ flex: '0 1 150px', display: 'flex', alignItems: 'flex-end' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              color: '#ccc',
              fontSize: '0.875rem',
              cursor: 'pointer',
              paddingBottom: '0.5rem'
            }}>
              <input
                type="checkbox"
                checked={eligibleOnly}
                onChange={(e) => setEligibleOnly(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              Eligible Only
            </label>
          </div>
        </div>

        {/* Driver List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>
            Loading drivers...
          </div>
        ) : drivers.length === 0 ? (
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#ccc'
          }}>
            No drivers found. {showForm ? '' : 'Click "Add Driver" to create one.'}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#333' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #444' }}>
                    Name
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #444' }}>
                    License Number
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #444' }}>
                    License Expiration
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #444' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #444' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '1rem' }}>
                      {driver.name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {driver.licenseNumber}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        {new Date(driver.licenseExpiration).toLocaleDateString()}
                      </div>
                      {isLicenseExpired(driver.licenseExpiration) && (
                        <div style={{
                          color: '#ff4444',
                          fontSize: '0.75rem',
                          marginTop: '0.25rem'
                        }}>
                          Expired
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusPill status={driver.status} type="driver" />
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(driver)}
                        style={{
                          padding: '0.5rem 1rem',
                          marginRight: '0.5rem',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#2196F3',
                          color: '#fff',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(driver.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#f44336',
                          color: '#fff',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Drivers;
