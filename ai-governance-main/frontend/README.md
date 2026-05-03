# Frontend User Interface

> **For the full project setup (all 3 services + API keys + troubleshooting), see [../Readme.md](../Readme.md). This file only covers running the frontend folder in isolation.**

A Vite + React app for the Governance Platform. This README is tailored for beginners running ONLY the `Frontend/` folder after cloning it separately.

## 🧰 What you need
- Node.js 18+
- npm or pnpm
- Backend API URL (default local backend runs on `http://localhost:3001`)
- Agents API URL (optional, default `http://localhost:8000`)

## ⚙️ Environment variables
Create a `.env` file in `Frontend/` with:
```env
# Backend Express API (defaults to http://localhost:3001)
VITE_BACKEND_URL=http://localhost:3001

# Agents API (Python FastAPI)
VITE_AGENT_URL=http://localhost:8000

# Optional app branding
VITE_APP_NAME=Governance Platform
VITE_APP_VERSION=1.0.0
```

## 🚀 Run it locally (this folder only)
1) Install dependencies
```bash
npm install
# or
pnpm install
```
2) Start the dev server
```bash
npm run dev
# or
pnpm dev
```
The app will be available on the URL printed by Vite (commonly `http://localhost:5173`).

If the backend is running on a different host/port, update `VITE_BACKEND_URL` accordingly.

---

# Frontend User Interface

A modern, responsive React application for the Governance Platform, providing an intuitive user interface for risk management, project collaboration, and AI-powered document analysis.

## 🚀 Features

### Core UI Components
- **Dashboard**: Comprehensive analytics and project overview
- **Project Management**: Interactive project creation and management
- **Risk Assessment**: AI-powered risk analysis and visualization
- **Control Management**: Control framework assessment tools
- **Comment System**: Collaborative commenting with file attachments
- **User Management**: Authentication and user profile management

### Advanced Features
- **Trust Center Bot**: AI-powered document querying interface
- **File Upload & Preview**: PDF upload and preview functionality
- **Real-time Updates**: Live data updates and notifications
- **Responsive Design**: Mobile-first, responsive layout
- **Dark Mode**: Theme switching capability
- **Accessibility**: WCAG compliant components

### File Management
- **PDF Upload**: Drag-and-drop file upload with validation
- **PDF Preview**: In-modal PDF viewing with zoom and navigation
- **File Download**: Direct file download functionality
- **File Information**: Display file metadata and size
- **Progress Indicators**: Upload progress and loading states

## 🏗️ Architecture

### Technology Stack
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS + Material-UI components
- **State Management**: React Context + useState/useEffect
- **HTTP Client**: Axios for API communication
- **File Handling**: FormData for file uploads
- **PDF Viewing**: iframe-based PDF preview
- **Build Tool**: Vite for fast development and building

### Project Structure
```
Frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (shadcn/ui)
│   │   ├── AuthGuard.jsx   # Authentication wrapper
│   │   ├── PDFPreview.jsx  # PDF preview component
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Dashboard/      # Dashboard pages
│   │   ├── Projects/       # Project management
│   │   ├── ChatAgent/      # AI chat interfaces
│   │   └── ...
│   ├── services/           # API service layer
│   │   ├── authService.js  # Authentication API
│   │   ├── commentService.js # Comments with file upload
│   │   ├── projectService.js
│   │   └── ...
│   ├── contexts/           # React contexts
│   │   └── AuthContext.jsx # Authentication context
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── config/             # Configuration files
├── public/                 # Static assets
└── package.json           # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm
- Backend API running on port 5000
- Agents API running on port 8000

### Installation

1. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

### Environment Configuration

Create a `.env` file:
```env
# API Endpoints
VITE_BACKEND_URL=http://localhost:5000
VITE_AGENT_URL=http://localhost:8000

# Google OAuth (if using)
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# App Configuration
VITE_APP_NAME=Governance Platform
VITE_APP_VERSION=2.0.0
```

## 📚 Component Documentation

### Core Components

#### PDFPreview Component
A comprehensive PDF preview component with modal viewing, download, and external link functionality.

**Features:**
- Modal PDF viewing
- File download
- External link opening
- File information display
- Loading states
- Responsive design

**Usage:**
```jsx
import PDFPreview from '@/components/PDFPreview';

<PDFPreview
  attachment={comment.attachment}
  attachmentInfo={comment.attachmentInfo}
  fileName={comment.attachmentInfo?.originalName}
/>
```

#### Comments Component
Enhanced comment system with file upload and PDF preview capabilities.

**Features:**
- Text commenting
- PDF file upload
- File validation
- PDF preview
- Edit/delete functionality
- Real-time updates

**Usage:**
```jsx
import Comments from '@/pages/Projects/components/comments';

<Comments projectId={project.id} />
```

### Service Layer

#### Comment Service
Handles all comment-related API operations including file uploads.

**Key Functions:**
- `saveComment(projectId, text, file)` - Create comment with file
- `getComments(projectId)` - Fetch project comments
- `updateComment(commentId, text, file)` - Update comment with new file
- `deleteComment(commentId)` - Delete comment and file

**Example:**
```javascript
import { saveComment } from '@/services/commentService';

// Upload comment with PDF
const handleSubmit = async (text, file) => {
  try {
    const comment = await saveComment(projectId, text, file);
    console.log('Comment saved:', comment);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Consistent color scheme with dark mode support
- **Typography**: Modern font stack with proper hierarchy
- **Spacing**: Consistent spacing system using Tailwind CSS
- **Components**: Reusable component library based on shadcn/ui

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Responsive breakpoints for all screen sizes
- **Touch Friendly**: Touch-optimized interactions
- **Accessibility**: WCAG 2.1 AA compliant

### File Upload Experience
- **Drag & Drop**: Intuitive file selection
- **Progress Indicators**: Visual upload progress
- **Validation Feedback**: Clear error messages
- **Preview**: Immediate file preview
- **File Management**: Easy file replacement and removal

## 🔧 Development

### Running in Development Mode

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Structure

#### Component Organization
```
components/
├── ui/                 # Base UI components
├── layout.jsx         # Main layout wrapper
├── navbar.jsx         # Navigation bar
├── sidebar.jsx        # Sidebar navigation
├── PDFPreview.jsx     # PDF preview component
└── ...
```

#### Page Organization
```
pages/
├── Dashboard/         # Dashboard pages
├── Projects/          # Project management
│   ├── components/    # Project-specific components
│   └── main.jsx      # Main project page
├── ChatAgent/         # AI chat interfaces
└── ...
```

#### Service Organization
```
services/
├── authService.js     # Authentication
├── commentService.js  # Comments with file upload
├── projectService.js  # Project management
├── agentService.js    # AI agent communication
└── ...
```

### State Management

#### Authentication Context
```jsx
import { useAuth } from '@/contexts/AuthContext';

const { user, login, logout, isAuthenticated } = useAuth();
```

#### Local State
- Component-level state with useState
- Effect management with useEffect
- Custom hooks for reusable logic

### API Integration

#### Service Pattern
All API calls are abstracted into service functions:

```javascript
// Example: Comment service
export const saveComment = async (projectId, text, file) => {
  const formData = new FormData();
  formData.append('projectId', projectId);
  formData.append('text', text);
  if (file) formData.append('attachment', file);

  const response = await axios.post('/comments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
};
```

## 🚀 Deployment

### Build for Production

```bash
# Build the application
npm run build

# The build output will be in the 'dist' directory
```

### Environment Variables for Production

```env
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_AGENT_URL=https://agents.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-production-client-id
```

### Static Hosting

The built application can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### Docker Deployment

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🧪 Testing

### Running Tests

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API service testing
- **E2E Tests**: Full user workflow testing

## 📱 Mobile Support

### Responsive Breakpoints
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Mobile Features
- Touch-optimized file upload
- Swipe gestures for navigation
- Mobile-friendly PDF preview
- Responsive comment system

## 🔒 Security

### Client-Side Security
- Input validation and sanitization
- XSS protection
- CSRF token handling
- Secure file upload validation

### Authentication
- JWT token management
- Automatic token refresh
- Secure logout
- Protected routes

## 🆘 Troubleshooting

### Common Issues

1. **Build Errors**
   - Check Node.js version (18+)
   - Clear node_modules and reinstall
   - Check for TypeScript errors

2. **API Connection Issues**
   - Verify backend is running
   - Check CORS configuration
   - Verify environment variables

3. **File Upload Issues**
   - Check file size limits
   - Verify file type validation
   - Check network connectivity

4. **PDF Preview Issues**
   - Check if PDF URL is accessible
   - Verify CORS for PDF URLs
   - Check browser PDF support

### Debug Mode

Enable debug logging:
```bash
DEBUG=vite:* npm run dev
```

## 📈 Performance

### Optimization Tips
- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize images and assets
- Use code splitting
- Minimize bundle size

### Performance Monitoring
- Bundle size analysis
- Runtime performance monitoring
- User experience metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow React best practices
- Use TypeScript for type safety
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License.
