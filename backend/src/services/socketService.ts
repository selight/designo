import { Server as SocketIOServer } from 'socket.io';
import { projectService } from './projectService';
import { userService } from './userService';

export interface SocketUser {
  userId: string;
  userName: string;
  userColor: string;
  socketId: string;
}

export interface CameraMoveData {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ObjectChangeData {
  action: 'add' | 'update' | 'delete';
  object?: any;
  objectId?: string;
}

export interface AnnotationChangeData {
  action: 'add' | 'update' | 'delete';
  annotation?: any;
  annotationId?: string;
}

export interface ChatMessageData {
  message: string;
  timestamp: Date;
}

export interface CursorMoveData {
  x: number;
  y: number;
}

export class SocketService {
  private io: SocketIOServer;
  private roomUsers: Map<string, Map<string, SocketUser>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Add user to a project room
   */
  addUserToRoom(projectId: string, user: SocketUser): void {
    if (!this.roomUsers.has(projectId)) {
      this.roomUsers.set(projectId, new Map());
    }
    
    const room = this.roomUsers.get(projectId)!;
    room.set(user.socketId, user);
    
    // Broadcast to other users in the room
    this.io.to(projectId).emit('user-joined', user);
  }

  /**
   * Remove user from a project room
   */
  removeUserFromRoom(projectId: string, socketId: string): SocketUser | null {
    const room = this.roomUsers.get(projectId);
    if (!room) return null;
    
    const user = room.get(socketId);
    if (user) {
      room.delete(socketId);
      
      // If room is empty, remove it
      if (room.size === 0) {
        this.roomUsers.delete(projectId);
      } else {
        // Broadcast to remaining users
        this.io.to(projectId).emit('user-left', user);
      }
    }
    
    return user || null;
  }

  /**
   * Get all users in a project room
   */
  getRoomUsers(projectId: string): SocketUser[] {
    const room = this.roomUsers.get(projectId);
    if (!room) return [];
    
    return Array.from(room.values());
  }

  /**
   * Broadcast camera movement to room
   */
  broadcastCameraMove(projectId: string, user: SocketUser, data: CameraMoveData): void {
    this.io.to(projectId).emit('camera-moved', {
      ...user,
      ...data
    });
  }

  /**
   * Broadcast object change to room
   */
  broadcastObjectChange(projectId: string, user: SocketUser, data: ObjectChangeData): void {
    this.io.to(projectId).emit('object-changed', {
      ...user,
      ...data
    });
  }

  /**
   * Broadcast annotation change to room
   */
  broadcastAnnotationChange(projectId: string, user: SocketUser, data: AnnotationChangeData): void {
    this.io.to(projectId).emit('annotation-changed', {
      ...user,
      ...data
    });
  }

  /**
   * Broadcast chat message to room
   */
  broadcastChatMessage(projectId: string, user: SocketUser, data: ChatMessageData): void {
    this.io.to(projectId).emit('chat-message', {
      ...user,
      ...data
    });
  }

  /**
   * Broadcast cursor movement to room
   */
  broadcastCursorMove(projectId: string, user: SocketUser, data: CursorMoveData): void {
    this.io.to(projectId).emit('cursor-moved', {
      ...user,
      ...data
    });
  }

  /**
   * Handle object change with database persistence
   */
  async handleObjectChange(projectId: string, user: SocketUser, data: ObjectChangeData): Promise<void> {
    try {
      // Broadcast to other users first
      this.broadcastObjectChange(projectId, user, data);
      
      // Update database
      if (data.action === 'add' && data.object) {
        await projectService.addObject(projectId, data.object);
      } else if (data.action === 'update' && data.object) {
        await projectService.updateObject(projectId, data.object.id, data.object);
      } else if (data.action === 'delete' && data.objectId) {
        await projectService.deleteObject(projectId, data.objectId);
      }
    } catch (error) {
      console.error('Error handling object change:', error);
      // Emit error to the specific user
      this.io.to(user.socketId).emit('error', { 
        message: 'Failed to sync object change',
        type: 'object-change'
      });
    }
  }

  /**
   * Handle annotation change with database persistence
   */
  async handleAnnotationChange(projectId: string, user: SocketUser, data: AnnotationChangeData): Promise<void> {
    try {
      // Broadcast to other users first
      this.broadcastAnnotationChange(projectId, user, data);
      
      // Update database
      if (data.action === 'add' && data.annotation) {
        await projectService.addAnnotation(projectId, data.annotation);
      } else if (data.action === 'update' && data.annotation) {
        await projectService.updateAnnotation(projectId, data.annotation.id, data.annotation);
      } else if (data.action === 'delete' && data.annotationId) {
        await projectService.deleteAnnotation(projectId, data.annotationId);
      }
    } catch (error) {
      console.error('Error handling annotation change:', error);
      // Emit error to the specific user
      this.io.to(user.socketId).emit('error', { 
        message: 'Failed to sync annotation change',
        type: 'annotation-change'
      });
    }
  }

  /**
   * Handle camera movement
   */
  async handleCameraMove(projectId: string, user: SocketUser, data: CameraMoveData): Promise<void> {
    try {
      // Broadcast to other users
      this.broadcastCameraMove(projectId, user, data);
      
      // Optionally save camera position to database
      await projectService.updateCamera(projectId, data);
    } catch (error) {
      console.error('Error handling camera move:', error);
    }
  }

  /**
   * Get room statistics
   */
  getRoomStats(projectId: string): { userCount: number; users: SocketUser[] } {
    const users = this.getRoomUsers(projectId);
    return {
      userCount: users.length,
      users
    };
  }

  /**
   * Get all active rooms
   */
  getAllActiveRooms(): string[] {
    return Array.from(this.roomUsers.keys());
  }

  /**
   * Get total connected users across all rooms
   */
  getTotalConnectedUsers(): number {
    let total = 0;
    for (const room of this.roomUsers.values()) {
      total += room.size;
    }
    return total;
  }
}
