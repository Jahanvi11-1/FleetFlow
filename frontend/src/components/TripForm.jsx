import { useState, useEffect } from 'react';
import { validateRequired } from '../utils/validators';
import { tripService } from '../services/tripService';
import styles from './VehicleForm.module.css';

function TripForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    cargoWeight: '',
    vehicleId: '',
    driverId: '',
    scheduledDate: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [capacityWarning, setCapacityWarning] = useState('');

  useEffect(() => {
    fetchAvailableVehicles();
    fetchEligibleDrivers();
  }, []);

  useEffect(() => {
    checkCapacity();
  }, [formData.cargoWeight, formData.vehicleId, availableVehicles]);

  const fetchAvailableVehicles = async () => {
    setLoadingVehicles(true);
    const result = await tripService.getAvailableVehicles();
    if (result.success) {
      setAvailableVehicles(result.data || []);
    }
    setLoadingVehicles(false);
  };

  const fetchEligibleDrivers = async () => {
    setLoadingDrivers(true);
    const result = await tripService.getEligibleDrivers();
    if (result.success) {
      setEligibleDrivers(result.data || []);
    }
    setLoadingDrivers(false);
  };

  const checkCapacity = () => {
    if (formData.cargoWeight && formData.vehicleId) {
      const selectedVehicle = availableVehicles.find(v => v.id === formData.vehicleId);
      if (selectedVehicle) {
        const cargoWeight = parseFloat(formData.cargoWeight);
        const maxCapacity = parseFloat(selectedVehicle.maxLoadCapacity);
        
        if (cargoWeight > maxCapacity) {
          setCapacityWarning(
            `Warning: Cargo weight (${cargoWeight} ${selectedVehicle.capacityUnit}) exceeds vehicle capacity (${maxCapacity} ${selectedVehicle.capacityUnit})`
          );
        } else {
          setCapacityWarning('');
        }
      }
    } else {
      setCapacityWarning('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!validateRequired(formData.origin)) {
      newErrors.origin = 'Origin is required';
    }

    if (!validateRequired(formData.destination)) {
      newErrors.destination = 'Destination is required';
    }

    if (!validateRequired(formData.cargoWeight)) {
      newErrors.cargoWeight = 'Cargo weight is required';
    } else if (isNaN(formData.cargoWeight) || parseFloat(formData.cargoWeight) <= 0) {
      newErrors.cargoWeight = 'Cargo weight must be a positive number';
    }

    if (!validateRequired(formData.vehicleId)) {
      newErrors.vehicleId = 'Vehicle selection is required';
    }

    if (!validateRequired(formData.driverId)) {
      newErrors.driverId = 'Driver selection is required';
    }

    if (!validateRequired(formData.scheduledDate)) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }

    // Check capacity validation
    if (capacityWarning) {
      newErrors.cargoWeight = 'Cargo weight exceeds vehicle capacity';
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
        origin: formData.origin,
        destination: formData.destination,
        cargoWeight: parseFloat(formData.cargoWeight),
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        scheduledDate: formData.scheduledDate,
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
          <h2 className={styles.title}>Create New Trip</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="origin" className={styles.label}>
              Origin <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="origin"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              className={`${styles.input} ${errors.origin ? styles.inputError : ''}`}
              placeholder="e.g., Warehouse A"
            />
            {errors.origin && (
              <span className={styles.errorMessage}>{errors.origin}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="destination" className={styles.label}>
              Destination <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className={`${styles.input} ${errors.destination ? styles.inputError : ''}`}
              placeholder="e.g., Distribution Center B"
            />
            {errors.destination && (
              <span className={styles.errorMessage}>{errors.destination}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cargoWeight" className={styles.label}>
              Cargo Weight (kg) <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              id="cargoWeight"
              name="cargoWeight"
              value={formData.cargoWeight}
              onChange={handleChange}
              className={`${styles.input} ${errors.cargoWeight ? styles.inputError : ''}`}
              placeholder="1000"
              step="0.01"
            />
            {capacityWarning && !errors.cargoWeight && (
              <span className={styles.errorMessage}>{capacityWarning}</span>
            )}
            {errors.cargoWeight && (
              <span className={styles.errorMessage}>{errors.cargoWeight}</span>
            )}
          </div>

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
              <option value="">
                {loadingVehicles ? 'Loading vehicles...' : 'Select a vehicle'}
              </option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.model} - {vehicle.licensePlate} (Capacity: {vehicle.maxLoadCapacity} {vehicle.capacityUnit})
                </option>
              ))}
            </select>
            {errors.vehicleId && (
              <span className={styles.errorMessage}>{errors.vehicleId}</span>
            )}
            {!loadingVehicles && availableVehicles.length === 0 && (
              <span className={styles.errorMessage}>No available vehicles</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="driverId" className={styles.label}>
              Driver <span className={styles.required}>*</span>
            </label>
            <select
              id="driverId"
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              className={`${styles.select} ${errors.driverId ? styles.inputError : ''}`}
              disabled={loadingDrivers}
            >
              <option value="">
                {loadingDrivers ? 'Loading drivers...' : 'Select a driver'}
              </option>
              {eligibleDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - License: {driver.licenseNumber}
                </option>
              ))}
            </select>
            {errors.driverId && (
              <span className={styles.errorMessage}>{errors.driverId}</span>
            )}
            {!loadingDrivers && eligibleDrivers.length === 0 && (
              <span className={styles.errorMessage}>No eligible drivers (must be On Duty with valid license)</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="scheduledDate" className={styles.label}>
              Scheduled Date <span className={styles.required}>*</span>
            </label>
            <input
              type="datetime-local"
              id="scheduledDate"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              className={`${styles.input} ${errors.scheduledDate ? styles.inputError : ''}`}
            />
            {errors.scheduledDate && (
              <span className={styles.errorMessage}>{errors.scheduledDate}</span>
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
              disabled={isSubmitting || loadingVehicles || loadingDrivers}
            >
              {isSubmitting ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TripForm;
