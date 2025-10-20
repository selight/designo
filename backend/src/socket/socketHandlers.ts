import { Server as SocketIOServer, Socket } from 'socket.io';
import { userService } from '../services/userService';
import { SocketService, SocketUser } from '../services/socketService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  projectId?: string;
  userName?: string;
  userColor?: string;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  const socketService = new SocketService(io);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Handle joining a project room
    socket.on('join-project', async (data: { projectId: string; userName?: string }) => {
      try {
        const { projectId, userName } = data;
        
        // Create or get user using service
        const user = userName 
          ? await userService.createOrGetUser(userName)
          : await userService.createAnonymousUser();
        
        socket.userId = user._id.toString();
        socket.userName = user.name;
        socket.userColor = user.color;
        socket.projectId = projectId;
        
        // Join the project room
        socket.join(projectId);
        
        // Create socket user object
        const socketUser: SocketUser = {
          userId: user._id.toString(),
          userName: user.name,
          userColor: user.color,
          socketId: socket.id
        };
        
        // Add user to room using service
        socketService.addUserToRoom(projectId, socketUser);
        
        // Send current room users to the new user
        const roomUsers = socketService.getRoomUsers(projectId);
        socket.emit('room-users', roomUsers);
        
        console.log(`👤 ${user.name} joined project ${projectId}`);
      } catch (error) {
        console.error('Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle camera movement
    socket.on('camera-move', async (data: { position: [number, number, number]; target: [number, number, number] }) => {
      if (socket.projectId && socket.userId) {
        const socketUser: SocketUser = {
          userId: socket.userId,
          userName: socket.userName!,
          userColor: socket.userColor!,
          socketId: socket.id
        };
        
        await socketService.handleCameraMove(socket.projectId, socketUser, data);
      }
    });

    // Handle object changes (add, update, delete)
    socket.on('object-change', async (data: { 
      action: 'add' | 'update' | 'delete';
      object?: any;
      objectId?: string;
    }) => {
      if (socket.projectId && socket.userId) {
        const socketUser: SocketUser = {
          userId: socket.userId,
          userName: socket.userName!,
          userColor: socket.userColor!,
          socketId: socket.id
        };
        
        await socketService.handleObjectChange(socket.projectId, socketUser, data);
      }
    });

    // Handle annotation changes
    socket.on('annotation-change', async (data: {
      action: 'add' | 'update' | 'delete';
      annotation?: any;
      annotationId?: string;
    }) => {
      if (socket.projectId && socket.userId) {
        const socketUser: SocketUser = {
          userId: socket.userId,
          userName: socket.userName!,
          userColor: socket.userColor!,
          socketId: socket.id
        };
        
        await socketService.handleAnnotationChange(socket.projectId, socketUser, data);
      }
    });

    // Handle chat messages
    socket.on('chat-message', (data: { message: string }) => {
      if (socket.projectId && socket.userId) {
        const socketUser: SocketUser = {
          userId: socket.userId,
          userName: socket.userName!,
          userColor: socket.userColor!,
          socketId: socket.id
        };
        
        socketService.broadcastChatMessage(socket.projectId, socketUser, {
          message: data.message,
          timestamp: new Date()
        });
      }
    });

    // Handle cursor position for real-time cursor tracking
    socket.on('cursor-move', (data: { x: number; y: number }) => {
      if (socket.projectId && socket.userId) {
        const socketUser: SocketUser = {
          userId: socket.userId,
          userName: socket.userName!,
          userColor: socket.userColor!,
          socketId: socket.id
        };
        
        socketService.broadcastCursorMove(socket.projectId, socketUser, data);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.projectId) {
        const removedUser = socketService.removeUserFromRoom(socket.projectId, socket.id);
        if (removedUser) {
          console.log(`👋 ${removedUser.userName} left project ${socket.projectId}`);
        }
      }
      console.log(`🔌 User disconnected: ${socket.id}`);
    });
  });
};
