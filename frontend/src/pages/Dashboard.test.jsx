import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import api from '../services/api';
import { tripService } from '../services/tripService';
import * as analyticsService from '../services/analyticsService';

// Mock the services
vi.mock('../services/api');
vi.mock('../services/tripService');
vi.mock('../services/analyticsService');

const mockVehicles = [
  { id: '1', model: 'Toyota Hilux', licensePlate: 'AB 12 CD 3456', status: 'Available', maxLoadCapacity: 1000, capacityUnit: 'kg', odometer: 50000 },
  { id: '2', model: 'Ford Ranger', licensePlate: 'EF 34 GH 5678', status: 'On Trip', maxLoadCapacity: 1200, capacityUnit: 'kg', odometer: 75000 },
  { id: '3', model: 'Isuzu D-Max', licensePlate: 'IJ 56 KL 7890', status: 'In Shop', maxLoadCapacity: 1100, capacityUnit: 'kg', odometer: 60000 }
];

const mockTrips = [
  { 
    id: '1', 
    origin: 'Warehouse A', 
    destination: 'Store B', 
    status: 'Dispatched', 
    cargoWeight: 500,
    scheduledDate: '2024-01-15T10:00:00Z',
    vehicle: { licensePlate: 'EF 34 GH 5678' },
    driver: { name: 'John Doe' }
  },
  { 
    id: '2', 
    origin: 'Warehouse C', 
    destination: 'Store D', 
    status: 'Completed', 
    cargoWeight: 800,
    scheduledDate: '2024-01-14T14:00:00Z',
    vehicle: { licensePlate: 'AB 12 CD 3456' },
    driver: { name: 'Jane Smith' }
  }
];

const mockDrivers = [
  { id: '1', name: 'John Doe', status: 'On Duty', licenseNumber: 'DL123456', licenseExpiration: '2025-12-31' },
  { id: '2', name: 'Jane Smith', status: 'On Duty', licenseNumber: 'DL789012', licenseExpiration: '2025-11-30' },
  { id: '3', name: 'Bob Johnson', status: 'Off Duty', licenseNumber: 'DL345678', licenseExpiration: '2025-10-31' }
];

const mockROIData = [
  { vehicleId: '1', licensePlate: 'AB 12 CD 3456', model: 'Toyota Hilux', roi: 15.5, revenue: 10000, maintenanceCost: 2000, fuelCost: 1500, acquisitionCost: 50000 },
  { vehicleId: '2', licensePlate: 'EF 34 GH 5678', model: 'Ford Ranger', roi: 12.3, revenue: 8000, maintenanceCost: 1800, fuelCost: 1200, acquisitionCost: 45000 }
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    api.get.mockImplementation((url) => {
      if (url === '/vehicles') {
        return Promise.resolve({ data: { vehicles: mockVehicles } });
      }
      if (url === '/drivers') {
        return Promise.resolve({ data: { drivers: mockDrivers } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    tripService.getTrips.mockResolvedValue({ success: true, data: mockTrips });
    analyticsService.getVehicleROI.mockResolvedValue({ roi: mockROIData });
    analyticsService.getFuelEfficiency.mockResolvedValue({ efficiency: [] });
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('renders dashboard title and subtitle', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('FleetFlow Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Real-time fleet management overview')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderDashboard();
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('displays fleet overview statistics', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Fleet Overview')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total vehicles
      expect(screen.getByText('Total Vehicles')).toBeInTheDocument();
    });
  });

  it('displays correct vehicle status counts', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('On Trip')).toBeInTheDocument();
      expect(screen.getByText('In Shop')).toBeInTheDocument();
    });
  });

  it('displays active trips count', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Active Trips')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 dispatched trip
      expect(screen.getByText('Currently dispatched')).toBeInTheDocument();
    });
  });

  it('displays drivers on duty count', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Drivers')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 on duty drivers
      expect(screen.getByText('On duty now')).toBeInTheDocument();
    });
  });

  it('displays recent trips', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Recent Trips')).toBeInTheDocument();
      expect(screen.getByText('Warehouse A → Store B')).toBeInTheDocument();
      expect(screen.getByText('Warehouse C → Store D')).toBeInTheDocument();
    });
  });

  it('displays top performers by ROI', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Top Performers (ROI)')).toBeInTheDocument();
      expect(screen.getByText('AB 12 CD 3456')).toBeInTheDocument();
      expect(screen.getByText('15.50%')).toBeInTheDocument();
    });
  });

  it('displays quick actions', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
      expect(screen.getByText('Create Trip')).toBeInTheDocument();
      expect(screen.getByText('Log Maintenance')).toBeInTheDocument();
    });
  });

  it('displays error message when data fetch fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('displays empty state when no trips exist', async () => {
    tripService.getTrips.mockResolvedValue({ success: true, data: [] });
    
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('No trips yet')).toBeInTheDocument();
    });
  });

  it('displays empty state when no ROI data exists', async () => {
    analyticsService.getVehicleROI.mockResolvedValue({ roi: [] });
    
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('No ROI data available')).toBeInTheDocument();
    });
  });

  it('has navigation links to other pages', async () => {
    renderDashboard();
    
    await waitFor(() => {
      const viewAllLinks = screen.getAllByText(/View All|View Analytics/);
      expect(viewAllLinks.length).toBeGreaterThan(0);
    });
  });
});
