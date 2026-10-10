import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { StudentPrediction, FeatureImportance } from '../types';
import { BarChart3, PieChart as PieIcon, Globe, BookOpen, Layers, Calendar } from 'lucide-react';

interface ChartsSectionProps {
  students: StudentPrediction[];
  featureImportances: FeatureImportance[];
}

const RISK_COLORS = {
  Alto: '#ef4444',
  Medio: '#f59e0b',
  Bajo: '#10b981',
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  students,
  featureImportances,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'anios' | 'pais' | 'cursos' | 'rf_features'>('general');

  if (students.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
        No hay datos disponibles para generar gráficos. Por favor carga un archivo Excel en la Fase 01 o selecciona "Cargar Demo 2020-2026".
      </div>
    );
  }

  // 1. Data para gráfico de distribución de riesgo
  const altoCount = students.filter(s => s.riesgo_academico === 'Alto').length;
  const medioCount = students.filter(s => s.riesgo_academico === 'Medio').length;
  const bajoCount = students.filter(s => s.riesgo_academico === 'Bajo').length;

  const riskPieData = [
    { name: 'Riesgo Alto', value: altoCount, color: RISK_COLORS.Alto },
    { name: 'Riesgo Medio', value: medioCount, color: RISK_COLORS.Medio },
    { name: 'Riesgo Bajo', value: bajoCount, color: RISK_COLORS.Bajo },
  ];

  // 2. Data para distribución por año (2020 a 2026)
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const yearChartData = years.map(y => {
    const listYear = students.filter(s => s.anio === y);
    return {
      anio: String(y) + (y === 2026 ? ' (Prueba)' : ''),
      Alto: listYear.filter(s => s.riesgo_academico === 'Alto').length,
      Medio: listYear.filter(s => s.riesgo_academico === 'Medio').length,
      Bajo: listYear.filter(s => s.riesgo_academico === 'Bajo').length,
      total: listYear.length,
    };
  });

  // 3. Data para riesgo por país
  const countryMap = new Map<string, { Alto: number; Medio: number; Bajo: number; total: number }>();
  students.forEach(s => {
    const paisKey = s.pais || 'Sede Central';
    const entry = countryMap.get(paisKey) || { Alto: 0, Medio: 0, Bajo: 0, total: 0 };
    entry[s.riesgo_academico] = (entry[s.riesgo_academico] || 0) + 1;
    entry.total += 1;
    countryMap.set(paisKey, entry);
  });

  const countryChartData = Array.from(countryMap.entries())
    .map(([pais, counts]) => ({
      pais,
      Alto: counts.Alto,
      Medio: counts.Medio,
      Bajo: counts.Bajo,
      total: counts.total,
    }))
    .sort((a, b) => b.total - a.total);

  // 4. Data para riesgo por cantidad de cursos
  const coursesMap = new Map<number, { Alto: number; Medio: number; Bajo: number; total: number }>();
  students.forEach(s => {
    const entry = coursesMap.get(s.cursos) || { Alto: 0, Medio: 0, Bajo: 0, total: 0 };
    entry[s.riesgo_academico] = (entry[s.riesgo_academico] || 0) + 1;
    entry.total += 1;
    coursesMap.set(s.cursos, entry);
  });

  const coursesChartData = Array.from(coursesMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([cursos, counts]) => ({
      cursos: `${cursos} Cursos`,
      Alto: counts.Alto,
      Medio: counts.Medio,
      Bajo: counts.Bajo,
      total: counts.total,
    }));

  // 5. Data para feature importances del Random Forest
  const featureChartData = featureImportances.map(f => ({
    name: f.label,
    importancia: Number((f.importance * 100).toFixed(1)),
  }));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Análisis Visual del Modelo Predictivo</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Explora la distribución temporal (2020-2026), variables clave y correlaciones académicas
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            <span>Distribución</span>
          </button>

          <button
            onClick={() => setActiveTab('anios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'anios'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Por Años (2020-2026)</span>
          </button>

          <button
            onClick={() => setActiveTab('pais')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pais'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Por País</span>
          </button>

          <button
            onClick={() => setActiveTab('cursos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cursos'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Por Cursos</span>
          </button>

          <button
            onClick={() => setActiveTab('rf_features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rf_features'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Pesos RF</span>
          </button>
        </div>
      </div>

      {/* Chart View Content */}
      <div className="pt-2">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="h-64 md:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [`${value} estudiantes`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Diagnóstico Global
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                El ensamble clasifica a <strong>{altoCount} estudiantes ({students.length ? ((altoCount/students.length)*100).toFixed(1) : 0}%)</strong> en zona de riesgo académico alto.
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5 font-mono tabular-nums">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    Riesgo Alto:
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{altoCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Riesgo Medio:
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{medioCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Riesgo Bajo:
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bajoCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anios' && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <XAxis dataKey="anio" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Alto" name="Riesgo Alto" fill={RISK_COLORS.Alto} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medio" name="Riesgo Medio" fill={RISK_COLORS.Medio} stackId="a" />
                <Bar dataKey="Bajo" name="Riesgo Bajo" fill={RISK_COLORS.Bajo} stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'pais' && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <XAxis dataKey="pais" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Alto" name="Riesgo Alto" fill={RISK_COLORS.Alto} />
                <Bar dataKey="Medio" name="Riesgo Medio" fill={RISK_COLORS.Medio} />
                <Bar dataKey="Bajo" name="Riesgo Bajo" fill={RISK_COLORS.Bajo} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'cursos' && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coursesChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <XAxis dataKey="cursos" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Alto" name="Riesgo Alto" fill={RISK_COLORS.Alto} stackId="a" />
                <Bar dataKey="Medio" name="Riesgo Medio" fill={RISK_COLORS.Medio} stackId="a" />
                <Bar dataKey="Bajo" name="Riesgo Bajo" fill={RISK_COLORS.Bajo} stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'rf_features' && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={featureChartData} 
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" domain={[0, 45]} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={180} />
                <Tooltip 
                  formatter={(val: any) => [`${val}% de peso en el modelo`, 'Importancia Relativa']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="importancia" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};
