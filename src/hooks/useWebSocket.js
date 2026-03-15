import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (url, options = {}) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const activeUrlRef = useRef(null); // tracks which URL should be connected right now

  const [isConnected, setIsConnected] = useState(false);

  const disconnect = useCallback(() => {
    activeUrlRef.current = null;
    clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback((connectUrl) => {
    if (!connectUrl) return;

    clearTimeout(reconnectTimeoutRef.current);

    const ws = new WebSocket(connectUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (activeUrlRef.current !== connectUrl) return;
      console.log(`WebSocket connected: ${connectUrl}`);
      setIsConnected(true);
      optionsRef.current.onOpen?.();
    };

    ws.onmessage = (event) => {
      if (activeUrlRef.current !== connectUrl) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onMessage?.(data);
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected: ${connectUrl}`);
      setIsConnected(false);
      optionsRef.current.onClose?.();

      // Only reconnect if this URL is still the active one
      if (activeUrlRef.current === connectUrl) {
        const { reconnectInterval = 3000, maxReconnectAttempts = 10 } = optionsRef.current;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (activeUrlRef.current === connectUrl) {
            console.log(`Reconnecting to ${connectUrl}...`);
            connect(connectUrl);
          }
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      optionsRef.current.onError?.(error);
    };
  }, []);

  useEffect(() => {
    const enabled = options.enabled !== false;
    if (enabled && url) {
      activeUrlRef.current = url;
      connect(url);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [url, options.enabled]);

  return { isConnected, disconnect };
};
