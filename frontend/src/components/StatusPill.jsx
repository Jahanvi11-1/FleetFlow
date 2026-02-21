const StatusPill = ({ status, type = 'driver' }) => {
  const getStatusColor = () => {
    if (type === 'driver') {
      switch (status) {
        case 'On Duty':
          return '#4CAF50'; // Green
        case 'Off Duty':
          return '#f44336'; // Red
        default:
          return '#757575'; // Gray
      }
    } else if (type === 'vehicle') {
      switch (status) {
        case 'Available':
          return '#4CAF50'; // Green
        case 'On Trip':
          return '#FFC107'; // Yellow
        case 'In Shop':
          return '#f44336'; // Red
        default:
          return '#757575'; // Gray
      }
    }
    return '#757575';
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '12px',
      backgroundColor: getStatusColor(),
      color: '#fff',
      fontSize: '0.875rem',
      fontWeight: '500'
    }}>
      {status}
    </span>
  );
};

export default StatusPill;
