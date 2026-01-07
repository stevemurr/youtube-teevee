# Unified Server Setup

This application now supports running both the frontend and API through a single command using a unified server setup.

## Quick Start

1. Install dependencies for all components:
   ```bash
   npm run install:all
   ```

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Run the application:
   ```bash
   # Development mode (runs both frontend and API dev servers)
   npm run dev
   
   # Production mode (serves built files)
   npm run build
   npm start
   ```

## Available Scripts

- `npm run dev` - Runs both frontend and API in development mode
- `npm run build` - Builds both frontend and API for production
- `npm start` - Starts the unified server (production mode)
- `npm run install:all` - Installs dependencies for root, API, and frontend

## How It Works

### Development Mode
- The unified server acts as a proxy
- API requests (`/api/*`) are proxied to the backend dev server (port 3001)
- All other requests are proxied to the Vite dev server (port 5173)
- Hot module replacement (HMR) works for both frontend and API

### Production Mode
- The unified server serves both the API and frontend
- API routes are mounted at `/api`
- Frontend static files are served from `frontend/dist`
- Client-side routing is handled by serving `index.html` for all non-API routes

## Ports

- **Unified Server**: http://localhost:3000 (configurable via PORT env var)
- **API Dev Server**: http://localhost:3001 (development only)
- **Frontend Dev Server**: http://localhost:5173 (development only)

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `PORT` - Port for the unified server (default: 3000)
- `NODE_ENV` - Set to "production" for production mode
- `YOUTUBE_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` - YouTube API credentials
- `JWT_SECRET`, `ENCRYPTION_KEY` - Security keys for authentication

## Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables (especially NODE_ENV=production)

3. Start the server:
   ```bash
   npm run start:prod
   ```

The server will serve the built frontend files and handle API requests from the same origin, eliminating CORS issues in production.