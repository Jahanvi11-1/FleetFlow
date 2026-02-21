"""
Centralized error handling for FleetFlow API.

This module provides custom exception classes and error handlers
to ensure consistent error responses across all endpoints.

Validates: Requirements 11.1, 11.3
"""

from flask import jsonify
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError
import logging

logger = logging.getLogger(__name__)


# Custom Exception Classes

class ValidationError(Exception):
    """Raised when input validation fails (400 Bad Request)."""
    def __init__(self, message, details=None):
        self.message = message
        self.details = details or []
        super().__init__(self.message)


class AuthenticationError(Exception):
    """Raised when authentication fails (401 Unauthorized)."""
    def __init__(self, message="Invalid credentials"):
        self.message = message
        super().__init__(self.message)


class AuthorizationError(Exception):
    """Raised when user lacks permission (403 Forbidden)."""
    def __init__(self, message="You do not have permission to access this resource"):
        self.message = message
        super().__init__(self.message)


class NotFoundError(Exception):
    """Raised when a resource is not found (404 Not Found)."""
    def __init__(self, message="Resource not found"):
        self.message = message
        super().__init__(self.message)


class ConflictError(Exception):
    """Raised when a resource conflict occurs (409 Conflict)."""
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class BusinessLogicError(Exception):
    """Raised when business rules are violated (422 Unprocessable Entity)."""
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


# Error Handler Registration

def register_error_handlers(app):
    """
    Register all error handlers with the Flask application.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors (400)."""
        response = {
            'error': 'Validation failed',
            'message': error.message
        }
        if error.details:
            response['details'] = error.details
        
        logger.warning(f"Validation error: {error.message}")
        return jsonify(response), 400
    
    @app.errorhandler(AuthenticationError)
    def handle_authentication_error(error):
        """Handle authentication errors (401)."""
        response = {
            'error': 'Authentication failed',
            'message': error.message
        }
        
        logger.warning(f"Authentication error: {error.message}")
        return jsonify(response), 401
    
    @app.errorhandler(AuthorizationError)
    def handle_authorization_error(error):
        """Handle authorization errors (403)."""
        response = {
            'error': 'Authorization failed',
            'message': error.message
        }
        
        logger.warning(f"Authorization error: {error.message}")
        return jsonify(response), 403
    
    @app.errorhandler(NotFoundError)
    def handle_not_found_error(error):
        """Handle not found errors (404)."""
        response = {
            'error': 'Not found',
            'message': error.message
        }
        
        logger.info(f"Not found error: {error.message}")
        return jsonify(response), 404
    
    @app.errorhandler(404)
    def handle_404(error):
        """Handle Flask's built-in 404 errors."""
        response = {
            'error': 'Not found',
            'message': 'The requested resource was not found'
        }
        
        logger.info(f"404 error: {error}")
        return jsonify(response), 404
    
    @app.errorhandler(ConflictError)
    def handle_conflict_error(error):
        """Handle conflict errors (409)."""
        response = {
            'error': 'Conflict',
            'message': error.message
        }
        
        logger.warning(f"Conflict error: {error.message}")
        return jsonify(response), 409
    
    @app.errorhandler(BusinessLogicError)
    def handle_business_logic_error(error):
        """Handle business logic errors (422)."""
        response = {
            'error': 'Business logic violation',
            'message': error.message
        }
        
        logger.warning(f"Business logic error: {error.message}")
        return jsonify(response), 422
    
    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        """Handle database integrity errors (409)."""
        # Parse common integrity errors
        error_str = str(error.orig).lower()
        
        if 'unique constraint' in error_str or 'duplicate' in error_str:
            if 'license_plate' in error_str:
                message = 'License plate already exists'
            elif 'license_number' in error_str:
                message = 'License number already exists'
            elif 'email' in error_str:
                message = 'Email already exists'
            else:
                message = 'A record with this value already exists'
        elif 'foreign key' in error_str:
            message = 'Referenced resource not found'
        else:
            message = 'Database constraint violation'
        
        response = {
            'error': 'Conflict',
            'message': message
        }
        
        logger.error(f"Integrity error: {error}", exc_info=True)
        return jsonify(response), 409
    
    @app.errorhandler(OperationalError)
    def handle_operational_error(error):
        """Handle database operational errors (503)."""
        response = {
            'error': 'Service unavailable',
            'message': 'Database temporarily unavailable, please try again'
        }
        
        logger.error(f"Operational error: {error}", exc_info=True)
        return jsonify(response), 503
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle internal server errors (500)."""
        response = {
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again later.'
        }
        
        # Log full error details server-side but don't expose to client
        logger.error(f"Internal server error: {error}", exc_info=True)
        return jsonify(response), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle any unexpected errors (500)."""
        # Check if it's an HTTPException from Werkzeug
        if isinstance(error, HTTPException):
            response = {
                'error': error.name,
                'message': error.description
            }
            logger.warning(f"HTTP exception: {error}")
            return jsonify(response), error.code
        
        # For all other unexpected errors
        response = {
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again later.'
        }
        
        # Log full error details server-side but don't expose to client
        logger.error(f"Unexpected error: {error}", exc_info=True)
        return jsonify(response), 500
