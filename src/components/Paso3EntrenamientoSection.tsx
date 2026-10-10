import React, { useState } from 'react';
import { 
  Cpu, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Target, 
  BarChart3, 
  Building2,
  TrendingUp,
  Layers,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { ColabEvaluationMetrics } from '../types';

interface Paso3EntrenamientoSectionProps {
  metrics: ColabEvaluationMetrics;
  onNextStep: () => void;
  onPrevStep?: () => void;
  onRetrain: (trees: number) => void;
}

type ValidationTab = 'matriz_dimensiones' | 'sedes' | 'cursos' | 'distribucion' | 'tendencia';

const SEDES_COLORS: Record<string, string> = {
  'Sede Central': '#2563eb', // blue
  'Sede Norte': '#dc2626',   // red
  'Sede Sur': '#059669',     // emerald
  'Sede Este': '#d97706',    // amber
  'Sede Callao': '#7c3aed',  // purple
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export const Paso3EntrenamientoSection: React.FC<Paso3EntrenamientoSectionProps> = ({
  metrics,
  onNextStep,
  onPrevStep,
  onRetrain,
}) => {
  const [activeTab, setActiveTab] = useState<ValidationTab>('matriz_dimensiones');

  const cm = metrics.matriz_confusion;
  const sensPct = (metrics.sensibilidad * 100).toFixed(2);
  const precPct = (metrics.precision * 100).toFixed(2);
  const f1Pct = (metrics.f1_score * 100).toFixed(2);
  const accPct = (metrics.accuracy * 100).toFixed(2);

  // Normalizar intensidades de color para la matriz de confusión (estilo cmap='Blues' de matplotlib)
  const maxVal = Math.max(cm.tn, cm.fp, cm.fn, cm.tp, 1);
  const getBlueBg = (val: number) => {
    const ratio = val / maxVal;
    if (ratio > 0.7) return 'bg-blue-600 text-white font-bold';
    if (ratio > 0.4) return 'bg-blue-400 text-white font-bold';
    if (ratio > 0.1) return 'bg-blue-200 text-blue-900 font-bold';
    return 'bg-blue-50 text-blue-900';
  };

  // Datos para gráfico de las Dimensiones Oficiales
  const dimensionesChartData = [
    { metrica: 'Sensibilidad (Recall)', porcentaje: Number(sensPct), fill: '#2563eb' },
    { metrica: 'Precisión', porcentaje: Number(precPct), fill: '#059669' },
    { metrica: 'F1-Score', porcentaje: Number(f1Pct), fill: '#4f46e5' },
    { metrica: 'Exactitud (Accuracy)', porcentaje: Number(accPct), fill: '#0891b2' },
  ];

  return (
    <div className="space-y-6 tab-content-enter">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-1">
              <span>🧠 PASO 3</span>
              <span>·</span>
              <span>ENTRENAMIENTO RANDOM FOREST & VALIDACIÓN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Validación y Métricas del Modelo ({metrics.n_estimators} Árboles)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onPrevStep && (
              <button
                type="button"
                onClick={onPrevStep}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso 2: Estandarización</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNextStep}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Ver Predicciones 2026 (Paso 4)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
          El ensamble de <strong>{metrics.n_estimators} árboles de decisión</strong> fue entrenado con aceleración multihilo y balanceo de clases (<code className="font-mono text-blue-600">class_weight='balanced', random_state=42</code>) sobre el histórico 2020-2025 ({metrics.total_train} registros) y validado en la cohorte 2026 ({metrics.total_test} registros con promedio B1+B2).
        </p>

        {/* Hyperparameter quick selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
            <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              n_estimators: <strong className="text-blue-600 dark:text-blue-400 font-bold">{metrics.n_estimators} árboles</strong>
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              class_weight: 'balanced'
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              random_state: 42
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              n_jobs: -1 (Aceleración Multi-núcleo)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Reentrenar con:</span>
            {[50, 100, 150, 200].map(trees => (
              <button
                key={trees}
                onClick={() => onRetrain(trees)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs cursor-pointer transition-all ${
                  metrics.n_estimators === trees
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {trees}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Las 4 Dimensiones Oficiales del Colab */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* Dimensión 1: Sensibilidad */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              1️⃣ Sensibilidad
            </span>
            <Target className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Recall (Vulnerabilidad Real)
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {sensPct}%
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            Detección de estudiantes en riesgo
          </p>
        </div>

        {/* Dimensión 2: Precisión */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              2️⃣ Precisión
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Alertas Correctas
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {precPct}%
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            Sin falsas alarmas pedagógicas
          </p>
        </div>

        {/* Dimensión 3: F1-Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              3️⃣ F1-Score
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Equilibrio Armónico
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            {f1Pct}%
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            Balance entre recall y precisión
          </p>
        </div>

        {/* Exactitud (Accuracy) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              4️⃣ Exactitud
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Accuracy Global
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
            {accPct}%
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            Aciertos sobre el total de prueba
          </p>
        </div>

      </div>

      {/* Selector de Pestañas de Gráficos de Validación */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto shadow-xs text-xs">
        <button
          onClick={() => setActiveTab('matriz_dimensiones')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'matriz_dimensiones'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Matriz de Confusión & Dimensiones</span>
        </button>

        <button
          onClick={() => setActiveTab('sedes')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'sedes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Validación por las 5 Sedes</span>
        </button>

        <button
          onClick={() => setActiveTab('cursos')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'cursos'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Cursos Detonantes (Feature Importance)</span>
        </button>

        <button
          onClick={() => setActiveTab('distribucion')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'distribucion'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5" />
          <span>Distribución Escala 0-3</span>
        </button>

        <button
          onClick={() => setActiveTab('tendencia')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tendencia'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tendencia Histórica (2020-2026)</span>
        </button>
      </div>

      {/* Contenido de Gráficos de Validación según Pestaña */}

      {/* 1. Matriz de Confusión & Dimensiones */}
      {activeTab === 'matriz_dimensiones' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Matriz de Confusión estilo Colab / Matplotlib (cmap='Blues') */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Matriz de Confusión (Cohorte 2026)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Representación oficial: <code>ConfusionMatrixDisplay(labels=['Normal', 'En Riesgo'], cmap='Blues')</code>
              </p>
            </div>

            <div className="max-w-md mx-auto py-2">
              <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Etiqueta Predicha por Random Forest
              </div>

              <div className="grid grid-cols-12 gap-2 text-xs">
                {/* Eje Y Label */}
                <div className="col-span-1 flex items-center justify-center">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] -rotate-90 whitespace-nowrap">
                    Etiqueta Real
                  </span>
                </div>

                {/* Matriz 2x2 */}
                <div className="col-span-11 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      Rendimiento Normal (0)
                    </div>
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400">
                      En Riesgo (1)
                    </div>
                  </div>

                  {/* Fila 1: Real = Normal */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-5 rounded-xl text-center border border-blue-200 dark:border-blue-800 transition-all ${getBlueBg(cm.tn)}`}>
                      <div className="text-2xl font-bold font-mono">{cm.tn}</div>
                      <div className="text-[11px] opacity-90 mt-1">Verdaderos Negativos (TN)</div>
                      <div className="text-[10px] opacity-75">Normal predicho Normal</div>
                    </div>

                    <div className={`p-5 rounded-xl text-center border border-slate-200 dark:border-slate-800 transition-all ${getBlueBg(cm.fp)}`}>
                      <div className="text-2xl font-bold font-mono">{cm.fp}</div>
                      <div className="text-[11px] opacity-90 mt-1">Falsos Positivos (FP)</div>
                      <div className="text-[10px] opacity-75">Falsa Alarma</div>
                    </div>
                  </div>

                  {/* Fila 2: Real = En Riesgo */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-5 rounded-xl text-center border border-slate-200 dark:border-slate-800 transition-all ${getBlueBg(cm.fn)}`}>
                      <div className="text-2xl font-bold font-mono">{cm.fn}</div>
                      <div className="text-[11px] opacity-90 mt-1">Falsos Negativos (FN)</div>
                      <div className="text-[10px] opacity-75">Riesgo no detectado</div>
                    </div>

                    <div className={`p-5 rounded-xl text-center border border-blue-200 dark:border-blue-800 transition-all ${getBlueBg(cm.tp)}`}>
                      <div className="text-2xl font-bold font-mono">{cm.tp}</div>
                      <div className="text-[11px] opacity-90 mt-1">Verdaderos Positivos (TP)</div>
                      <div className="text-[10px] opacity-75">Riesgo detectado a tiempo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              Evaluados: <strong>{metrics.total_test}</strong> alumnos ({cm.tp + cm.fn} en riesgo real vs {cm.tn + cm.fp} normales).
            </div>
          </div>

          {/* Gráfico de Barras de las 4 Dimensiones */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dimensiones Oficiales de Validación
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rendimiento porcentual de las métricas de clasificación en prueba
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionesChartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="metrica" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(val: any) => [`${val}%`, 'Porcentaje']} 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="porcentaje" radius={[6, 6, 0, 0]}>
                    {dimensionesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                <strong>Sensibilidad {sensPct}%:</strong> Cobertura de casos vulnerables
              </div>
              <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">
                <strong>Precisión {precPct}%:</strong> Certeza en las intervenciones
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. Validación por las 5 Sedes */}
      {activeTab === 'sedes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Comparativa de Vulnerabilidad en las 5 Sedes</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribución de alumnos y tasa de riesgo por cada sede activa
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono font-semibold self-start sm:self-auto">
              5 Sedes Evaluadas
            </span>
          </div>

          {/* Gráfico de Barras por Sedes */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.sedes_analisis} margin={{ top: 15, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="sede" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="normal" name="Rendimiento Normal" fill="#059669" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="en_riesgo" name="En Riesgo Académico" fill="#dc2626" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tarjetas resumen por cada una de las 5 Sedes */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            {metrics.sedes_analisis.map(s => {
              const esAlta = s.tasa_riesgo >= 50;
              return (
                <div 
                  key={s.sede}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-1.5"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={s.sede}>
                    {s.sede}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400">Tasa Riesgo:</span>
                    <strong className={`font-mono text-sm ${esAlta ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {s.tasa_riesgo}%
                    </strong>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Total: {s.total}</span>
                    <span className="text-red-500">Riesgo: {s.en_riesgo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Cursos Detonantes & Feature Importance */}
      {activeTab === 'cursos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Cursos Detonantes de Riesgo & Importancia en Random Forest</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Asignaturas con mayor frecuencia de nota 0 (C) que provocan alertas y peso relativo en los 100 árboles
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.cursos_falla} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="curso" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip 
                  formatter={(val: any, name: any) => [name === 'importancia_rf' ? `${(val * 100).toFixed(1)}%` : val, name === 'importancia_rf' ? 'Importancia RF' : 'Alumnos con Nota C']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="total_reprobados" name="Total Alumnos con Nota C (0)" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de Importancia */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <table className="w-full text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Asignatura</th>
                  <th className="py-2.5 px-3 text-center">Frecuencia en Nota C (0)</th>
                  <th className="py-2.5 px-3 text-center">Porcentaje de Impacto</th>
                  <th className="py-2.5 px-3 text-center">Importancia Random Forest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {metrics.cursos_falla.map(c => (
                  <tr key={c.curso} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {c.curso}
                    </td>
                    <td className="py-2.5 px-3 text-center text-red-600 dark:text-red-400 font-bold">
                      {c.total_reprobados}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {c.porcentaje}%
                    </td>
                    <td className="py-2.5 px-3 text-center text-blue-600 font-bold">
                      {(c.importancia_rf * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Distribución Escala 0-3 */}
      {activeTab === 'distribucion' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-500" />
              <span>Distribución Global de Calificaciones Estandarizadas (0 a 3)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conversión de letras (AD, A, B, C) y notas numéricas vigesimales (0-20)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.distribucion_notas}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="cantidad"
                    nameKey="escala"
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {metrics.distribucion_notas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val} notas`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Desglose explicativo */}
            <div className="space-y-3">
              {metrics.distribucion_notas.map((d, i) => (
                <div 
                  key={d.escala}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-3.5 h-3.5 rounded-full shrink-0" 
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} 
                    />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">{d.escala}</strong>
                      <span className="text-slate-400 block text-[11px]">{d.etiqueta}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">{d.cantidad} notas</div>
                    <div className="text-[11px] text-slate-400">{d.porcentaje}% del total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Tendencia Histórica (2020-2026) */}
      {activeTab === 'tendencia' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Evolución Multianual de Vulnerabilidad (2020 a 2026)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Partición temporal: 2020 a 2025 (Entrenamiento histórico) vs 2026 (Cohorte de validación con B1+B2)
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.tendencia_anual} margin={{ top: 15, right: 30, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [name === 'tasa_riesgo' ? `${val}%` : val, name === 'tasa_riesgo' ? 'Tasa de Riesgo' : name === 'en_riesgo' ? 'En Riesgo' : 'Total Alumnos']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="total" name="Total Estudiantes" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} />
                <Area type="monotone" dataKey="en_riesgo" name="Estudiantes en Riesgo" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-xs">
            {metrics.tendencia_anual.map(t => (
              <div 
                key={t.anio}
                className={`p-2.5 rounded-xl border ${
                  t.anio === 2026 
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20'
                }`}
              >
                <span className="font-bold font-mono text-xs block text-slate-800 dark:text-slate-200">{t.anio}</span>
                <span className="text-[10px] text-slate-400 block">{t.fase}</span>
                <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400 mt-1 block">{t.tasa_riesgo}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
