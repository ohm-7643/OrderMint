import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export function CatalogManager({ showToast }) {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [priceInr, setPriceInr] = useState('');
  const [unit, setUnit] = useState('piece');
  const [aliases, setAliases] = useState('');

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await api.getCatalog();
      setItems(data.items || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setPriceInr('');
    setUnit('piece');
    setAliases('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name);
    setPriceInr((item.unit_price_paise / 100).toFixed(0));
    setUnit(item.unit);
    setAliases((item.aliases || []).join(', '));
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    const numPrice = parseFloat(priceInr);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      setError('Please enter a valid price in INR.');
      return;
    }

    const aliasArray = aliases
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(a => a.length > 0);

    const uniqueAliases = new Set(aliasArray);
    if (uniqueAliases.size !== aliasArray.length) {
      setError('Duplicate aliases found in your list.');
      return;
    }

    try {
      if (editingItem) {
        await api.updateCatalogItem(editingItem.id, {
          name: name.trim(),
          unit_price_inr: numPrice,
          unit: unit.trim(),
          aliases: Array.from(uniqueAliases)
        });
        showToast('Product updated successfully');
      } else {
        await api.createCatalogItem({
          name: name.trim(),
          unit_price_inr: numPrice,
          unit: unit.trim(),
          aliases: Array.from(uniqueAliases)
        });
        showToast('Product created successfully');
      }

      setShowModal(false);
      loadItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from your catalog?`)) {
      return;
    }
    try {
      await api.deleteCatalogItem(item.id);
      showToast('Product deleted');
      loadItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoadDemo = async () => {
    try {
      await api.loadDemo();
      showToast('Demo catalog loaded!');
      loadItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredItems = items.filter(item =>
    !searchQuery ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.aliases || []).some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card">
        {/* Header and Controls */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">Product Catalog</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
              Your menu items, units, prices, and matching aliases used by the extraction engine.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              style={{ width: '220px', fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
              placeholder="🔍 Search items or aliases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLoadDemo}
            >
              🌱 Load Demo Catalog
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreateModal}
            >
              + Add Product
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', color: 'var(--red-700)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--slate-500)', padding: '1.5rem', textAlign: 'center' }}>Loading catalog...</p>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-800)' }}>
              {searchQuery ? 'No matching products found' : 'Your catalog is empty'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', maxWidth: '360px', margin: '0.3rem auto 1.25rem auto' }}>
              {searchQuery ? 'Try clearing your search query.' : 'Add your custom bakery, tiffin, or kitchen items, or load the demo catalog.'}
            </p>
            {!searchQuery && (
              <button type="button" className="btn btn-primary" onClick={handleLoadDemo}>
                Load Demo Catalog
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lines-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Product Name</th>
                  <th style={{ width: '16%' }}>Price (INR)</th>
                  <th style={{ width: '14%' }}>Unit</th>
                  <th style={{ width: '30%' }}>Matching Aliases</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--slate-900)' }}>{item.name}</strong>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-900)' }}>
                        ₹{(item.unit_price_paise / 100).toFixed(0)}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                        {item.unit}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {(item.aliases || []).map((alias, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#ffffff',
                              border: '1px solid var(--slate-200)',
                              color: 'var(--slate-700)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                          onClick={() => handleDelete(item)}
                          title="Delete product"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--slate-400)' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {error && (
              <div style={{ background: 'var(--red-50)', color: 'var(--red-700)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Chocolate Cake"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Unit Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    className="input"
                    required
                    min="0"
                    step="1"
                    placeholder="e.g. 700"
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Unit Label
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="piece, box, jar, meal..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                  Matching Aliases (comma-separated)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. choc cake, cocoa cake, dark chocolate cake"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                  Chat variations and abbreviations will match this product automatically.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CatalogManager;
