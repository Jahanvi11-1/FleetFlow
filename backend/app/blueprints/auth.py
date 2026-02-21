from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models import User

auth_bp = Blueprint('auth', __name__)

# In-memory token blocklist for logout functionality
token_blocklist = set()


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user and generate JWT token.
    
    Request body:
        {
            "email": "user@example.com",
            "password": "password123"
        }
    
    Returns:
        200: { "token": "jwt_token", "user": { "id", "email", "name", "role" } }
        400: { "error": "Missing required fields" }
        401: { "error": "Invalid email or password" }
    """
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Create JWT token with user identity
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role
        }
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Invalidate the current JWT token.
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        200: { "message": "Successfully logged out" }
        401: { "error": "Missing or invalid token" }
    """
    jti = get_jwt()['jti']  # JWT ID for token invalidation
    token_blocklist.add(jti)
    
    return jsonify({'message': 'Successfully logged out'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """
    Get current authenticated user information.
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        200: { "user": { "id", "email", "name", "role" } }
        401: { "error": "Missing or invalid token" }
        404: { "error": "User not found" }
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role
        }
    }), 200
