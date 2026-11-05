'use client';
import { useEffect, useState } from 'react';

const KEY = 'alertas_ocultas';
export default function Alerts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch('/api/alerts').then((r) => r.json()).then((j) => {
      let h = []; try { h = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
      setItems((j.alerts || []).filter((a) => !h.includes(a.id)));
    }).catch(() => {});
  }, []);
  const hide = (id) => {
    try { const h = JSON.parse(localStorage.getItem(KEY) || '[]'); h.push(id); localStorage.setItem(KEY, JSON.stringify(h.slice(-200))); } catch (e) {}
    setItems((x) => x.filter((a) => a.id !== id));
  };
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      {items.map((a) => (
        <div className="alert" key={a.id}>
          <div style={{ flex: 1 }}>{a.text} {a.href && <a href={a.href}>Ver</a>}</div>
          <button onClick={() => hide(a.id)}>Entendido</button>
        </div>
      ))}
    </div>
  );
}
