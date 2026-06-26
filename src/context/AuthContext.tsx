/**
 * src/context/AuthContext.tsx
 * React context that provides the current authenticated user and auth helpers
 * to all components in the app tree.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, getSession, logout as authLogout, updateSessionData } from '../services/auth';

interface AuthContextType {
  currentUser: AuthUser | null;
  isAdmin: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  isFormTeacher: boolean; // teacher with a class_assignment
  isSubjectTeacher: boolean; // teacher assigned to activities
  login: (user: AuthUser) => void;
  logout: () => void;
  refreshSession: () => void;
  patchSession: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  isStudent: false,
  isTeacher: false,
  isFormTeacher: false,
  isSubjectTeacher: false,
  login: () => {},
  logout: () => {},
  refreshSession: () => {},
  patchSession: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const session = getSession();
    if (session) setCurrentUser(session);
  }, []);

  const login = (user: AuthUser) => {
    setCurrentUser(user);
  };

  const logout = () => {
    authLogout();
    setCurrentUser(null);
  };

  const refreshSession = () => {
    const session = getSession();
    if (session) setCurrentUser(session);
  };

  const patchSession = (updates: Partial<AuthUser>) => {
    updateSessionData(updates);
    setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student';
  const isTeacher = currentUser?.role === 'teacher';
  const isFormTeacher = isTeacher && !!currentUser?.classAssignment;
  const isSubjectTeacher = isTeacher; // subject teacher status is determined by activity assignments

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAdmin,
      isStudent,
      isTeacher,
      isFormTeacher,
      isSubjectTeacher,
      login,
      logout,
      refreshSession,
      patchSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
