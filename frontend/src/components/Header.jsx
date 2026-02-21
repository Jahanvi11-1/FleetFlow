import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import { searchGlobal } from '../services/searchService';
import SearchResults from './SearchResults';
import './Header.css';

/**
 * Header Component
 * Global search with 300ms debounce, profile avatar, and menu button
 * Requirements: 7.1, 12.3, 12.4
 */
function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search with 300ms delay (Requirement 7.1)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim().length === 0) {
      setSearchResults(null);
      setShowResults(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchGlobal(searchQuery);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults({ vehicles: [], drivers: [], trips: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleResultClick = (type, id) => {
    setShowResults(false);
    setSearchQuery('');
    
    // Navigate to the detailed view (Requirement 7.4)
    switch (type) {
      case 'vehicle':
        navigate(`/vehicles?id=${id}`);
        break;
      case 'driver':
        navigate(`/drivers?id=${id}`);
        break;
      case 'trip':
        navigate(`/trips?id=${id}`);
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasResults = searchResults && (
    searchResults.vehicles?.length > 0 ||
    searchResults.drivers?.length > 0 ||
    searchResults.trips?.length > 0
  );

  return (
    <header className="header">
      <div className="header__container">
        {/* Menu button */}
        <button 
          className="header__menu-btn"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <span className="header__menu-icon">☰</span>
        </button>

        {/* Logo */}
        <div className="header__logo">
          <h1 className="header__title">FleetFlow</h1>
        </div>

        {/* Global search bar with 300ms debounce (Requirement 7.1) */}
        <div className="header__search" ref={searchRef}>
          <div className="search-bar">
            <span className="search-bar__icon">🔍</span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search vehicles, drivers, trips..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Global search"
            />
            {isSearching && (
              <span className="search-bar__loading">⏳</span>
            )}
          </div>

          {/* Search results dropdown - Requirements 7.2, 7.3, 7.4 */}
          {showResults && (
            <SearchResults
              results={searchResults}
              query={searchQuery}
              onResultClick={handleResultClick}
            />
          )}
        </div>

        {/* Profile avatar with dropdown */}
        <div className="header__profile" ref={profileRef}>
          <button
            className="profile-avatar"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="Profile menu"
          >
            <span className="profile-avatar__initials">
              {getInitials(user?.name)}
            </span>
          </button>

          {showProfileMenu && (
            <div className="profile-menu">
              <div className="profile-menu__header">
                <div className="profile-menu__name">{user?.name || 'User'}</div>
                <div className="profile-menu__email">{user?.email || ''}</div>
                <div className="profile-menu__role">{user?.role || 'Guest'}</div>
              </div>
              <div className="profile-menu__divider" />
              <button
                className="profile-menu__item"
                onClick={handleLogout}
              >
                <span className="profile-menu__icon">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

Header.propTypes = {
  onMenuToggle: PropTypes.func.isRequired
};

export default Header;
