"""
Authorization utilities for role-based access control.

This module provides decorators and permission mappings for restricting
access to Flask routes based on user roles.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User


# Permission mappings for each role
# Each key is a permission, and the value is a list of roles that have that permission
ROLE_PERMISSIONS = {
    # Vehicle management permissions
    'vehicles:read': ['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'],
    'vehicles:create': ['Manager'],
    'vehicles:update': ['Manager'],
    'vehicles:delete': ['Manager'],
    
    # Driver management permissions
    'drivers:read': ['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'],
    'drivers:create': ['Safety Officer', 'Manager'],
    'drivers:update': ['Safety Officer', 'Manager'],
    'drivers:delete': ['Safety Officer', 'Manager'],
    
    # Trip management permissions
    'trips:read': ['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'],
    'trips:create': ['Dispatcher', 'Manager'],
    'trips:update': ['Dispatcher', 'Manager'],
    'trips:delete': ['Dispatcher', 'Manager'],
    
    # Maintenance management permissions
    'maintenance:read': ['Manager', 'Dispatcher', 'Financial Analyst'],
    'maintenance:create': ['Manager'],
    'maintenance:update': ['Manager'],
    'maintenance:delete': ['Manager'],
    
    # Fuel log permissions
    'fuel:read': ['Manager', 'Financial Analyst'],
    'fuel:create': ['Manager', 'Financial Analyst'],
    'fuel:update': ['Manager', 'Financial Analyst'],
    'fuel:delete': ['Manager', 'Financial Analyst'],
    
    # Analytics permissions
    'analytics:read': ['Manager', 'Financial Analyst'],
    'analytics:export': ['Manager', 'Financial Analyst'],
    
    # Search permissions (all authenticated users)
    'search:read': ['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'],
}


def require_role(*allowed_roles):
    """
    Decorator to restrict route access based on user roles.
    
    This decorator checks if the authenticated user's role is in the list
    of allowed roles. If not, it returns a 403 Forbidden response.
    
    Usage:
        @app.route('/admin')
        @require_role('Manager')
        def admin_route():
            return {'message': 'Admin access granted'}
        
        @app.route('/dispatch')
        @require_role('Manager', 'Dispatcher')
        def dispatch_route():
            return {'message': 'Dispatch access granted'}
    
    Args:
        *allowed_roles: Variable number of role names that are allowed to access the route
    
    Returns:
        Decorated function that checks user role before executing the route handler
    
    Raises:
        401: If user is not authenticated (handled by @jwt_required)
        403: If user's role is not in allowed_roles
        404: If user is not found in database
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            # Get current user ID from JWT token
            current_user_id = get_jwt_identity()
            
            # Fetch user from database
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Check if user's role is in allowed roles
            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'You do not have permission to access this resource',
                    'required_roles': list(allowed_roles),
                    'your_role': user.role
                }), 403
            
            # Role check passed, execute the route handler
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator


def require_permission(permission):
    """
    Decorator to restrict route access based on permissions.
    
    This decorator checks if the authenticated user's role has the specified
    permission according to the ROLE_PERMISSIONS mapping.
    
    Usage:
        @app.route('/vehicles', methods=['POST'])
        @require_permission('vehicles:create')
        def create_vehicle():
            return {'message': 'Vehicle created'}
    
    Args:
        permission: Permission string (e.g., 'vehicles:create', 'trips:read')
    
    Returns:
        Decorated function that checks user permission before executing the route handler
    
    Raises:
        401: If user is not authenticated (handled by @jwt_required)
        403: If user's role does not have the required permission
        404: If user is not found in database
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            # Get current user ID from JWT token
            current_user_id = get_jwt_identity()
            
            # Fetch user from database
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Get allowed roles for this permission
            allowed_roles = ROLE_PERMISSIONS.get(permission, [])
            
            # Check if user's role has this permission
            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'You do not have permission to access this resource',
                    'required_permission': permission,
                    'your_role': user.role
                }), 403
            
            # Permission check passed, execute the route handler
            return fn(*args, **kwargs)
        
        return wrapper
    return decorator
