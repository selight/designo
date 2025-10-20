import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/database';
import projectRoutes from './routes/projects';
import userRoutes from './routes/users';
import { setupSocketHandlers } from './socket/socketHandlers';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration for React frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Large limit for 3D geometry data
app.use(express.urlencoded({ extended: true }));

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Setup socket handlers
setupSocketHandlers(io);

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server ready`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error(' Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log(' Process terminated');
    process.exit(0);
  });
});

startServer();
