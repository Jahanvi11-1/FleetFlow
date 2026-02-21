import { useState, useEffect } from 'react';
import { getVehicleROI, getFuelEfficiency, exportAnalytics } from '../services/analyticsService';
import styles from './Analytics.module.css';

function Analytics() {
  const [roiData, setRoiData] = useState([]);
  const [fuelData, setFuelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, [appliedStartDate, appliedEndDate]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch ROI data with date range
      const roiResponse = await getVehicleROI(appliedStartDate, appliedEndDate);
      setRoiData(roiResponse.roi || []);
      
      // Fetch fuel efficiency data
      const fuelResponse = await getFuelEfficiency();
      setFuelData(fuelResponse.efficiency || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDateRange = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      setError(null);
      
      // Export ROI data
      const blob = await exportAnalytics(format, 'roi', appliedStartDate, appliedEndDate);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vehicle_roi_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage(`Analytics exported successfully as ${format.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to export as ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatROI = (roi) => {
    if (roi === null || roi === undefined) return 'N/A';
    const value = parseFloat(roi);
    const className = value > 0 ? styles.roiPositive : value < 0 ? styles.roiNegative : styles.roiNeutral;
    return <span className={className}>{value.toFixed(2)}%</span>;
  };

  const formatEfficiency = (efficiency) => {
    if (efficiency === null || efficiency === undefined) return 'N/A';
    return `${parseFloat(efficiency).toFixed(2)} km/L`;
  };

  // Calculate max efficiency for chart scaling
  const maxEfficiency = Math.max(...fuelData.map(d => d.efficiency || 0), 1);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics Dashboard</h1>
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
        <div className={styles.success}>
          {successMessage}
        </div>
      )}

      {/* Date Range Selector */}
      <div className={styles.dateRangeSection}>
        <h3 className={styles.dateRangeTitle}>Date Range Filter</h3>
        <div className={styles.dateRangeInputs}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.dateInput}
            placeholder="Start Date"
          />
          <span style={{ color: '#9ca3af' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.dateInput}
            placeholder="End Date"
          />
          <button 
            onClick={handleApplyDateRange}
            className={styles.applyButton}
            disabled={loading}
          >
            Apply Filter
          </button>
          {(appliedStartDate || appliedEndDate) && (
            <button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setAppliedStartDate('');
                setAppliedEndDate('');
              }}
              className={styles.applyButton}
              style={{ background: 'rgba(239, 68, 68, 0.2)' }}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Export Buttons */}
      <div className={styles.exportSection}>
        <button 
          onClick={() => handleExport('csv')}
          className={styles.exportButton}
          disabled={exporting || roiData.length === 0}
        >
          📊 Export CSV
        </button>
        <button 
          onClick={() => handleExport('pdf')}
          className={styles.exportButton}
          disabled={exporting || roiData.length === 0}
        >
          📄 Export PDF
        </button>
      </div>

      {/* Vehicle ROI Table */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Vehicle ROI Analysis</h2>
        {roiData.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📊</div>
            <div className={styles.emptyText}>No ROI data available</div>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>License Plate</th>
                  <th>Model</th>
                  <th>Revenue</th>
                  <th>Maintenance Cost</th>
                  <th>Fuel Cost</th>
                  <th>Acquisition Cost</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {roiData.map((vehicle) => (
                  <tr key={vehicle.vehicleId}>
                    <td>{vehicle.licensePlate}</td>
                    <td>{vehicle.model}</td>
                    <td>{formatCurrency(vehicle.revenue)}</td>
                    <td>{formatCurrency(vehicle.maintenanceCost)}</td>
                    <td>{formatCurrency(vehicle.fuelCost)}</td>
                    <td>{formatCurrency(vehicle.acquisitionCost)}</td>
                    <td>{formatROI(vehicle.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fuel Efficiency Charts */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Fuel Efficiency Analysis</h2>
        {fuelData.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⛽</div>
            <div className={styles.emptyText}>No fuel efficiency data available</div>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>License Plate</th>
                    <th>Model</th>
                    <th>Efficiency (km/L)</th>
                    <th>Total Distance (km)</th>
                    <th>Total Fuel (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelData.map((vehicle) => (
                    <tr key={vehicle.vehicleId}>
                      <td>{vehicle.licensePlate}</td>
                      <td>{vehicle.model}</td>
                      <td>{formatEfficiency(vehicle.efficiency)}</td>
                      <td>{vehicle.totalDistance ? parseFloat(vehicle.totalDistance).toFixed(2) : 'N/A'}</td>
                      <td>{vehicle.totalFuel ? parseFloat(vehicle.totalFuel).toFixed(2) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fuel Efficiency Bar Chart */}
            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>Fuel Efficiency Comparison</h3>
              <div className={styles.barChart}>
                {fuelData
                  .filter(v => v.efficiency !== null && v.efficiency !== undefined)
                  .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
                  .map((vehicle) => (
                    <div key={vehicle.vehicleId} className={styles.barRow}>
                      <div className={styles.barLabel}>{vehicle.licensePlate}</div>
                      <div className={styles.barContainer}>
                        <div 
                          className={styles.barFill}
                          style={{ width: `${(vehicle.efficiency / maxEfficiency) * 100}%` }}
                        />
                      </div>
                      <div className={styles.barValue}>
                        {formatEfficiency(vehicle.efficiency)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;
