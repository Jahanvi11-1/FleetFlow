from flask import Blueprint, request, jsonify
from app.auth import require_permission
from app import db
from app.models import Driver
from sqlalchemy.exc import IntegrityError
from datetime import date

drivers_bp = Blueprint('drivers', __name__)


def validate_driver_data(data, is_update=False):
    """
    Validate driver data for creation or update.
    
    Args:
        data: Dictionary containing driver data
        is_update: Boolean indicating if this is an update operation
    
    Returns:
        tuple: (is_valid: bool, errors: list of dicts)
    """
    errors = []
    
    # Required fields for creation
    if not is_update:
        required_fields = ['name', 'licenseNumber', 'licenseExpiration', 'status']
        for field in required_fields:
            if not data.get(field):
                errors.append({
                    'field': field,
                    'message': f'{field} is required'
                })
    
    # Validate status if provided
    if data.get('status') and data['status'] not in ['On Duty', 'Off Duty']:
        errors.append({
            'field': 'status',
            'message': "Status must be 'On Duty' or 'Off Duty'"
        })
    
    # Validate license expiration date format if provided
    if data.get('licenseExpiration'):
        try:
            # Try to parse the date string (expecting ISO format YYYY-MM-DD)
            if isinstance(data['licenseExpiration'], str):
                date.fromisoformat(data['licenseExpiration'])
        except (ValueError, TypeError):
            errors.append({
                'field': 'licenseExpiration',
                'message': 'License expiration must be a valid date in YYYY-MM-DD format'
            })
    
    return len(errors) == 0, errors


def driver_to_dict(driver):
    """Convert Driver model to dictionary."""
    return {
        'id': driver.id,
        'name': driver.name,
        'licenseNumber': driver.license_number,
        'licenseExpiration': driver.license_expiration.isoformat() if driver.license_expiration else None,
        'status': driver.status,
        'createdAt': driver.created_at.isoformat() if driver.created_at else None,
        'updatedAt': driver.updated_at.isoformat() if driver.updated_at else None
    }


def is_driver_eligible(driver):
    """
    Check if a driver is eligible for trip assignment.
    
    A driver is eligible if:
    - Status is "On Duty"
    - License expiration date is greater than current date
    
    Args:
        driver: Driver model instance
    
    Returns:
        bool: True if driver is eligible, False otherwise
    """
    today = date.today()
    return driver.status == 'On Duty' and driver.license_expiration > today


@drivers_bp.route('', methods=['GET'])
@require_permission('drivers:read')
def get_drivers():
    """
    Get list of drivers with optional filtering.
    
    Query parameters:
        status: Filter by driver status (On Duty, Off Duty)
        eligible: Filter for eligible drivers (true/false) - drivers with "On Duty" status and non-expired licenses
        search: Search by driver name (partial match, case-insensitive)
    
    Returns:
        200: { "drivers": [Driver] }
    """
    query = Driver.query
    
    # Filter by status if provided
    status = request.args.get('status')
    if status:
        query = query.filter(Driver.status == status)
    
    # Filter by eligibility if provided
    eligible = request.args.get('eligible')
    if eligible and eligible.lower() == 'true':
        today = date.today()
        query = query.filter(
            Driver.status == 'On Duty',
            Driver.license_expiration > today
        )
    
    # Search by name if provided
    search = request.args.get('search')
    if search:
        query = query.filter(Driver.name.ilike(f'%{search}%'))
    
    drivers = query.all()
    
    return jsonify({
        'drivers': [driver_to_dict(d) for d in drivers]
    }), 200


@drivers_bp.route('', methods=['POST'])
@require_permission('drivers:create')
def create_driver():
    """
    Create a new driver.
    
    Request body:
        {
            "name": "John Doe",
            "licenseNumber": "DL123456",
            "licenseExpiration": "2025-12-31",
            "status": "On Duty"
        }
    
    Returns:
        201: { "driver": Driver }
        400: { "error": "Validation failed", "details": [errors] }
        409: { "error": "License number already exists" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_driver_data(data)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Create new driver
    driver = Driver(
        name=data['name'],
        license_number=data['licenseNumber'],
        license_expiration=date.fromisoformat(data['licenseExpiration']),
        status=data['status']
    )
    
    try:
        db.session.add(driver)
        db.session.commit()
        
        return jsonify({
            'driver': driver_to_dict(driver)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        # Check if it's a unique constraint violation on license number
        if 'license_number' in str(e.orig):
            return jsonify({
                'error': 'License number already exists'
            }), 409
        else:
            return jsonify({
                'error': 'Database constraint violation',
                'details': 'An integrity error occurred'
            }), 400


@drivers_bp.route('/<id>', methods=['GET'])
@require_permission('drivers:read')
def get_driver(id):
    """
    Get a specific driver by ID.
    
    Returns:
        200: { "driver": Driver }
        404: { "error": "Driver not found" }
    """
    driver = Driver.query.get(id)
    
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    return jsonify({
        'driver': driver_to_dict(driver)
    }), 200


@drivers_bp.route('/<id>', methods=['PUT'])
@require_permission('drivers:update')
def update_driver(id):
    """
    Update a driver.
    
    Request body (all fields optional):
        {
            "name": "John Doe",
            "licenseNumber": "DL123456",
            "licenseExpiration": "2025-12-31",
            "status": "On Duty"
        }
    
    Returns:
        200: { "driver": Driver }
        400: { "error": "Validation failed", "details": [errors] }
        404: { "error": "Driver not found" }
        409: { "error": "License number already exists" }
    """
    driver = Driver.query.get(id)
    
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_driver_data(data, is_update=True)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Update fields if provided
    if 'name' in data:
        driver.name = data['name']
    if 'licenseNumber' in data:
        driver.license_number = data['licenseNumber']
    if 'licenseExpiration' in data:
        driver.license_expiration = date.fromisoformat(data['licenseExpiration'])
    if 'status' in data:
        driver.status = data['status']
    
    try:
        db.session.commit()
        
        return jsonify({
            'driver': driver_to_dict(driver)
        }), 200
        
    except IntegrityError as e:
        db.session.rollback()
        # Check if it's a unique constraint violation on license number
        if 'license_number' in str(e.orig):
            return jsonify({
                'error': 'License number already exists'
            }), 409
        else:
            return jsonify({
                'error': 'Database constraint violation',
                'details': 'An integrity error occurred'
            }), 400


@drivers_bp.route('/<id>', methods=['DELETE'])
@require_permission('drivers:delete')
def delete_driver(id):
    """
    Delete a driver.
    
    Returns:
        200: { "message": "Driver deleted successfully" }
        404: { "error": "Driver not found" }
        409: { "error": "Cannot delete driver with active trips" }
    """
    driver = Driver.query.get(id)
    
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    try:
        db.session.delete(driver)
        db.session.commit()
        
        return jsonify({
            'message': 'Driver deleted successfully'
        }), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'error': 'Cannot delete driver with active trips',
            'details': 'Remove or reassign all trips before deleting this driver'
        }), 409
