from flask import Blueprint, request, jsonify
from app.auth import require_permission
from app import db
from app.models import Vehicle
from sqlalchemy.exc import IntegrityError
import re

vehicles_bp = Blueprint('vehicles', __name__)


def validate_license_plate(license_plate):
    """
    Validate license plate format against pattern 'XX 00 XX 0000'.
    
    Args:
        license_plate: String to validate
    
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    pattern = r'^[A-Z]{2} [0-9]{2} [A-Z]{2} [0-9]{4}$'
    if not re.match(pattern, license_plate):
        return False, "License plate must match pattern 'XX 00 XX 0000' where X is a letter and 0 is a digit"
    return True, None


def validate_vehicle_data(data, is_update=False):
    """
    Validate vehicle data for creation or update.
    
    Args:
        data: Dictionary containing vehicle data
        is_update: Boolean indicating if this is an update operation
    
    Returns:
        tuple: (is_valid: bool, errors: list of dicts)
    """
    errors = []
    
    # Required fields for creation
    if not is_update:
        required_fields = ['model', 'licensePlate', 'maxLoadCapacity', 'capacityUnit', 'odometer']
        for field in required_fields:
            if not data.get(field):
                errors.append({
                    'field': field,
                    'message': f'{field} is required'
                })
    
    # Validate license plate format if provided
    if data.get('licensePlate'):
        is_valid, error_msg = validate_license_plate(data['licensePlate'])
        if not is_valid:
            errors.append({
                'field': 'licensePlate',
                'message': error_msg
            })
    
    # Validate capacity unit if provided
    if data.get('capacityUnit') and data['capacityUnit'] not in ['kg', 'tons']:
        errors.append({
            'field': 'capacityUnit',
            'message': "Capacity unit must be 'kg' or 'tons'"
        })
    
    # Validate numeric fields if provided
    if data.get('maxLoadCapacity') is not None:
        try:
            capacity = float(data['maxLoadCapacity'])
            if capacity <= 0:
                errors.append({
                    'field': 'maxLoadCapacity',
                    'message': 'Max load capacity must be greater than 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'maxLoadCapacity',
                'message': 'Max load capacity must be a valid number'
            })
    
    if data.get('odometer') is not None:
        try:
            odometer = float(data['odometer'])
            if odometer < 0:
                errors.append({
                    'field': 'odometer',
                    'message': 'Odometer must be greater than or equal to 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'odometer',
                'message': 'Odometer must be a valid number'
            })
    
    if data.get('acquisitionCost') is not None:
        try:
            cost = float(data['acquisitionCost'])
            if cost < 0:
                errors.append({
                    'field': 'acquisitionCost',
                    'message': 'Acquisition cost must be greater than or equal to 0'
                })
        except (ValueError, TypeError):
            errors.append({
                'field': 'acquisitionCost',
                'message': 'Acquisition cost must be a valid number'
            })
    
    # Validate status if provided (for updates)
    if data.get('status') and data['status'] not in ['Available', 'On Trip', 'In Shop']:
        errors.append({
            'field': 'status',
            'message': "Status must be 'Available', 'On Trip', or 'In Shop'"
        })
    
    return len(errors) == 0, errors


def vehicle_to_dict(vehicle):
    """Convert Vehicle model to dictionary."""
    return {
        'id': vehicle.id,
        'model': vehicle.model,
        'licensePlate': vehicle.license_plate,
        'maxLoadCapacity': float(vehicle.max_load_capacity),
        'capacityUnit': vehicle.capacity_unit,
        'odometer': float(vehicle.odometer),
        'status': vehicle.status,
        'acquisitionCost': float(vehicle.acquisition_cost) if vehicle.acquisition_cost else None,
        'createdAt': vehicle.created_at.isoformat() if vehicle.created_at else None,
        'updatedAt': vehicle.updated_at.isoformat() if vehicle.updated_at else None
    }


@vehicles_bp.route('', methods=['GET'])
@require_permission('vehicles:read')
def get_vehicles():
    """
    Get list of vehicles with optional filtering.
    
    Query parameters:
        status: Filter by vehicle status (Available, On Trip, In Shop)
        search: Search by license plate (partial match, case-insensitive)
    
    Returns:
        200: { "vehicles": [Vehicle] }
    """
    query = Vehicle.query
    
    # Filter by status if provided
    status = request.args.get('status')
    if status:
        query = query.filter(Vehicle.status == status)
    
    # Search by license plate if provided
    search = request.args.get('search')
    if search:
        query = query.filter(Vehicle.license_plate.ilike(f'%{search}%'))
    
    vehicles = query.all()
    
    return jsonify({
        'vehicles': [vehicle_to_dict(v) for v in vehicles]
    }), 200


@vehicles_bp.route('', methods=['POST'])
@require_permission('vehicles:create')
def create_vehicle():
    """
    Create a new vehicle.
    
    Request body:
        {
            "model": "Toyota Hilux",
            "licensePlate": "AB 12 CD 3456",
            "maxLoadCapacity": 1500,
            "capacityUnit": "kg",
            "odometer": 50000,
            "acquisitionCost": 25000 (optional)
        }
    
    Returns:
        201: { "vehicle": Vehicle }
        400: { "error": "Validation failed", "details": [errors] }
        409: { "error": "License plate already exists" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_vehicle_data(data)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Create new vehicle with status initialized to 'Available'
    vehicle = Vehicle(
        model=data['model'],
        license_plate=data['licensePlate'],
        max_load_capacity=data['maxLoadCapacity'],
        capacity_unit=data['capacityUnit'],
        odometer=data['odometer'],
        status='Available',  # Requirement 1.5: Initialize status as "Available"
        acquisition_cost=data.get('acquisitionCost')
    )
    
    try:
        db.session.add(vehicle)
        db.session.commit()
        
        return jsonify({
            'vehicle': vehicle_to_dict(vehicle)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        # Check if it's a unique constraint violation on license plate
        if 'license_plate' in str(e.orig):
            return jsonify({
                'error': 'License plate already exists'
            }), 409
        else:
            return jsonify({
                'error': 'Database constraint violation',
                'details': 'An integrity error occurred'
            }), 400


@vehicles_bp.route('/<id>', methods=['GET'])
@require_permission('vehicles:read')
def get_vehicle(id):
    """
    Get a specific vehicle by ID.
    
    Returns:
        200: { "vehicle": Vehicle }
        404: { "error": "Vehicle not found" }
    """
    vehicle = Vehicle.query.get(id)
    
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    return jsonify({
        'vehicle': vehicle_to_dict(vehicle)
    }), 200


@vehicles_bp.route('/<id>', methods=['PUT'])
@require_permission('vehicles:update')
def update_vehicle(id):
    """
    Update a vehicle.
    
    Request body (all fields optional):
        {
            "model": "Toyota Hilux",
            "licensePlate": "AB 12 CD 3456",
            "maxLoadCapacity": 1500,
            "capacityUnit": "kg",
            "odometer": 50000,
            "acquisitionCost": 25000
        }
    
    Returns:
        200: { "vehicle": Vehicle }
        400: { "error": "Validation failed", "details": [errors] }
        404: { "error": "Vehicle not found" }
        409: { "error": "License plate already exists" }
    """
    vehicle = Vehicle.query.get(id)
    
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_vehicle_data(data, is_update=True)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Update fields if provided
    if 'model' in data:
        vehicle.model = data['model']
    if 'licensePlate' in data:
        vehicle.license_plate = data['licensePlate']
    if 'maxLoadCapacity' in data:
        vehicle.max_load_capacity = data['maxLoadCapacity']
    if 'capacityUnit' in data:
        vehicle.capacity_unit = data['capacityUnit']
    if 'odometer' in data:
        vehicle.odometer = data['odometer']
    if 'acquisitionCost' in data:
        vehicle.acquisition_cost = data['acquisitionCost']
    
    try:
        db.session.commit()
        
        return jsonify({
            'vehicle': vehicle_to_dict(vehicle)
        }), 200
        
    except IntegrityError as e:
        db.session.rollback()
        # Check if it's a unique constraint violation on license plate
        if 'license_plate' in str(e.orig):
            return jsonify({
                'error': 'License plate already exists'
            }), 409
        else:
            return jsonify({
                'error': 'Database constraint violation',
                'details': 'An integrity error occurred'
            }), 400


@vehicles_bp.route('/<id>', methods=['DELETE'])
@require_permission('vehicles:delete')
def delete_vehicle(id):
    """
    Delete a vehicle.
    
    Returns:
        200: { "message": "Vehicle deleted successfully" }
        404: { "error": "Vehicle not found" }
        409: { "error": "Cannot delete vehicle with active trips" }
    """
    vehicle = Vehicle.query.get(id)
    
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    try:
        db.session.delete(vehicle)
        db.session.commit()
        
        return jsonify({
            'message': 'Vehicle deleted successfully'
        }), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'error': 'Cannot delete vehicle with active trips',
            'details': 'Remove or reassign all trips before deleting this vehicle'
        }), 409
