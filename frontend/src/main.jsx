import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  List,
  Settings,
  ArrowDownAZ,
  ArrowUpAZ,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';

import './styles.css';

const STATUS = [
  'Orderan Masuk',
  'Revisi',
  'Antri Cetak',
  'Proses Cetak',
  'Selesai Cetak',
  'Pending',
  'Sudah Dikirim',
];

const ALL_TAB = 'Semua List';
const TYPE = ['Digital', 'Cetak'];
const API_STORAGE_KEY = 'rwi-order-board-api-url';
const DEFAULT_REMOTE_API = 'https://order.royalweddinginvitiation.com/backend/api.php';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function isDesktopRuntime() {
  return window.location.protocol === 'tauri:' || window.location.hostname === 'tauri.localhost';
}

function getDefaultApiUrl() {
  const saved = window.localStorage.getItem(API_STORAGE_KEY);
  if (saved) return saved;
  if (isDesktopRuntime()) return DEFAULT_REMOTE_API;
  return import.meta.env.VITE_API_URL || './backend/api.php';
}

function normalizeApiUrl(value) {
  return value.trim().replace(/\/$/, '');
}

function parseOrderDate(orderNo) {
  const match = String(orderNo || '').match(/(?:^|\D)(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;

  const year = 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return { date, label: `${String(day).padStart(2, '0')} ${MONTHS[month - 1]}` };
}

function splitOrderNumbers(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const parts = text.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

function getOrderDateInfo(orderNo) {
  const parsed = splitOrderNumbers(orderNo).map(parseOrderDate).filter(Boolean);
  if (!parsed.length) return null;
  return { primary: parsed[0], labels: [...new Set(parsed.map((item) => item.label))] };
}

function getOrderTimestamp(order) {
  const info = getOrderDateInfo(order.orderNo);
  if (info?.primary?.date) return info.primary.date.getTime();
  const created = new Date(order.createdAt || 0).getTime();
  return Number.isNaN(created) ? 0 : created;
}

function variantClass(value) {
  const variant = String(value || '').toLowerCase();
  if (variant.includes('merah') || variant.includes('red')) return 'variant-red';
  if (variant.includes('biru') || variant.includes('blue')) return 'variant-blue';
  if (variant.includes('hijau') || variant.includes('green') || variant.includes('sage')) return 'variant-green';
  if (variant.includes('coklat') || variant.includes('brown')) return 'variant-brown';
  if (variant.includes('pink')) return 'variant-pink';
  if (variant.includes('hitam') || variant.includes('black')) return 'variant-black';
  return 'variant-neutral';
}

async function requestApi(baseUrl, path = '', options = {}) {
  const normalized = normalizeApiUrl(baseUrl);
  const sep = normalized.includes('?') ? '&' : '?';
  const response = await fetch(`${normalized}${sep}path=${encodeURIComponent(path)}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body?.message || `Request gagal (${response.status})`);
  }
  return body;
}

const emptyForm = {
  orderNo: '', type: 'Digital', variant: '', qty: 1, couple: '', status: 'Orderan Masuk', notes: '',
};

function App() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('Orderan Masuk');
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(getDefaultApiUrl);
  const [apiDraft, setApiDraft] = useState(getDefaultApiUrl);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState('');
  const [connectionOk, setConnectionOk] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  async function loadOrders(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await requestApi(apiUrl, '/orders');
      setOrders((result?.data || []).map((order) => ({ ...order, type: order.type === 'Digital + Cetak' ? 'Cetak' : order.type })));
      setConnectionOk(true);
      setLastSync(new Date());
    } catch (err) {
      setConnectionOk(false);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadOrders(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [apiUrl]);

  const counts = useMemo(() => {
    const statusCounts = STATUS.reduce((acc, status) => {
      acc[status] = orders.filter((order) => order.status === status).length;
      return acc;
    }, {});
    statusCounts[ALL_TAB] = orders.length;
    return statusCounts;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((order) => q || activeTab === ALL_TAB || order.status === activeTab)
      .filter((order) => !q || [order.orderNo, order.type, order.variant, order.couple, order.status, order.notes].join(' ').toLowerCase().includes(q))
      .sort((a, b) => {
        const delta = getOrderTimestamp(b) - getOrderTimestamp(a);
        return sortDirection === 'desc' ? delta : -delta;
      });
  }, [orders, activeTab, search, sortDirection]);

  const pageTitle = search.trim() ? 'Hasil Pencarian' : activeTab;

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, status: activeTab === ALL_TAB ? 'Orderan Masuk' : activeTab });
    setModalOpen(true);
  }

  function openEdit(order) {
    setEditingId(order.id);
    setForm({
      orderNo: order.orderNo,
      type: order.type === 'Digital + Cetak' ? 'Cetak' : order.type,
      variant: order.variant || '', qty: order.qty, couple: order.couple,
      status: order.status, notes: order.notes || '',
    });
    setModalOpen(true);
  }

  function openOrderInStatus(order) {
    setActiveTab(order.status);
    setSearch('');
  }

  async function saveOrder(event) {
    event.preventDefault();
    if (!form.orderNo.trim() || !form.couple.trim()) return;
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, type: TYPE.includes(form.type) ? form.type : 'Digital', qty: Number(form.qty) || 1 };
      const result = editingId
        ? await requestApi(apiUrl, `/orders/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await requestApi(apiUrl, '/orders', { method: 'POST', body: JSON.stringify(payload) });
      setOrders((previous) => editingId
        ? previous.map((order) => order.id === editingId ? result.data : order)
        : [result.data, ...previous]);
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setConnectionOk(true);
      setLastSync(new Date());
    } catch (err) {
      setConnectionOk(false);
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function changeStatus(id, status) {
    const previousOrders = orders;
    setOrders((previous) => previous.map((order) => order.id === id ? { ...order, status } : order));
    setError('');
    try {
      const result = await requestApi(apiUrl, `/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders((previous) => previous.map((order) => order.id === id ? result.data : order));
      setConnectionOk(true);
      setLastSync(new Date());
    } catch (err) {
      setOrders(previousOrders);
      setConnectionOk(false);
      setError(err.message);
    }
  }

  async function removeOrder(id) {
    if (!window.confirm('Hapus order ini?')) return;
    setError('');
    try {
      await requestApi(apiUrl, `/orders/${id}`, { method: 'DELETE' });
      setOrders((previous) => previous.filter((order) => order.id !== id));
      setConnectionOk(true);
      setLastSync(new Date());
    } catch (err) {
      setConnectionOk(false);
      setError(err.message);
    }
  }

  async function testConnection() {
    const candidate = normalizeApiUrl(apiDraft);
    if (!candidate) return;
    setTestingConnection(true);
    setError('');
    try {
      await requestApi(candidate, '/orders');
      setConnectionOk(true);
    } catch (err) {
      setConnectionOk(false);
      setError(`Koneksi gagal: ${err.message}`);
    } finally { setTestingConnection(false); }
  }

  function saveApiSettings(event) {
    event.preventDefault();
    const candidate = normalizeApiUrl(apiDraft);
    if (!candidate) return;
    window.localStorage.setItem(API_STORAGE_KEY, candidate);
    setApiUrl(candidate);
    setSettingsOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><ClipboardList size={20} /></div><div><strong>Royal Wedding</strong><span>Order Board</span></div></div>
        <nav className="tabs">
          <button onClick={() => setActiveTab(ALL_TAB)} className={activeTab === ALL_TAB && !search.trim() ? 'active' : ''}>
            <span className="tab-label"><List size={15} />{ALL_TAB}</span><b>{counts[ALL_TAB] || 0}</b>
          </button>
          {STATUS.map((status) => (
            <button key={status} onClick={() => setActiveTab(status)} className={activeTab === status && !search.trim() ? 'active' : ''}>
              <span>{status}</span><b>{counts[status] || 0}</b>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className={connectionOk ? 'connection ok' : 'connection'}>{connectionOk ? <Wifi size={14} /> : <WifiOff size={14} />}<span>{connectionOk ? 'Database terhubung' : 'Tidak terhubung'}</span></div>
          <button className="settings-btn" onClick={() => { setApiDraft(apiUrl); setSettingsOpen(true); }}><Settings size={15} />Pengaturan koneksi</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar"><div><p className="eyebrow">WORKSPACE</p><h1>{pageTitle}</h1>{search.trim() && <p className="search-context">Pencarian global dari seluruh status</p>}</div><button className="primary-btn" onClick={openAdd}><Plus size={18} />Tambah Order</button></header>
        {error && <div className="error-banner"><AlertCircle size={17} /><span>{error}</span></div>}
        <section className="toolbar">
          <div className="search-box"><Search size={17} /><input placeholder="Cari global: no pesanan, mempelai, varian, status..." value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button className="clear-search" onClick={() => setSearch('')}><X size={14} /></button>}</div>
          <div className="toolbar-actions">
            <button className="sort-btn" onClick={() => setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')}>{sortDirection === 'desc' ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}{sortDirection === 'desc' ? 'Terbaru' : 'Terlama'}</button>
            <button className="refresh-btn" onClick={() => loadOrders(false)} title="Refresh data"><RefreshCw size={16} /></button>
            <div className="total"><strong>{visibleOrders.length}</strong> order{lastSync && <span>Sync {lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}</div>
          </div>
        </section>

        <section className="table-card"><div className="table-wrap"><table><thead><tr><th>No Pesanan</th><th>Jenis</th><th>Varian + Jumlah</th><th>Nama Mempelai</th><th>Status</th><th>Catatan</th><th></th></tr></thead><tbody>
          {loading ? <tr><td colSpan="7"><div className="empty-state">Mengambil data order...</div></td></tr> : visibleOrders.length === 0 ? <tr><td colSpan="7"><div className="empty-state">{search.trim() ? 'Tidak ada order yang cocok dengan pencarian.' : 'Belum ada order di bagian ini.'}</div></td></tr> : visibleOrders.map((order) => {
            const dateInfo = getOrderDateInfo(order.orderNo);
            const numbers = splitOrderNumbers(order.orderNo);
            return <tr key={order.id}>
              <td><div className="order-number-cell">{numbers.map((number, index) => <span className="mono" key={`${number}-${index}`}>{number}</span>)}{dateInfo && <span className="order-date">{dateInfo.labels.join(' • ')}</span>}</div></td>
              <td><span className="pill">{order.type}</span></td>
              <td><div className="stacked"><strong className="variant-label"><i className={`variant-dot ${variantClass(order.variant)}`} />{order.variant || '-'}</strong><span>{order.qty} pcs</span></div></td>
              <td><strong>{order.couple}</strong></td>
              <td><select className="status-select" value={order.status} onChange={(e) => changeStatus(order.id, e.target.value)}>{STATUS.map((status) => <option key={status} value={status}>{status}</option>)}</select></td>
              <td className="notes-cell">{order.notes || '-'}</td>
              <td><div className="actions">{search.trim() && <button title={`Buka di ${order.status}`} onClick={() => openOrderInStatus(order)}><ExternalLink size={15} /></button>}<button title="Edit" onClick={() => openEdit(order)}><Pencil size={16} /></button><button title="Hapus" onClick={() => removeOrder(order.id)}><Trash2 size={16} /></button></div></td>
            </tr>;
          })}
        </tbody></table></div></section>
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">ORDER</p><h2>{editingId ? 'Edit Order' : 'Tambah Order'}</h2></div><button className="icon-btn" disabled={saving} onClick={() => setModalOpen(false)}><X size={18} /></button></div><form onSubmit={saveOrder} className="form-grid">
        <label className="full"><span>No Pesanan</span><textarea rows="2" value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} placeholder={'Contoh: 2609026M0UKNFM\nJika ada 2 nomor, pisahkan dengan Enter atau koma'} required /><small>Tanggal masuk dibaca otomatis dari 6 angka awal: YYMMDD.</small></label>
        <label><span>Jenis Order</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPE.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span>Varian</span><input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} placeholder="Contoh: Merah / Biru / Sage" /></label>
        <label><span>Jumlah</span><input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></label>
        <label><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="full"><span>Nama Mempelai</span><input value={form.couple} onChange={(e) => setForm({ ...form, couple: e.target.value })} placeholder="Contoh: Bayu & Winda" required /></label>
        <label className="full"><span>Catatan</span><textarea rows="4" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan produksi / revisi / detail lainnya" /></label>
        <div className="form-actions full"><button type="button" className="secondary-btn" disabled={saving} onClick={() => setModalOpen(false)}>Batal</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Order'}</button></div>
      </form></div></div>}

      {settingsOpen && <div className="modal-backdrop" onMouseDown={() => !testingConnection && setSettingsOpen(false)}><div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">DESKTOP</p><h2>Pengaturan Koneksi</h2></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={18} /></button></div><form onSubmit={saveApiSettings} className="settings-form"><p>Aplikasi PC tetap memakai backend PHP dan database hosting yang sama. Jika alamat hosting berubah, ganti URL di sini tanpa mengubah source code.</p><label><span>URL backend/api.php</span><input value={apiDraft} onChange={(e) => setApiDraft(e.target.value)} placeholder="https://domain.com/backend/api.php" required /></label><div className="settings-actions"><button type="button" className="secondary-btn" disabled={testingConnection} onClick={testConnection}>{testingConnection ? 'Menguji...' : 'Tes Koneksi'}</button><button type="submit" className="primary-btn">Simpan</button></div></form></div></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
