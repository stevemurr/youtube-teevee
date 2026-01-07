const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  // Development mode: Proxy requests to separate dev servers
  console.log('Running in development mode');
  
  // Proxy API requests to backend dev server (port 3001)
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
    logLevel: 'debug'
  }));
  
  // Proxy all other requests to Vite dev server (port 5173)
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
    logLevel: 'debug'
  }));
  
} else {
  // Production mode: Serve built files and API
  console.log('Running in production mode');
  
  // Import and use the API routes directly
  // Note: Make sure to build the API first with `npm run build:api`
  try {
    const apiServer = require('./api/dist/server').default;
    
    // Initialize the API (database, etc)
    if (apiServer.initialize) {
      apiServer.initialize();
    }
    
    // Mount API routes - remove the /api prefix since the API server already includes it
    app.use(apiServer);
  } catch (error) {
    console.error('Failed to load API server. Make sure to run "npm run build:api" first.');
    console.error(error);
    process.exit(1);
  }
  
  // Serve static files from the frontend build
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Unified server running on http://localhost:${PORT}`);
  if (isDevelopment) {
    console.log('API backend expected on http://localhost:3001');
    console.log('Frontend dev server expected on http://localhost:5173');
    console.log('\nMake sure to run "npm run dev" to start both dev servers');
  }
});