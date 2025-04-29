import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { nanoid } from 'nanoid';

interface User {
  userId: string;
  nickname: string;
  isAdmin: boolean;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  createTemporaryUser: (nickname: string) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('filesync_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('filesync_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('filesync_user');
    }
  }, [user]);

  // Handle tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('filesync_user');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const createTemporaryUser = (nickname: string) => {
    const newUser: User = {
      userId: nanoid(8),
      nickname,
      isAdmin: false,
    };
    setUser(newUser);
  };

  const clearUser = () => {
    setUser(null);
    sessionStorage.removeItem('filesync_user');
  };

  return (
    <UserContext.Provider value={{ user, setUser, createTemporaryUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};