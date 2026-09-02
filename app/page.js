'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

function fmtDate(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, '0'),
    day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayStr() {
  return fmtDate(new Date());
}
function labelForDate(dateStr, today) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const todayD = new Date();
  todayD.setHours(0, 0, 0, 0);
  const diffDays = Math.round((todayD - date) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  const wd = date.toLocaleDateString('es-AR', { weekday: 'short' });
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)} ${d}`;
}
function fullLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const s = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function money(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}
function last14Days() {
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(fmtDate(d));
  }
  return arr;
}

const PLAT_NAMES = { mercadopago: 'Mercado Pago', naranjax: 'Naranja X', bancor: 'Bancor' };

export default function Home() {
  const today = todayStr();
  const [currentDate, setCurrentDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [daysWithData, setDaysWithData] = useState(new Set());
  const [toast, setToast] = useState('');
  const [dateInput, setDateInput] = useState(today);

  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState('cobrado');
  const [medio, setMedio] = useState('efectivo');
  const [plat, setPlat] = useState('mercadopago');
  const [cliente, setCliente] = useState('');

  const chipDays = useMemo(() => last14Days(), []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1400);
  };

  const fetchEntries = useCallback(async (date) => {
    try {
      const res = await fetch(`/api/entries?date=${date}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries(data.entries || []);
    } catch (err) {
      showToast(err.message || 'No se pudo cargar');
    }
  }, []);

  const fetchDaysWithData = useCallback(async () => {
    try {
      const from = chipDays[chipDays.length - 1];
      const to = chipDays[0];
      const res = await fetch(`/api/days?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.days) setDaysWithData(new Set(data.days));
    } catch (err) {
      // silencioso: los puntitos son solo decorativos
    }
  }, [chipDays]);

  useEffect(() => {
    fetchEntries(currentDate);
    fetchDaysWithData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const switchDay = (dateStr) => {
    setCurrentDate(dateStr);
    setDateInput(dateStr);
  };

  const handleSave = async () => {
    const amount = parseInt(monto, 10);
    if (!amount || amount <= 0) {
      showToast('Ingresá un monto');
      return;
    }
    const now = new Date();
    const entry = {
      date: today,
      time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      ts: now.getTime(),
      amount,
      tipo,
      medio: tipo === 'fiado' ? null : medio,
      plat: tipo !== 'fiado' && medio === 'transferencia' ? plat : null,
      cliente: tipo === 'fiado' ? cliente.trim() : null,
    };
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMonto('');
      setCliente('');
      showToast('Venta guardada');
      if (currentDate === today) fetchEntries(today);
      fetchDaysWithData();
    } catch (err) {
      showToast(err.message || 'No se pudo guardar');
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      fetchEntries(currentDate);
      fetchDaysWithData();
    } catch (err) {
      showToast('No se pudo borrar');
    }
  };

  const summary = useMemo(() => {
    let efectivo = 0,
      transferencia = 0,
      fiado = 0;
    const desglose = { mercadopago: 0, naranjax: 0, bancor: 0 };
    entries.forEach((e) => {
      if (e.tipo === 'fiado') {
        fiado += e.amount;
        return;
      }
      if (e.medio === 'efectivo') efectivo += e.amount;
      else if (e.medio === 'transferencia') {
        transferencia += e.amount;
        if (e.plat) desglose[e.plat] += e.amount;
      }
    });
    return { efectivo, transferencia, fiado, desglose, total: efectivo + transferencia + fiado };
  }, [entries]);

  return (
    <div className="wrap">
      <header>
        <h1>Registro del almacén</h1>
        <p>{fullLabel(currentDate)}</p>
      </header>

      <div className="days">
        {chipDays.map((d) => (
          <button
            key={d}
            className={`day-chip ${d === currentDate ? 'active' : ''}`}
            onClick={() => switchDay(d)}
          >
            {labelForDate(d)}
            {daysWithData.has(d) && <span className="dot" />}
          </button>
        ))}
      </div>

      <div className="date-jump">
        <label htmlFor="dateJump">Buscar otra fecha:</label>
        <input
          id="dateJump"
          type="date"
          value={dateInput}
          max={today}
          onChange={(e) => {
            setDateInput(e.target.value);
            if (e.target.value) switchDay(e.target.value);
          }}
        />
      </div>

      {currentDate === today ? (
        <div className="card">
          <h2>Nueva venta</h2>
          <div className="amount-row">
            <input
              className="amount-input"
              type="text"
              inputMode="decimal"
              placeholder="$ 0"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>

          <div className="btn-group">
            <button
              className={`toggle-btn tipo-cobrado ${tipo === 'cobrado' ? 'active' : ''}`}
              onClick={() => setTipo('cobrado')}
            >
              Cobrado ahora
            </button>
            <button
              className={`toggle-btn tipo-fiado ${tipo === 'fiado' ? 'active' : ''}`}
              onClick={() => setTipo('fiado')}
            >
              Fiado
            </button>
          </div>

          {tipo === 'cobrado' && (
            <div className="btn-group">
              <button
                className={`toggle-btn medio-efectivo ${medio === 'efectivo' ? 'active' : ''}`}
                onClick={() => setMedio('efectivo')}
              >
                Efectivo
              </button>
              <button
                className={`toggle-btn medio-transferencia ${medio === 'transferencia' ? 'active' : ''}`}
                onClick={() => setMedio('transferencia')}
              >
                Transferencia
              </button>
            </div>
          )}

          {tipo === 'cobrado' && medio === 'transferencia' && (
            <div className="plat-group">
              {Object.keys(PLAT_NAMES).map((p) => (
                <button
                  key={p}
                  className={`toggle-btn plat-btn ${plat === p ? 'active' : ''}`}
                  onClick={() => setPlat(p)}
                >
                  {PLAT_NAMES[p]}
                </button>
              ))}
            </div>
          )}

          {tipo === 'fiado' && (
            <input
              className="cliente-input"
              type="text"
              placeholder="Nombre del cliente (opcional)"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />
          )}

          <button className="save-btn" onClick={handleSave}>
            Guardar venta
          </button>
        </div>
      ) : (
        <div className="readonly-note">Estás viendo un día anterior. Solo se puede cargar en &quot;Hoy&quot;.</div>
      )}

      <div className="card">
        <h2>Resumen del día</h2>
        {entries.length === 0 ? (
          <div className="empty">Sin movimientos</div>
        ) : (
          <>
            <div className="summary-row">
              <span className="label"><span className="tag-dot cash" />Efectivo</span>
              <span className="val">{money(summary.efectivo)}</span>
            </div>
            <div className="summary-row">
              <span className="label"><span className="tag-dot transfer" />Transferencia</span>
              <span className="val">{money(summary.transferencia)}</span>
            </div>
            {Object.keys(PLAT_NAMES).map(
              (p) =>
                summary.desglose[p] > 0 && (
                  <div className="summary-row" style={{ paddingLeft: 18 }} key={p}>
                    <span className="label">{PLAT_NAMES[p]}</span>
                    <span className="val">{money(summary.desglose[p])}</span>
                  </div>
                )
            )}
            <div className="summary-row">
              <span className="label"><span className="tag-dot fiado" />Fiado (pendiente de cobro)</span>
              <span className="val">{money(summary.fiado)}</span>
            </div>
            <div className="summary-row total">
              <span className="label">Total vendido</span>
              <span className="val">{money(summary.total)}</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Movimientos</h2>
        {entries.length === 0 ? (
          <div className="empty">Todavía no hay ventas cargadas.</div>
        ) : (
          entries.map((e) => {
            const badge = e.tipo === 'fiado' ? 'fiado' : e.medio === 'efectivo' ? 'cash' : 'transfer';
            let meta = e.time;
            if (e.tipo === 'fiado') meta += ' · Fiado' + (e.cliente ? ' · ' + e.cliente : '');
            else if (e.medio === 'efectivo') meta += ' · Efectivo';
            else meta += ' · ' + PLAT_NAMES[e.plat];
            return (
              <div className="move" key={e.id}>
                <span className={`badge ${badge}`} />
                <div className="info">
                  <div className="amount">{money(e.amount)}</div>
                  <div className="meta">{meta}</div>
                </div>
                {currentDate === today && (
                  <button className="del" onClick={() => handleDelete(e.id)}>
                    &times;
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
