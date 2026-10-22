import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAccessToken } from '../api/session';
import { useAppSelector } from './hooks';
import { WebSocketContext } from './webSocketState';

export function WebSocketProvider({children}:{children:ReactNode}) {
  const subscriptions=useRef(new Map<string,StompSubscription>());
  const clientRef=useRef<Client|null>(null);
  const [client,setClient]=useState<Client|null>(null);
  const [isConnected,setConnected]=useState(false);
  const {isAuthenticated,user}=useAppSelector(state=>state.auth);
  const userId=user?.id;
  const role=user?.role;
  const send=useCallback((destination:string,body:unknown)=>{
    if(!clientRef.current?.connected) return false;
    clientRef.current.publish({destination,body:JSON.stringify(body)});return true;
  },[]);
  const subscribe=useCallback((destination:string,callback:(data:unknown)=>void)=>{
    if(!clientRef.current?.connected) return null;
    subscriptions.current.get(destination)?.unsubscribe();
    const subscription=clientRef.current.subscribe(destination,message=>{
      let data:unknown=message.body;
      try{data=JSON.parse(message.body);}catch{/* Plain text events are supported. */}
      callback(data);
    });
    subscriptions.current.set(destination,subscription);return subscription;
  },[]);
  const unsubscribe=useCallback((destination:string)=>{
    subscriptions.current.get(destination)?.unsubscribe();subscriptions.current.delete(destination);
  },[]);
  const reconnect=useCallback(()=>{
    const current=clientRef.current;
    if(current && !current.connected) void current.activate();
  },[]);
  useEffect(()=>{
    if(!isAuthenticated || !userId || !role || !['SUPER_ADMIN','GUARDIAN_ADMIN'].includes(role)) return;
    const current=new Client({webSocketFactory:()=>new SockJS(import.meta.env.VITE_WS_URL || '/ws'),
      reconnectDelay:5000,heartbeatIncoming:4000,heartbeatOutgoing:4000,debug:()=>{}});
    const activeSubscriptions=subscriptions.current;
    current.beforeConnect=async()=>{
      const token=getAccessToken();
      // Read the current in-memory credential on every retry after token rotation.
      current.connectHeaders=token?{Authorization:`Bearer ${token}`} : {};
      if(!token) await current.deactivate();
    };
    current.onConnect=()=>{setConnected(true);setClient(current);};
    current.onDisconnect=()=>{setConnected(false);setClient(null);};
    current.onWebSocketClose=()=>{setConnected(false);activeSubscriptions.clear();};
    current.onStompError=()=>{setConnected(false);};
    clientRef.current=current;
    void current.activate();
    return ()=>{
      clientRef.current=null;activeSubscriptions.clear();
      void current.deactivate();
    };
  },[isAuthenticated,userId,role]);
  return <WebSocketContext.Provider value={{isConnected,send,subscribe,unsubscribe,stompClient:client,reconnect}}>{children}</WebSocketContext.Provider>;
}
