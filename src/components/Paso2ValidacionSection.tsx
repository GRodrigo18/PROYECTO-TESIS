import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NotaEstandar, ResultadoAuditoria } from '../types';
import { ETIQUETA_NOTA, riesgoObservado } from '../utils/validacion';
import { descargarCsv } from '../utils/exportar';
import { Aviso, Card, NavPasos, Tabla, miles, pct } from './ui';

interface Props {
  auditoria: ResultadoAuditoria;
  onPrevStep: () => void;
  onNextStep: () => void;
}

const BotonCsv: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
    <Download className="w-3 h-3" />{label}
  </button>
);

const ListaConteo: React.FC<{ datos: Record<string, number>; total?: number }> = ({ datos, total }) => {
  const max = Math.max(1, ...Object.values(datos));
  return (
    <ul className="space-y-1.5 text-xs">
      {Object.entries(datos).map(([k, v]) => (
        <li key={k}>
          <div className="flex justify-between gap-2">
            <span className="text-slate-700 dark:text-slate-300 truncate" title={k}>{k}</span>
            <span className="font-mono text-slate-500">{miles(v)}{total ? ` · ${pct(v / total)}` : ''}</span>
          </div>
          <div className="h-1.5 rounded bg-slate-100 dark:bg-slate-800 mt-0.5">
            <div className="h-1.5 rounded bg-blue-500" style={{ width: `${(100 * v) / max}%` }} />
          </div>
        </li>
      ))}
      {Object.keys(datos).length === 0 && <li className="text-slate-400">Sin registros</li>}
    </ul>
  );
};

export const Paso2ValidacionSection: React.FC<Props> = ({ auditoria, onPrevStep, onNextStep }) => {
  const { perfil: p, validos, excluidos, revisar } = auditoria;

  const distribucion = useMemo(() => {
    const c: Record<NotaEstandar, number> = { 3: 0, 2: 0, 1: 0, 0: 0 };
    for (const r of validos) for (const v of Object.values(r.notas)) c[v]++;
    const total = c[0] + c[1] + c[2] + c[3];
    return ([3, 2, 1, 0] as NotaEstandar[]).map(k => ({ nota: ETIQUETA_NOTA[k], cantidad: c[k], porcentaje: total ? c[k] / total : 0 }));
  }, [validos]);

  const riesgo = useMemo(() => {
    const porAnio: Record<string, { n: number; r: number }> = {};
    const porSede: Record<string, { n: number; r: number }> = {};
    for (const reg of validos) {
      const y = riesgoObservado(reg, p.formato_detectado);
      if (y === null) continue;
      const a = (porAnio[reg.anio] ??= { n: 0, r: 0 });
      const s = (porSede[reg.sede] ??= { n: 0, r: 0 });
      a.n++; s.n++; a.r += y; s.r += y;
    }
    return { porAnio, porSede };
  }, [validos, p.formato_detectado]);

  const anios = Object.keys(p.validos_por_anio).concat(Object.keys(p.excluidos_por_anio))
    .filter((v, i, arr) => arr.indexOf(v) === i).sort();

  return (
    <div className="space-y-6 tab-content-enter">
      <Card>
        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">PASO 2 · VALIDACIÓN, ESTANDARIZACIÓN Y EXCLUSIÓN</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {miles(p.total_validos)} válidos · {miles(p.total_excluidos)} excluidos ({p.porcentaje_excluidos}%)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-3xl">
          Todas las cifras se calculan sobre este archivo. Escala MINEDU: AD 18-20 · A 14-17 · B 11-13 · C 0-10.
          Un número 0-3 en un año registrado mayoritariamente en letras se marca como sospechoso (probable «2» por «A») y no se usa.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <BotonCsv label="registros_excluidos.csv" disabled={!excluidos.length} onClick={() => descargarCsv('registros_excluidos.csv', excluidos as any)} />
          <BotonCsv label="valores_a_revisar.csv" disabled={!revisar.length} onClick={() => descargarCsv('valores_a_revisar.csv', revisar as any)} />
          <BotonCsv label="dataset_validado.csv" disabled={!validos.length}
            onClick={() => descargarCsv('dataset_validado.csv', validos.map(({ notas, ...r }) => ({ ...r, ...notas })))} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Motivos de exclusión" subtitle="Un registro puede tener varios motivos">
          <ListaConteo datos={p.motivos_exclusion} />
        </Card>
        <Card title="Excluidos por sede" subtitle="Sede tal como venía en el archivo">
          <ListaConteo datos={p.excluidos_por_sede} total={p.total_excluidos} />
        </Card>
        <Card title="Válidos por sede">
          <ListaConteo datos={p.validos_por_sede} total={p.total_validos} />
          {p.sexo_no_registrado > 0 && (
            <p className="text-[11px] text-amber-600 mt-3">{miles(p.sexo_no_registrado)} válidos sin sexo registrado (quedan como «No registrado»).</p>
          )}
        </Card>
      </div>

      <Card title="Totales por año" subtitle="Escala predominante y riesgo observado (algún curso en C en la nota de cierre)">
        <Tabla
          columnas={['Año', 'Escala', 'Válidos', 'Excluidos', 'Con riesgo observado', 'Tasa']}
          filas={anios.map(a => {
            const r = riesgo.porAnio[a];
            return [
              a,
              p.escala_literal_por_anio[a] === undefined ? '—' : p.escala_literal_por_anio[a] ? 'Literal' : 'Vigesimal',
              miles(p.validos_por_anio[a] ?? 0),
              miles(p.excluidos_por_anio[a] ?? 0),
              r ? miles(r.r) : a === '2026' ? 'sin cierre' : '—',
              r ? pct(r.r / r.n) : '—',
            ];
          })}
        />
        <p className="text-[11px] text-slate-400 mt-2">
          Es una descripción de los datos, no una predicción. 2026 no tiene nota de cierre, así que su riesgo aún no se conoce.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Distribución de notas estandarizadas" subtitle="Todas las notas de los registros válidos">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribucion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                <XAxis dataKey="nota" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any, _n: any, item: any) => [`${miles(v)} (${pct(item.payload.porcentaje)})`, 'Notas']} />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Riesgo observado por sede" subtitle="Años con nota de cierre">
          <Tabla
            columnas={['Sede', 'Registros', 'Con riesgo', 'Tasa']}
            filas={Object.entries(riesgo.porSede).sort((a, b) => b[1].r / b[1].n - a[1].r / a[1].n)
              .map(([s, v]) => [s, miles(v.n), miles(v.r), pct(v.r / v.n)])}
          />
        </Card>
      </div>

      <Card title="Registros excluidos" subtitle={excluidos.length > 500 ? `Primeros 500 de ${miles(excluidos.length)}; descarga el CSV para verlos todos` : undefined}>
        {excluidos.length ? (
          <Tabla columnas={['Fila Excel', 'ID', 'Año', 'Sede', 'Motivos']}
            filas={excluidos.slice(0, 500).map(e => [e.fila_excel, e.ID_Estudiante || '—', e.anio ?? '—', e.sede, e.motivos])} />
        ) : <Aviso title="No se excluyó ningún registro." />}
      </Card>

      <NavPasos onPrev={onPrevStep} onNext={onNextStep} nextLabel="Paso 3: Modelo y métricas" />
    </div>
  );
};
