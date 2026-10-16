'use client';
import { useEffect, useMemo, useState } from 'react';

const money = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const initial = () => { const n = new Date(); n.setDate(1); if (new Date().getDate() === 1) n.setMonth(n.getMonth() - 1); return ym(n); };
const prevMonth = () => { const n = new Date(); n.setDate(1); n.setMonth(n.getMonth() - 1); return ym(n); };
const monthLabel = (m) => { const [y, x] = m.split('-').map(Number); const s = new Date(y, x - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const dayLabel = (s) => { const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const PL = { mercadopago: 'Mercado Pago', naranjax: 'Naranja X', bancor: 'Bancor' };
const Row = ({ cls, label, val, indent, neg }) => (
  <div className={`summary-row ${neg ? 'neg' : ''}`} style={indent ? { paddingLeft: 18 } : null}>
    <span className="label">{cls && <span className={`tag-dot ${cls}`} />}{label}</span><span className="val">{money(val)}</span>
  </div>
);

export default function Balance() {
  const [month, setMonth] = useState(initial());
  const [data, setData] = useState({ sales: [], expenses: [], payments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/summary?month=${month}`).then((r) => r.json()).then((j) => setData({ sales: j.sales || [], expenses: j.expenses || [], payments: j.payments || [] })).finally(() => setLoading(false));
  }, [month]);

  const t = useMemo(() => {
    let ef = 0, tr = 0, fi = 0, cob = 0, gas = 0;
    const pl = { mercadopago: 0, naranjax: 0, bancor: 0 }, dia = {}, prov = {};
    data.sales.forEach((e) => {
      dia[e.date] = (dia[e.date] || 0) + e.amount;
      if (e.tipo === 'fiado') fi += e.amount;
      else if (e.medio === 'efectivo') ef += e.amount;
      else { tr += e.amount; if (e.plat) pl[e.plat] += e.amount; }
    });
    data.payments.forEach((p) => { cob += p.amount; });
    data.expenses.forEach((g) => { gas += g.amount; prov[g.prov_key] = prov[g.prov_key] || { name: g.prov_name, total: 0 }; prov[g.prov_key].total += g.amount; });
    const cobrado = ef + tr + cob;
    return { ef, tr, fi, cob, gas, pl, cobrado, vendido: ef + tr + fi, neto: cobrado - gas,
      dias: Object.keys(dia).sort().map((d) => ({ d, v: dia[d] })), provs: Object.values(prov).sort((a, b) => b.total - a.total) };
  }, [data]);

  const empty = !loading && !data.sales.length && !data.expenses.length && !data.payments.length;

  return (
    <div className="wrap">
      <header><h1>Balance mensual</h1><p>{monthLabel(month)}</p></header>
      <div className="nav"><a href="/">← Registro diario</a></div>
      <div className="date-jump">
        <label htmlFor="mp">Mes:</label>
        <input id="mp" type="month" value={month} min={prevMonth()} max={ym(new Date())} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      {loading ? <div className="card"><div className="empty">Cargando…</div></div> : empty ? <div className="card"><div className="empty">Sin movimientos este mes</div></div> : (<>
        <div className="card">
          <h2>Ingresos</h2>
          <Row cls="cash" label="Efectivo" val={t.ef} />
          <Row cls="transfer" label="Transferencia" val={t.tr} />
          {Object.keys(PL).map((p) => t.pl[p] > 0 && <Row key={p} label={PL[p]} val={t.pl[p]} indent />)}
          <Row cls="fiado" label="Fiado (a cobrar)" val={t.fi} />
          <div className="summary-row total"><span className="label">Total vendido</span><span className="val">{money(t.vendido)}</span></div>
          <Row label="Cobranza de fiados recibida" val={t.cob} />
        </div>
        <div className="card">
          <h2>Gastos por proveedor</h2>
          {t.provs.length === 0 ? <div className="empty">Sin gastos</div> : t.provs.map((p) => (
            <div className="summary-row" key={p.name}><span className="label">{p.name} ({Math.round((p.total / t.gas) * 100)}%)</span><span className="val">{money(p.total)}</span></div>
          ))}
          <div className="summary-row total"><span className="label">Total gastado</span><span className="val">{money(t.gas)}</span></div>
        </div>
        <div className="card">
          <h2>Resultado del mes</h2>
          <Row label="Ingresos cobrados (efectivo + transf. + cobranzas)" val={t.cobrado} />
          <Row label="Gastos" val={t.gas} neg />
          <div className={`summary-row total ${t.neto < 0 ? 'neg' : ''}`}><span className="label">Resultado</span><span className="val">{money(t.neto)}</span></div>
        </div>
        {t.dias.length > 0 && <div className="card"><h2>Ventas por día</h2>{t.dias.map((x) => <Row key={x.d} label={dayLabel(x.d)} val={x.v} />)}</div>}
      </>)}
    </div>
  );
}
