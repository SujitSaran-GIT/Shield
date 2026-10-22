import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { fetchClientDetails } from '../clientsSlice';
import { Modal, Button, LoadingSpinner, Tabs } from '../../../components';
import { errorMessage } from '../../../api/axiosConfig';
import type { Client } from '../../../types';

export default function ClientDetailsModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [result, setResult] = useState<{ id: string; client?: Client; error?: string } | null>(null);
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  useEffect(() => {
    let current = true;
    void dispatch(fetchClientDetails(clientId)).unwrap().then((client: Client) => {
      if (current) setResult({ id: clientId, client });
    }).catch((failure: unknown) => { if (current) setResult({ id: clientId, error: errorMessage(failure) }); });
    return () => { current = false; };
  }, [clientId, dispatch]);
  const client = result?.id === clientId ? result.client : undefined;
  const download = () => {
    if (!client) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(client, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `client-${client.clientId}.json`; link.click(); URL.revokeObjectURL(url);
  };
  const copy = async () => {
    if (!client) return;
    try { await navigator.clipboard.writeText(client.clientId); setCopied(true); setCopyError(''); window.setTimeout(() => setCopied(false), 2000); }
    catch (failure: unknown) { setCopyError(errorMessage(failure)); }
  };
  return <Modal isOpen onClose={onClose} size="xl" title={client?.name || 'Client details'}>
    {result?.id === clientId && result.error ? <p role="alert" className="form-error">{result.error}</p> : !client ? <LoadingSpinner text="Loading client details..." /> : <div className="space-y-6">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'security', label: 'Security' }, { value: 'activity', label: 'Activity' }, { value: 'config', label: 'Configuration' }]} />
      {tab === 'overview' && <dl className="definition-list"><div><dt>Client ID</dt><dd>{client.clientId}</dd></div><div><dt>Description</dt><dd>{client.description || 'No description'}</dd></div><div><dt>Status</dt><dd>{client.status}</dd></div><div><dt>Created</dt><dd>{new Date(client.createdAt).toLocaleString()}</dd></div><div><dt>Users</dt><dd>{client.userCount ?? 'Unavailable'}</dd></div></dl>}
      {tab === 'security' && <div><h3>Allowed origins</h3>{client.allowedOrigins?.length ? <ul className="list-disc pl-5 mt-3">{client.allowedOrigins.map((origin) => <li key={origin}>{origin}</li>)}</ul> : <p>No origins configured.</p>}<p className="mt-4">Idle timeout: {client.idleTimeout} minutes</p><p className="text-muted mt-4">Client credentials are shown once during provisioning. Keep the client key on your application server.</p></div>}
      {tab === 'activity' && <p className="text-muted">Client session history is unavailable in this view. Open Audit logs and filter by this client to inspect recorded authentication activity.</p>}
      {tab === 'config' && <pre className="overflow-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100"><code>{JSON.stringify({ clientId: client.clientId, name: client.name, allowedOrigins: client.allowedOrigins, idleTimeout: client.idleTimeout }, null, 2)}</code></pre>}
      {copyError && <p role="alert" className="form-error">{copyError}</p>}
      <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => { void copy(); }}>{copied ? 'Copied' : 'Copy client ID'}</Button><Button variant="outline" onClick={download}>Download configuration</Button><Button onClick={onClose}>Close</Button></div>
    </div>}
  </Modal>;
}
