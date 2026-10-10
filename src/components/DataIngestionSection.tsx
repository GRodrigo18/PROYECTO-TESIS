import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  Sparkles, 
  Database, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Layers
} from 'lucide-react';
import { StudentPrediction } from '../types';
import { downloadOfficialExcelTemplate } from '../utils/excelService';

interface DataIngestionSectionProps {
  students: StudentPrediction[];
  onOpenImport: () => void;
  onLoadDemoData: () => void;
  onSelectStudent: (student: StudentPrediction) => void;
}

export const DataIngestionSection: React.FC<DataIngestionSectionProps> = ({
  students,
  onOpenImport,
  onLoadDemoData,
  onSelectStudent,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [search, setSearch] = useState('');

  // Estadísticas por año
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const yearCounts = years.reduce((acc, y) => {
    acc[y] = students.filter(s => s.anio === y).length;
    return acc;
  }, {} as Record<number, number>);

  const trainingTotal = students.filter(s => s.anio < 2026).length;
  const test2026Total = students.filter(s => s.anio === 2026).length;

  const filtered = students.filter(s => {
    if (selectedYear !== 'Todos') {
      if (selectedYear === 'entrenamiento' && s.anio === 2026) return false;
      if (selectedYear === 'prueba' && s.anio !== 2026) return false;
      if (!isNaN(Number(selectedYear)) && s.anio !== Number(selectedYear)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const match = 
        s.nombre_codigo.toLowerCase().includes(q) ||
        s.codigo.toLowerCase().includes(q) ||
        (s.pais ? s.pais.toLowerCase().includes(q) : false);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner explaining Data Ingestion */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Database className="w-4 h-4" />
              <span>FASE 01 · RECOPILACIÓN E INGESTA DE DATOS</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Dataset Multianual de Rendimiento Académico (2020 - 2026)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Alimentación del sistema mediante hoja de cálculo Excel. Los registros de <strong>2020 a 2025</strong> contienen los 4 bimestres completos para entrenar el algoritmo, mientras que la cohorte <strong>2026</strong> cuenta con el promedio consolidado de los bimestres 1 y 2 para la prueba de alerta temprana.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenImport}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Cargar Archivo Excel</span>
            </button>

            <button
              type="button"
              onClick={downloadOfficialExcelTemplate}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Plantilla (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Cohort Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Registros Recopilados</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
              {students.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Abarca años 2020 hasta 2026
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Entrenamiento (2020 - 2025)</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
              {trainingTotal}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Datos consolidados con 4 bimestres
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Prueba Activa (2026)</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {test2026Total}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Consolidado Bimestres 1 y 2 (En curso)
            </div>
          </div>
        </div>
      </div>

      {/* Year Filter Buttons & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Year tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedYear('Todos')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedYear === 'Todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({students.length})
            </button>

            <button
              onClick={() => setSelectedYear('entrenamiento')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedYear === 'entrenamiento'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Histórico 2020-2025 ({trainingTotal})
            </button>

            <button
              onClick={() => setSelectedYear('prueba')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedYear === 'prueba'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
              }`}
            >
              Prueba 2026 ({test2026Total})
            </button>

            {years.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(String(y))}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedYear === String(y)
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {y} ({yearCounts[y] || 0})
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre o país..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Ingestion Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Año</th>
                <th className="py-2.5 px-3">Cohorte</th>
                <th className="py-2.5 px-3">Nombre o Código Estudiante</th>
                <th className="py-2.5 px-3">Sexo</th>
                <th className="py-2.5 px-3">País</th>
                <th className="py-2.5 px-3 text-right">Cursos</th>
                <th className="py-2.5 px-3 text-right">B1</th>
                <th className="py-2.5 px-3 text-right">B2</th>
                <th className="py-2.5 px-3 text-right">Prom. B1+B2</th>
                <th className="py-2.5 px-3">Riesgo Académico</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-slate-400">
                    No se encontraron registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  const is2026 = student.anio === 2026;
                  return (
                    <tr 
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => onSelectStudent(student)}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {student.anio}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[11px] font-medium ${
                          is2026 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {is2026 ? 'Prueba (2026)' : 'Entrenamiento'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {student.nombre}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {student.codigo}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {student.sexo}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {student.pais}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {student.cursos}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {student.bimestre_1.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {student.bimestre_2.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        {student.promedio_b1_b2.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-semibold ${
                          student.riesgo_academico === 'Alto'
                            ? 'text-red-600 dark:text-red-400'
                            : student.riesgo_academico === 'Medio'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {student.riesgo_academico}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(student);
                          }}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
