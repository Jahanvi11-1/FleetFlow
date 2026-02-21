import { useState, useEffect } from 'react';
import { validateRequired } from '../utils/validators';
import { getVehicles } from '../services/vehicleService';
import styles from './VehicleForm.module.css';

function MaintenanceForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    vehicleId: '',
    date: new Date().toISOString().slice(0, 16),
    description: '',
    cost: '',
  });

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const vehicleList = await getVehicles();
      setVehicles(vehicleList);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!validateRequired(formData.vehicleId)) {
      newErrors.vehicleId = 'Vehicle is required';
    }

    if (!validateRequired(formData.date)) {
      newErrors.date = 'Date is required';
    }

    if (!validateRequired(formData.description)) {
      newErrors.description = 'Description is required';
    }

    if (!validateRequired(formData.cost)) {
      newErrors.cost = 'Cost is required';
    } else if (isNaN(formData.cost) || parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        vehicleId: formData.vehicleId,
        date: new Date(formData.date).toISOString(),
        description: formData.description,
        cost: parseFloat(formData.cost),
      });
    } catch (error) {
      // Error handling is done in parent component
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Maintenance Log</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="vehicleId" className={styles.label}>
              Vehicle <span className={styles.required}>*</span>
            </label>
            <select
              id="vehicleId"
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleChange}
              className={`${styles.select} ${errors.vehicleId ? styles.inputError : ''}`}
              disabled={loadingVehicles}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.licensePlate} - {vehicle.model}
                </option>
              ))}
            </select>
            {errors.vehicleId && (
              <span className={styles.errorMessage}>{errors.vehicleId}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.label}>
              Date <span className={styles.required}>*</span>
            </label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`${styles.input} ${errors.date ? styles.inputError : ''}`}
            />
            {errors.date && (
              <span className={styles.errorMessage}>{errors.date}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`${styles.input} ${errors.description ? styles.inputError : ''}`}
              placeholder="e.g., Oil change and tire rotation"
              rows="3"
              style={{ resize: 'vertical' }}
            />
            {errors.description && (
              <span className={styles.errorMessage}>{errors.description}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cost" className={styles.label}>
              Cost ($) <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              className={`${styles.input} ${errors.cost ? styles.inputError : ''}`}
              placeholder="250.00"
              step="0.01"
              min="0"
            />
            {errors.cost && (
              <span className={styles.errorMessage}>{errors.cost}</span>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Add Maintenance Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MaintenanceForm;
