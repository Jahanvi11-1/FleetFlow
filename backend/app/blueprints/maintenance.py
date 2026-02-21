from flask import Blueprint, request, jsonify
from app.auth import require_permission
from app import db
from app.models import MaintenanceLog, Vehicle
from sqlalchemy.exc import IntegrityError
from datetime import datetime

maintenance_bp = Blueprint('maintenance', __name__)


def validate_maintenance_data(data, is_update=False):
    """
    Validate maintenance log data for creation or update.
    
    Args:
        data: Dictionary containing maintenance data
        is_update: Boolean indicating if this is an update operation
    
    Returns:
        tuple: (is_valid: bool, errors: list of dicts)
    """
    errors = []
    
    # Required fields for creation
    if not is_update:
        required_fields = ['vehicleId', 'date', 'description', 'cost']
        for field in required_fields:
            if not data.get(field):
                errors.append({
                    'field': field,
                    'message': f'{field} is required'
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
    
    # Validate status if provided
    if data.get('status') and data['status'] not in ['In Progress', 'Completed']:
        errors.append({
            'field': 'status',
            'message': "Status must be 'In Progress' or 'Completed'"
        })
    
    return len(errors) == 0, errors


def maintenance_log_to_dict(log):
    """Convert MaintenanceLog model to dictionary."""
    return {
        'id': log.id,
        'vehicleId': log.vehicle_id,
        'date': log.date.isoformat() if log.date else None,
        'description': log.description,
        'cost': float(log.cost),
        'status': log.status,
        'createdAt': log.created_at.isoformat() if log.created_at else None,
        'updatedAt': log.updated_at.isoformat() if log.updated_at else None
    }


@maintenance_bp.route('', methods=['GET'])
@require_permission('maintenance:read')
def get_maintenance_logs():
    """
    Get list of maintenance logs with optional filtering.
    
    Query parameters:
        vehicleId: Filter by vehicle ID
        status: Filter by maintenance status (In Progress, Completed)
    
    Returns:
        200: { "maintenanceLogs": [MaintenanceLog] }
    """
    query = MaintenanceLog.query
    
    # Filter by vehicle if provided
    vehicle_id = request.args.get('vehicleId')
    if vehicle_id:
        query = query.filter(MaintenanceLog.vehicle_id == vehicle_id)
    
    # Filter by status if provided
    status = request.args.get('status')
    if status:
        query = query.filter(MaintenanceLog.status == status)
    
    logs = query.all()
    
    return jsonify({
        'maintenanceLogs': [maintenance_log_to_dict(log) for log in logs]
    }), 200


@maintenance_bp.route('', methods=['POST'])
@require_permission('maintenance:create')
def create_maintenance_log():
    """
    Create a new maintenance log with automatic vehicle status update.
    
    Request body:
        {
            "vehicleId": "uuid",
            "date": "2024-01-15T10:00:00",
            "description": "Oil change and tire rotation",
            "cost": 250.00,
            "status": "In Progress" (optional, defaults to "In Progress")
        }
    
    Business Rules:
        - When maintenance log is created, vehicle status automatically changes to "In Shop" (Requirement 4.1)
        - Uses database transactions to ensure atomicity
    
    Returns:
        201: { "maintenanceLog": MaintenanceLog }
        400: { "error": "Validation failed", "details": [errors] }
        404: { "error": "Vehicle not found" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate input data
    is_valid, errors = validate_maintenance_data(data)
    if not is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': errors
        }), 400
    
    # Parse date
    maintenance_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
    
    # Get status (default to 'In Progress' if not provided)
    status = data.get('status', 'In Progress')
    
    try:
        # Use database transaction to ensure atomicity
        # Lock the vehicle row to prevent race conditions
        vehicle = Vehicle.query.filter_by(id=data['vehicleId']).with_for_update().first()
        
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
        
        # Create new maintenance log
        maintenance_log = MaintenanceLog(
            vehicle_id=data['vehicleId'],
            date=maintenance_date,
            description=data['description'],
            cost=data['cost'],
            status=status
        )
        
        db.session.add(maintenance_log)
        
        # Requirement 4.1: Automatically set vehicle status to "In Shop"
        vehicle.status = 'In Shop'
        
        # Commit both changes atomically
        db.session.commit()
        
        return jsonify({
            'maintenanceLog': maintenance_log_to_dict(maintenance_log)
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
            'error': 'Failed to create maintenance log',
            'details': 'An error occurred while creating the maintenance log'
        }), 500


@maintenance_bp.route('/<id>/complete', methods=['PUT'])
@require_permission('maintenance:update')
def complete_maintenance(id):
    """
    Mark a maintenance log as completed with automatic vehicle status restoration.
    
    Business Rules:
        - When maintenance is marked as completed, vehicle status automatically returns to "Available" (Requirement 4.3)
        - Uses database transactions to ensure atomicity
    
    Returns:
        200: { "maintenanceLog": MaintenanceLog }
        404: { "error": "Maintenance log not found" }
        422: { "error": "Maintenance is already completed" }
    """
    try:
        # Use database transaction to ensure atomicity
        # Query with FOR UPDATE to lock the rows and prevent race conditions
        maintenance_log = MaintenanceLog.query.filter_by(id=id).with_for_update().first()
        
        if not maintenance_log:
            return jsonify({'error': 'Maintenance log not found'}), 404
        
        # Check if already completed
        if maintenance_log.status == 'Completed':
            return jsonify({
                'error': 'Maintenance is already completed',
                'details': 'This maintenance log has already been marked as completed'
            }), 422
        
        # Get the vehicle with row lock for state transitions
        vehicle = Vehicle.query.filter_by(id=maintenance_log.vehicle_id).with_for_update().first()
        if not vehicle:
            db.session.rollback()
            return jsonify({'error': 'Associated vehicle not found'}), 404
        
        # Update maintenance status to completed
        maintenance_log.status = 'Completed'
        
        # Requirement 4.3: Automatically return vehicle status to "Available"
        vehicle.status = 'Available'
        
        # Commit the transaction atomically
        db.session.commit()
        
        return jsonify({
            'maintenanceLog': maintenance_log_to_dict(maintenance_log)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to complete maintenance',
            'details': 'An error occurred while completing the maintenance'
        }), 500
