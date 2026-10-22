import { useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
interface HeadingProps { title: string; description?: string; icon?: ReactNode; actions?: ReactNode }
export function PageHeader({ title, description, icon, actions }: HeadingProps) {
  return <div className="page-heading"><div>{icon}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions}</div>;
}
interface Option { value: string; label: ReactNode; icon?: ReactNode; disabled?: boolean }
export function Tabs({ value, onChange, options, className = '' }: { value: string; onChange: (value: string) => void; options: Option[]; variant?: string; className?: string }) {
  return <div className={`flex flex-wrap gap-2 border-b border-gray-200 pb-3 ${className}`} aria-label="View options">{options.map((option) => <button key={option.value} type="button" disabled={option.disabled} aria-pressed={value === option.value} className={value === option.value ? 'primary-button' : 'secondary-button'} onClick={() => onChange(option.value)}>{option.icon}{option.label}</button>)}</div>;
}
export function EmptyState({ title, description, icon, actions }: HeadingProps) { return <div className="empty-panel">{icon}<h2>{title}</h2>{description && <p>{description}</p>}{actions}</div>; }
export function LoadingOverlay({ message = 'Loading…' }: { message?: string }) { return <div className="page-loading" role="status" aria-live="polite">{message}</div>; }
export function CodeBlock({ code, language }: { code: string; language?: string; showLineNumbers?: boolean; maxHeight?: string }) { return <pre className="overflow-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100" aria-label={language ? `${language} code` : 'Code'}><code>{code}</code></pre>; }
export function DropdownMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return <details ref={ref} className="relative" onKeyDown={(event) => { if (event.key === 'Escape' && ref.current) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } }}><summary className="list-none cursor-pointer" aria-label="More actions">{trigger}</summary><div className="absolute right-0 z-50 min-w-48 rounded-lg border bg-white p-2 shadow-lg dark:bg-gray-800" onClick={() => { if (ref.current) ref.current.open = false; }}>{children}</div></details>;
}
export function DropdownItem({ icon, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) { return <button type="button" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700" {...props}>{icon}{children}</button>; }
export function Select({ value, onChange, options, icon, className = '', label = 'Select option' }: { value: string; onChange: (value: string) => void; options: Option[]; icon?: ReactNode; className?: string; label?: string }) {
  const id = useId();
  return <label htmlFor={id} className={`flex items-center gap-2 ${className}`}>{icon}<span className="sr-only">{label}</span><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="secondary-button w-full">{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></label>;
}
