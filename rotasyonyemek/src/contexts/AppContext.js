import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const auth = useAuth();

  const value = {
    user: auth.user,
    userRole: auth.userRole,
    loading: auth.loading,
    isAdmin: auth.isAdmin,
    isRestoran: auth.isRestoran,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export { AppContext };
export default AppContext;