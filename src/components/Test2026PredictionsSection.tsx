import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Download, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Calendar,
  FileSpreadsheet,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { StudentPrediction, RiskLevel, Gender } from '../types';
import { exportPredictionsToExcelFile } from '../utils/excelService';
import { exportToCSV } from '../utils/randomForestSimulator';

interface Test2026PredictionsSectionProps {
  students: StudentPrediction[];
  onSelectStudent: (student: StudentPrediction) => void;
  onOpenNewPrediction: () => void;
}

export const Test2026PredictionsSection: React.FC<Test2026PredictionsSectionProps> = ({
  students,
  onSelectStudent,
  onOpenNewPrediction,
}) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'Todos'>('Todos');
  const [genderFilter, setGenderFilter] = useState<Gender | 'Todos'>('Todos');
  const [countryFilter, setCountryFilter] = useState<string>('Todos');
  const [sortField, setSortField] = useState<'nombre' | 'promedio_b1_b2' | 'cursos' | 'probabilidad_riesgo'>('probabilidad_riesgo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filtrar estrictamente la cohorte 2026 (o marcada como prueba)
  const students2026 = useMemo(() => {
    return students.filter(s => s.anio === 2026 || s.tipo_conjunto === 'prueba_2026');
  }, [students]);

  // Lista única de países en 2026
  const countries = useMemo(() => {
    const set = new Set(students2026.map(s => s.pais));
    return Array.from(set).sort();
  }, [students2026]);

  // Filtrado
  const filteredStudents = useMemo(() => {
    return students2026.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        const match = 
          s.nombre_codigo.toLowerCase().includes(q) ||
          s.codigo.toLowerCase().includes(q) ||
          s.nombre.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (riskFilter !== 'Todos' && s.riesgo_academico !== riskFilter) return false;
      if (genderFilter !== 'Todos' && s.sexo !== genderFilter) return false;
      if (countryFilter !== 'Todos' && s.pais !== countryFilter) return false;
      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students2026, search, riskFilter, genderFilter, countryFilter, sortField, sortDirection]);

  // Contadores
  const total2026 = students2026.length;
  const altoRiskCount = students2026.filter(s => s.riesgo_academico === 'Alto').length;
  const medioRiskCount = students2026.filter(s => s.riesgo_academico === 'Medio').length;
  const bajoRiskCount = students2026.filter(s => s.riesgo_academico === 'Bajo').length;
  const avgB1B2 = total2026 > 0 
    ? (students2026.reduce((acc, s) => acc + s.promedio_b1_b2, 0) / total2026).toFixed(2)
    : '0.00';

  const handleExportExcel2026 = () => {
    exportPredictionsToExcelFile(filteredStudents, `predicciones_cohorte_2026_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCsv2026 = () => {
    exportToCSV(filteredStudents, `predicciones_cohorte_2026_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleToggleSort = (field: 'nombre' | 'promedio_b1_b2' | 'cursos' | 'probabilidad_riesgo') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner for 2026 Test Cohort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Target className="w-4 h-4" />
              <span>FASE 03 · CONJUNTO DE PRUEBA Y ALERTA TEMPRANA 2026</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Predicciones sobre la Cohorte 2026 (Consolidado Bimestres 1 y 2)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              En el año académico <strong>2026</strong> solo se cuenta con las calificaciones consolidadas de los dos primeros bimestres. El modelo Random Forest entrenado evalúa el promedio B1+B2, carga de cursos y asistencia para emitir alertas preventivas antes del cierre del año escolar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel2026}
              disabled={students2026.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 font-semibold text-xs tracking-wide shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Reporte 2026 (Excel)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv2026}
              disabled={students2026.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* 2026 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Estudiantes 2026 Evaluados:</span>
            <span className="text-base font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {total2026}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <span className="text-red-700 dark:text-red-400 block text-[11px] font-semibold">Alerta: Riesgo Alto:</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
                {altoRiskCount}
              </span>
              <span className="text-[11px] text-red-500 dark:text-red-400">
                ({total2026 > 0 ? ((altoRiskCount / total2026) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <span className="text-amber-700 dark:text-amber-400 block text-[11px] font-semibold">Riesgo Medio:</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {medioRiskCount}
              </span>
              <span className="text-[11px] text-amber-500 dark:text-amber-400">
                ({total2026 > 0 ? ((medioRiskCount / total2026) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-semibold">Riesgo Bajo:</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {bajoRiskCount}
              </span>
              <span className="text-[11px] text-emerald-500 dark:text-emerald-400">
                ({total2026 > 0 ? ((bajoRiskCount / total2026) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 col-span-2 sm:col-span-1">
            <span className="text-blue-700 dark:text-blue-400 block text-[11px] font-semibold">Promedio B1+B2 Global:</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {avgB1B2} / 20
            </span>
          </div>
        </div>
      </div>

      {/* Main Results Table with Required Columns:
          - nombre o codigo estudiante
          - sexo
          - pais
          - cursos
          - riesgo_academico
          plus promedio_b1_b2 and probability
      */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Filters bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estudiante 2026..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dropdown filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Risk filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="Todos">Riesgo: Todos</option>
              <option value="Alto">Riesgo: Alto</option>
              <option value="Medio">Riesgo: Medio</option>
              <option value="Bajo">Riesgo: Bajo</option>
            </select>

            {/* Gender filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="Todos">Sexo: Todos</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
              <option value="Otro">Otro</option>
            </select>

            {/* Country filter */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="Todos">País: Todos</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

          </div>
        </div>

        {/* Results Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  onClick={() => handleToggleSort('nombre')}
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre o Código Estudiante</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Sexo</th>
                <th className="py-3 px-3">País</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  onClick={() => handleToggleSort('cursos')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cursos</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">B1</th>
                <th className="py-3 px-3 text-right">B2</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  onClick={() => handleToggleSort('promedio_b1_b2')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Promedio B1+B2</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Riesgo Académico (RF)</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  onClick={() => handleToggleSort('probabilidad_riesgo')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Probabilidad</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs text-slate-400">
                    No hay estudiantes de la cohorte 2026 para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isHighRisk = student.riesgo_academico === 'Alto';
                  const isMedRisk = student.riesgo_academico === 'Medio';
                  return (
                    <tr 
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => onSelectStudent(student)}
                    >
                      {/* 1. Nombre o código estudiante */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {student.nombre}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {student.codigo}
                        </div>
                      </td>

                      {/* 2. Sexo */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {student.sexo}
                      </td>

                      {/* 3. País */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {student.pais}
                      </td>

                      {/* 4. Cursos */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        <span className={student.cursos >= 7 ? 'text-amber-600 dark:text-amber-400' : ''}>
                          {student.cursos}
                        </span>
                      </td>

                      {/* Bimestre 1 */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {student.bimestre_1.toFixed(1)}
                      </td>

                      {/* Bimestre 2 */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {student.bimestre_2.toFixed(1)}
                      </td>

                      {/* Promedio B1 + B2 */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                        {student.promedio_b1_b2.toFixed(2)}
                      </td>

                      {/* 5. Riesgo Académico */}
                      <td className="py-3 px-3">
                        <span className={`text-xs font-bold ${
                          isHighRisk
                            ? 'text-red-600 dark:text-red-400'
                            : isMedRisk
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {student.riesgo_academico}
                        </span>
                      </td>

                      {/* Probabilidad */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[11px]">
                        {(student.probabilidad_riesgo * 100).toFixed(0)}%
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(student);
                          }}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Diagnóstico
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
