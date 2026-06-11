/**
 * Contribution of Member 4: Real-time Messaging Context.
 * Usage: This module maintains a persistent WebSocket connection (SockJS/STOMP). 
 * It listens for incoming alerts on user-specific and broadcast topics, 
 * triggering visual (toast) and audible alerts to ensure reactive UX.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

/**
 * Context for managing Real-Time Notifications.
 * This file handles WebSocket connections via STOMP, manages notification history via REST,
 * and coordinates system-wide alerts (toasts and sounds).
 */
export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  resourceId?: string;
}

interface NotificationContextType {
  notifications: Notification[]; // List of received notifications
  unreadCount: number; // Reactive count of unread notifications
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

/**
 * Custom hook to consume notification state and actions.
 */
export const useNotifications = () => useContext(NotificationContext);

/**
 * Provider component that maintains the WebSocket lifecycle and notification state.
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userRole } = useAuth(); // Consume auth state for role-based subscriptions
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /**
   * Dynamically determines the API URL based on the environment.
   */
  const getApiUrl = () => {
    const host = window.location.hostname;
    return host === 'localhost' ? 'http://localhost:8080/api/v1' : `http://${host}:8080/api/v1`;
  };

  const notifyUrl = getApiUrl();
  const wsUrl = notifyUrl.replace('/api/v1', '/ws'); // Derive WebSocket endpoint from API URL

  /**
   * Fetches historical notifications via REST API.
   */
  const fetchNotifications = async (token: string) => {
    try {
      const response = await fetch(`${notifyUrl}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure consistent 'isRead' property mapping from the backend
        const mappedData = data.map((n: any) => ({
          ...n,
          isRead: n.read !== undefined ? n.read : n.isRead
        }));
        setNotifications(mappedData);
      }
    } catch (e) {
      console.error("Failed to fetch initial notifications", e);
    }
  };

  useEffect(() => {
    let client: Client | null = null;
    let isMounted = true;

    // Reset notifications if the user logs out
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    /**
     * Establishes and configures the WebSocket connection.
     */
    const connectWebSocket = async () => {
      try {
        const token = await currentUser.getIdToken();
        if (!isMounted) return;

        // Load existing notifications first
        await fetchNotifications(token);
        if (!isMounted) return;

        console.log(`Initializing WebSocket for user ${currentUser.uid} with role ${userRole || 'pending'}`);

        // Initialize the STOMP client using SockJS for broad browser compatibility
        const stompClient = new Client({
          webSocketFactory: () => new SockJS(wsUrl),
          reconnectDelay: 5000, // Automaticaly retry connection every 5 seconds if it drops
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        // Inject fresh Firebase JWT tokens into the CONNECT headers
        stompClient.beforeConnect = async () => {
          try {
            const freshToken = await currentUser.getIdToken(true);
            stompClient.connectHeaders = {
              'Authorization': `Bearer ${freshToken}`,
            };
          } catch (err) {
            console.error("Failed to refresh token before WebSocket connect", err);
          }
        };

        stompClient.onConnect = () => {
          if (!isMounted) return;
          console.log("WebSocket connected! Subscribing to topics...");

          // 1. Subscribe to the user's private notification channel
          stompClient.subscribe(`/topic/notifications/${currentUser.uid}`, (message) => {
            handleIncomingNotification(message);
          });

          // 2. Subscribe to general system broadcasts
          stompClient.subscribe('/topic/broadcasts/ALL', (message) => {
            handleIncomingNotification(message);
          });

          // 3. Subscribe to role-specific topics (e.g., /topic/broadcasts/ADMIN)
          if (userRole) {
            const roleTopic = `/topic/broadcasts/${userRole.toUpperCase()}`;
            console.log(`Subscribing to role topic: ${roleTopic}`);
            stompClient.subscribe(roleTopic, (message) => {
              handleIncomingNotification(message);
            });
          }
        };

        stompClient.onStompError = (frame) => {
          console.error('STOMP Broker error: ' + frame.headers['message']);
        };

        stompClient.onWebSocketClose = () => {
          if (isMounted) console.log("WebSocket connection closed.");
        };

        /**
         * Processes messages received fromsubscribed WebSocket channels.
         */
        const handleIncomingNotification = (message: any) => {
          if (message.body) {
            try {
              const rawNotification = JSON.parse(message.body);
              const newNotification: Notification = {
                ...rawNotification,
                isRead: rawNotification.read !== undefined ? rawNotification.read : rawNotification.isRead
              };

              if (isMounted) {
                // Update local state and avoid duplicate IDs
                setNotifications(prev => {
                  if (prev.some(n => n.id === newNotification.id)) return prev;
                  return [newNotification, ...prev];
                });

                // Display a visual pop-up alert
                toast.success(newNotification.message, {
                  duration: 5000,
                  position: 'top-right',
                  style: { fontWeight: 'bold' }
                });

                // Play an audible alert sound
                const audio = new Audio('/notification-sound.mp3');
                audio.play().catch(e => console.error("Error playing notification sound:", e));
              }
            } catch (err) {
              console.error("Error parsing incoming message:", err);
            }
          }
        };

        client = stompClient;
        stompClient.activate(); // Turn on the WebSocket client

      } catch (e) {
        console.error("Failed to initialize WebSocket", e);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (client) {
        console.log("Deactivating WebSocket client...");
        client.deactivate(); // Ensure resources are cleaned up on unmount
      }
    };
  }, [currentUser, userRole]);

  /**
   * API Handlers for notification actions (Read, Delete, Mark All).
   */
  const markAsRead = async (id: string) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${notifyUrl}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (e) { console.error(e); }
  };

  const deleteNotification = async (id: string) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${notifyUrl}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) { console.error(e); }
  }

  const markAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${notifyUrl}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

