import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom React hook for WebSocket connections
 * 
 * @param {string} url - WebSocket URL
 * @param {object} options - Configuration options
 * @param {boolean} options.enabled - Whether to connect (default: true)
 * @param {number} options.reconnectInterval - Reconnection interval in ms (default: 3000)
 * @param {number} options.maxReconnectAttempts - Max reconnection attempts (default: 10)
 * @param {function} options.onMessage - Callback for messages
 * @param {function} options.onOpen - Callback for connection open
 * @param {function} options.onClose - Callback for connection close
 * @param {function} options.onError - Callback for errors
 * @returns {object} WebSocket state and methods
 */
export const useWebSocket = (url, options = {}) => {
  const {
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`WebSocket connected: ${url}`);
        setIsConnected(true);
        setReconnectAttempts(0);
        if (onOpen) onOpen();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected: ${url}`);
        setIsConnected(false);
        wsRef.current = null;
        if (onClose) onClose();

        // Attempt reconnection
        if (shouldReconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttempts + 1})`);
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      if (onError) onError(error);
    }
  }, [url, enabled, reconnectAttempts, maxReconnectAttempts, reconnectInterval, onMessage, onOpen, onClose, onError]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }, []);

  useEffect(() => {
    if (enabled) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, url]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};
