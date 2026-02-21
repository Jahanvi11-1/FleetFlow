from flask import Blueprint, request, jsonify
from app.models import Vehicle, Driver, Trip
from app import db

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
def search():
    """
    Global search endpoint with partial matching across vehicles, drivers, and trips.
    
    Query Parameters:
        q (str): Search query string
    
    Returns:
        JSON response with results grouped by entity type:
        {
            "vehicles": [...],
            "drivers": [...],
            "trips": [...]
        }
    
    Validates: Requirements 7.2, 7.3
    """
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({
            'vehicles': [],
            'drivers': [],
            'trips': []
        }), 200
    
    # Perform partial matching (case-insensitive) across entities
    search_pattern = f'%{query}%'
    
    # Search vehicles by license plate
    vehicles = Vehicle.query.filter(
        Vehicle.license_plate.ilike(search_pattern)
    ).all()
    
    # Search drivers by name
    drivers = Driver.query.filter(
        Driver.name.ilike(search_pattern)
    ).all()
    
    # Search trips by ID (partial match on UUID string)
    trips = Trip.query.filter(
        Trip.id.ilike(search_pattern)
    ).all()
    
    # Serialize results
    vehicles_data = [{
        'id': v.id,
        'model': v.model,
        'license_plate': v.license_plate,
        'status': v.status,
        'max_load_capacity': float(v.max_load_capacity),
        'capacity_unit': v.capacity_unit
    } for v in vehicles]
    
    drivers_data = [{
        'id': d.id,
        'name': d.name,
        'license_number': d.license_number,
        'license_expiration': d.license_expiration.isoformat(),
        'status': d.status
    } for d in drivers]
    
    trips_data = [{
        'id': t.id,
        'origin': t.origin,
        'destination': t.destination,
        'status': t.status,
        'cargo_weight': float(t.cargo_weight),
        'scheduled_date': t.scheduled_date.isoformat(),
        'vehicle_id': t.vehicle_id,
        'driver_id': t.driver_id
    } for t in trips]
    
    return jsonify({
        'vehicles': vehicles_data,
        'drivers': drivers_data,
        'trips': trips_data
    }), 200
