import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import './Sidebar.css';

/**
 * Sidebar Drawer Component
 * Slide-out navigation with role-based filtering
 * Requirements: 12.3
 */
function Sidebar({ isOpen, onClose, userRole }) {
  const location = useLocation();

  // Navigation items with role-based access control
  const navigationItems = [
    { path: '/', label: 'Dashboard', roles: ['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { path: '/vehicles', label: 'Vehicles', roles: ['Manager', 'Dispatcher', 'Safety Officer'] },
    { path: '/drivers', label: 'Drivers', roles: ['Manager', 'Dispatcher', 'Safety Officer'] },
    { path: '/trips', label: 'Trips', roles: ['Manager', 'Dispatcher'] },
    { path: '/maintenance', label: 'Maintenance', roles: ['Manager', 'Safety Officer'] },
    { path: '/analytics', label: 'Analytics', roles: ['Manager', 'Financial Analyst'] }
  ];

  // Filter navigation items by user role
  const filteredItems = navigationItems.filter(item => 
    !userRole || item.roles.includes(userRole)
  );

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <h2 className="sidebar__title">FleetFlow</h2>
          <button 
            className="sidebar__close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar__nav">
          <ul className="sidebar__list">
            {filteredItems.map((item) => (
              <li key={item.path} className="sidebar__item">
                <Link
                  to={item.path}
                  className={`sidebar__link ${isActive(item.path) ? 'sidebar__link--active' : ''}`}
                  onClick={onClose}
                >
                  <span className="sidebar__label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <p className="sidebar__footer-text">
            Role: <strong>{userRole || 'Guest'}</strong>
          </p>
        </div>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userRole: PropTypes.oneOf(['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'])
};

export default Sidebar;
