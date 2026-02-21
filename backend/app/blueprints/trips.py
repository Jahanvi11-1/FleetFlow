from flask import Blueprint, request, jsonify
from app.auth import require_permission
from app import db
from app.models import Trip, Vehicle, Driver
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date

trips_bp = Blueprint('trips', __name__)


def validate_trip_data(data, is_update=False):
    """
    Validate trip data for creation or update.
    
    Args:
        data: Dictionary containing trip data
        is_update: Boolean indicating if this is an update operation
    
    Returns:
        tuple: (is_valid: bool, errors: list of dicts)
    """
    errors = []
    
    # Required fields for creation
    if not is_update:
        required_fields = ['origin', 'destination', 'cargoWeight', 'vehicleId', 'driverId', 'scheduledDate']
        for field in required_fields:
            if not data.get(field):
                errors.append({
                    'field': field,
                    'message': f'{field} is required'
                })
    
    # Validate cargo weight if provided
    if data.get('cargoWeight') is not None:
        try:
            weight = float(data['cargoWeight'])
            if weight <= 0:
                errors.append({
                    'field': 'cargoWeight',
                    'message': 'Cargo weight must be greater than 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'cargoWeight',
                'message': 'Cargo weight must be a valid number'
            })
    
    # Validate scheduled date format if provided
    if data.get('scheduledDate'):
        try:
            if isinstance(data['scheduledDate'], str):
                datetime.fromisoformat(data['scheduledDate'].replace('Z', '+00:00'))
        except (ValueError, TypeError):
            errors.append({
                'field': 'scheduledDate',
                'message': 'Scheduled date must be a valid ISO datetime'
            })
    
    # Validate revenue if provided
    if data.get('revenue') is not None:
        try:
            revenue = float(data['revenue'])
            if revenue < 0:
                errors.append({
                    'field': 'revenue',
                    'message': 'Revenue must be greater than or equal to 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'revenue',
                'message': 'Revenue must be a valid number'
            })
    
    # Validate status if provided (for updates)
    if data.get('status') and data['status'] not in ['Draft', 'Dispatched', 'Completed', 'Cancelled']:
        errors.append({
            'field': 'status',
            'message': "Status must be 'Draft', 'Dispatched', 'Completed', or 'Cancelled'"
        })
    
    return len(errors) == 0, errors


def trip_to_dict(trip):
    """Convert Trip model to dictionary."""
    return {
        'id': trip.id,
        'origin': trip.origin,
        'destination': trip.destination,
        'cargoWeight': float(trip.cargo_weight),
        'vehicleId': trip.vehicle_id,
        'driverId': trip.driver_id,
        'scheduledDate': trip.scheduled_date.isoformat() if trip.scheduled_date else None,
        'status': trip.status,
        'revenue': float(trip.revenue) if trip.revenue else None,
        'createdAt': trip.created_at.isoformat() if trip.created_at else None,
        'updatedAt': trip.updated_at.isoformat() if trip.updated_at else None
    }


@trips_bp.route('', methods=['GET'])
@require_permission('trips:read')
def get_trips():
    """
    Get list of trips with optional filtering.
    
    Query parameters:
        status: Filter by trip status (Draft, Dispatched, Completed, Cancelled)
        vehicleId: Filter by vehicle ID
        driverId: Filter by driver ID
    
    Returns:
        200: { "trips": [Trip] }
    """
    query = Trip.query
    
    # Filter by status if provided
    status = request.args.get('status')
    if status:
        query = query.filter(Trip.status == status)
    
    # Filter by vehicle if provided
    vehicle_id = request.args.get('vehicleId')
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    
    # Filter by driver if provided
    driver_id = request.args.get('driverId')
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    
    trips = query.all()
    
    return jsonify({
        'trips': [trip_to_dict(t) for t in trips]
    }), 200


@trips_bp.route('', methods=['POST'])
@require_permission('trips:create')
def create_trip():
    """
    Create a new trip with capacity validation and state transitions.
    
    Request body:
        {
            "origin": "City A",
            "destination": "City B",
            "cargoWeight": 1200,
            "vehicleId": "uuid",
            "driverId": "uuid",
            "scheduledDate": "2024-01-15T10:00:00",
            "revenue": 5000 (optional)
        }
    
    Business Rules:
        - Cargo weight must not exceed vehicle's max load capacity (Requirement 3.3)
        - Vehicle must have status "Available" (Requirement 3.2)
        - Driver must have status "On Duty" and non-expired license (Requirement 2.4)
        - When trip is created with status "Dispatched", vehicle status changes to "On Trip" (Requirement 3.5)
    
    Returns:
        201: { "trip": Trip }
        400: { "error": "Validation failed", "details": [errors] }
        404: { "error": "Vehicle not found" } or { "error": "Driver not found" }
        409: { "error": "Vehicle is currently unavailable" }
        422: { "error": "Cargo weight exceeds vehicle capacity" } or { "error": "Driver is ineligible" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_trip_data(data)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Fetch vehicle and validate
    vehicle = Vehicle.query.get(data['vehicleId'])
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    # Requirement 3.2: Vehicle must be available
    if vehicle.status != 'Available':
        return jsonify({
            'error': 'Vehicle is currently unavailable',
            'details': f'Vehicle status is "{vehicle.status}"'
        }), 409
    
    # Requirement 3.3: Validate cargo weight against vehicle capacity
    cargo_weight = float(data['cargoWeight'])
    max_capacity = float(vehicle.max_load_capacity)
    
    if cargo_weight > max_capacity:
        return jsonify({
            'error': 'Cargo weight exceeds vehicle capacity',
            'details': f'Cargo weight ({cargo_weight} {vehicle.capacity_unit}) exceeds vehicle capacity ({max_capacity} {vehicle.capacity_unit})'
        }), 422
    
    # Fetch driver and validate
    driver = Driver.query.get(data['driverId'])
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    # Requirement 2.4: Driver must be on duty and have non-expired license
    today = date.today()
    if driver.status != 'On Duty':
        return jsonify({
            'error': 'Driver is ineligible for trip assignment',
            'details': f'Driver status is "{driver.status}"'
        }), 422
    
    if driver.license_expiration <= today:
        return jsonify({
            'error': 'Driver is ineligible for trip assignment',
            'details': f'Driver license expired on {driver.license_expiration.isoformat()}'
        }), 422
    
    # Parse scheduled date
    scheduled_date = datetime.fromisoformat(data['scheduledDate'].replace('Z', '+00:00'))
    
    # Get initial status (default to 'Draft' if not provided)
    initial_status = data.get('status', 'Draft')
    
    # Validate status if provided
    if initial_status not in ['Draft', 'Dispatched', 'Completed', 'Cancelled']:
        return jsonify({
            'error': 'Validation failed',
            'details': [{'field': 'status', 'message': "Status must be 'Draft', 'Dispatched', 'Completed', or 'Cancelled'"}]
        }), 400
    
    # Create new trip
    trip = Trip(
        origin=data['origin'],
        destination=data['destination'],
        cargo_weight=cargo_weight,
        vehicle_id=data['vehicleId'],
        driver_id=data['driverId'],
        scheduled_date=scheduled_date,
        status=initial_status,
        revenue=data.get('revenue')
    )
    
    try:
        # Use database transaction to ensure atomicity
        db.session.add(trip)
        
        # Requirement 3.5: If trip is created with "Dispatched" status, set vehicle to "On Trip"
        if initial_status == 'Dispatched':
            vehicle.status = 'On Trip'
        
        db.session.commit()
        
        return jsonify({
            'trip': trip_to_dict(trip)
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
            'error': 'Failed to create trip',
            'details': 'An error occurred while creating the trip'
        }), 500


@trips_bp.route('/<id>', methods=['GET'])
@require_permission('trips:read')
def get_trip(id):
    """
    Get a specific trip by ID.
    
    Returns:
        200: { "trip": Trip }
        404: { "error": "Trip not found" }
    """
    trip = Trip.query.get(id)
    
    if not trip:
        return jsonify({'error': 'Trip not found'}), 404
    
    return jsonify({
        'trip': trip_to_dict(trip)
    }), 200


@trips_bp.route('/<id>/status', methods=['PUT'])
@require_permission('trips:update')
def update_trip_status(id):
    """
    Update trip status with automatic vehicle state transitions.
    
    Request body:
        {
            "status": "Dispatched" | "Completed" | "Cancelled"
        }
    
    State Transitions:
        - Draft → Dispatched: Set vehicle status to "On Trip" (Requirement 3.5)
        - Dispatched → Completed: Set vehicle status to "Available" (Requirement 3.6)
        - Dispatched → Cancelled: Set vehicle status to "Available" (Requirement 3.6)
    
    Uses database transactions to ensure atomicity of status changes.
    
    Returns:
        200: { "trip": Trip }
        400: { "error": "Validation failed" }
        404: { "error": "Trip not found" }
        422: { "error": "Invalid status transition" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({
            'error': 'Validation failed',
            'details': [{'field': 'status', 'message': 'Status is required'}]
        }), 400
    
    if new_status not in ['Draft', 'Dispatched', 'Completed', 'Cancelled']:
        return jsonify({
            'error': 'Validation failed',
            'details': [{'field': 'status', 'message': "Status must be 'Draft', 'Dispatched', 'Completed', or 'Cancelled'"}]
        }), 400
    
    try:
        # Use database transaction to ensure atomicity
        # Query with FOR UPDATE to lock the rows and prevent race conditions
        trip = Trip.query.filter_by(id=id).with_for_update().first()
        
        if not trip:
            return jsonify({'error': 'Trip not found'}), 404
        
        # Get the vehicle with row lock for state transitions
        vehicle = Vehicle.query.filter_by(id=trip.vehicle_id).with_for_update().first()
        if not vehicle:
            db.session.rollback()
            return jsonify({'error': 'Associated vehicle not found'}), 404
        
        old_status = trip.status
        
        # Requirement 3.5: When trip is dispatched, set vehicle status to "On Trip"
        if old_status == 'Draft' and new_status == 'Dispatched':
            vehicle.status = 'On Trip'
        
        # Requirement 3.6: When trip is completed or cancelled, set vehicle status to "Available"
        if old_status == 'Dispatched' and new_status in ['Completed', 'Cancelled']:
            vehicle.status = 'Available'
        
        # Update trip status
        trip.status = new_status
        
        # Commit the transaction atomically
        db.session.commit()
        
        return jsonify({
            'trip': trip_to_dict(trip)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to update trip status',
            'details': 'An error occurred while updating the trip'
        }), 500
