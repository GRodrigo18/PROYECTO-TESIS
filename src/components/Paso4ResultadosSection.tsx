import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpDown,
  Building2,
  Eye,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { StudentRecord } from '../types';
import { exportarResultadosPrediccion } from '../utils/colabEngine';

interface Paso4ResultadosSectionProps {
  records: StudentRecord[];
  onSelectStudent: (record: StudentRecord) => void;
  onPrevStep?: () => void;
  onGoToSimulator?: () => void;
}

export const Paso4ResultadosSection: React.FC<Paso4ResultadosSectionProps> = ({
  records,
  onSelectStudent,
  onPrevStep,
  onGoToSimulator,
}) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'Todos' | 'Normal' | 'En Riesgo'>('Todos');
  const [genderFilter, setGenderFilter] = useState<'Todos' | 'Femenino' | 'Masculino'>('Todos');
  const [sedeFilter, setSedeFilter] = useState<string>('Todas');

  // Solo cohorte 2026 (validación/prueba)
  const testRecords2026 = useMemo(() => {
    return records.filter(r => r.anio_academico === 2026);
  }, [records]);

  const displayList = testRecords2026.length > 0 ? testRecords2026 : records;

  // Sedes disponibles en cohorte
  const availableSedes = useMemo(() => {
    const set = new Set<string>();
    displayList.forEach(r => {
      if (r.sede) set.add(r.sede);
    });
    return Array.from(set).sort();
  }, [displayList]);

  const filtered = useMemo(() => {
    return displayList.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        const m = r.nombre.toLowerCase().includes(q) || 
                  r.ID_Estudiante.toLowerCase().includes(q) ||
                  (r.sede && r.sede.toLowerCase().includes(q));
        if (!m) return false;
      }
      if (riskFilter !== 'Todos' && r.estado_riesgo_real_texto !== riskFilter) return false;
      if (genderFilter !== 'Todos' && r.sexo !== genderFilter) return false;
      if (sedeFilter !== 'Todas' && r.sede !== sedeFilter) return false;
      return true;
    });
  }, [displayList, search, riskFilter, genderFilter, sedeFilter]);

  const total2026 = displayList.length;
  const riesgoCount = displayList.filter(r => r.estado_riesgo_real === 1).length;
  const normalCount = displayList.filter(r => r.estado_riesgo_real === 0).length;

  const sampleCursos = displayList[0] ? Object.keys(displayList[0].cursos) : [];

  return (
    <div className="space-y-6 tab-content-enter">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              <span>📦 PASO 4</span>
              <span>·</span>
              <span>RESULTADOS Y EXPORTACIÓN OFICIAL</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Predicciones de Validación Cohorte 2026
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              Resultados generados para los estudiantes del año <strong>2026</strong> en las <strong>5 sedes</strong> con notas bimestrales B1 y B2 estandarizadas. Compara el estado real con la inferencia del ensamble de 100 árboles de decisión.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onPrevStep && (
              <button
                type="button"
                onClick={onPrevStep}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Paso 3: Métricas</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => exportarResultadosPrediccion(records, 'csv')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Descargar CSV Oficial 2026</span>
            </button>

            <button
              type="button"
              onClick={() => exportarResultadosPrediccion(records, 'xlsx')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            {onGoToSimulator && (
              <button
                type="button"
                onClick={onGoToSimulator}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Simulador en Vivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2026 KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Estudiantes 2026:</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 block">
              {total2026}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <span className="text-[11px] text-red-600 dark:text-red-400 block font-medium">En Riesgo (Alerta Activa):</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400 font-mono tabular-nums mt-0.5 block">
              {riesgoCount} ({total2026 > 0 ? ((riesgoCount / total2026) * 100).toFixed(1) : 0}%)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">Rendimiento Normal:</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5 block">
              {normalCount} ({total2026 > 0 ? ((normalCount / total2026) * 100).toFixed(1) : 0}%)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40">
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-medium">Sedes Activas:</span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-0.5 block">
              {availableSedes.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Sede Filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sedeFilter}
                onChange={(e) => setSedeFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Todas">Todas las Sedes ({displayList.length})</option>
                {availableSedes.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Risk Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setRiskFilter('Todos')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  riskFilter === 'Todos' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setRiskFilter('En Riesgo')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  riskFilter === 'En Riesgo' ? 'bg-red-500 text-white font-semibold shadow-xs' : 'text-slate-500 hover:text-red-500'
                }`}
              >
                En Riesgo
              </button>
              <button
                onClick={() => setRiskFilter('Normal')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  riskFilter === 'Normal' ? 'bg-emerald-500 text-white font-semibold shadow-xs' : 'text-slate-500 hover:text-emerald-500'
                }`}
              >
                Normal
              </button>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setGenderFilter('Todos')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  genderFilter === 'Todos' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                Ambos Sexos
              </button>
              <button
                onClick={() => setGenderFilter('Femenino')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  genderFilter === 'Femenino' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                Femenino
              </button>
              <button
                onClick={() => setGenderFilter('Masculino')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  genderFilter === 'Masculino' ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs' : 'text-slate-500'
                }`}
              >
                Masculino
              </button>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, nombre o sede..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>

        {/* Results Table with Sede Column */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3">ID / Estudiante</th>
                <th className="py-2.5 px-3">Sede</th>
                <th className="py-2.5 px-3">Sexo</th>
                <th className="py-2.5 px-3 text-center">Año</th>
                {sampleCursos.map(c => (
                  <th key={c} className="py-2.5 px-3 text-center">
                    {c} (Std)
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">Nota Mín.</th>
                <th className="py-2.5 px-3 text-center">Prom. Std</th>
                <th className="py-2.5 px-3 text-center">Riesgo Real</th>
                <th className="py-2.5 px-3 text-center">Predicción Random Forest</th>
                <th className="py-2.5 px-3 text-center">Probabilidad Alerta</th>
                <th className="py-2.5 px-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {filtered.map(student => {
                const enRiesgoReal = student.estado_riesgo_real === 1;
                const enRiesgoPred = student.riesgo_predicho_ia === 1;
                const acierto = student.estado_riesgo_real === student.riesgo_predicho_ia;

                return (
                  <tr 
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {student.nombre}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {student.ID_Estudiante}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-sans">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {student.sede}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-sans text-slate-500">
                      {student.sexo}
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold">
                      {student.anio_academico}
                    </td>

                    {sampleCursos.map(c => {
                      const cData = student.cursos[c];
                      const esCero = cData?.estandarizada === 0;
                      return (
                        <td key={c} className="py-2.5 px-3 text-center font-bold">
                          <span className={esCero ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>
                            {cData?.estandarizada}
                          </span>
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={student.nota_minima === 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {student.nota_minima}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                      {student.promedio_estandarizado}
                    </td>

                    <td className="py-2.5 px-3 text-center font-sans font-bold">
                      {enRiesgoReal ? (
                        <span className="text-red-600 dark:text-red-400">En Riesgo</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Normal</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-sans">
                      {enRiesgoPred ? (
                        <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Alerta Riesgo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Normal</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={(student.probabilidad_riesgo || 0) >= 0.5 ? 'text-red-600' : 'text-slate-600'}>
                        {((student.probabilidad_riesgo || 0) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({student.votos_arboles?.riesgo || 0} de {student.votos_arboles?.total_arboles || 100} árboles)
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ver detalle del estudiante"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
