# Role-Based Access Control (RBAC) Documentation

## Overview

The FleetFlow platform implements role-based access control to restrict access to features based on user roles. This document explains how to use the authorization decorators and the permission model.

## User Roles

The system supports four user roles:

1. **Manager**: Full access to vehicle management, can manage all resources
2. **Dispatcher**: Manages trips and dispatch operations
3. **Safety Officer**: Manages driver records and license validation
4. **Financial Analyst**: Access to analytics, fuel logs, and ROI calculations

## Authorization Decorators

### `@require_role(*allowed_roles)`

Restricts route access to specific roles.

**Usage:**
```python
from app.auth import require_role

@app.route('/admin')
@require_role('Manager')
def admin_route():
    return {'message': 'Admin access granted'}

@app.route('/dispatch')
@require_role('Manager', 'Dispatcher')
def dispatch_route():
    return {'message': 'Dispatch access granted'}
```

**Parameters:**
- `*allowed_roles`: Variable number of role names that can access the route

**Returns:**
- `403 Forbidden`: If user's role is not in allowed_roles
- `404 Not Found`: If user is not found in database
- `401 Unauthorized`: If JWT token is missing or invalid

### `@require_permission(permission)`

Restricts route access based on permission strings. This is the recommended approach as it provides more granular control.

**Usage:**
```python
from app.auth import require_permission

@app.route('/vehicles', methods=['POST'])
@require_permission('vehicles:create')
def create_vehicle():
    return {'message': 'Vehicle created'}

@app.route('/vehicles', methods=['GET'])
@require_permission('vehicles:read')
def get_vehicles():
    return {'message': 'Vehicles list'}
```

**Parameters:**
- `permission`: Permission string (e.g., 'vehicles:create', 'trips:read')

**Returns:**
- `403 Forbidden`: If user's role doesn't have the required permission
- `404 Not Found`: If user is not found in database
- `401 Unauthorized`: If JWT token is missing or invalid

## Permission Model

Permissions follow the format: `resource:action`

### Available Permissions

#### Vehicle Management
- `vehicles:read` - View vehicles (All roles)
- `vehicles:create` - Create vehicles (Manager only)
- `vehicles:update` - Update vehicles (Manager only)
- `vehicles:delete` - Delete vehicles (Manager only)

#### Driver Management
- `drivers:read` - View drivers (All roles)
- `drivers:create` - Create drivers (Safety Officer, Manager)
- `drivers:update` - Update drivers (Safety Officer, Manager)
- `drivers:delete` - Delete drivers (Safety Officer, Manager)

#### Trip Management
- `trips:read` - View trips (All roles)
- `trips:create` - Create trips (Dispatcher, Manager)
- `trips:update` - Update trips (Dispatcher, Manager)
- `trips:delete` - Delete trips (Dispatcher, Manager)

#### Maintenance Management
- `maintenance:read` - View maintenance logs (Manager, Dispatcher, Financial Analyst)
- `maintenance:create` - Create maintenance logs (Manager only)
- `maintenance:update` - Update maintenance logs (Manager only)
- `maintenance:delete` - Delete maintenance logs (Manager only)

#### Fuel Log Management
- `fuel:read` - View fuel logs (Manager, Financial Analyst)
- `fuel:create` - Create fuel logs (Manager, Financial Analyst)
- `fuel:update` - Update fuel logs (Manager, Financial Analyst)
- `fuel:delete` - Delete fuel logs (Manager, Financial Analyst)

#### Analytics
- `analytics:read` - View analytics (Manager, Financial Analyst)
- `analytics:export` - Export reports (Manager, Financial Analyst)

#### Search
- `search:read` - Use global search (All roles)

## Role Permission Matrix

| Permission | Manager | Dispatcher | Safety Officer | Financial Analyst |
|-----------|---------|------------|----------------|-------------------|
| vehicles:read | ✓ | ✓ | ✓ | ✓ |
| vehicles:create | ✓ | ✗ | ✗ | ✗ |
| vehicles:update | ✓ | ✗ | ✗ | ✗ |
| vehicles:delete | ✓ | ✗ | ✗ | ✗ |
| drivers:read | ✓ | ✓ | ✓ | ✓ |
| drivers:create | ✓ | ✗ | ✓ | ✗ |
| drivers:update | ✓ | ✗ | ✓ | ✗ |
| drivers:delete | ✓ | ✗ | ✓ | ✗ |
| trips:read | ✓ | ✓ | ✓ | ✓ |
| trips:create | ✓ | ✓ | ✗ | ✗ |
| trips:update | ✓ | ✓ | ✗ | ✗ |
| trips:delete | ✓ | ✓ | ✗ | ✗ |
| maintenance:read | ✓ | ✓ | ✗ | ✓ |
| maintenance:create | ✓ | ✗ | ✗ | ✗ |
| maintenance:update | ✓ | ✗ | ✗ | ✗ |
| maintenance:delete | ✓ | ✗ | ✗ | ✗ |
| fuel:read | ✓ | ✗ | ✗ | ✓ |
| fuel:create | ✓ | ✗ | ✗ | ✓ |
| fuel:update | ✓ | ✗ | ✗ | ✓ |
| fuel:delete | ✓ | ✗ | ✗ | ✓ |
| analytics:read | ✓ | ✗ | ✗ | ✓ |
| analytics:export | ✓ | ✗ | ✗ | ✓ |
| search:read | ✓ | ✓ | ✓ | ✓ |

## Implementation Examples

### Example 1: Vehicle Blueprint

```python
from flask import Blueprint
from app.auth import require_permission

vehicles_bp = Blueprint('vehicles', __name__)

@vehicles_bp.route('', methods=['GET'])
@require_permission('vehicles:read')
def get_vehicles():
    # All authenticated users can view vehicles
    return {'vehicles': []}

@vehicles_bp.route('', methods=['POST'])
@require_permission('vehicles:create')
def create_vehicle():
    # Only Managers can create vehicles
    return {'message': 'Vehicle created'}
```

### Example 2: Trip Blueprint

```python
from flask import Blueprint
from app.auth import require_permission

trips_bp = Blueprint('trips', __name__)

@trips_bp.route('', methods=['POST'])
@require_permission('trips:create')
def create_trip():
    # Managers and Dispatchers can create trips
    return {'message': 'Trip created'}
```

### Example 3: Analytics Blueprint

```python
from flask import Blueprint
from app.auth import require_permission

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/vehicle-roi', methods=['GET'])
@require_permission('analytics:read')
def get_vehicle_roi():
    # Only Managers and Financial Analysts can view analytics
    return {'roi': []}

@analytics_bp.route('/export', methods=['GET'])
@require_permission('analytics:export')
def export_analytics():
    # Only Managers and Financial Analysts can export reports
    return {'file': 'report.csv'}
```

## Error Responses

### 401 Unauthorized
Returned when JWT token is missing or invalid.

```json
{
  "msg": "Missing Authorization Header"
}
```

### 403 Forbidden
Returned when user doesn't have required permission.

```json
{
  "error": "You do not have permission to access this resource",
  "required_permission": "vehicles:create",
  "your_role": "Dispatcher"
}
```

### 404 Not Found
Returned when authenticated user is not found in database.

```json
{
  "error": "User not found"
}
```

## Best Practices

1. **Use `@require_permission` over `@require_role`**: Permission-based checks are more flexible and maintainable.

2. **Always place decorators in the correct order**:
   ```python
   @app.route('/endpoint')
   @require_permission('resource:action')  # Authorization decorator
   def endpoint():
       pass
   ```

3. **Keep permission strings consistent**: Follow the `resource:action` format.

4. **Document permission requirements**: Add comments to routes explaining who can access them.

5. **Test authorization**: Write tests to verify that unauthorized users receive 403 responses.

## Modifying Permissions

To modify the permission model, edit the `ROLE_PERMISSIONS` dictionary in `backend/app/auth.py`:

```python
ROLE_PERMISSIONS = {
    'vehicles:read': ['Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'],
    'vehicles:create': ['Manager'],
    # Add or modify permissions here
}
```

## Validates

This implementation validates **Requirement 9.4**: "THE System SHALL restrict access to features based on user role permissions"
