import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export const pct = (v: number | null | undefined, dec = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(dec)}%`;
export const num = (v: number | null | undefined, dec = 3) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(dec);
export const miles = (v: number) => v.toLocaleString('es-PE');

export const Card: React.FC<{ title?: string; subtitle?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }> = ({
  title, subtitle, children, className = '', actions,
}) => (
  <section className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs ${className}`}>
    {(title || actions) && (
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          {title && <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </section>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'default' | 'blue' | 'emerald' | 'amber' | 'red' }> = ({
  label, value, hint, tone = 'default',
}) => {
  const color = {
    default: 'text-slate-900 dark:text-white',
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }[tone];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={`text-2xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
};

export const Aviso: React.FC<{ tipo?: 'alerta' | 'info'; title: string; children?: React.ReactNode }> = ({ tipo = 'info', title, children }) => (
  <div className={`rounded-xl border p-4 text-xs flex gap-3 ${
    tipo === 'alerta'
      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
  }`}>
    {tipo === 'alerta' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
    <div className="space-y-1.5 leading-relaxed">
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  </div>
);

export const Tabla: React.FC<{ columnas: string[]; filas: React.ReactNode[][]; maxH?: string }> = ({ columnas, filas, maxH = 'max-h-96' }) => (
  <div className={`overflow-auto ${maxH} rounded-lg border border-slate-200 dark:border-slate-800`}>
    <table className="w-full text-xs">
      <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
        <tr>
          {columnas.map(c => (
            <th key={c} className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2 whitespace-nowrap">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {filas.map((f, i) => (
          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            {f.map((c, j) => (
              <td key={j} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Comando: React.FC<{ children: string }> = ({ children }) => (
  <pre className="bg-slate-900 text-slate-100 text-[11px] rounded-lg p-3 overflow-x-auto font-mono">{children}</pre>
);

export const NavPasos: React.FC<{ onPrev?: () => void; onNext?: () => void; nextLabel?: string }> = ({ onPrev, onNext, nextLabel }) => (
  <div className="flex items-center justify-between gap-3">
    {onPrev ? (
      <button onClick={onPrev} className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
        ← Anterior
      </button>
    ) : <span />}
    {onNext && (
      <button onClick={onNext} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer">
        {nextLabel ?? 'Siguiente'} →
      </button>
    )}
  </div>
);
