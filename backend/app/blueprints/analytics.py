from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import get_jwt_identity
from app.auth import require_permission
from app.models import Vehicle, Trip, MaintenanceLog, FuelLog, User
from app import db
from sqlalchemy import func
from datetime import datetime
import csv
from io import StringIO, BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/vehicle-roi', methods=['GET'])
@require_permission('analytics:read')
def get_vehicle_roi():
    """
    Calculate Vehicle ROI based on revenue and expenses.
    
    Query parameters:
        startDate: Filter trips/expenses from this date (ISO format: YYYY-MM-DD)
        endDate: Filter trips/expenses to this date (ISO format: YYYY-MM-DD)
    
    Returns:
        200: { "roi": [VehicleROI] }
        400: { "error": "Invalid date format" }
    
    ROI Formula: (Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost
    
    Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
    """
    # Parse date range parameters
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    
    start_date = None
    end_date = None
    
    try:
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
    except ValueError:
        return jsonify({
            'error': 'Invalid date format',
            'details': 'Dates must be in ISO format (YYYY-MM-DD)'
        }), 400
    
    # Get all vehicles
    vehicles = Vehicle.query.all()
    
    roi_data = []
    
    for vehicle in vehicles:
        # Aggregate revenue from completed trips (Requirement 6.4)
        revenue_query = db.session.query(func.sum(Trip.revenue)).filter(
            Trip.vehicle_id == vehicle.id,
            Trip.status == 'Completed'
        )
        
        if start_date:
            revenue_query = revenue_query.filter(Trip.scheduled_date >= start_date)
        if end_date:
            revenue_query = revenue_query.filter(Trip.scheduled_date <= end_date)
        
        revenue = revenue_query.scalar() or 0
        
        # Aggregate maintenance costs (Requirement 6.2)
        maintenance_query = db.session.query(func.sum(MaintenanceLog.cost)).filter(
            MaintenanceLog.vehicle_id == vehicle.id
        )
        
        if start_date:
            maintenance_query = maintenance_query.filter(MaintenanceLog.date >= start_date)
        if end_date:
            maintenance_query = maintenance_query.filter(MaintenanceLog.date <= end_date)
        
        maintenance_cost = maintenance_query.scalar() or 0
        
        # Aggregate fuel costs (Requirement 6.3)
        fuel_query = db.session.query(func.sum(FuelLog.cost)).filter(
            FuelLog.vehicle_id == vehicle.id
        )
        
        if start_date:
            fuel_query = fuel_query.filter(FuelLog.date >= start_date)
        if end_date:
            fuel_query = fuel_query.filter(FuelLog.date <= end_date)
        
        fuel_cost = fuel_query.scalar() or 0
        
        # Calculate ROI (Requirement 6.1, 6.5)
        # ROI = (Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost
        roi_percentage = None
        if vehicle.acquisition_cost and float(vehicle.acquisition_cost) > 0:
            total_expenses = float(maintenance_cost) + float(fuel_cost)
            net_profit = float(revenue) - total_expenses
            roi_percentage = (net_profit / float(vehicle.acquisition_cost)) * 100
        
        roi_data.append({
            'vehicleId': vehicle.id,
            'licensePlate': vehicle.license_plate,
            'model': vehicle.model,
            'revenue': float(revenue),
            'maintenanceCost': float(maintenance_cost),
            'fuelCost': float(fuel_cost),
            'acquisitionCost': float(vehicle.acquisition_cost) if vehicle.acquisition_cost else None,
            'roi': round(roi_percentage, 2) if roi_percentage is not None else None
        })
    
    return jsonify({
        'roi': roi_data
    }), 200


@analytics_bp.route('/fuel-efficiency', methods=['GET'])
@require_permission('analytics:read')
def get_fuel_efficiency():
    """
    Calculate fuel efficiency for vehicles.
    
    Query parameters:
        vehicleId: Filter by specific vehicle ID (optional)
    
    Returns:
        200: { "efficiency": [FuelEfficiency] }
        404: { "error": "Vehicle not found" }
    
    Efficiency Formula: Distance Traveled (km) / Liters Consumed
    Distance is calculated from consecutive odometer readings.
    
    Validates: Requirements 5.2, 5.3, 5.4
    """
    vehicle_id = request.args.get('vehicleId')
    
    # Build query for vehicles
    if vehicle_id:
        vehicles = Vehicle.query.filter_by(id=vehicle_id).all()
        if not vehicles:
            return jsonify({'error': 'Vehicle not found'}), 404
    else:
        vehicles = Vehicle.query.all()
    
    efficiency_data = []
    
    for vehicle in vehicles:
        # Get fuel logs ordered by odometer reading
        fuel_logs = FuelLog.query.filter_by(vehicle_id=vehicle.id).order_by(FuelLog.odometer_reading).all()
        
        if len(fuel_logs) < 2:
            # Need at least 2 fuel logs to calculate efficiency
            efficiency_data.append({
                'vehicleId': vehicle.id,
                'licensePlate': vehicle.license_plate,
                'model': vehicle.model,
                'efficiency': None,
                'totalDistance': 0,
                'totalFuel': 0,
                'message': 'Insufficient data (need at least 2 fuel logs)'
            })
            continue
        
        # Calculate total distance and total fuel (Requirements 5.2, 5.3)
        first_odometer = float(fuel_logs[0].odometer_reading)
        last_odometer = float(fuel_logs[-1].odometer_reading)
        total_distance = last_odometer - first_odometer
        
        # Sum all liters consumed
        total_fuel = sum(float(log.liters) for log in fuel_logs)
        
        # Calculate efficiency: distance / liters (Requirement 5.4)
        efficiency = None
        if total_fuel > 0:
            efficiency = total_distance / total_fuel
        
        efficiency_data.append({
            'vehicleId': vehicle.id,
            'licensePlate': vehicle.license_plate,
            'model': vehicle.model,
            'efficiency': round(efficiency, 2) if efficiency is not None else None,
            'totalDistance': round(total_distance, 2),
            'totalFuel': round(total_fuel, 2)
        })
    
    return jsonify({
        'efficiency': efficiency_data
    }), 200


@analytics_bp.route('/export', methods=['GET'])
@require_permission('analytics:export')
def export_analytics():
    """
    Export analytics data in CSV or PDF format.
    
    Query parameters:
        format: Export format - 'csv' or 'pdf' (required)
        type: Data type to export - 'roi' or 'fuel-efficiency' (default: 'roi')
        startDate: Filter from this date (ISO format: YYYY-MM-DD) (optional)
        endDate: Filter to this date (ISO format: YYYY-MM-DD) (optional)
    
    Returns:
        200: File download (CSV or PDF)
        400: { "error": "Invalid parameters" }
        401: { "error": "Authentication required" }
        403: { "error": "Insufficient permissions" }
    
    Validates: Requirements 8.2, 8.3, 8.4
    """
    # Get query parameters
    export_format = request.args.get('format', '').lower()
    export_type = request.args.get('type', 'roi').lower()
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    
    # Validate format parameter (Requirement 8.1)
    if export_format not in ['csv', 'pdf']:
        return jsonify({
            'error': 'Invalid format parameter',
            'details': 'Format must be either "csv" or "pdf"'
        }), 400
    
    # Validate type parameter
    if export_type not in ['roi', 'fuel-efficiency']:
        return jsonify({
            'error': 'Invalid type parameter',
            'details': 'Type must be either "roi" or "fuel-efficiency"'
        }), 400
    
    # Parse date range
    start_date = None
    end_date = None
    
    try:
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
    except ValueError:
        return jsonify({
            'error': 'Invalid date format',
            'details': 'Dates must be in ISO format (YYYY-MM-DD)'
        }), 400
    
    # Get current user information for metadata (Requirement 8.4)
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get export timestamp (Requirement 8.4)
    export_timestamp = datetime.utcnow()
    
    # Fetch data based on type
    if export_type == 'roi':
        data = _get_roi_data(start_date, end_date)
        headers = ['Vehicle ID', 'License Plate', 'Model', 'Revenue', 'Maintenance Cost', 'Fuel Cost', 'Acquisition Cost', 'ROI (%)']
        title = 'Vehicle ROI Report'
    else:  # fuel-efficiency
        data = _get_fuel_efficiency_data()
        headers = ['Vehicle ID', 'License Plate', 'Model', 'Efficiency (km/L)', 'Total Distance (km)', 'Total Fuel (L)']
        title = 'Fuel Efficiency Report'
    
    # Generate export based on format
    if export_format == 'csv':
        return _generate_csv_export(data, headers, title, user.name, export_timestamp)
    else:  # pdf
        return _generate_pdf_export(data, headers, title, user.name, export_timestamp, start_date, end_date)


def _get_roi_data(start_date, end_date):
    """
    Fetch ROI data for all vehicles.
    
    Returns:
        List of lists containing ROI data for each vehicle
    """
    vehicles = Vehicle.query.all()
    data = []
    
    for vehicle in vehicles:
        # Aggregate revenue from completed trips
        revenue_query = db.session.query(func.sum(Trip.revenue)).filter(
            Trip.vehicle_id == vehicle.id,
            Trip.status == 'Completed'
        )
        
        if start_date:
            revenue_query = revenue_query.filter(Trip.scheduled_date >= start_date)
        if end_date:
            revenue_query = revenue_query.filter(Trip.scheduled_date <= end_date)
        
        revenue = revenue_query.scalar() or 0
        
        # Aggregate maintenance costs
        maintenance_query = db.session.query(func.sum(MaintenanceLog.cost)).filter(
            MaintenanceLog.vehicle_id == vehicle.id
        )
        
        if start_date:
            maintenance_query = maintenance_query.filter(MaintenanceLog.date >= start_date)
        if end_date:
            maintenance_query = maintenance_query.filter(MaintenanceLog.date <= end_date)
        
        maintenance_cost = maintenance_query.scalar() or 0
        
        # Aggregate fuel costs
        fuel_query = db.session.query(func.sum(FuelLog.cost)).filter(
            FuelLog.vehicle_id == vehicle.id
        )
        
        if start_date:
            fuel_query = fuel_query.filter(FuelLog.date >= start_date)
        if end_date:
            fuel_query = fuel_query.filter(FuelLog.date <= end_date)
        
        fuel_cost = fuel_query.scalar() or 0
        
        # Calculate ROI
        roi_percentage = None
        if vehicle.acquisition_cost and float(vehicle.acquisition_cost) > 0:
            total_expenses = float(maintenance_cost) + float(fuel_cost)
            net_profit = float(revenue) - total_expenses
            roi_percentage = (net_profit / float(vehicle.acquisition_cost)) * 100
        
        data.append([
            vehicle.id,
            vehicle.license_plate,
            vehicle.model,
            f"{float(revenue):.2f}",
            f"{float(maintenance_cost):.2f}",
            f"{float(fuel_cost):.2f}",
            f"{float(vehicle.acquisition_cost):.2f}" if vehicle.acquisition_cost else "N/A",
            f"{roi_percentage:.2f}" if roi_percentage is not None else "N/A"
        ])
    
    return data


def _get_fuel_efficiency_data():
    """
    Fetch fuel efficiency data for all vehicles.
    
    Returns:
        List of lists containing fuel efficiency data for each vehicle
    """
    vehicles = Vehicle.query.all()
    data = []
    
    for vehicle in vehicles:
        # Get fuel logs ordered by odometer reading
        fuel_logs = FuelLog.query.filter_by(vehicle_id=vehicle.id).order_by(FuelLog.odometer_reading).all()
        
        if len(fuel_logs) < 2:
            data.append([
                vehicle.id,
                vehicle.license_plate,
                vehicle.model,
                "N/A",
                "0.00",
                "0.00"
            ])
            continue
        
        # Calculate total distance and total fuel
        first_odometer = float(fuel_logs[0].odometer_reading)
        last_odometer = float(fuel_logs[-1].odometer_reading)
        total_distance = last_odometer - first_odometer
        
        # Sum all liters consumed
        total_fuel = sum(float(log.liters) for log in fuel_logs)
        
        # Calculate efficiency
        efficiency = None
        if total_fuel > 0:
            efficiency = total_distance / total_fuel
        
        data.append([
            vehicle.id,
            vehicle.license_plate,
            vehicle.model,
            f"{efficiency:.2f}" if efficiency is not None else "N/A",
            f"{total_distance:.2f}",
            f"{total_fuel:.2f}"
        ])
    
    return data


def _generate_csv_export(data, headers, title, user_name, export_timestamp):
    """
    Generate CSV export with proper headers and metadata.
    
    Validates: Requirements 8.2, 8.4
    
    Args:
        data: List of lists containing the data rows
        headers: List of column headers
        title: Report title
        user_name: Name of user who initiated export
        export_timestamp: Timestamp of export
    
    Returns:
        Flask response with CSV file
    """
    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    
    # Write metadata (Requirement 8.4)
    writer.writerow([f"Report: {title}"])
    writer.writerow([f"Exported by: {user_name}"])
    writer.writerow([f"Export timestamp: {export_timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}"])
    writer.writerow([])  # Empty row for spacing
    
    # Write headers (Requirement 8.2)
    writer.writerow(headers)
    
    # Write data rows (Requirement 8.2)
    for row in data:
        writer.writerow(row)
    
    # Create response
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename="{title.lower().replace(" ", "_")}_{export_timestamp.strftime("%Y%m%d_%H%M%S")}.csv"'
    
    return response


def _generate_pdf_export(data, headers, title, user_name, export_timestamp, start_date, end_date):
    """
    Generate PDF export with formatted tables and metadata.
    
    Validates: Requirements 8.3, 8.4
    
    Args:
        data: List of lists containing the data rows
        headers: List of column headers
        title: Report title
        user_name: Name of user who initiated export
        export_timestamp: Timestamp of export
        start_date: Start date filter (optional)
        end_date: End date filter (optional)
    
    Returns:
        Flask response with PDF file
    """
    # Create PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for PDF elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = styles['Title']
    normal_style = styles['Normal']
    
    # Add title
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Add metadata (Requirement 8.4)
    metadata_text = f"<b>Exported by:</b> {user_name}<br/>"
    metadata_text += f"<b>Export timestamp:</b> {export_timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}<br/>"
    
    if start_date:
        metadata_text += f"<b>Start date:</b> {start_date.strftime('%Y-%m-%d')}<br/>"
    if end_date:
        metadata_text += f"<b>End date:</b> {end_date.strftime('%Y-%m-%d')}<br/>"
    
    elements.append(Paragraph(metadata_text, normal_style))
    elements.append(Spacer(1, 0.3*inch))
    
    # Prepare table data (Requirement 8.3)
    table_data = [headers] + data
    
    # Create table
    table = Table(table_data)
    
    # Style the table (Requirement 8.3)
    table.setStyle(TableStyle([
        # Header row styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Data rows styling
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.beige, colors.lightgrey]),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    
    # Create response
    buffer.seek(0)
    response = make_response(buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename="{title.lower().replace(" ", "_")}_{export_timestamp.strftime("%Y%m%d_%H%M%S")}.pdf"'
    
    return response
