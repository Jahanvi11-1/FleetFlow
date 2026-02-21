import PropTypes from 'prop-types';
import './SearchResults.css';

/**
 * SearchResults Component
 * Displays search results grouped by entity type (vehicles, drivers, trips)
 * Requirements: 7.2, 7.3, 7.4
 */
function SearchResults({ results, query, onResultClick }) {
  const hasResults = results && (
    results.vehicles?.length > 0 ||
    results.drivers?.length > 0 ||
    results.trips?.length > 0
  );

  if (!hasResults) {
    return (
      <div className="search-results">
        <div className="search-results__empty">
          No results found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {/* Vehicles Section - Requirement 7.3: Results grouped by entity type */}
      {results.vehicles?.length > 0 && (
        <div className="search-results__section">
          <h3 className="search-results__heading">Vehicles</h3>
          {results.vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              className="search-results__item"
              onClick={() => onResultClick('vehicle', vehicle.id)}
            >
              <span className="search-results__icon">🚛</span>
              <div className="search-results__content">
                <div className="search-results__title">{vehicle.license_plate}</div>
                <div className="search-results__subtitle">{vehicle.model}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Drivers Section - Requirement 7.3: Results grouped by entity type */}
      {results.drivers?.length > 0 && (
        <div className="search-results__section">
          <h3 className="search-results__heading">Drivers</h3>
          {results.drivers.map((driver) => (
            <button
              key={driver.id}
              className="search-results__item"
              onClick={() => onResultClick('driver', driver.id)}
            >
              <span className="search-results__icon">👤</span>
              <div className="search-results__content">
                <div className="search-results__title">{driver.name}</div>
                <div className="search-results__subtitle">{driver.license_number}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Trips Section - Requirement 7.3: Results grouped by entity type */}
      {results.trips?.length > 0 && (
        <div className="search-results__section">
          <h3 className="search-results__heading">Trips</h3>
          {results.trips.map((trip) => (
            <button
              key={trip.id}
              className="search-results__item"
              onClick={() => onResultClick('trip', trip.id)}
            >
              <span className="search-results__icon">🗺️</span>
              <div className="search-results__content">
                <div className="search-results__title">
                  {trip.origin} → {trip.destination}
                </div>
                <div className="search-results__subtitle">Trip #{trip.id.slice(0, 8)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

SearchResults.propTypes = {
  results: PropTypes.shape({
    vehicles: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      license_plate: PropTypes.string.isRequired,
      model: PropTypes.string.isRequired,
    })),
    drivers: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      license_number: PropTypes.string.isRequired,
    })),
    trips: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      origin: PropTypes.string.isRequired,
      destination: PropTypes.string.isRequired,
    })),
  }),
  query: PropTypes.string.isRequired,
  onResultClick: PropTypes.func.isRequired,
};

export default SearchResults;
