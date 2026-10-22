import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { auditApi } from '../../api';
import { auditError } from './auditRequests';
import type { AuditRecord, AuditKPIsData, AuditFiltersState, AuditPage, AuditQuery } from './auditTypes';
export type { AuditRecord, AuditKPIsData, AuditFiltersState } from './auditTypes';
import { exportCsv } from '../../utils/export';

export interface AuditPagination {currentPage:number;totalPages:number;totalElements:number;pageSize:number}
interface AuditState {audits:AuditRecord[];recentLogs:AuditRecord[];kpis:AuditKPIsData|null;selectedAudit:AuditRecord|null;loading:boolean;loadingKPIs:boolean;loadingDetails:boolean;loadingRecent:boolean;exporting:boolean;error:string|null;kpiError:string|null;recentError:string|null;detailError:string|null;pagination:AuditPagination;filters:AuditFiltersState;eventTypeStats:Record<string,number>;requestId?:string;kpiRequestId?:string;recentRequestId?:string;detailRequestId?:string}
export const AUDIT_EVENT_TYPES=Object.fromEntries(['LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT_SUCCESS','USER_REGISTRATION_SUCCESS','USER_REGISTRATION_FAILED','CLIENT_REGISTRATION_SUCCESS','CLIENT_REGISTRATION_FAILED','TOKEN_ISSUED','TOKEN_REFRESHED','TOKEN_EXPIRED','TOKEN_INVALID','RATE_LIMIT_EXCEEDED','CLIENT_AUTH_FAILED','CLIENT_AUTH_SUCCESS','BRUTE_FORCE_DETECTED','SUSPICIOUS_ACTIVITY','ADMIN_CREATED','ADMIN_UPDATED','ADMIN_DEACTIVATED','SYSTEM_ERROR','DATABASE_ERROR'].map(type=>[type,type]));
const defaults:AuditFiltersState={eventType:'',clientId:'',ipAddress:'',startDate:null,endDate:null,sortBy:'createdAt',sortDir:'DESC'};
export const fetchAudits=createAsyncThunk<AuditPage,AuditQuery|undefined,{rejectValue:string}>('audit/fetchAudits',async(params,{rejectWithValue,signal})=>{
 try{return (await auditApi.getAllAudits(params||{},signal)).data;}catch(error){return rejectWithValue(auditError(error));}
});
export const fetchFilteredAudits=createAsyncThunk<AuditPage,AuditQuery,{rejectValue:string}>('audit/fetchFilteredAudits',async(filters,{rejectWithValue,signal})=>{
 try{return (await auditApi.getFilteredAudits(filters,signal)).data;}catch(error){return rejectWithValue(auditError(error));}
});
export const fetchAuditKPIs=createAsyncThunk<AuditKPIsData,void,{rejectValue:string}>('audit/fetchAuditKPIs',async(_,{rejectWithValue,signal})=>{
 try{return (await auditApi.getAuditKPIs(signal)).data;}catch(error){return rejectWithValue(auditError(error));}
});
export const fetchRecentLogs=createAsyncThunk<AuditRecord[],number|undefined,{rejectValue:string}>('audit/fetchRecentLogs',async(days=7,{rejectWithValue,signal})=>{
 try{return (await auditApi.getRecentLogs(days,signal)).data;}catch(error){return rejectWithValue(auditError(error));}
});
export const fetchAuditDetails=createAsyncThunk<AuditRecord,string,{rejectValue:string}>('audit/fetchAuditDetails',async(id,{rejectWithValue,signal})=>{
 try{return (await auditApi.getAuditDetails(id,signal)).data;}catch(error){return rejectWithValue(auditError(error));}
});
export const exportAudits=createAsyncThunk<void,{ids?:string[];format?:string}|undefined,{state:{audit:AuditState};rejectValue:string}>('audit/exportAudits',async(params,{getState,rejectWithValue})=>{
 try{
  const records=getState().audit.audits.filter(item=>!params?.ids || params.ids.includes(item.id));
  if(params?.format==='json'){
   const url=URL.createObjectURL(new Blob([JSON.stringify(records,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='shield-audits-current-page.json';link.click();URL.revokeObjectURL(url);
  }else exportCsv('shield-audits-current-page.csv',records.map(item=>({...item})));
 }catch(error){return rejectWithValue(auditError(error));}
});
const initialState:AuditState={audits:[],recentLogs:[],kpis:null,selectedAudit:null,loading:false,loadingKPIs:false,loadingDetails:false,loadingRecent:false,exporting:false,error:null,kpiError:null,recentError:null,detailError:null,pagination:{currentPage:0,totalPages:0,totalElements:0,pageSize:20},filters:{...defaults},eventTypeStats:{}};
const auditSlice=createSlice({name:'audit',initialState,reducers:{
 clearAuditError:state=>{state.error=null;},
 setFilters:(state,action:PayloadAction<Partial<AuditFiltersState>>)=>{state.filters={...state.filters,...action.payload};state.pagination.currentPage=0;},
 clearFilters:state=>{state.filters={...defaults};state.pagination.currentPage=0;},
 setSelectedAudit:(state,action:PayloadAction<AuditRecord>)=>{state.selectedAudit=action.payload;},
 clearSelectedAudit:state=>{state.selectedAudit=null;state.detailError=null;state.detailRequestId=undefined;state.loadingDetails=false;},
 updateEventTypeStats:(state,action:PayloadAction<Record<string,number>>)=>{state.eventTypeStats=action.payload;},
 resetAudit:()=>({...initialState,filters:{...defaults}}),
 },extraReducers:builder=>{
  for(const operation of [fetchAudits,fetchFilteredAudits])builder.addCase(operation.pending,(state,action)=>{state.loading=true;state.error=null;state.requestId=action.meta.requestId;state.audits=[];})
   .addCase(operation.fulfilled,(state,action)=>{if(state.requestId!==action.meta.requestId)return;state.loading=false;state.audits=action.payload.content;state.pagination={currentPage:action.payload.number,totalPages:action.payload.totalPages,totalElements:action.payload.totalElements,pageSize:action.payload.size};})
   .addCase(operation.rejected,(state,action)=>{if(state.requestId!==action.meta.requestId)return;state.loading=false;if(!action.meta.aborted)state.error=action.payload||'Unable to load audit events';});
  builder.addCase(fetchAuditKPIs.pending,(state,action)=>{state.loadingKPIs=true;state.kpiError=null;state.kpis=null;state.kpiRequestId=action.meta.requestId;})
   .addCase(fetchAuditKPIs.fulfilled,(state,action)=>{if(state.kpiRequestId!==action.meta.requestId)return;state.loadingKPIs=false;state.kpis=action.payload;})
   .addCase(fetchAuditKPIs.rejected,(state,action)=>{if(state.kpiRequestId!==action.meta.requestId)return;state.loadingKPIs=false;state.kpis=null;if(!action.meta.aborted)state.kpiError=action.payload||'Metrics unavailable';})
   .addCase(fetchRecentLogs.pending,(state,action)=>{state.loadingRecent=true;state.recentError=null;state.recentLogs=[];state.recentRequestId=action.meta.requestId;})
   .addCase(fetchRecentLogs.fulfilled,(state,action)=>{if(state.recentRequestId!==action.meta.requestId)return;state.loadingRecent=false;state.recentLogs=action.payload;})
   .addCase(fetchRecentLogs.rejected,(state,action)=>{if(state.recentRequestId!==action.meta.requestId)return;state.loadingRecent=false;state.recentLogs=[];if(!action.meta.aborted)state.recentError=action.payload||'Timeline unavailable';})
   .addCase(fetchAuditDetails.pending,(state,action)=>{state.loadingDetails=true;state.selectedAudit=null;state.detailError=null;state.detailRequestId=action.meta.requestId;})
   .addCase(fetchAuditDetails.fulfilled,(state,action)=>{if(state.detailRequestId!==action.meta.requestId)return;state.loadingDetails=false;state.selectedAudit=action.payload;})
   .addCase(fetchAuditDetails.rejected,(state,action)=>{if(state.detailRequestId!==action.meta.requestId)return;state.loadingDetails=false;if(!action.meta.aborted)state.detailError=action.payload||'Event unavailable';})
   .addCase(exportAudits.pending,state=>{state.exporting=true;})
   .addCase(exportAudits.fulfilled,state=>{state.exporting=false;})
   .addCase(exportAudits.rejected,(state,action)=>{state.exporting=false;state.error=action.payload||'Export failed';});
 }});
export const {clearAuditError,setFilters,clearFilters,setSelectedAudit,clearSelectedAudit,updateEventTypeStats,resetAudit}=auditSlice.actions;
export default auditSlice.reducer;
