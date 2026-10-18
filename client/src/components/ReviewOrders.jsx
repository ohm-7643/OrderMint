import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export function ReviewOrders({ selectedOrderId, onSelectOrder, onViewBill, showToast }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'needs_review', 'approved', 'reopened'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit states for customer & delivery note
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [deliveryNoteInput, setDeliveryNoteInput] = useState('');

  const fetchOrders = async (selectId = null) => {
    try {
      setLoading(true);
      const apiStatus = filter === 'needs_review' ? 'draft' : (filter === 'all' ? undefined : filter);
      const data = await api.getOrders({ status: apiStatus });
      let list = data.orders || [];

      if (filter === 'needs_review') {
        list = list.filter(o => o.status === 'draft' || o.flags_count > 0);
      }

      setOrders(list);

      const targetId = selectId || selectedOrderId || (list[0] ? list[0].id : null);
      if (targetId) {
        await loadOrderDetail(targetId);
      } else {
        setCurrentOrder(null);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const loadOrderDetail = async (orderId) => {
    try {
      const data = await api.getOrder(orderId);
      setCurrentOrder(data);
      setCustomerNameInput(data.order.customer_label);
      setDeliveryNoteInput(data.order.delivery_note || '');
      setEditingCustomer(false);
      if (onSelectOrder) onSelectOrder(orderId);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadCatalog = async () => {
    try {
      const data = await api.getCatalog();
      setCatalog(data.items || []);
    } catch (err) {
      console.error('Failed to load catalog', err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    fetchOrders(selectedOrderId);
  }, [filter, selectedOrderId]);

  const handleSaveCustomer = async () => {
    if (!currentOrder || !customerNameInput.trim()) return;
    try {
      await api.updateOrderHeader(currentOrder.order.id, {
        customer_label: customerNameInput.trim()
      });
      setEditingCustomer(false);
      await loadOrderDetail(currentOrder.order.id);
      await fetchOrders(currentOrder.order.id);
      showToast('Customer name updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveDeliveryNote = async () => {
    if (!currentOrder) return;
    try {
      await api.updateOrderHeader(currentOrder.order.id, {
        delivery_note: deliveryNoteInput.trim()
      });
      await loadOrderDetail(currentOrder.order.id);
      showToast('Delivery notes saved');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateLine = async (lineId, updates) => {
    if (!currentOrder) return;
    try {
      setActionLoading(true);
      await api.updateOrderLine(currentOrder.order.id, lineId, updates);
      await loadOrderDetail(currentOrder.order.id);
      await fetchOrders(currentOrder.order.id);
      setActionLoading(false);
      showToast('Line item updated');
    } catch (err) {
      setActionLoading(false);
      setError(err.message);
    }
  };

  const handleAddLine = async () => {
    if (!currentOrder) return;
    try {
      setActionLoading(true);
      const firstItem = catalog[0];
      await api.addOrderLine(currentOrder.order.id, {
        item_id: firstItem ? firstItem.id : null,
        unit_price_paise: firstItem ? firstItem.unit_price_paise : 0,
        quantity: 1,
        note: ''
      });
      await loadOrderDetail(currentOrder.order.id);
      await fetchOrders(currentOrder.order.id);
      setActionLoading(false);
      showToast('Product line added');
    } catch (err) {
      setActionLoading(false);
      setError(err.message);
    }
  };

  const handleDeleteLine = async (lineId) => {
    if (!currentOrder) return;
    try {
      setActionLoading(true);
      await api.deleteOrderLine(currentOrder.order.id, lineId);
      await loadOrderDetail(currentOrder.order.id);
      await fetchOrders(currentOrder.order.id);
      setActionLoading(false);
      showToast('Line removed');
    } catch (err) {
      setActionLoading(false);
      setError(err.message);
    }
  };

  const handleApprove = async () => {
    if (!currentOrder) return;
    try {
      setActionLoading(true);
      await api.approveOrder(currentOrder.order.id);
      await loadOrderDetail(currentOrder.order.id);
      await fetchOrders(currentOrder.order.id);
      setActionLoading(false);
      showToast('🎉 Order approved and finalized!');
    } catch (err) {
      setActionLoading(false);
      setError(err.message);
    }
  };

  const handleReopen = async () => {
    if (!currentOrder) return;
    try {
      setActionLoading(true);
      await api.reopenOrder(currentOrder.order.id);
      await loadOrderDetail(currentOrder.order.id);
      await fetchOrders(currentOrder.order.id);
      setActionLoading(false);
      showToast('Order reopened for editing');
    } catch (err) {
      setActionLoading(false);
      setError(err.message);
    }
  };

  const isApproved = currentOrder && currentOrder.order.status === 'approved';
  const validation = currentOrder ? currentOrder.validation : { canApprove: false, blockers: [] };

  const filteredOrders = orders.filter(o =>
    !searchQuery || o.customer_label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {error && (
        <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', color: 'var(--red-700)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="review-layout">
        {/* Left Column: Modern Order Inbox */}
        <div className="orders-sidebar">
          {/* Search box */}
          <div style={{ marginBottom: '0.5rem' }}>
            <input
              type="text"
              className="input"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
              placeholder="🔍 Search orders by customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', background: '#ffffff', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)', marginBottom: '0.65rem' }}>
            <button
              className={`nav-btn ${filter === 'all' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.2rem', textAlign: 'center' }}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`nav-btn ${filter === 'needs_review' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.2rem', textAlign: 'center' }}
              onClick={() => setFilter('needs_review')}
            >
              Review
            </button>
            <button
              className={`nav-btn ${filter === 'approved' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.2rem', textAlign: 'center' }}
              onClick={() => setFilter('approved')}
            >
              Done
            </button>
            <button
              className={`nav-btn ${filter === 'reopened' ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.2rem', textAlign: 'center' }}
              onClick={() => setFilter('reopened')}
            >
              Reopen
            </button>
          </div>

          {loading && <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', padding: '0.75rem', textAlign: 'center' }}>Loading orders...</p>}

          {!loading && filteredOrders.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>📭</div>
              <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem', fontWeight: 600 }}>No orders in this view</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem' }}>
                Paste customer messages in "Import Messages" or clear your filter.
              </p>
            </div>
          )}

          {/* Inbox List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {filteredOrders.map(ord => {
              const isSelected = currentOrder && currentOrder.order.id === ord.id;
              const hasFlags = ord.flags_count > 0 && ord.status !== 'approved';

              return (
                <div
                  key={ord.id}
                  className={`order-tab-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => loadOrderDetail(ord.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter') loadOrderDetail(ord.id); }}
                >
                  <div className="order-tab-header">
                    <span className="order-tab-customer">{ord.customer_label}</span>
                    <span className={`badge badge-${ord.status}`}>{ord.status}</span>
                  </div>

                  <div className="order-tab-meta">
                    <span>{ord.lines_count} item(s)</span>
                    <strong style={{ color: 'var(--slate-900)' }}>{ord.total_inr}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                    <span>{new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {hasFlags && (
                      <span className="badge badge-flagged" style={{ fontSize: '0.7rem' }}>
                        ⚠️ Needs action
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Order Detail Workspace */}
        <div>
          {!currentOrder ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-800)' }}>Select an order to review</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                Inspect original chat messages, adjust quantities or prices, and approve for invoice generation.
              </p>
            </div>
          ) : (
            <div className="card">
              {/* Order Header */}
              <div className="card-header" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {editingCustomer ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input"
                          style={{ fontSize: '1.1rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}
                          value={customerNameInput}
                          onChange={(e) => setCustomerNameInput(e.target.value)}
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleSaveCustomer}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingCustomer(false)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <h2 className="card-title" style={{ fontSize: '1.3rem' }}>
                          {currentOrder.order.customer_label}
                        </h2>
                        {!isApproved && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                            onClick={() => setEditingCustomer(true)}
                            title="Edit customer name"
                          >
                            ✏️ Edit Name
                          </button>
                        )}
                      </>
                    )}

                    <span className={`badge badge-${currentOrder.order.status}`}>
                      {currentOrder.order.status.toUpperCase()}
                    </span>

                    {currentOrder.order.is_demo === 1 && (
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                        DEMO DATA
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.3rem' }}>
                    Order #{currentOrder.order.id} • Created: {new Date(currentOrder.order.created_at).toLocaleString()}
                    {currentOrder.order.approved_at && ` • Approved: ${new Date(currentOrder.order.approved_at).toLocaleString()}`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isApproved && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => onViewBill(currentOrder.order.id)}>
                        🧾 View Printable Bill
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={handleReopen} disabled={actionLoading}>
                        Reopen Order
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Delivery Note Editor */}
              <div style={{ marginBottom: '1.25rem', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                    📍 Delivery / Timing Instructions:
                  </span>
                  {!isApproved && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                      onClick={handleSaveDeliveryNote}
                    >
                      Save Note
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="input"
                  disabled={isApproved}
                  placeholder="e.g. Deliver by Saturday 5 PM, eggless, gate code #123"
                  value={deliveryNoteInput}
                  onChange={(e) => setDeliveryNoteInput(e.target.value)}
                  onBlur={handleSaveDeliveryNote}
                />
              </div>

              {/* Original Message Evidence Bubble */}
              {currentOrder.messages && currentOrder.messages.length > 0 && (
                <div className="evidence-box">
                  <div className="evidence-header">
                    <span>💬 Source Message Evidence</span>
                    <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '0.4rem', color: 'var(--slate-500)' }}>
                      (Verbatim customer input preserved for verification)
                    </span>
                  </div>
                  {currentOrder.messages.map((m, idx) => (
                    <div key={idx} className="evidence-msg">
                      "{m.raw_text}"
                    </div>
                  ))}
                </div>
              )}

              {/* Tracked Revision History (Multi-message modifications) */}
              {currentOrder.lines.some(l => l.history && l.history.length > 0) && (
                <div className="history-box">
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    🔄 Tracked Revisions from Customer Chat:
                  </div>
                  {currentOrder.lines.flatMap(l => l.history || []).map((h, i) => (
                    <div key={i} className="history-item">
                      <span>•</span> {h}
                    </div>
                  ))}
                </div>
              )}

              {/* Order Lines Table */}
              <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                <table className="lines-table">
                  <thead>
                    <tr>
                      <th style={{ width: '42%' }}>Product & Notes</th>
                      <th style={{ width: '16%' }}>Quantity</th>
                      <th style={{ width: '18%' }}>Unit Price</th>
                      <th style={{ width: '16%' }}>Subtotal</th>
                      <th style={{ width: '8%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrder.lines.map((line) => {
                      const flags = line.flags || [];
                      const hasMismatch = flags.includes('price_mismatch');
                      const isUnknown = flags.includes('unknown_item');
                      const isAmbiguous = flags.includes('ambiguous_item');
                      const isAi = line.origin === 'ai' || flags.includes('ai_suggested');

                      return (
                        <tr key={line.id}>
                          <td>
                            {isApproved ? (
                              <div>
                                <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)' }}>{line.item_name}</strong>
                                {line.note && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
                                    Note: {line.note}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <select
                                  className="select"
                                  value={line.item_id || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value ? parseInt(e.target.value, 10) : null;
                                    const found = catalog.find(c => c.id === selectedId);
                                    handleUpdateLine(line.id, {
                                      item_id: selectedId,
                                      unit_price_paise: found ? found.unit_price_paise : line.unit_price_paise,
                                      status: 'resolved',
                                      flags: flags.filter(f => f !== 'unknown_item' && f !== 'ambiguous_item')
                                    });
                                  }}
                                >
                                  <option value="">-- Custom / Unknown Product --</option>
                                  {catalog.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} (₹{(c.unit_price_paise / 100).toFixed(0)})
                                    </option>
                                  ))}
                                </select>

                                {!line.item_id && (
                                  <input
                                    type="text"
                                    className="input"
                                    style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}
                                    defaultValue={line.custom_item_name || ''}
                                    placeholder="Enter custom product name..."
                                    onBlur={(e) => handleUpdateLine(line.id, {
                                      custom_item_name: e.target.value,
                                      status: 'resolved',
                                      flags: flags.filter(f => f !== 'unknown_item')
                                    })}
                                  />
                                )}
                              </div>
                            )}

                            {/* Origin badge and notes */}
                            <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <span className={`badge badge-${line.origin}`} style={{ textTransform: 'capitalize' }}>
                                {line.origin === 'ai' ? '🤖 AI Suggested' : line.origin}
                              </span>
                              {!isApproved && (
                                <input
                                  type="text"
                                  className="input"
                                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', maxWidth: '240px' }}
                                  defaultValue={line.note || ''}
                                  placeholder="Add item note (e.g. eggless)..."
                                  onBlur={(e) => handleUpdateLine(line.id, { note: e.target.value })}
                                />
                              )}
                            </div>

                            {/* Inline Warning Callouts with 1-Click Resolution */}
                            <div className="line-flags-area">
                              {hasMismatch && !isApproved && (
                                <div className="flag-alert">
                                  <span>⚠️ Quoted price is ₹{(line.unit_price_override_paise / 100).toFixed(0)}, Catalog is ₹{(line.unit_price_paise / 100).toFixed(0)}</span>
                                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleUpdateLine(line.id, {
                                        unit_price_override_paise: null,
                                        status: 'resolved',
                                        flags: flags.filter(f => f !== 'price_mismatch')
                                      })}
                                    >
                                      Use Catalog
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleUpdateLine(line.id, {
                                        unit_price_paise: line.unit_price_override_paise,
                                        unit_price_override_paise: null,
                                        status: 'resolved',
                                        flags: flags.filter(f => f !== 'price_mismatch')
                                      })}
                                    >
                                      Accept Quoted
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isUnknown && !isApproved && (
                                <div className="flag-alert">
                                  <span>⚠️ Unmatched product: "{line.raw_text}"</span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleUpdateLine(line.id, {
                                      status: 'resolved',
                                      flags: flags.filter(f => f !== 'unknown_item')
                                    })}
                                  >
                                    Confirm Custom
                                  </button>
                                </div>
                              )}

                              {isAmbiguous && !isApproved && (
                                <div className="flag-alert">
                                  <span>⚠️ Ambiguous match. Please select the product from dropdown above.</span>
                                </div>
                              )}

                              {isAi && !isApproved && (
                                <div className="flag-alert" style={{ background: '#fdf2f8', borderColor: '#fbcfe8', color: '#9d174d' }}>
                                  <span>🤖 Local AI Suggested: Verify item & quantity.</span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleUpdateLine(line.id, {
                                      status: 'resolved',
                                      flags: flags.filter(f => f !== 'ai_suggested')
                                    })}
                                  >
                                    Confirm
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td>
                            {isApproved ? (
                              <strong style={{ fontSize: '0.95rem' }}>{line.quantity}</strong>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.45rem' }}
                                  onClick={() => {
                                    if (line.quantity > 1) {
                                      handleUpdateLine(line.id, { quantity: line.quantity - 1 });
                                    }
                                  }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  className="input"
                                  min="1"
                                  max="1000"
                                  style={{ width: '56px', textAlign: 'center', padding: '0.35rem 0.2rem' }}
                                  value={line.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (val > 0 && val <= 1000) {
                                      handleUpdateLine(line.id, {
                                        quantity: val,
                                        flags: flags.filter(f => f !== 'missing_quantity' && f !== 'zero_quantity')
                                      });
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.45rem' }}
                                  onClick={() => handleUpdateLine(line.id, { quantity: line.quantity + 1 })}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Unit Price */}
                          <td>
                            {isApproved ? (
                              <span>{line.effective_unit_price_inr}</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>₹</span>
                                <input
                                  type="number"
                                  className="input"
                                  min="0"
                                  step="1"
                                  style={{ width: '84px', padding: '0.35rem 0.4rem' }}
                                  value={(line.effective_unit_price_paise / 100).toFixed(0)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (Number.isFinite(val) && val >= 0) {
                                      handleUpdateLine(line.id, {
                                        unit_price_paise: Math.round(val * 100),
                                        unit_price_override_paise: null,
                                        flags: flags.filter(f => f !== 'missing_price')
                                      });
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </td>

                          {/* Line Total */}
                          <td>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                              {line.line_total_inr}
                            </strong>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'center' }}>
                            {!isApproved && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                title="Remove line item"
                                onClick={() => handleDeleteLine(line.id)}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!isApproved && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddLine}
                    disabled={actionLoading}
                  >
                    + Add Product Line
                  </button>
                </div>
              )}

              {/* Blockers Alert if approval is disabled */}
              {!isApproved && !validation.canApprove && (
                <div className="blockers-list">
                  <strong>Cannot approve order yet. Please resolve these issues:</strong>
                  <ul>
                    {validation.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Order Footer & Approval Bar */}
              <div className="approval-panel">
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Calculated Total (Integer Math):</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>
                    {currentOrder.order.total_inr}
                  </div>
                </div>

                <div>
                  {!isApproved ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!validation.canApprove || actionLoading}
                      onClick={handleApprove}
                      style={{ padding: '0.7rem 1.6rem', fontSize: '0.95rem', boxShadow: 'var(--shadow-sm)' }}
                    >
                      {actionLoading ? 'Validating...' : '✓ Approve & Finalize Order'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onViewBill(currentOrder.order.id)}
                      >
                        🧾 View Printable Invoice
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleReopen}
                      >
                        Reopen Order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewOrders;
