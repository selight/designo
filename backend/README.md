# Designo Backend

A collaborative 3D annotation app backend built with Node.js, Express, Socket.IO, and MongoDB.

## 🚀 Features

- **Real-time Collaboration**: Multiple users can work on the same 3D scene simultaneously
- **Scene Persistence**: Full 3D scene state stored in MongoDB
- **Autosave**: Automatic saving of scene changes
- **Live Annotations**: Real-time annotation sharing
- **Chat System**: In-project communication
- **Camera Sync**: Synchronized camera movements across users

## 🛠 Tech Stack

- **Node.js** with TypeScript
- **Express.js** for REST API
- **Socket.IO** for real-time communication
- **MongoDB** with Mongoose ODM
- **CORS** enabled for React frontend

## 🏗 Architecture

The backend follows a clean service-oriented architecture with clear separation of concerns:

### **Services Layer**
- **ProjectService**: Handles all project-related business logic
- **UserService**: Manages user creation, updates, and authentication
- **SocketService**: Manages real-time collaboration and room management

### **Routes Layer**
- **Projects Routes**: REST API endpoints for project CRUD operations
- **Users Routes**: REST API endpoints for user management

### **Models Layer**
- **Project Model**: MongoDB schema for projects with scene data
- **User Model**: MongoDB schema for users with colors and metadata

### **Socket Layer**
- **Socket Handlers**: Real-time event handling for collaboration

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🔧 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/designo
   FRONTEND_URL=http://localhost:5173
   ```

3. **Start MongoDB:**
   - Local: Make sure MongoDB is running on your system
   - Cloud: Update `MONGODB_URI` in `.env` with your connection string

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## 📡 API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get specific project with full scene data
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project (autosave)
- `DELETE /api/projects/:id` - Delete project

### Annotations
- `POST /api/projects/:id/annotations` - Add annotation
- `PUT /api/projects/:id/annotations/:annotationId` - Update annotation
- `DELETE /api/projects/:id/annotations/:annotationId` - Delete annotation

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Health Check
- `GET /api/health` - Server health status

## 🔌 Socket.IO Events

### Client → Server
- `join-project` - Join a project room
- `camera-move` - Broadcast camera movement
- `object-change` - Add/update/delete 3D objects
- `annotation-change` - Add/update/delete annotations
- `chat-message` - Send chat message
- `cursor-move` - Broadcast cursor position

### Server → Client
- `user-joined` - User joined the room
- `user-left` - User left the room
- `room-users` - List of current room users
- `camera-moved` - Camera movement from other user
- `object-changed` - Object changes from other users
- `annotation-changed` - Annotation changes from other users
- `chat-message` - Chat message from other user
- `cursor-moved` - Cursor movement from other user

## 🗄 Database Schema

### User
```typescript
{
  _id: ObjectId,
  name: string,       // e.g. "Guest-1234"
  color: string,      // random color for UI
  createdAt: Date
}
```

### Project
```typescript
{
  _id: ObjectId,
  title: string,
  ownerId?: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  objects: [
    {
      id: string,
      type: "primitive" | "stl",
      name: string,
      position: [number, number, number],
      rotation: [number, number, number],
      scale: [number, number, number],
      geometryJson?: any
    }
  ],
  annotations: [
    {
      id: string,
      text: string,
      position: [number, number, number],
      normal?: [number, number, number],
      userId?: ObjectId,
      createdAt: Date
    }
  ],
  camera: {
    position: [number, number, number],
    target: [number, number, number]
  }
}
```

## 🔄 Real-time Collaboration Flow

1. **User opens project**: Loads scene data via REST API
2. **Join room**: Connects to Socket.IO room for the project
3. **Real-time sync**: All changes broadcast to other users in the room
4. **Autosave**: Scene changes automatically saved to database
5. **Live updates**: Other users see changes in real-time

## 🛡 CORS Configuration

The server is configured to accept requests from your React frontend. Update `FRONTEND_URL` in `.env` to match your frontend URL.

## 📝 Development Notes

- Large payload support (50MB limit) for 3D geometry data
- Automatic user creation for anonymous users
- Graceful shutdown handling
- Comprehensive error handling
- TypeScript for type safety

## 🔧 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access for cloud MongoDB

### CORS Issues
- Update `FRONTEND_URL` in `.env`
- Check browser console for CORS errors

### Socket.IO Connection Issues
- Verify frontend URL configuration
- Check firewall settings
- Ensure WebSocket support
