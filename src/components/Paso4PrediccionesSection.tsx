import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { ResultadosPipeline } from '../types';
import { descargarCsv } from '../utils/exportar';
import { Aviso, Card, NavPasos, Stat, Tabla, miles, num, pct } from './ui';

interface Props {
  resultados: ResultadosPipeline | null;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export const Paso4PrediccionesSection: React.FC<Props> = ({ resultados, onPrevStep, onNextStep }) => {
  const preds = resultados?.predicciones_2026 ?? [];
  const [sede, setSede] = useState('Todas');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const sedes = useMemo(() => Array.from(new Set(preds.map(p => p.sede))).sort(), [preds]);
  const porSede = useMemo(() => {
    const o: Record<string, { n: number; a: number }> = {};
    for (const p of preds) {
      const s = (o[p.sede] ??= { n: 0, a: 0 });
      s.n++;
      s.a += p.alerta_riesgo;
    }
    return o;
  }, [preds]);
  const filtradas = preds.filter(p =>
    (sede === 'Todas' || p.sede === sede) && (!soloAlertas || p.alerta_riesgo === 1) &&
    (!busqueda || p.ID_Estudiante.toLowerCase().includes(busqueda.toLowerCase())));
  const alertas = preds.filter(p => p.alerta_riesgo === 1).length;
  const umbral = resultados?.informe?.umbral.valor;

  return (
    <div className="space-y-6 tab-content-enter">
      <Card>
        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-2">PASO 4 · ALERTAS TEMPRANAS 2026</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Predicciones del modelo final para 2026</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-3xl">
          Salen de <code>tesis-rf/resultados/predicciones_2026.csv</code>: probabilidad del bosque reentrenado con 2020-2025 y votos reales de sus árboles.
          2026 aún no tiene nota de cierre, así que aquí <strong>no hay métricas</strong>: se podrán calcular cuando cierre el año.
        </p>
      </Card>

      {!preds.length ? (
        <Aviso title="Todavía no hay predicciones 2026">
          <p>Se generan al ejecutar <code>pipeline_rf_tesis.py</code> con un Excel por bimestre que incluya registros de 2026 (ver Paso 3).</p>
        </Aviso>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Estudiantes 2026" value={miles(preds.length)} />
            <Stat label="Con alerta" value={miles(alertas)} tone="red" hint={pct(alertas / preds.length)} />
            <Stat label="Umbral" value={num(umbral)} tone="amber" hint={resultados?.informe?.umbral.criterio} />
            <Stat label="Árboles" value={preds[0].total_arboles} tone="blue" hint="Modelo final" />
          </div>

          <Card title="Alertas por sede">
            <Tabla columnas={['Sede', 'Estudiantes', 'Con alerta', '% alerta']} maxH=""
              filas={Object.entries(porSede).map(([s, v]) => [s, miles(v.n), miles(v.a), pct(v.a / v.n)])} />
          </Card>

          <Card title="Estudiantes" subtitle="Ordenados por probabilidad de riesgo"
            actions={
              <button onClick={() => descargarCsv('predicciones_2026.csv', filtradas as any)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5">
                <Download className="w-3 h-3" />Exportar CSV ({miles(filtradas.length)})
              </button>
            }>
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ID…"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent" />
              <select value={sede} onChange={e => setSede(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                <option>Todas</option>
                {sedes.map(s => <option key={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={soloAlertas} onChange={e => setSoloAlertas(e.target.checked)} />
                Solo con alerta
              </label>
            </div>
            <Tabla columnas={['ID', 'Sede', 'Sexo', 'Grado', 'Probabilidad', 'Votos de árboles', 'Alerta']}
              filas={filtradas.slice(0, 1000).map(p => [
                p.ID_Estudiante, p.sede, p.sexo, p.grado, pct(p.probabilidad_riesgo),
                `${p.votos_arboles_riesgo}/${p.total_arboles}`,
                p.alerta_riesgo ? <span className="text-red-600 font-semibold">Sí</span> : 'No',
              ])} />
            {filtradas.length > 1000 && <p className="text-[11px] text-slate-400 mt-2">Se muestran 1000 de {miles(filtradas.length)}; el CSV las incluye todas.</p>}
          </Card>
        </>
      )}

      <NavPasos onPrev={onPrevStep} onNext={onNextStep} nextLabel="Paso 5: Simulador" />
    </div>
  );
};
