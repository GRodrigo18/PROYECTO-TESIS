import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, ErrorBar,
} from 'recharts';
import { InformeMetricas, MetricasBinarias, ResultadosPipeline } from '../types';
import { Aviso, Card, Comando, NavPasos, Stat, Tabla, miles, num, pct } from './ui';

interface Props {
  resultados: ResultadosPipeline | null;
  formatoSinBimestres: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
}

const FILAS_METRICAS: Array<[keyof MetricasBinarias, string, 'pct' | 'num']> = [
  ['sensibilidad_recall', 'Sensibilidad (recall)', 'pct'],
  ['especificidad', 'Especificidad', 'pct'],
  ['precision', 'Precisión', 'pct'],
  ['valor_predictivo_negativo', 'Valor predictivo negativo', 'pct'],
  ['f1', 'F1', 'num'],
  ['f2', 'F2', 'num'],
  ['balanced_accuracy', 'Exactitud balanceada', 'pct'],
  ['accuracy', 'Exactitud', 'pct'],
  ['mcc', 'MCC', 'num'],
  ['kappa_cohen', 'Kappa de Cohen', 'num'],
  ['roc_auc', 'ROC-AUC', 'num'],
  ['pr_auc', 'PR-AUC (principal)', 'num'],
  ['brier', 'Brier', 'num'],
  ['log_loss', 'Log loss', 'num'],
];

const NOMBRE_BASE: Record<string, string> = {
  regla_alguna_C_en_B1B2: 'Regla: alguna C en B1-B2',
  dummy_estratificado: 'Azar estratificado (dummy)',
  regresion_logistica: 'Regresión logística',
};

const fmt = (v: unknown, tipo: 'pct' | 'num') => (typeof v === 'number' ? (tipo === 'pct' ? pct(v) : num(v)) : '—');
const ic = (inf: InformeMetricas, k: string, tipo: 'pct' | 'num') => {
  const r = inf.test.ic95_bootstrap_umbral_optimo[k];
  return r ? `[${fmt(r[0], tipo)} – ${fmt(r[1], tipo)}]` : '';
};

export const Paso3ModeloSection: React.FC<Props> = ({ resultados, formatoSinBimestres, onPrevStep, onNextStep }) => {
  const inf = resultados?.informe;

  if (!inf) {
    return (
      <div className="space-y-6 tab-content-enter">
        <Card>
          <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">PASO 3 · MODELO RANDOM FOREST</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Todavía no hay un modelo entrenado</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-3xl">
            El sitio no inventa métricas: muestra lo que escribe el pipeline de scikit-learn en <code>tesis-rf/resultados/</code>.
            Cuando exista <code>informe_metricas.json</code>, esta página mostrará las métricas de 2025 con sus IC 95%,
            las líneas base, el desempeño por sede, sexo y grado, la calibración, la importancia por permutación y los hiperparámetros.
          </p>
        </Card>
        {formatoSinBimestres && (
          <Aviso tipo="alerta" title="El archivo cargado no permite entrenar">
            <p>Trae una sola nota por curso. El pipeline se detiene a propósito con ese formato para no entrenar con fuga de información.
              Se necesitan las notas de B1, B2 y Final de 2020-2025.</p>
          </Aviso>
        )}
        <Card title="Cómo generar los resultados">
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>Con el Excel por bimestre en <code>tesis-rf/data/</code>:</p>
            <Comando>{`cd tesis-rf
pip install -r requirements.txt
python src/auditar_excel.py --datos data/notas.xlsx --salida salida/
python src/pipeline_rf_tesis.py --datos data/notas.xlsx --salida resultados/ --n-iter 40`}</Comando>
            <p>Luego recarga esta página.</p>
          </div>
        </Card>
        <NavPasos onPrev={onPrevStep} />
      </div>
    );
  }

  const opt = inf.test.umbral_optimo;
  const m05 = inf.test['umbral_0.5'];
  const curvas = inf.curvas_validacion_marginales ?? {};
  const calibracion = inf.calibracion.prob_media_predicha.map((x, i) => ({ predicha: x, real: inf.calibracion.fraccion_real[i], ideal: x }));
  const importancia = (resultados?.importancia_permutacion.length ? resultados.importancia_permutacion : inf.importancia_permutacion_top10)
    .slice(0, 15).map(d => ({ ...d, error: d.desv_std }));

  return (
    <div className="space-y-6 tab-content-enter">
      <Card>
        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">PASO 3 · MODELO RANDOM FOREST (scikit-learn)</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Evaluación en la cohorte de prueba {inf.particion.prueba}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-3xl">
          Variables: notas de B1 y B2 y sus derivadas, grado, sede y sexo. Etiqueta: algún curso con nota final en C.
          Entrenamiento {inf.particion.entrenamiento} con validación cruzada dejando un año fuera; prueba {inf.particion.prueba};
          modelo final reentrenado con 2020-{inf.particion.prueba}. Resultados generados el {resultados?.generado_en ? new Date(resultados.generado_en).toLocaleString('es-PE') : '—'}.
        </p>
      </Card>

      {/* Las tres dimensiones de la tesis primero; la tabla completa de métricas está más abajo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Sensibilidad (D1)" value={pct(opt.sensibilidad_recall)} tone="emerald" hint={`IC 95% ${ic(inf, 'sensibilidad_recall', 'pct')}`} />
        <Stat label="Precisión (D2)" value={pct(opt.precision)} hint={`IC 95% ${ic(inf, 'precision', 'pct')}`} />
        <Stat label="F1-Score (D3)" value={num(opt.f1)} hint={`IC 95% ${ic(inf, 'f1', 'num')}`} />
        <Stat label={`PR-AUC ${inf.particion.prueba}`} value={num(opt.pr_auc)} tone="blue" hint={`IC 95% ${ic(inf, 'pr_auc', 'num')}`} />
        <Stat label="Umbral" value={num(inf.umbral.valor)} tone="amber" hint={inf.umbral.criterio} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Partición temporal" className="lg:col-span-1">
          <Tabla columnas={['Conjunto', 'Registros', 'Prevalencia']} maxH="" filas={[
            [`Entrenamiento ${inf.particion.entrenamiento}`, miles(inf.particion.n_train), pct(inf.particion.prevalencia_train)],
            [`Prueba ${inf.particion.prueba}`, miles(inf.particion.n_test), pct(inf.particion.prevalencia_test)],
            [`Predicción ${inf.particion.prediccion}`, miles(inf.particion.n_2026), 'sin cierre'],
          ]} />
        </Card>
        <Card title={`Matriz de confusión ${inf.particion.prueba}`} subtitle={`Umbral ${num(opt.umbral)}`}>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3"><div className="text-slate-500">VN</div><div className="text-xl font-mono font-bold">{miles(opt.matriz_confusion.tn)}</div></div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3"><div className="text-slate-500">FP</div><div className="text-xl font-mono font-bold">{miles(opt.matriz_confusion.fp)}</div></div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3"><div className="text-slate-500">FN</div><div className="text-xl font-mono font-bold">{miles(opt.matriz_confusion.fn)}</div></div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3"><div className="text-slate-500">VP</div><div className="text-xl font-mono font-bold">{miles(opt.matriz_confusion.tp)}</div></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Filas: real (normal / riesgo). Columnas: predicho (normal / alerta).</p>
        </Card>
        <Card title="Mejores hiperparámetros" subtitle={`RandomizedSearchCV, PR-AUC CV = ${num(inf.cv_leave_one_year_out_pr_auc)}`}>
          <Tabla columnas={['Parámetro', 'Valor']} maxH="" filas={Object.entries(inf.mejores_hiperparametros)
            .map(([k, v]) => [k.replace('rf__', ''), v === null ? 'None' : String(v)])} />
        </Card>
      </div>

      <Card title={`Métricas en ${inf.particion.prueba}`} subtitle="IC 95% por bootstrap (1000 remuestreos) en el umbral elegido">
        <Tabla columnas={['Métrica', 'Umbral 0.5', `Umbral elegido (${num(opt.umbral)})`, 'IC 95%']} maxH=""
          filas={FILAS_METRICAS.map(([k, label, tipo]) => [label, fmt(m05[k], tipo), fmt(opt[k], tipo), ic(inf, k, tipo)])} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Comparación con líneas base" subtitle="Mismo conjunto de prueba">
          <Tabla columnas={['Modelo', 'Sensib.', 'Precisión', 'F2', 'PR-AUC', 'MCC']} maxH="" filas={[
            ['Random Forest (umbral elegido)', pct(opt.sensibilidad_recall), pct(opt.precision), num(opt.f2), num(opt.pr_auc), num(opt.mcc)],
            ...Object.entries(inf.lineas_base).map(([k, m]) => [NOMBRE_BASE[k] ?? k, pct(m.sensibilidad_recall), pct(m.precision), num(m.f2), num(m.pr_auc), num(m.mcc)]),
          ]} />
          <div className="mt-3">
            <Tabla columnas={['Prueba de McNemar', 'RF acierta / otro falla', 'Otro acierta / RF falla', 'χ²', 'p']} maxH=""
              filas={Object.entries(inf.pruebas_mcnemar).map(([k, t]) => [k.replace(/_/g, ' '), t.a_acierta_b_falla, t.b_acierta_a_falla, num(t.chi2), num(t.p_valor, 4)])} />
          </div>
        </Card>
        <Card title="Calibración" subtitle="Probabilidad predicha vs. fracción real (deciles)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calibracion} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="predicha" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => num(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="ideal" name="Calibración perfecta" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
                <Line dataKey="real" name="Modelo" stroke="#2563eb" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400">Brier = {num(opt.brier)}</p>
        </Card>
      </div>

      <Card title="Desempeño por subgrupo" subtitle="Solo grupos con ≥ 20 registros y ambas clases presentes">
        <div className="grid lg:grid-cols-3 gap-4">
          {Object.entries(inf.por_subgrupo).map(([g, grupos]) => (
            <div key={g}>
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 capitalize">{g}</h3>
              <Tabla columnas={[g, 'Prev.', 'Sensib.', 'Precisión', 'PR-AUC']} maxH=""
                filas={Object.entries(grupos).map(([k, m]) => [k, pct(m.prevalencia), pct(m.sensibilidad_recall), pct(m.precision), num(m.pr_auc)])} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Importancia por permutación" subtitle="Caída de PR-AUC en la prueba al permutar cada variable (media ± desv.)">
          <div style={{ height: Math.max(200, importancia.length * 22) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={importancia} layout="vertical" margin={{ left: 20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b833" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="variable" width={150} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => num(Number(v), 4)} />
                <Bar dataKey="importancia_media" fill="#2563eb">
                  <ErrorBar dataKey="error" width={4} stroke="#64748b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Validación cruzada dejando un año fuera">
          {inf.cv_pr_auc_por_anio_validacion && (
            <Tabla columnas={['Año validado', 'PR-AUC']} maxH=""
              filas={Object.entries(inf.cv_pr_auc_por_anio_validacion).map(([a, v]) => [a, num(v)])} />
          )}
          {inf.brecha_entrenamiento_validacion_pr_auc !== undefined && (
            <p className="text-[11px] text-slate-500 mt-2">Brecha entrenamiento − validación (PR-AUC): {num(inf.brecha_entrenamiento_validacion_pr_auc)}</p>
          )}
          {Object.entries(curvas).map(([param, puntos]) => (
            <div key={param} className="mt-4">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Curva de validación: {param}</h3>
              <p className="text-[10px] text-slate-400 mb-1">Promedio de las combinaciones probadas con cada valor</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={puntos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="valor" tick={{ fontSize: 10 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => num(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line dataKey="pr_auc_entrenamiento" name="Entrenamiento" stroke="#94a3b8" />
                    <Line dataKey="pr_auc_validacion" name="Validación" stroke="#2563eb" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <NavPasos onPrev={onPrevStep} onNext={onNextStep} nextLabel="Paso 4: Predicciones 2026" />
    </div>
  );
};
