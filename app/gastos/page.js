'use client';
import { useCallback, useEffect, useState } from 'react';

const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Gastos() {
  const [data, setData] = useState({ hoy: [], acum: [], provs: [] });
  const [prov, setProv] = useState('');
  const [monto, setMonto] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/gastos?date=' + dstr(new Date()));
    const j = await r.json();
    if (!j.error) setData(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  const guardar = async () => {
    const amount = parseInt(monto, 10);
    if (!prov.trim() || !amount) { setMsg('Completá proveedor y monto'); return; }
    const now = new Date();
    const r = await fetch('/api/gastos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proveedor: prov, amount, date: dstr(now), ts: now.getTime(), time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }),
    });
    const j = await r.json();
    if (j.error) { setMsg(j.error); return; }
    setMsg(j.created ? `Proveedor nuevo creado: ${j.name}` : `Sumado a ${j.name}`);
    setProv(''); setMonto(''); load();
  };
  const borrar = async (id) => { await fetch('/api/gastos?id=' + id, { method: 'DELETE' }); load(); };
  const totalAcum = data.acum.reduce((s, a) => s + a.total, 0);

  return (
    <div className="wrap">
      <header><h1>Gastos</h1><p>Proveedores y sectores</p></header>
      <div className="nav"><a href="/">← Registro diario</a></div>
      <div className="card">
        <h2>Nuevo gasto</h2>
        <input className="cliente-input" list="provs" placeholder="Proveedor o sector" value={prov} onChange={(e) => setProv(e.target.value)} />
        <datalist id="provs">{data.provs.map((p) => <option key={p} value={p} />)}</datalist>
        <div className="amount-row">
          <input className="amount-input" inputMode="decimal" placeholder="$ 0" value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <button className="save-btn" onClick={guardar}>Guardar gasto</button>
        {msg && <p className="msg">{msg}</p>}
      </div>
      <div className="card">
        <h2>Gastos de hoy</h2>
        {data.hoy.length === 0 ? <div className="empty">Sin gastos cargados hoy</div> : data.hoy.map((g) => (
          <div className="move" key={g.id}>
            <div className="info"><div className="amount">{money(g.amount)}</div><div className="meta">{g.time} · {g.prov_name}</div></div>
            <button className="del" onClick={() => borrar(g.id)}>&times;</button>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Acumulado por proveedor (últimos 32 días)</h2>
        {data.acum.length === 0 ? <div className="empty">Sin datos</div> : (<>
          {data.acum.map((a) => (<div className="summary-row" key={a.name}><span className="label">{a.name}</span><span className="val">{money(a.total)}</span></div>))}
          <div className="summary-row total"><span className="label">Total gastado</span><span className="val">{money(totalAcum)}</span></div>
        </>)}
      </div>
    </div>
  );
}
