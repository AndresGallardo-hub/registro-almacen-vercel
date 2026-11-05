'use client';
import { useCallback, useEffect, useState } from 'react';

const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Gastos() {
  const [data, setData] = useState({ hoy: [], acum: [], provs: [], deudas: [] });
  const [prov, setProv] = useState('');
  const [monto, setMonto] = useState('');
  const [estado, setEstado] = useState('todo');
  const [pagado, setPagado] = useState('');
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState(null);
  const [abono, setAbono] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/gastos?date=' + dstr(new Date()));
    const j = await r.json();
    if (!j.error) setData(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (body) => {
    const now = new Date();
    const r = await fetch('/api/gastos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, date: dstr(now), ts: now.getTime(), time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }),
    });
    return r.json();
  };
  const guardar = async () => {
    const amount = parseInt(monto, 10);
    if (!prov.trim() || !amount) { setMsg('Completá proveedor y monto'); return; }
    const paid = estado === 'todo' ? amount : parseInt(pagado || '0', 10);
    const j = await send({ proveedor: prov, amount, paid });
    if (j.error) { setMsg(j.error); return; }
    setMsg((j.created ? `Proveedor nuevo creado: ${j.name}` : `Sumado a ${j.name}`) + (j.deuda > 0 ? ` · Deuda con ${j.name}: ${money(j.deuda)}` : ''));
    setProv(''); setMonto(''); setPagado(''); setEstado('todo'); load();
  };
  const pagarDeuda = async () => {
    const paid = parseInt(abono, 10);
    if (!paid) { setMsg('Ingresá un monto'); return; }
    const j = await send({ kind: 'pago', proveedor: sel.name, paid });
    if (j.error) { setMsg(j.error); return; }
    setMsg(j.deuda > 0 ? `Pagaste ${money(paid)} a ${j.name}. Resta ${money(j.deuda)}` : `Saldaste la deuda con ${j.name}`);
    setSel(null); setAbono(''); load();
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
        <div className="btn-group">
          <button className={`toggle-btn tipo-cobrado ${estado === 'todo' ? 'active' : ''}`} onClick={() => setEstado('todo')}>Pagué todo</button>
          <button className={`toggle-btn tipo-fiado ${estado === 'deuda' ? 'active' : ''}`} onClick={() => setEstado('deuda')}>Quedó deuda</button>
        </div>
        {estado === 'deuda' && (
          <input className="cliente-input" inputMode="decimal" placeholder="¿Cuánto pagué ahora? (0 si nada)" value={pagado} onChange={(e) => setPagado(e.target.value.replace(/[^0-9]/g, ''))} />
        )}
        <button className="save-btn" onClick={guardar}>Guardar gasto</button>
        {msg && <p className="msg">{msg}</p>}
      </div>
      {data.deudas.length > 0 && (
        <div className="card">
          <h2>Deudas con proveedores</h2>
          {data.deudas.map((x) => (
            <div key={x.key}>
              <button className="row-btn" onClick={() => { setSel(sel && sel.key === x.key ? null : x); setAbono(''); setMsg(''); }}>
                <div className="summary-row"><span className="label">{x.name}{x.debt_since ? ` · desde ${x.debt_since}` : ''}</span><span className="val">{money(x.debt)}</span></div>
              </button>
              {sel && sel.key === x.key && (
                <div style={{ padding: '8px 0 14px' }}>
                  <div className="amount-row"><input className="amount-input" inputMode="decimal" placeholder="¿Cuánto pagué?" value={abono} onChange={(e) => setAbono(e.target.value.replace(/[^0-9]/g, ''))} /></div>
                  <div className="btn-group">
                    <button className="toggle-btn" onClick={() => setAbono(String(x.debt))}>Pagué todo</button>
                    <button className="save-btn" style={{ flex: 2 }} onClick={pagarDeuda}>Registrar pago</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <h2>Gastos de hoy</h2>
        {data.hoy.length === 0 ? <div className="empty">Sin gastos cargados hoy</div> : data.hoy.map((g) => (
          <div className="move" key={g.id}>
            <div className="info">
              <div className="amount">{money(g.amount || g.paid)}</div>
              <div className="meta">{g.time} · {g.prov_name}{g.amount === 0 ? ' · pago de deuda' : g.paid < g.amount ? ` · pagado ${money(g.paid)}` : ''}</div>
            </div>
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
