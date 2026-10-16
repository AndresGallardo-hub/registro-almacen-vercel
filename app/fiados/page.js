'use client';
import { useCallback, useEffect, useState } from 'react';

const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const PL = { mercadopago: 'Mercado Pago', naranjax: 'Naranja X', bancor: 'Bancor' };
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Fiados() {
  const [d, setD] = useState({ accounts: [], pagos: [] });
  const [sel, setSel] = useState(null);
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState('efectivo');
  const [plat, setPlat] = useState('mercadopago');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/fiados');
    const j = await r.json();
    if (!j.error) setD(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pagar = async () => {
    const amount = parseInt(monto, 10);
    if (!amount) { setMsg('Ingresá un monto'); return; }
    const now = new Date();
    const r = await fetch('/api/fiados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: sel.key, amount, medio, plat: medio === 'transferencia' ? plat : null, date: dstr(now), ts: now.getTime(), time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }),
    });
    const j = await r.json();
    if (j.error) { setMsg(j.error); return; }
    setMsg(j.resta > 0 ? `${sel.name} pagó ${money(amount)}. Resta ${money(j.resta)}` : `${sel.name} saldó toda la cuenta`);
    setSel(null); setMonto(''); load();
  };
  const deshacer = async (id) => { await fetch('/api/fiados?id=' + id, { method: 'DELETE' }); load(); };

  const deben = d.accounts.filter((a) => a.balance > 0);
  const total = deben.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="wrap">
      <header><h1>Fiados</h1><p>Cuentas pendientes de cobro</p></header>
      <div className="nav"><a href="/">← Registro diario</a></div>
      {msg && <div className="readonly-note">{msg}</div>}
      <div className="card">
        <h2>Quién debe</h2>
        {deben.length === 0 ? <div className="empty">Nadie debe nada</div> : (<>
          {deben.map((a) => (
            <div key={a.key}>
              <button className="row-btn" onClick={() => { setSel(sel && sel.key === a.key ? null : a); setMonto(''); setMsg(''); }}>
                <div className="summary-row"><span className="label">{a.name}</span><span className="val">{money(a.balance)}</span></div>
              </button>
              {sel && sel.key === a.key && (
                <div style={{ padding: '8px 0 14px' }}>
                  <div className="amount-row"><input className="amount-input" inputMode="decimal" placeholder="¿Cuánto pagó?" value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9]/g, ''))} /></div>
                  <div className="btn-group">
                    <button className={`toggle-btn medio-efectivo ${medio === 'efectivo' ? 'active' : ''}`} onClick={() => setMedio('efectivo')}>Efectivo</button>
                    <button className={`toggle-btn medio-transferencia ${medio === 'transferencia' ? 'active' : ''}`} onClick={() => setMedio('transferencia')}>Transferencia</button>
                  </div>
                  {medio === 'transferencia' && (<div className="plat-group">{Object.keys(PL).map((p) => (
                    <button key={p} className={`toggle-btn plat-btn ${plat === p ? 'active' : ''}`} onClick={() => setPlat(p)}>{PL[p]}</button>))}</div>)}
                  <div className="btn-group">
                    <button className="toggle-btn" onClick={() => setMonto(String(a.balance))}>Pagó todo</button>
                    <button className="save-btn" style={{ flex: 2 }} onClick={pagar}>Registrar pago</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="summary-row total"><span className="label">Total que te deben</span><span className="val">{money(total)}</span></div>
        </>)}
      </div>
      <div className="card">
        <h2>Últimos pagos recibidos</h2>
        {d.pagos.length === 0 ? <div className="empty">Sin pagos todavía</div> : d.pagos.map((p) => (
          <div className="move" key={p.id}>
            <div className="info"><div className="amount">{money(p.amount)}</div><div className="meta">{p.date} {p.time} · {p.name}</div></div>
            <button className="del" onClick={() => deshacer(p.id)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
