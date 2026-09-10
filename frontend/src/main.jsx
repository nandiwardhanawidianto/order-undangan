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
  AlertCircle
} from 'lucide-react';

import './styles.css';

const STATUS = [
  'Orderan Masuk',
  'Revisi',
  'Antri Cetak',
  'Proses Cetak',
  'Selesai Cetak',
  'Pending',
  'Sudah Dikirim'
];

const TYPE = [
  'Digital',
  'Cetak',
  'Digital + Cetak'
];

const API_URL = (
  import.meta.env.VITE_API_URL ||
  './backend/api.php'
).replace(/\/$/, '');

const emptyForm = {
  orderNo: '',
  type: 'Digital',
  variant: '',
  qty: 1,
  couple: '',
  status: 'Orderan Masuk',
  notes: '',
};

async function api(path = '', options = {}) {
  const sep = API_URL.includes('?') ? '&' : '?';

  const response = await fetch(
    `${API_URL}${sep}path=${encodeURIComponent(path)}`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    }
  );

  let body = null;

  try {
    body = await response.json();
  } catch {
    // response kosong
  }

  if (!response.ok) {
    const validation = body?.errors
      ? Object.values(body.errors).flat().join(' ')
      : '';

    throw new Error(
      validation ||
      body?.message ||
      `Request gagal (${response.status})`
    );
  }

  return body;
}

function App() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('Orderan Masuk');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');

    try {
      const result = await api('/orders');

      setOrders(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const counts = useMemo(() => {
    return STATUS.reduce((acc, status) => {
      acc[status] = orders.filter(
        (order) => order.status === status
      ).length;

      return acc;
    }, {});
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders
      .filter((order) => order.status === activeTab)
      .filter((order) => {
        if (!q) return true;

        return [
          order.orderNo,
          order.type,
          order.variant,
          order.couple,
          order.notes
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
  }, [orders, activeTab, search]);

  function openAdd() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      status: activeTab
    });

    setModalOpen(true);
  }

  function openEdit(order) {
    setEditingId(order.id);

    setForm({
      orderNo: order.orderNo,
      type: order.type,
      variant: order.variant || '',
      qty: order.qty,
      couple: order.couple,
      status: order.status,
      notes: order.notes || '',
    });

    setModalOpen(true);
  }

  async function saveOrder(e) {
    e.preventDefault();

    if (
      !form.orderNo.trim() ||
      !form.couple.trim()
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        qty: Number(form.qty) || 1
      };

      const result = editingId
        ? await api(`/orders/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await api('/orders', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      setOrders((prev) => {
        if (editingId) {
          return prev.map((order) =>
            order.id === editingId
              ? result.data
              : order
          );
        }

        return [
          result.data,
          ...prev
        ];
      });

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id, status) {
    const previousOrders = orders;

    // langsung pindah tab tanpa menunggu server
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id
          ? {
              ...order,
              status
            }
          : order
      )
    );

    setError('');

    try {
      const result = await api(
        `/orders/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status
          }),
        }
      );

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id
            ? result.data
            : order
        )
      );

    } catch (err) {
      // kalau server gagal, balikin status
      setOrders(previousOrders);
      setError(err.message);
    }
  }

  async function removeOrder(id) {
    if (!confirm('Hapus order ini?')) {
      return;
    }

    setError('');

    try {
      await api(`/orders/${id}`, {
        method: 'DELETE'
      });

      setOrders((prev) =>
        prev.filter(
          (order) => order.id !== id
        )
      );

    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            <ClipboardList size={20} />
          </div>

          <div>
            <strong>
              Royal Wedding
            </strong>

            <span>
              Order Board
            </span>
          </div>

        </div>

        <nav className="tabs">

          {STATUS.map((status) => (

            <button
              key={status}
              onClick={() =>
                setActiveTab(status)
              }
              className={
                activeTab === status
                  ? 'active'
                  : ''
              }
            >

              <span>
                {status}
              </span>

              <b>
                {counts[status] || 0}
              </b>

            </button>

          ))}

        </nav>

      </aside>

      <main className="main">

        <header className="topbar">

          <div>

            <p className="eyebrow">
              WORKSPACE
            </p>

            <h1>
              {activeTab}
            </h1>

          </div>

          <button
            className="primary-btn"
            onClick={openAdd}
          >

            <Plus size={18} />

            Tambah Order

          </button>

        </header>

        {error && (

          <div className="error-banner">

            <AlertCircle size={17} />

            <span>
              {error}
            </span>

          </div>

        )}

        <section className="toolbar">

          <div className="search-box">

            <Search size={17} />

            <input
              placeholder="Cari no pesanan, nama mempelai, varian..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <button
            className="refresh-btn"
            onClick={loadOrders}
            title="Refresh data"
          >

            <RefreshCw size={16} />

          </button>

          <div className="total">
            {visibleOrders.length} order
          </div>

        </section>

        <section className="table-card">

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>
                    No Pesanan
                  </th>

                  <th>
                    Jenis
                  </th>

                  <th>
                    Varian + Jumlah
                  </th>

                  <th>
                    Nama Mempelai
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Catatan
                  </th>

                  <th></th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td colSpan="7">

                      <div className="empty-state">
                        Mengambil data order...
                      </div>

                    </td>

                  </tr>

                ) : visibleOrders.length === 0 ? (

                  <tr>

                    <td colSpan="7">

                      <div className="empty-state">
                        Belum ada order di status ini.
                      </div>

                    </td>

                  </tr>

                ) : (

                  visibleOrders.map((order) => (

                    <tr key={order.id}>

                      <td className="mono">
                        {order.orderNo}
                      </td>

                      <td>

                        <span className="pill">
                          {order.type}
                        </span>

                      </td>

                      <td>

                        <div className="stacked">

                          <strong>
                            {order.variant || '-'}
                          </strong>

                          <span>
                            {order.qty} pcs
                          </span>

                        </div>

                      </td>

                      <td>

                        <strong>
                          {order.couple}
                        </strong>

                      </td>

                      <td>

                        <select
                          className="status-select"
                          value={order.status}
                          onChange={(e) =>
                            changeStatus(
                              order.id,
                              e.target.value
                            )
                          }
                        >

                          {STATUS.map((status) => (

                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>

                          ))}

                        </select>

                      </td>

                      <td className="notes-cell">
                        {order.notes || '-'}
                      </td>

                      <td>

                        <div className="actions">

                          <button
                            title="Edit"
                            onClick={() =>
                              openEdit(order)
                            }
                          >

                            <Pencil size={16} />

                          </button>

                          <button
                            title="Hapus"
                            onClick={() =>
                              removeOrder(order.id)
                            }
                          >

                            <Trash2 size={16} />

                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

      {modalOpen && (

        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !saving &&
            setModalOpen(false)
          }
        >

          <div
            className="modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-head">

              <div>

                <p className="eyebrow">
                  ORDER
                </p>

                <h2>
                  {editingId
                    ? 'Edit Order'
                    : 'Tambah Order'}
                </h2>

              </div>

              <button
                className="icon-btn"
                disabled={saving}
                onClick={() =>
                  setModalOpen(false)
                }
              >

                <X size={18} />

              </button>

            </div>

            <form
              onSubmit={saveOrder}
              className="form-grid"
            >

              <label>

                <span>
                  No Pesanan
                </span>

                <input
                  value={form.orderNo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      orderNo:
                        e.target.value
                    })
                  }
                  placeholder="Contoh: 260903HT1ABC"
                  required
                />

              </label>

              <label>

                <span>
                  Jenis Order
                </span>

                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type:
                        e.target.value
                    })
                  }
                >

                  {TYPE.map((type) => (

                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>

                  ))}

                </select>

              </label>

              <label>

                <span>
                  Varian
                </span>

                <input
                  value={form.variant}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      variant:
                        e.target.value
                    })
                  }
                  placeholder="Contoh: Tema Jawa / Ivory"
                />

              </label>

              <label>

                <span>
                  Jumlah
                </span>

                <input
                  type="number"
                  min="1"
                  value={form.qty}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      qty:
                        e.target.value
                    })
                  }
                />

              </label>

              <label className="full">

                <span>
                  Nama Mempelai
                </span>

                <input
                  value={form.couple}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      couple:
                        e.target.value
                    })
                  }
                  placeholder="Contoh: Bayu & Winda"
                  required
                />

              </label>

              <label className="full">

                <span>
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target.value
                    })
                  }
                >

                  {STATUS.map((status) => (

                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>

                  ))}

                </select>

              </label>

              <label className="full">

                <span>
                  Catatan
                </span>

                <textarea
                  rows="4"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes:
                        e.target.value
                    })
                  }
                  placeholder="Opsional: revisi nama, alamat, deadline cetak, dll."
                />

              </label>

              <div className="form-actions full">

                <button
                  type="button"
                  className="secondary-btn"
                  disabled={saving}
                  onClick={() =>
                    setModalOpen(false)
                  }
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? 'Menyimpan...'
                    : 'Simpan Order'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

createRoot(
  document.getElementById('root')
).render(
  <App />
);