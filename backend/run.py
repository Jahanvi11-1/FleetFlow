from app import create_app, db
from app.models import User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog

app = create_app()


@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'User': User,
        'Vehicle': Vehicle,
        'Driver': Driver,
        'Trip': Trip,
        'MaintenanceLog': MaintenanceLog,
        'FuelLog': FuelLog
    }


if __name__ == '__main__':
    app.run(debug=True)
