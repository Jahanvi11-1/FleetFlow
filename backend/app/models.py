from app import db
from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash


def generate_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.CheckConstraint(
            "role IN ('Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst')",
            name='check_user_role'
        ),
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    model = db.Column(db.String(255), nullable=False)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)
    max_load_capacity = db.Column(db.Numeric(10, 2), nullable=False)
    capacity_unit = db.Column(db.String(10), nullable=False)
    odometer = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Available')
    acquisition_cost = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trips = db.relationship('Trip', back_populates='vehicle', lazy='dynamic')
    maintenance_logs = db.relationship('MaintenanceLog', back_populates='vehicle', lazy='dynamic', cascade='all, delete-orphan')
    fuel_logs = db.relationship('FuelLog', back_populates='vehicle', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.CheckConstraint(
            "capacity_unit IN ('kg', 'tons')",
            name='check_capacity_unit'
        ),
        db.CheckConstraint(
            "status IN ('Available', 'On Trip', 'In Shop')",
            name='check_vehicle_status'
        ),
        db.Index('idx_vehicles_status', 'status'),
        db.Index('idx_vehicles_license_plate', 'license_plate'),
    )


class Driver(db.Model):
    __tablename__ = 'drivers'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)
    license_expiration = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Off Duty')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    trips = db.relationship('Trip', back_populates='driver', lazy='dynamic')
    
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('On Duty', 'Off Duty')",
            name='check_driver_status'
        ),
        db.Index('idx_drivers_status', 'status'),
        db.Index('idx_drivers_name', 'name'),
        db.Index('idx_drivers_license_exp', 'license_expiration'),
    )


class Trip(db.Model):
    __tablename__ = 'trips'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    origin = db.Column(db.String(255), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    cargo_weight = db.Column(db.Numeric(10, 2), nullable=False)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id', ondelete='RESTRICT'), nullable=False)
    driver_id = db.Column(db.String(36), db.ForeignKey('drivers.id', ondelete='RESTRICT'), nullable=False)
    scheduled_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Draft')
    revenue = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', back_populates='trips')
    driver = db.relationship('Driver', back_populates='trips')
    
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')",
            name='check_trip_status'
        ),
        db.Index('idx_trips_vehicle', 'vehicle_id'),
        db.Index('idx_trips_driver', 'driver_id'),
        db.Index('idx_trips_status', 'status'),
    )


class MaintenanceLog(db.Model):
    __tablename__ = 'maintenance_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.Text, nullable=False)
    cost = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='In Progress')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', back_populates='maintenance_logs')
    
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('In Progress', 'Completed')",
            name='check_maintenance_status'
        ),
        db.Index('idx_maintenance_vehicle', 'vehicle_id'),
    )


class FuelLog(db.Model):
    __tablename__ = 'fuel_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    liters = db.Column(db.Numeric(10, 2), nullable=False)
    cost = db.Column(db.Numeric(10, 2), nullable=False)
    odometer_reading = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    vehicle = db.relationship('Vehicle', back_populates='fuel_logs')
    
    __table_args__ = (
        db.Index('idx_fuel_vehicle', 'vehicle_id'),
        db.Index('idx_fuel_date', 'date'),
    )
