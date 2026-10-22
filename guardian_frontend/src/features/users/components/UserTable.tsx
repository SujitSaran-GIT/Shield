import type { ReactNode } from 'react';
import { Eye, UserCheck, UserX, Trash2 } from 'lucide-react';
import type { User } from '../../../types';
import { canManageAdministrator } from '../adminManagement';

export interface UserColumn { key: string; label: string; width?: string; render?: (user: User) => ReactNode }
interface Props {
  columns: UserColumn[]; data: User[]; selectedRows: string[];
  onRowSelect: (id: string, checked: boolean) => void; onSelectAll: (checked: boolean) => void;
  onRowClick: (user: User) => void; onStatusChange: (id: string, action: 'block' | 'unblock' | 'delete') => void;
  loading: boolean; canManage?: boolean;
  actor?: User | null; onManageAdministrator?: (user: User) => void;
}
export default function UserTable({columns,data,selectedRows,onRowSelect,onSelectAll,onRowClick,onStatusChange,loading,canManage=false,actor=null,onManageAdministrator}: Props) {
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead><tr>
      <th className="px-4 py-3"><input type="checkbox" aria-label="Select all users on this page" checked={data.length>0 && data.every(user=>selectedRows.includes(user.id))} onChange={e=>onSelectAll(e.target.checked)} /></th>
      {columns.map(column=><th key={column.key} scope="col" className="px-4 py-3 text-left text-xs uppercase" style={{width:column.width}}>{column.label}</th>)}
      <th scope="col" className="px-4 py-3 text-left text-xs uppercase">Actions</th>
    </tr></thead>
    <tbody>{data.map(user=><tr key={user.id} className="border-t border-gray-100 dark:border-gray-800">
      <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${user.username}`} checked={selectedRows.includes(user.id)} onChange={e=>onRowSelect(user.id,e.target.checked)} /></td>
      {columns.map(column=><td key={column.key} className="px-4 py-3 text-sm">{column.render ? column.render(user) : String(user[column.key as keyof User] ?? '')}</td>)}
      <td className="px-4 py-3"><div className="flex gap-1">
        <button className="icon-button" aria-label={`View ${user.username}`} onClick={()=>onRowClick(user)}><Eye size={17}/></button>
        {onManageAdministrator && canManageAdministrator(actor,user) && <button className="text-button whitespace-nowrap" aria-label={`Manage administrator ${user.username}`} onClick={()=>onManageAdministrator(user)}>Manage administrator</button>}
        {canManage && user.role==='USER' && user.status!=='DELETED' && <>
          <button className="icon-button" aria-label={`${user.status==='ACTIVE'?'Block':'Unblock'} ${user.username}`} onClick={()=>onStatusChange(user.id,user.status==='ACTIVE'?'block':'unblock')}>{user.status==='ACTIVE'?<UserX size={17}/>:<UserCheck size={17}/>}</button>
          <button className="icon-button" aria-label={`Delete ${user.username}`} onClick={()=>onStatusChange(user.id,'delete')}><Trash2 size={17}/></button>
        </>}
      </div></td>
    </tr>)}</tbody>
  </table>{data.length===0 && !loading && <p className="p-8 text-center text-gray-500">No users match these filters.</p>}</div>;
}
