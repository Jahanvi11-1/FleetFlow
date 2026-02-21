# FleetFlow Logistics Platform

A full-stack fleet management platform built with Flask (Python) and React.

## Project Structure

```
.
├── backend/                 # Flask REST API
│   ├── app/
│   │   ├── blueprints/     # API route blueprints
│   │   ├── models.py       # SQLAlchemy database models
│   │   └── __init__.py     # Flask app factory
│   ├── tests/              # Property-based and unit tests
│   ├── config.py           # Configuration settings
│   ├── requirements.txt    # Python dependencies
│   └── run.py             # Application entry point
│
└── frontend/               # React application
    ├── src/
    │   ├── components/    # Reusable UI components
    │   ├── pages/         # Page components
    │   ├── services/      # API service layer
    │   └── utils/         # Utility functions
    ├── package.json       # Node dependencies
    └── vite.config.js     # Vite configuration
```

## Backend Setup

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
pip install psycopg2-binary
```

2. Set up environment variables:
```bash
cp .env.example .env

# Edit .env with your database credentials``


3. Initialize the database:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Enter entry in user table in postgresql 
# To Encrypt Password as well as sucessful log in do the following steps
flask shell

# Import your database object and User model
from app import db
from app.models import User

# 1. Find the user you manually added to PostgreSQL
# Replace 'your_email@example.com' with the actual email in your DB
user = User.query.filter_by(email='admin@example.com').first()

# 2. Convert the plain text password into a secure hash
# This uses the set_password method from your models.py
user.set_password('your_new_password')

# 3. Save the changes to the PostgreSQL database
db.session.commit()

# 4. Exit the shell
exit()


```

4. Run the development server:
```bash
python run.py
```

5. Run tests:
```bash
pytest
```

## Frontend Setup

1. Install Node dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Run tests:
```bash
npm test
```

## Features

- Vehicle Registry Management
- Driver Management with License Validation
- Trip Dispatcher with Capacity Validation
- Maintenance Log with Automatic State Management
- Fuel Log and Efficiency Tracking
- Vehicle ROI Analytics
- Global Search Functionality
- Data Export (CSV/PDF)
- User Authentication and Authorization
- Real-Time Status Management

## Technology Stack

- **Backend**: Flask 3.0, SQLAlchemy, PostgreSQL, JWT
- **Frontend**: React 18, React Router, Axios
- **Database**: PostgreSQL (production)
