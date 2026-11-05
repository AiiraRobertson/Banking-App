import { useState, useEffect, useCallback } from 'react';
import NotificationContext from './NotificationContextValue';
import { useAuth } from './useAuth';
import * as notificationService from '../services/notificationService';

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch (error) {
      console.error('Failed to refresh notification count:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    notificationService.getUnreadCount()
      .then(res => {
        if (active) setUnreadCount(res.data.count);
      })
      .catch(error => {
        console.error('Failed to refresh notification count:', error);
      });
    const interval = setInterval(refreshCount, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount: isAuthenticated ? unreadCount : 0, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
}
