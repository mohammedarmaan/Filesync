import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { database, ref, set, get, onValue, push } from '../hooks/firebase';
import { useUser } from './UserContext';

interface File {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface ActiveUser {
  userId: string;
  nickname: string;
  isAdmin: boolean;
}

interface Room {
  id: string;
  code: string;
  adminId: string;
  createdAt: number;
  files: File[];
  activeUsers: ActiveUser[];
}

interface RoomContextType {
  room: Room | null;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => void;
  addFile: (file: Omit<File, 'id' | 'timestamp'>) => Promise<void>;
}

const RoomContext = createContext<RoomContextType | null>(null);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

interface RoomProviderProps {
  children: ReactNode;
}

export const RoomProvider = ({ children }: RoomProviderProps) => {
  const [room, setRoom] = useState<Room | null>(null);
  const { user } = useUser();

  // Generate a random 4-digit room code
  const generateRoomCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Create a new room
  const createRoom = async (): Promise<string> => {
    if (!user) throw new Error('User must be logged in to create a room');

    const code = generateRoomCode();
    const roomRef = ref(database, `rooms/${code}`);
    
    // Check if room code already exists
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      return createRoom(); // Try again with a new code
    }

    const newRoom: Room = {
      id: code,
      code,
      adminId: user.userId,
      createdAt: Date.now(),
      files: [], // Initialize with empty array
      activeUsers: [{ // Initialize with admin user
        userId: user.userId,
        nickname: user.nickname,
        isAdmin: true,
      }]
    };

    await set(roomRef, newRoom);
    setRoom(newRoom);
    return code;
  };

  // Join an existing room
  const joinRoom = async (code: string): Promise<boolean> => {
    if (!user) throw new Error('User must be logged in to join a room');

    const roomRef = ref(database, `rooms/${code}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      return false;
    }

    const roomData = snapshot.val() as Room;

    // Ensure arrays exist
    if (!roomData.files) roomData.files = [];
    if (!roomData.activeUsers) roomData.activeUsers = [];

    const newUser: ActiveUser = {
      userId: user.userId,
      nickname: user.nickname,
      isAdmin: false,
    };

    // Add user to active users if not already present
    const existingUserIndex = roomData.activeUsers.findIndex(u => u.userId === user.userId);
    if (existingUserIndex === -1) {
      roomData.activeUsers.push(newUser);
      await set(roomRef, roomData);
    }

    setRoom(roomData);
    return true;
  };

  // Leave the current room
  const leaveRoom = async () => {
    if (!room || !user) return;

    const roomRef = ref(database, `rooms/${room.code}`);
    const updatedUsers = room.activeUsers.filter(u => u.userId !== user.userId);

    if (updatedUsers.length === 0) {
      // If last user leaves, delete the room
      await set(roomRef, null);
    } else {
      // Update active users list
      await set(roomRef, {
        ...room,
        activeUsers: updatedUsers,
      });
    }

    setRoom(null);
  };

  // Add a file to the room
  const addFile = async (file: Omit<File, 'id' | 'timestamp'>) => {
    if (!room || !user) throw new Error('Must be in a room to add files');

    const roomRef = ref(database, `rooms/${room.code}`);
    const newFile: File = {
      ...file,
      id: push(ref(database)).key || '',
      timestamp: Date.now(),
    };

    const updatedFiles = [...(room.files || []), newFile];
    await set(roomRef, {
      ...room,
      files: updatedFiles,
    });
  };

  // Listen for room updates
  useEffect(() => {
    if (!room?.code) return;

    const roomRef = ref(database, `rooms/${room.code}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setRoom(null);
        return;
      }
      const roomData = snapshot.val() as Room;
      // Ensure arrays exist
      if (!roomData.files) roomData.files = [];
      if (!roomData.activeUsers) roomData.activeUsers = [];
      setRoom(roomData);
    });

    return () => {
      unsubscribe();
    };
  }, [room?.code]);

  // Clean up room connection on unmount or user change
  useEffect(() => {
    return () => {
      if (room && user) {
        leaveRoom();
      }
    };
  }, [user]);

  return (
    <RoomContext.Provider value={{ room, createRoom, joinRoom, leaveRoom, addFile }}>
      {children}
    </RoomContext.Provider>
  );
};