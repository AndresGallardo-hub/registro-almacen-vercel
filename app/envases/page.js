'use client';
import { useCallback, useEffect, useState } from 'react';

const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const T = { gaseosa: 'Gaseosa', cerveza: 'Cerveza' };

export default function Envases() {
  const [d, setD] = useState({ accounts: [], movs: [] });
  const [name, setName] = useState('');
  const [tipo, setTipo] = useState('gaseosa');
  const [qty, setQty] = useState('');
  const [sel, setSel] = useState(null);
  const [rt, setRt] = useState('gaseosa');
  const [rq, setRq] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/envases');
    const j = await r.json();
    if (!j.error) setD(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (body) => {
    const now = new Date();
    const r = await fetch('/api/envases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, date: dstr(now), ts: now.getTime(), time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }),
    });
    return r.json();
  };
  const prestar = async () => {
    const n = parseInt(qty, 10);
    if (!name.trim() || !n) { setMsg('Completá la persona y la cantidad'); return; }
    const j = await send({ kind: 'presto', name, tipo, qty: n });
    if (j.error) { setMsg(j.error); return; }
    setMsg(`${j.name} se llevó ${n} de ${tipo}. En total tiene ${j.qty} de ${tipo}.`);
    setName(''); setQty(''); load();
  };
  const devolver = async () => {
    const n = parseInt(rq, 10);
    if (!n) { setMsg('Ingresá cuántos devolvió'); return; }
    const j = await send({ kind: 'devolvio', name: sel.name, tipo: rt, qty: n });
    if (j.error) { setMsg(j.error); return; }
    setMsg(`${j.name} devolvió ${n} de ${rt}. Le quedan ${j.qty}.`);
    setSel(null); setRq(''); load();
  };
  const deshacer = async (id) => { await fetch('/api/envases?id=' + id, { method: 'DELETE' }); load(); };

  const tienen = d.accounts.filter((a) => a.gaseosa + a.cerveza > 0);
  const totG = d.accounts.reduce((s, a) => s + a.gaseosa, 0);
  const totC = d.accounts.reduce((s, a) => s + a.cerveza, 0);

  return (
    <div className="wrap">
      <header><h1>Envases</h1><p>Prestados a clientes</p></header>
      <div className="nav"><a href="/">← Registro diario</a></div>
      {msg && <div className="readonly-note">{msg}</div>}
      <div className="card">
        <h2>Prestar envases</h2>
        <input className="cliente-input" type="text" placeholder="Nombre de la persona" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="sugs">
          {d.accounts.filter((a) => norm(a.name).includes(norm(name)) && norm(a.name) !== norm(name)).slice(0, 8).map((a) => (
            <button key={a.key} type="button" className="sug" onClick={() => setName(a.name)}>{a.name}</button>
          ))}
        </div>
        <div className="btn-group">
          <button className={`toggle-btn medio-efectivo ${tipo === 'gaseosa' ? 'active' : ''}`} onClick={() => setTipo('gaseosa')}>Gaseosa</button>
          <button className={`toggle-btn medio-transferencia ${tipo === 'cerveza' ? 'active' : ''}`} onClick={() => setTipo('cerveza')}>Cerveza</button>
        </div>
        <div className="amount-row">
          <input className="amount-input" inputMode="numeric" placeholder="Cantidad" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <button className="save-btn" onClick={prestar}>Registrar préstamo</button>
      </div>
      <div className="card">
        <h2>Quién tiene envases</h2>
        {tienen.length === 0 ? <div className="empty">Nadie tiene envases prestados</div> : (<>
          {tienen.map((a) => (
            <div key={a.key}>
              <button className="row-btn" onClick={() => { setSel(sel && sel.key === a.key ? null : a); setRt(a.gaseosa > 0 ? 'gaseosa' : 'cerveza'); setRq(''); setMsg(''); }}>
                <div className="summary-row"><span className="label">{a.name}</span><span className="val">Gaseosa {a.gaseosa} · Cerveza {a.cerveza}</span></div>
              </button>
              {sel && sel.key === a.key && (
                <div style={{ padding: '8px 0 14px' }}>
                  <div className="btn-group">
                    <button className={`toggle-btn medio-efectivo ${rt === 'gaseosa' ? 'active' : ''}`} onClick={() => setRt('gaseosa')}>Gaseosa ({a.gaseosa})</button>
                    <button className={`toggle-btn medio-transferencia ${rt === 'cerveza' ? 'active' : ''}`} onClick={() => setRt('cerveza')}>Cerveza ({a.cerveza})</button>
                  </div>
                  <div className="amount-row"><input className="amount-input" inputMode="numeric" placeholder="¿Cuántos devolvió?" value={rq} onChange={(e) => setRq(e.target.value.replace(/[^0-9]/g, ''))} /></div>
                  <div className="btn-group">
                    <button className="toggle-btn" onClick={() => setRq(String(a[rt]))}>Devolvió todos</button>
                    <button className="save-btn" style={{ flex: 2 }} onClick={devolver}>Registrar devolución</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="summary-row total"><span className="label">Total prestados</span><span className="val">Gaseosa {totG} · Cerveza {totC}</span></div>
        </>)}
      </div>
      <div className="card">
        <h2>Últimos movimientos</h2>
        {d.movs.length === 0 ? <div className="empty">Sin movimientos</div> : d.movs.map((m) => (
          <div className="move" key={m.id}>
            <div className="info"><div className="amount">{m.name}</div><div className="meta">{m.date} {m.time} · {m.kind === 'presto' ? 'se llevó' : 'devolvió'} {m.qty} de {m.tipo}</div></div>
            <button className="del" onClick={() => deshacer(m.id)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
