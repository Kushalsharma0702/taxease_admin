# Tax Hub Dashboard Backend API

Production-ready FastAPI backend with Redis caching for the Tax Hub Dashboard admin panel.

## Features

- ✅ FastAPI with async/await support
- ✅ PostgreSQL database with SQLAlchemy ORM
- ✅ Redis caching for performance optimization
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (Superadmin, Admin)
- ✅ Comprehensive audit logging
- ✅ RESTful API design
- ✅ CORS enabled for frontend integration
- ✅ Production-ready configuration

## Architecture

```
backend/
├── app/
│   ├── api/           # API routes
│   ├── core/          # Core utilities (config, auth, database, cache)
│   ├── models/        # SQLAlchemy models
│   └── schemas/       # Pydantic schemas
├── requirements.txt
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE taxhub_db;
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update the following:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `REDIS_HOST`, `REDIS_PORT`: Your Redis configuration
- `CORS_ORIGINS`: Frontend URLs

### 4. Initialize Database

The database tables will be created automatically on startup. Alternatively, you can use Alembic for migrations:

```bash
alembic upgrade head
```

### 5. Redis Setup

Make sure Redis is running:

```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:alpine
```

### 6. Run the Server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Admin login
- `GET /api/v1/auth/me` - Get current user

### Clients
- `GET /api/v1/clients` - List clients (paginated, filtered)
- `GET /api/v1/clients/{id}` - Get client details
- `POST /api/v1/clients` - Create client
- `PATCH /api/v1/clients/{id}` - Update client
- `DELETE /api/v1/clients/{id}` - Delete client

### Admin Users (Superadmin only)
- `GET /api/v1/admin-users` - List admins
- `GET /api/v1/admin-users/{id}` - Get admin details
- `POST /api/v1/admin-users` - Create admin
- `PATCH /api/v1/admin-users/{id}` - Update admin
- `DELETE /api/v1/admin-users/{id}` - Delete admin

### Documents
- `GET /api/v1/documents` - List documents
- `POST /api/v1/documents` - Create document
- `DELETE /api/v1/documents/{id}` - Delete document

### Payments
- `GET /api/v1/payments` - List payments
- `POST /api/v1/payments` - Create payment

### Analytics
- `GET /api/v1/analytics` - Get dashboard analytics

### Audit Logs (Superadmin only)
- `GET /api/v1/audit-logs` - List audit logs

## Initial Setup

### Create Superadmin

You'll need to create a superadmin user. You can do this via a Python script or directly in the database.

```python
from app.core.database import init_db, AsyncSessionLocal
from app.models.admin_user import AdminUser
from app.core.auth import get_password_hash
from app.core.permissions import ALL_PERMISSIONS
import asyncio

async def create_superadmin():
    await init_db()
    async with AsyncSessionLocal() as db:
        admin = AdminUser(
            email="superadmin@taxease.ca",
            name="Super Admin",
            password_hash=get_password_hash("demo123"),
            role="superadmin",
            permissions=ALL_PERMISSIONS,
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Superadmin created!")

asyncio.run(create_superadmin())
```

## Development

### Running Tests

```bash
pytest
```

### Code Quality

```bash
# Format code
black app/

# Lint
flake8 app/
```

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Use a proper secret key (generate with `openssl rand -hex 32`)
3. Configure proper CORS origins
4. Use environment variables for all secrets
5. Set up proper database connection pooling
6. Use a reverse proxy (nginx) for SSL/TLS
7. Set up proper logging and monitoring

## Redis Caching

The backend uses Redis for caching frequently accessed data:
- Analytics data is cached for 1 hour (configurable)
- Client lists can be cached
- Admin user data is cached

Cache can be invalidated by pattern matching.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Role-based access control
- Audit logging for all actions
- CORS protection
- SQL injection protection via SQLAlchemy ORM

## License

MIT




