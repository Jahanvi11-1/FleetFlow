from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    # JWT token blocklist checker
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        from app.blueprints.auth import token_blocklist
        return jwt_payload['jti'] in token_blocklist

    from app.blueprints.auth import auth_bp
    from app.blueprints.vehicles import vehicles_bp
    from app.blueprints.drivers import drivers_bp
    from app.blueprints.trips import trips_bp
    from app.blueprints.maintenance import maintenance_bp
    from app.blueprints.fuel_logs import fuel_logs_bp
    from app.blueprints.analytics import analytics_bp
    from app.blueprints.search import search_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(vehicles_bp, url_prefix='/vehicles')
    app.register_blueprint(drivers_bp, url_prefix='/drivers')
    app.register_blueprint(trips_bp, url_prefix='/trips')
    app.register_blueprint(maintenance_bp, url_prefix='/maintenance')
    app.register_blueprint(fuel_logs_bp, url_prefix='/fuel-logs')
    app.register_blueprint(analytics_bp, url_prefix='/analytics')
    app.register_blueprint(search_bp, url_prefix='/search')

    # Register centralized error handlers
    from app.errors import register_error_handlers
    register_error_handlers(app)

    return app
