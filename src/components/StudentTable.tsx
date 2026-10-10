import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { StudentPrediction, RiskLevel, Gender, FilterState } from '../types';

interface StudentTableProps {
  students: StudentPrediction[];
  onSelectStudent: (student: StudentPrediction) => void;
  filterState: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
}

type SortField = 'nombre_codigo' | 'sexo' | 'pais' | 'cursos' | 'anio' | 'promedio_b1_b2' | 'riesgo_academico' | 'probabilidad_riesgo';
type SortOrder = 'asc' | 'desc';

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onSelectStudent,
  filterState,
  onFilterChange,
  onResetFilters,
}) => {
  const [sortField, setSortField] = useState<SortField>('anio');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Lista única de países disponibles
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.pais) set.add(s.pais);
    });
    return Array.from(set).sort();
  }, [students]);

  // Manejo de ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'probabilidad_riesgo' || field === 'cursos' || field === 'anio' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Filtrado de estudiantes
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Filtro por Año / Cohorte
      if (filterState.year !== 'Todos') {
        if (filterState.year === 'Entrenamiento (2020-2025)' && s.anio === 2026) return false;
        if (filterState.year === 'Prueba (2026)' && s.anio !== 2026) return false;
        if (typeof filterState.year === 'number' && s.anio !== filterState.year) return false;
      }

      // 2. Búsqueda por texto (nombre o código)
      if (filterState.searchQuery) {
        const query = filterState.searchQuery.toLowerCase().trim();
        const matchesNameOrCode = 
          (s.nombre_codigo && s.nombre_codigo.toLowerCase().includes(query)) ||
          (s.codigo && s.codigo.toLowerCase().includes(query)) ||
          (s.nombre && s.nombre.toLowerCase().includes(query));
        if (!matchesNameOrCode) return false;
      }

      // 3. Filtro por Riesgo Académico
      if (filterState.risk !== 'Todos' && (s.riesgo_academico as any) !== filterState.risk) {
        return false;
      }

      // 4. Filtro por Sexo
      if (filterState.gender !== 'Todos' && (s.sexo as any) !== filterState.gender) {
        return false;
      }

      // Filtro por Cursos
      if (filterState.minCourses !== undefined && s.cursos < filterState.minCourses) {
        return false;
      }
      if (filterState.maxCourses !== undefined && s.cursos > filterState.maxCourses) {
        return false;
      }

      return true;
    });
  }, [students, filterState]);

  // Ordenamiento de los datos filtrados
  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    return list.sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (sortField === 'riesgo_academico') {
        const riskWeights = { Alto: 3, Medio: 2, Bajo: 1 };
        valA = riskWeights[a.riesgo_academico] || 0;
        valB = riskWeights[b.riesgo_academico] || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortField, sortOrder]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Table Controls / Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3.5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Dataset Multianual (2020 - 2026)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historico consolidado y cohorte de prueba para el desarrollo del algoritmo
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {sortedStudents.length} de {students.length} estudiantes
            </span>
            {(filterState.searchQuery || filterState.year !== 'Todos' || filterState.risk !== 'Todos' || filterState.gender !== 'Todos' || filterState.country !== 'Todos') && (
              <button
                id="btn-limpiar-filtros"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
          
          {/* Búsqueda por Nombre o Código */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={filterState.searchQuery}
              onChange={(e) => {
                onFilterChange({ ...filterState, searchQuery: e.target.value });
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por Año / Cohorte */}
          <div className="lg:col-span-3">
            <select
              value={filterState.year}
              onChange={(e) => {
                const val = e.target.value;
                const parsedVal = val === 'Todos' || val === 'Entrenamiento (2020-2025)' || val === 'Prueba (2026)' ? val : Number(val);
                onFilterChange({ ...filterState, year: parsedVal as any });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Año: Todos (2020 - 2026)</option>
              <option value="Entrenamiento (2020-2025)">Entrenamiento (2020 - 2025)</option>
              <option value="Prueba (2026)">Prueba (2026 - B1 y B2)</option>
              <option value={2026}>Solo 2026</option>
              <option value={2025}>Solo 2025</option>
              <option value={2024}>Solo 2024</option>
              <option value={2023}>Solo 2023</option>
              <option value={2022}>Solo 2022</option>
              <option value={2021}>Solo 2021</option>
              <option value={2020}>Solo 2020</option>
            </select>
          </div>

          {/* Filtro por Riesgo Académico */}
          <div className="lg:col-span-2">
            <select
              value={filterState.risk}
              onChange={(e) => {
                onFilterChange({ ...filterState, risk: e.target.value as any });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Riesgo: Todos</option>
              <option value="Alto">Riesgo Alto</option>
              <option value="Medio">Riesgo Medio</option>
              <option value="Bajo">Riesgo Bajo</option>
            </select>
          </div>

          {/* Filtro por Sexo */}
          <div className="lg:col-span-1">
            <select
              value={filterState.gender}
              onChange={(e) => {
                onFilterChange({ ...filterState, gender: e.target.value as any });
                setCurrentPage(1);
              }}
              className="w-full px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Sexo</option>
              <option value="Femenino">Femenino</option>
              <option value="Masculino">Masculino</option>
            </select>
          </div>

          {/* Filtro por País */}
          <div className="lg:col-span-2">
            <select
              value={filterState.country}
              onChange={(e) => {
                onFilterChange({ ...filterState, country: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">País: Todos</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Responsive Table Container with Required Columns:
          - nombre o codigo estudiante
          - sexo
          - pais
          - cursos
          - riesgo_academico
          plus año and promedio_b1_b2
      */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              
              {/* Año */}
              <th 
                onClick={() => handleSort('anio')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Año</span>
                  {renderSortIcon('anio')}
                </div>
              </th>

              {/* 1. Nombre o Código Estudiante */}
              <th 
                onClick={() => handleSort('nombre_codigo')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Nombre o Código Estudiante</span>
                  {renderSortIcon('nombre_codigo')}
                </div>
              </th>

              {/* 2. Sexo */}
              <th 
                onClick={() => handleSort('sexo')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Sexo</span>
                  {renderSortIcon('sexo')}
                </div>
              </th>

              {/* 3. País */}
              <th 
                onClick={() => handleSort('pais')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  <span>País</span>
                  {renderSortIcon('pais')}
                </div>
              </th>

              {/* 4. Cursos */}
              <th 
                onClick={() => handleSort('cursos')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Cursos</span>
                  {renderSortIcon('cursos')}
                </div>
              </th>

              {/* Promedio Bimestres 1 y 2 */}
              <th 
                onClick={() => handleSort('promedio_b1_b2')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Prom. B1+B2</span>
                  {renderSortIcon('promedio_b1_b2')}
                </div>
              </th>

              {/* 5. Riesgo Académico */}
              <th 
                onClick={() => handleSort('riesgo_academico')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Riesgo Académico</span>
                  {renderSortIcon('riesgo_academico')}
                </div>
              </th>

              {/* Probabilidad RF */}
              <th 
                onClick={() => handleSort('probabilidad_riesgo')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Probabilidad</span>
                  {renderSortIcon('probabilidad_riesgo')}
                </div>
              </th>

              {/* Acciones */}
              <th className="py-3 px-3 text-right">
                <span>Acciones</span>
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-xs">No se encontraron estudiantes para los filtros seleccionados.</p>
                    <button
                      onClick={onResetFilters}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => {
                const is2026 = student.anio === 2026;
                const isHighRisk = student.riesgo_academico === 'Alto';
                return (
                  <tr 
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    
                    {/* Año */}
                    <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <span>{student.anio}</span>
                        {is2026 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold">
                            Prueba
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nombre o Código Estudiante */}
                    <td className="py-3 px-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {student.nombre}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {student.codigo}
                        </div>
                      </div>
                    </td>

                    {/* Sexo */}
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {student.sexo}
                    </td>

                    {/* País */}
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {student.pais}
                    </td>

                    {/* Cursos */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                      <span className={student.cursos >= 7 ? 'text-amber-600 dark:text-amber-400' : ''}>
                        {student.cursos}
                      </span>
                    </td>

                    {/* Promedio B1 + B2 */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {student.promedio_b1_b2.toFixed(2)}
                    </td>

                    {/* Riesgo Académico */}
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold ${
                        isHighRisk
                          ? 'text-red-600 dark:text-red-400'
                          : student.riesgo_academico === 'Medio'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {student.riesgo_academico}
                      </span>
                    </td>

                    {/* Probabilidad RF */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {(student.probabilidad_riesgo * 100).toFixed(0)}%
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-3 text-right">
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Página <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> de <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
