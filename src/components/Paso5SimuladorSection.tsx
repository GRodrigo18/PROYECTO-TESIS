import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { InfoModelo, ResultadoPrediccion } from '../types';
import { Aviso, Card, NavPasos, Stat, num, pct } from './ui';

interface Props {
  modeloDisponible: boolean;
  onPrevStep: () => void;
}

const OPCIONES_NOTA = ['', 'AD', 'A', 'B', 'C', ...Array.from({ length: 21 }, (_, i) => String(20 - i))];

export const Paso5SimuladorSection: React.FC<Props> = ({ modeloDisponible, onPrevStep }) => {
  const [info, setInfo] = useState<InfoModelo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grado, setGrado] = useState('1');
  const [sede, setSede] = useState('');
  const [sexo, setSexo] = useState('No registrado');
  const [notas, setNotas] = useState<Record<string, { B1: string; B2: string }>>({});
  const [resultado, setResultado] = useState<ResultadoPrediccion | null>(null);
  const [cargando, setCargando] = useState(false);

  // Un resultado anterior no debe quedar en pantalla junto a datos que ya cambiaron.
  useEffect(() => { setResultado(null); }, [grado, sede, sexo, notas]);

  const limpiar = () => {
    if (!info) return;
    setGrado('1');
    setSexo('No registrado');
    setNotas(Object.fromEntries(info.cursos.map(c => [c, { B1: '', B2: '' }])));
    setError(null);
  };

  useEffect(() => {
    if (!modeloDisponible) return;
    let cancelado = false; // una respuesta tardía no debe borrar las notas ya ingresadas
    fetch('/api/modelo')
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        if (cancelado) return;
        setInfo(j);
        setSede(j.sedes[0]);
        setNotas(Object.fromEntries(j.cursos.map((c: string) => [c, { B1: '', B2: '' }])));
      })
      .catch(e => !cancelado && setError(e.message));
    return () => {
      cancelado = true;
    };
  }, [modeloDisponible]);

  const predecir = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch('/api/predecir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros: [{ grado, sede, sexo, notas }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResultado(j.resultados[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const selectCls = 'px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';

  return (
    <div className="space-y-6 tab-content-enter">
      <Card>
        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-2">PASO 5 · SIMULADOR CON EL MODELO ENTRENADO</div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Probar el modelo con un estudiante</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-3xl">
          Las notas de B1 y B2 se envían al modelo guardado en <code>tesis-rf/resultados/modelo_rf.joblib</code> (scikit-learn).
          El mismo estudiante siempre da la misma probabilidad. No se agrega a ningún conjunto de datos.
        </p>
      </Card>

      {!modeloDisponible ? (
        <Aviso title="El simulador necesita un modelo entrenado">
          <p>Se habilita cuando <code>pipeline_rf_tesis.py</code> genera <code>modelo_rf.joblib</code> (ver Paso 3). El servidor necesita Python con las dependencias de <code>tesis-rf/requirements.txt</code>.</p>
        </Aviso>
      ) : !info ? (
        error ? <Aviso tipo="alerta" title="No se pudo cargar el modelo"><p>{error}</p></Aviso>
          : <p className="text-xs text-slate-500">Cargando modelo…</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Datos del estudiante" className="lg:col-span-2">
            <div className="flex flex-wrap gap-3 mb-4 text-xs">
              <label className="flex flex-col gap-1">Grado
                <select value={grado} onChange={e => setGrado(e.target.value)} className={`${selectCls} w-20`}>
                  {['1', '2', '3', '4', '5'].map(g => <option key={g} value={g}>{g}.º</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Sede
                <select value={sede} onChange={e => setSede(e.target.value)} className={selectCls}>
                  {info.sedes.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Sexo
                <select value={sexo} onChange={e => setSexo(e.target.value)} className={selectCls}>
                  {['Femenino', 'Masculino', 'No registrado'].map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1">Curso</th><th>B1</th><th>B2</th></tr></thead>
              <tbody>
                {info.cursos.map(c => (
                  <tr key={c} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 text-slate-700 dark:text-slate-300">{c}</td>
                    {(['B1', 'B2'] as const).map(b => (
                      <td key={b}>
                        <select value={notas[c]?.[b] ?? ''} className={selectCls}
                          onChange={e => setNotas(n => ({ ...n, [c]: { ...n[c], [b]: e.target.value } }))}>
                          {OPCIONES_NOTA.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={predecir} disabled={cargando}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                {cargando && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}{cargando ? 'Prediciendo…' : 'Predecir'}
              </button>
              <button onClick={limpiar} disabled={cargando}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50">
                Limpiar
              </button>
              <span className="text-[11px] text-slate-400">Notas en letras (AD/A/B/C) o en número (0-20). Se necesitan B1 y B2 de los {info.cursos.length} cursos.</span>
            </div>
          </Card>

          <div className="space-y-4">
            {error && <Aviso tipo="alerta" title="Error"><p>{error}</p></Aviso>}
            {resultado && !resultado.ok && (
              <Aviso tipo="alerta" title="No se predijo: hay notas faltantes o inválidas">
                <ul className="list-disc pl-4">{resultado.errores?.map(e => <li key={e}>{e}</li>)}</ul>
              </Aviso>
            )}
            {resultado?.ok && (
              <>
                <Stat label="Probabilidad de riesgo" value={pct(resultado.probabilidad_riesgo)}
                  tone={resultado.alerta_riesgo ? 'red' : 'emerald'}
                  hint={resultado.alerta_riesgo ? `Alerta (umbral ${num(info.umbral)})` : `Sin alerta (umbral ${num(info.umbral)})`} />
                <Stat label="Votos de árboles" value={`${resultado.votos_arboles_riesgo}/${resultado.total_arboles}`} tone="blue"
                  hint="Árboles que clasifican «riesgo»" />
              </>
            )}
          </div>
        </div>
      )}

      <NavPasos onPrev={onPrevStep} />
    </div>
  );
};
