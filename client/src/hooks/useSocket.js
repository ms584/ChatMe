import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

/**
 * Custom hook to manage a Socket.io connection with JWT auth.
 * Uses refs for callbacks so closures are always fresh — avoids stale selectedUser etc.
 */
const useSocket = (token, onNewMessage, onTyping) => {
  const socketRef = useRef(null);

  // Always-fresh refs for callbacks
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingRef = useRef(onTyping);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    if (import.meta.env.DEV) {
      socket.on('connect', () => console.log('🔌 Socket connected'));
      socket.on('connect_error', (err) => console.error('Socket error:', err.message));
    }

    // Wrapper listeners — always call the latest callback via ref
    socket.on('new_message', (msg) => onNewMessageRef.current?.(msg));
    socket.on('user_typing', (data) => onTypingRef.current?.(data));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]); // Only reconnect when token changes

  const sendMessage = useCallback((content, receiverId = null) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { content, receiverId });
    }
  }, []);

  const sendTyping = useCallback((receiverId, isTyping) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { receiverId, isTyping });
    }
  }, []);

  return { sendMessage, sendTyping, socket: socketRef };
};

export default useSocket;
