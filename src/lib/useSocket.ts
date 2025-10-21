import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { loadUser } from './storage.ts';

export interface SocketUser {
  userId: string;
  userName: string;
  userColor: string;
  socketId: string;
}


export interface CameraMoveData {
  userId: string;
  userName: string;
  userColor: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface ObjectChangeData {
  userId: string;
  userName: string;
  userColor: string;
  action: 'add' | 'update' | 'delete';
  object?: any;
  objectId?: string;
}

export interface AnnotationChangeData {
  userId: string;
  userName: string;
  userColor: string;
  action: 'add' | 'update' | 'delete';
  annotation?: any;
  annotationId?: string;
}

export interface CursorMoveData {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
}

export const useSocket = (projectId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState<SocketUser[]>([]);
  const [isSharedProject, setIsSharedProject] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const user = loadUser();
    if (!user || !projectId) return;

    const isShared = window.location.pathname.includes('/share/');
    setIsSharedProject(isShared);

    // Connect to socket
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    
    (window as any).socket = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      setConnected(true);
      
      // Join the project room
      newSocket.emit('join-project', {
        projectId,
        userName: user.name
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Room events
    newSocket.on('room-users', (users: SocketUser[]) => {
      setRoomUsers(users);
    });

    newSocket.on('user-joined', (user: SocketUser) => {
      setRoomUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
    });

    newSocket.on('user-left', (user: SocketUser) => {
      setRoomUsers(prev => prev.filter(u => u.userId !== user.userId));
    });


    // Error handling
    newSocket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      (window as any).socket = null;
    };
  }, [projectId]);

  // Socket methods
  const sendCameraMove = (position: [number, number, number], target: [number, number, number]) => {
    if (socket && connected) {
      socket.emit('camera-move', { position, target });
    }
  };

  const sendObjectChange = (action: 'add' | 'update' | 'delete', object?: any, objectId?: string) => {
    if (socket && connected) {
      socket.emit('object-change', { action, object, objectId });
    }
  };

  const sendAnnotationChange = (action: 'add' | 'update' | 'delete', annotation?: any, annotationId?: string) => {
    if (socket && connected) {
      socket.emit('annotation-change', { action, annotation, annotationId });
    }
  };


  const sendCursorMove = (x: number, y: number) => {
    if (socket && connected) {
      socket.emit('cursor-move', { x, y });
    }
  };

  // Expose socket globally for event listeners
  useEffect(() => {
    if (socket) {
      (window as any).socket = socket;
    }
    return () => {
      (window as any).socket = null;
    };
  }, [socket]);

  return {
    socket,
    connected,
    roomUsers,
    isSharedProject,
    sendCameraMove,
    sendObjectChange,
    sendAnnotationChange,
    sendCursorMove
  };
};
