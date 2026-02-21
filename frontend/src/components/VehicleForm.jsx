import { useState } from 'react';
import { validateLicensePlate, validateRequired } from '../utils/validators';
import styles from './VehicleForm.module.css';

function VehicleForm({ onSubmit, onCancel, initialData = null }) {
  const [formData, setFormData] = useState({
    model: initialData?.model || '',
    licensePlate: initialData?.licensePlate || '',
    maxLoadCapacity: initialData?.maxLoadCapacity || '',
    capacityUnit: initialData?.capacityUnit || 'kg',
    odometer: initialData?.odometer || '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!validateRequired(formData.model)) {
      newErrors.model = 'Model is required';
    }

    if (!validateRequired(formData.licensePlate)) {
      newErrors.licensePlate = 'License plate is required';
    } else if (!validateLicensePlate(formData.licensePlate)) {
      newErrors.licensePlate = 'License plate must match pattern XX 00 XX 0000 (e.g., AB 12 CD 3456)';
    }

    if (!validateRequired(formData.maxLoadCapacity)) {
      newErrors.maxLoadCapacity = 'Max load capacity is required';
    } else if (isNaN(formData.maxLoadCapacity) || parseFloat(formData.maxLoadCapacity) <= 0) {
      newErrors.maxLoadCapacity = 'Max load capacity must be a positive number';
    }

    if (!validateRequired(formData.odometer)) {
      newErrors.odometer = 'Odometer reading is required';
    } else if (isNaN(formData.odometer) || parseFloat(formData.odometer) < 0) {
      newErrors.odometer = 'Odometer reading must be a non-negative number';
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
        model: formData.model,
        licensePlate: formData.licensePlate,
        maxLoadCapacity: parseFloat(formData.maxLoadCapacity),
        capacityUnit: formData.capacityUnit,
        odometer: parseFloat(formData.odometer),
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
          <h2 className={styles.title}>
            {initialData ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="model" className={styles.label}>
              Model <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className={`${styles.input} ${errors.model ? styles.inputError : ''}`}
              placeholder="e.g., Toyota Hilux"
            />
            {errors.model && (
              <span className={styles.errorMessage}>{errors.model}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="licensePlate" className={styles.label}>
              License Plate <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="licensePlate"
              name="licensePlate"
              value={formData.licensePlate}
              onChange={handleChange}
              className={`${styles.input} ${errors.licensePlate ? styles.inputError : ''}`}
              placeholder="AB 12 CD 3456"
              maxLength={13}
            />
            {errors.licensePlate && (
              <span className={styles.errorMessage}>{errors.licensePlate}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="maxLoadCapacity" className={styles.label}>
                Max Load Capacity <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                id="maxLoadCapacity"
                name="maxLoadCapacity"
                value={formData.maxLoadCapacity}
                onChange={handleChange}
                className={`${styles.input} ${errors.maxLoadCapacity ? styles.inputError : ''}`}
                placeholder="5000"
                step="0.01"
              />
              {errors.maxLoadCapacity && (
                <span className={styles.errorMessage}>{errors.maxLoadCapacity}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="capacityUnit" className={styles.label}>
                Unit
              </label>
              <select
                id="capacityUnit"
                name="capacityUnit"
                value={formData.capacityUnit}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="kg">kg</option>
                <option value="tons">tons</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="odometer" className={styles.label}>
              Odometer Reading (km) <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              id="odometer"
              name="odometer"
              value={formData.odometer}
              onChange={handleChange}
              className={`${styles.input} ${errors.odometer ? styles.inputError : ''}`}
              placeholder="50000"
              step="0.01"
            />
            {errors.odometer && (
              <span className={styles.errorMessage}>{errors.odometer}</span>
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
              {isSubmitting ? 'Saving...' : initialData ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VehicleForm;
