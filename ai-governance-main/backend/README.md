# AI Governance Backend

> **For the full project setup (all 3 services + API keys + troubleshooting), see [../Readme.md](../Readme.md). This file only covers running the backend folder in isolation.**

A Node.js/Express API that powers governance, risk, and compliance features. This README is tailored for beginners running ONLY the `Backend/` folder after cloning it separately.

## 🧰 What you need
- Node.js 18+
- npm (comes with Node.js)
- MongoDB running locally or a MongoDB URI you can access

## ⚙️ Environment variables
Create a `.env` file in `Backend/` with at least:
```env
# Server
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/governance-ai
```
Optional (only if you use these features):
```env
# CORS: allow the Frontend dev server (default Vite port)
CORS_ORIGIN=http://localhost:5173
```

Notes:
- The code reads `MONGODB_URI` and `PORT` directly. If absent, it defaults to `mongodb://localhost:27017` and port `3001`.
- There is no global `/api` prefix in routes; endpoints are mounted at the root (see below).

## 🚀 Run it locally (this folder only)
1) Install dependencies
```bash
npm install
```
2) Start MongoDB (skip if using a hosted cluster)
```bash
# Linux/macOS (one example)
mongod
```
3) Start the server (development)
```bash
npm run dev
```
The server will log: `Server running on port 3001`.

If you need a plain non‑watch run:
```bash
node server.js
```

## 🔗 Key endpoints (no /api prefix)
- `GET /` – health/status
- `POST /auth/login`, `POST /auth/register`
- `GET /projects`, `POST /projects`, ...
- `GET /templates`, `POST /templates`, ...
- `GET /comments/:entityType/:entityId`, `POST /comments`
- `GET /controls`, `POST /controls`
- `GET /risks`, `POST /risks`

## 🧪 Seed sample data (optional)
```bash
npm run seed
npm run seed:users
```

## 🏗️ Architecture

### Core Components

```
Backend/
├── middleware/           # Express middleware
│   ├── auth.js         # JWT authentication
│   ├── googleauth.js   # Google OAuth integration
│   └── logger.js       # Request logging
├── models/             # Mongoose data models
│   ├── User.js         # User management
│   ├── Projects.js     # Project data model
│   ├── Template.js     # Template system
│   ├── TemplateResponse.js # Template responses
│   ├── Comments.js     # Comment system
│   ├── ControlAssessment.js # Control assessments
│   ├── RiskMatrixRisk.js # Risk matrix data
│   ├── DataElements.js # Data elements
│   ├── Question.js     # Question management
│   └── ThirdParty.js   # Third-party assessments
├── routes/             # API route handlers
│   ├── auth.js         # Authentication routes
│   ├── projects.js     # Project management
│   ├── templates.js    # Template system
│   ├── templateResponses.js # Template responses
│   ├── comments.js     # Comment system
│   ├── controlAssessment.js # Control assessments
│   ├── riskMatrixResults.js # Risk matrix results
│   ├── riskMatrixRisks.js # Risk matrix risks
│   ├── dataElements.js # Data elements
│   ├── questionnaire.js # Questionnaire system
│   └── thirdparty.js   # Third-party assessments
├── services/           # Business logic services
│   ├── controlAssessmentService.js # Control assessment logic
│   └── riskMatrixService.js # Risk matrix logic
├── config.js           # Configuration management
├── server.js           # Express server entry point
├── seedData.js         # Database seeding
├── seedUsers.js        # User seeding
└── DB_schema.sql       # Database schema
```

## 📖 API Documentation

### Base URL
```
Development: http://localhost:3001
Production: https://your-domain.com
```

### Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

#### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/risks` - Get project risks
- `POST /api/projects/:id/risks` - Add project risk
- `GET /api/projects/:id/third-parties` - Get third parties
- `POST /api/projects/:id/third-parties` - Add third party

#### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create new template
- `GET /api/templates/:id` - Get template by ID
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `GET /api/templates/:id/questions` - Get template questions
- `POST /api/templates/:id/questions` - Add template question

#### Risk Management
- `GET /api/risk-matrix/risks` - Get all risks
- `POST /api/risk-matrix/risks` - Create new risk
- `GET /api/risk-matrix/results` - Get risk matrix results
- `POST /api/risk-matrix/results` - Create risk matrix result
- `GET /api/control-assessments` - Get control assessments
- `POST /api/control-assessments` - Create control assessment

#### Comments
- `GET /api/comments/:entityType/:entityId` - Get comments for entity
- `POST /api/comments` - Create new comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

## 🚀 Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Use a process manager or plain node
node server.js
# e.g. with PM2
# pm2 start server.js --name governance-backend
```

### Docker Development
```bash
# Using docker-compose
docker-compose -f docker-compose.dev.yml up

# Or build and run manually
docker build -f Dockerfile.dev -t governance-backend-dev .
docker run -p 3001:3001 --env-file .env governance-backend-dev
```

### Docker Production
```bash
# Using docker-compose
docker-compose up -d

# Or build and run manually
docker build -t governance-backend .
docker run -p 3001:3001 --env-file .env governance-backend
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3001 |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `CORS_ORIGIN` | CORS allowed origin | No | http://localhost:5173 |

### Database Configuration

The system uses MongoDB with the following collections:
- `users` - User accounts and profiles
- `projects` - Project data and metadata
- `templates` - Template definitions
- `templateresponses` - Template response data
- `comments` - Comment system data
- `controlassessments` - Control assessment data
- `riskmatrixrisks` - Risk matrix data
- `dataelements` - Data element definitions
- `questions` - Question definitions
- `thirdparties` - Third-party assessment data

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Manual Testing
Use tools like Postman or curl to test API endpoints:

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

## 📁 Project Structure Details

### Models (`models/`)

Each model defines the data structure and validation rules:

- **User.js**: User authentication and profile data
- **Projects.js**: Project management and metadata
- **Template.js**: Template system and question management
- **Comments.js**: Comment system for collaboration
- **ControlAssessment.js**: Control assessment data
- **RiskMatrixRisk.js**: Risk matrix and assessment data

### Routes (`routes/`)

API route handlers organized by feature:

- **auth.js**: Authentication and user management
- **projects.js**: Project CRUD operations
- **templates.js**: Template management
- **comments.js**: Comment system
- **riskMatrixResults.js**: Risk assessment results
- **controlAssessment.js**: Control evaluation

### Services (`services/`)

Business logic and external service integration:

- **controlAssessmentService.js**: Control assessment logic
- **riskMatrixService.js**: Risk matrix calculations
- **authService.js**: Authentication logic (if exists)

### Middleware (`middleware/`)

Express middleware for cross-cutting concerns:

- **auth.js**: JWT authentication middleware
- **googleauth.js**: Google OAuth integration
- **logger.js**: Request logging and monitoring

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**:
   ```bash
   # Check if MongoDB is running
   mongosh --eval "db.adminCommand('ismaster')"
   
   # Check connection string
   echo $MONGODB_URI
   ```

2. **Port Already in Use**:
   ```bash
   # Kill process on port 3001
   npx kill-port 3001
   # or
   lsof -ti:3001 | xargs kill -9
   ```

3. **JWT Token Issues**:
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format in Authorization header

4. **CORS Issues**:
   - Verify CORS_ORIGIN matches frontend URL
   - Check if frontend is running on expected port

5. **Agent Connection Issues**:
   - Verify AGENT_URL is correct
   - Check if AI agent service is running
   - Test agent connectivity

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

### Logs

Check application logs for:
- Database connection status
- API request/response details
- Error messages and stack traces
- Authentication events

## 🔒 Security

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration and refresh
- Role-based access control

### Data Validation
- Input sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

### Best Practices
- Store secrets in environment variables
- Use HTTPS in production
- Implement rate limiting
- Regular security updates

## 📊 Performance

### Optimization
- Database indexing
- Query optimization
- Response caching
- Connection pooling

### Monitoring
- Request/response times
- Database query performance
- Memory usage
- Error rates

## 🚀 Deployment

### Production Checklist

- [ ] Set up production MongoDB instance
- [ ] Configure environment variables
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS for production domain
- [ ] Set up monitoring and logging
- [ ] Configure backup and recovery
- [ ] Set up CI/CD pipeline
- [ ] Performance testing

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3001

CMD ["npm", "start"]
```

### Environment-Specific Configs

#### Development
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/governance-ai-dev
CORS_ORIGIN=http://localhost:5173
```

#### Production
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://production-server:27017/governance-ai
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📈 Monitoring & Logging

### Health Checks
- **Basic Health**: `GET /health`
- **Database Health**: Check MongoDB connection
- **Agent Health**: Verify AI agent connectivity

### Logging
- Request/response logging
- Error tracking
- Performance metrics
- User activity logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is part of the AI Governance system and is proprietary software.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check the logs for error details
4. Contact the development team

---

**Note**: This backend system is designed for governance and compliance applications. Ensure proper testing and security validation before deploying to production environments.


## Run the AI agent
cd ai-governance-main\backend\Agents
python main.py

install the new requirements
check the .env file inside agents folder (added google API, Atlassian API key)
## 3.1.3 Asset Inventory Management

### Overview
This module provides a centralized system to track, manage, and link all 
organizational assets to their security requirements.

### Files Added
- `backend/models/Asset.js` - Asset database model
- `backend/routes/assets.js` - API endpoints  
- `frontend/src/pages/Inventory/main.jsx` - Asset Inventory UI
- `frontend/src/components/sidebar.jsx` - Added Asset Inventory navigation

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/assets` | Get all assets |
| POST | `/assets` | Create new asset |
| PUT | `/assets/:id` | Update asset |
| DELETE | `/assets/:id` | Delete asset |
| POST | `/assets/:id/link-requirement` | Link requirement to asset |

### How to Access
1. Run backend: `npm run dev` inside `backend/` folder
2. Run frontend: `npm run dev` inside `frontend/` folder
3. Login as admin
4. Click **Asset Inventory** in the sidebar