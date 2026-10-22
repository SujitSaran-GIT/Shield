import { createContext, useContext } from 'react';
import type { Client, StompSubscription } from '@stomp/stompjs';
export interface WebSocketState {
  isConnected: boolean;
  send: (destination: string, body: unknown) => boolean;
  subscribe: (destination: string, callback: (data: unknown) => void) => StompSubscription | null;
  unsubscribe: (destination: string) => void;
  stompClient: Client | null;
  reconnect: () => void;
}
export const WebSocketContext = createContext<WebSocketState | undefined>(undefined);
export function useWebSocket() {
  const context=useContext(WebSocketContext);
  if(!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
}
