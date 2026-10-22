import { createElement } from 'react';
import { KeyRound, LogIn, LogOut, ShieldAlert, UserRound, Activity } from 'lucide-react';
export const eventTitle = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
export const eventTone = (status: number | null) => status !== null && status >= 400 ? 'failure' : status !== null && status >= 200 && status < 300 ? 'success' : 'neutral';
export const eventIcon = (type: string) => /FAILED|INVALID|ERROR|EXCEEDED|DETECTED|SUSPICIOUS/.test(type) ? ShieldAlert : type.includes('LOGIN') ? LogIn : type.includes('LOGOUT') ? LogOut : type.includes('TOKEN') ? KeyRound : /USER|ADMIN/.test(type) ? UserRound : Activity;
export const eventStatus = (status: number | null) => status === null ? 'No status' : status >= 400 ? 'Failed' : status >= 200 && status < 300 ? 'Success' : 'Other';


export const eventGraphic = (type: string, size = 19) => createElement(eventIcon(type), { size });

