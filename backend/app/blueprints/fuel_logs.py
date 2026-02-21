from flask import Blueprint, request, jsonify
from app.auth import require_permission
from app import db
from app.models import FuelLog, Vehicle
from sqlalchemy.exc import IntegrityError
from datetime import datetime

fuel_logs_bp = Blueprint('fuel_logs', __name__)


def validate_fuel_log_data(data, is_update=False):
    """
    Validate fuel log data for creation or update.
    
    Args:
        data: Dictionary containing fuel log data
        is_update: Boolean indicating if this is an update operation
    
    Returns:
        tuple: (is_valid: bool, errors: list of dicts)
    """
    errors = []
    
    # Required fields for creation (Requirement 5.1)
    if not is_update:
        required_fields = ['vehicleId', 'date', 'liters', 'cost', 'odometerReading']
        for field in required_fields:
            if not data.get(field):
                errors.append({
                    'field': field,
                    'message': f'{field} is required'
                })
    
    # Validate liters if provided
    if data.get('liters') is not None:
        try:
            liters = float(data['liters'])
            if liters <= 0:
                errors.append({
                    'field': 'liters',
                    'message': 'Liters must be greater than 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'liters',
                'message': 'Liters must be a valid number'
            })
    
    # Validate cost if provided
    if data.get('cost') is not None:
        try:
            cost = float(data['cost'])
            if cost < 0:
                errors.append({
                    'field': 'cost',
                    'message': 'Cost must be greater than or equal to 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'cost',
                'message': 'Cost must be a valid number'
            })
    
    # Validate odometer reading if provided
    if data.get('odometerReading') is not None:
        try:
            odometer = float(data['odometerReading'])
            if odometer < 0:
                errors.append({
                    'field': 'odometerReading',
                    'message': 'Odometer reading must be greater than or equal to 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'odometerReading',
                'message': 'Odometer reading must be a valid number'
            })
    
    # Validate date format if provided
    if data.get('date'):
        try:
            if isinstance(data['date'], str):
                datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        except (ValueError, TypeError):
            errors.append({
                'field': 'date',
                'message': 'Date must be a valid ISO datetime'
            })
    
    return len(errors) == 0, errors


def calculate_fuel_efficiency(vehicle_id):
    """
    Calculate fuel efficiency for a vehicle based on consecutive odometer readings.
    
    Formula (Requirements 5.2, 5.3, 5.4):
        Fuel Efficiency = Distance Traveled (km) / Liters Consumed
        Distance = Current Odometer - Previous Odometer
    
    Args:
        vehicle_id: UUID of the vehicle
    
    Returns:
        dict: {
            'vehicleId': str,
            'efficiency': float (km/L),
            'totalDistance': float (km),
            'totalLiters': float (L),
            'entries': int (number of fuel log entries used)
        }
        Returns None if insufficient data (less than 2 entries)
    """
    # Get all fuel logs for the vehicle, ordered by odometer reading
    logs = FuelLog.query.filter(
        FuelLog.vehicle_id == vehicle_id
    ).order_by(FuelLog.odometer_reading.asc()).all()
    
    # Need at least 2 entries to calculate efficiency
    if len(logs) < 2:
        return None
    
    # Calculate total distance from first to last odometer reading
    first_odometer = float(logs[0].odometer_reading)
    last_odometer = float(logs[-1].odometer_reading)
    total_distance = last_odometer - first_odometer
    
    # Calculate total liters consumed
    total_liters = sum(float(log.liters) for log in logs)
    
    # Calculate efficiency (km/L)
    # Avoid division by zero
    if total_liters == 0:
        efficiency = 0.0
    else:
        efficiency = total_distance / total_liters
    
    return {
        'vehicleId': vehicle_id,
        'efficiency': round(efficiency, 2),
        'totalDistance': round(total_distance, 2),
        'totalLiters': round(total_liters, 2),
        'entries': len(logs)
    }


def fuel_log_to_dict(log):
    """Convert FuelLog model to dictionary."""
    return {
        'id': log.id,
        'vehicleId': log.vehicle_id,
        'date': log.date.isoformat() if log.date else None,
        'liters': float(log.liters),
        'cost': float(log.cost),
        'odometerReading': float(log.odometer_reading),
        'createdAt': log.created_at.isoformat() if log.created_at else None
    }


@fuel_logs_bp.route('', methods=['GET'])
@require_permission('fuel:read')
def get_fuel_logs():
    """
    Get list of fuel logs with optional filtering.
    
    Query parameters:
        vehicleId: Filter by vehicle ID
    
    Returns:
        200: { "fuelLogs": [FuelLog] }
    """
    query = FuelLog.query
    
    # Filter by vehicle if provided
    vehicle_id = request.args.get('vehicleId')
    if vehicle_id:
        query = query.filter(FuelLog.vehicle_id == vehicle_id)
    
    # Order by date descending (most recent first)
    logs = query.order_by(FuelLog.date.desc()).all()
    
    return jsonify({
        'fuelLogs': [fuel_log_to_dict(log) for log in logs]
    }), 200


@fuel_logs_bp.route('', methods=['POST'])
@require_permission('fuel:create')
def create_fuel_log():
    """
    Create a new fuel log entry.
    
    Request body:
        {
            "vehicleId": "uuid",
            "date": "2024-01-15T10:00:00",
            "liters": 45.5,
            "cost": 75.00,
            "odometerReading": 52000
        }
    
    Returns:
        201: { "fuelLog": FuelLog }
        400: { "error": "Validation failed", "details": [errors] }
        404: { "error": "Vehicle not found" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_fuel_log_data(data)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Verify vehicle exists
    vehicle = Vehicle.query.get(data['vehicleId'])
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    # Parse date
    fuel_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
    
    try:
        # Create new fuel log
        fuel_log = FuelLog(
            vehicle_id=data['vehicleId'],
            date=fuel_date,
            liters=data['liters'],
            cost=data['cost'],
            odometer_reading=data['odometerReading']
        )
        
        db.session.add(fuel_log)
        db.session.commit()
        
        return jsonify({
            'fuelLog': fuel_log_to_dict(fuel_log)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            'error': 'Database constraint violation',
            'details': 'An integrity error occurred'
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to create fuel log',
            'details': 'An error occurred while creating the fuel log'
        }), 500


@fuel_logs_bp.route('/efficiency/<vehicle_id>', methods=['GET'])
@require_permission('fuel:read')
def get_fuel_efficiency(vehicle_id):
    """
    Get fuel efficiency calculation for a specific vehicle.
    
    Calculates efficiency based on consecutive odometer readings:
        - Distance = Last Odometer - First Odometer
        - Efficiency = Distance / Total Liters (km/L)
    
    Requirements: 5.2, 5.3, 5.4
    
    Returns:
        200: {
            "efficiency": {
                "vehicleId": "uuid",
                "efficiency": 12.5,  # km/L
                "totalDistance": 500.0,  # km
                "totalLiters": 40.0,  # L
                "entries": 5
            }
        }
        404: { "error": "Vehicle not found" }
        422: { "error": "Insufficient data for efficiency calculation" }
    """
    # Verify vehicle exists
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    # Calculate efficiency
    efficiency_data = calculate_fuel_efficiency(vehicle_id)
    
    if efficiency_data is None:
        return jsonify({
            'error': 'Insufficient data for efficiency calculation',
            'message': 'At least 2 fuel log entries are required to calculate efficiency'
        }), 422
    
    return jsonify({
        'efficiency': efficiency_data
    }), 200
