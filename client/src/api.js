const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || (data.blockers ? data.blockers.join(' ') : `Request failed (${res.status})`);
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // Catalog
  getCatalog: () => request('/catalog'),
  createCatalogItem: (item) => request('/catalog', { method: 'POST', body: JSON.stringify(item) }),
  updateCatalogItem: (id, item) => request(`/catalog/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  deleteCatalogItem: (id) => request(`/catalog/${id}`, { method: 'DELETE' }),

  // Import
  importText: (rawText, source = 'paste') => request('/import', { method: 'POST', body: JSON.stringify({ rawText, source }) }),
  importUpload: (content, filename) => request('/import/upload', { method: 'POST', body: JSON.stringify({ content, filename }) }),

  // Orders
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders${query ? `?${query}` : ''}`);
  },
  getOrder: (id) => request(`/orders/${id}`),
  updateOrderHeader: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateOrderLine: (orderId, lineId, data) => request(`/orders/${orderId}/lines/${lineId}`, { method: 'PUT', body: JSON.stringify(data) }),
  addOrderLine: (orderId, data) => request(`/orders/${orderId}/lines`, { method: 'POST', body: JSON.stringify(data) }),
  deleteOrderLine: (orderId, lineId) => request(`/orders/${orderId}/lines/${lineId}`, { method: 'DELETE' }),
  approveOrder: (id) => request(`/orders/${id}/approve`, { method: 'POST' }),
  reopenOrder: (id) => request(`/orders/${id}/reopen`, { method: 'POST' }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  // Summary
  getSummary: (date) => request(`/summary${date ? `?date=${date}` : ''}`),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),

  // AI & Demo
  getAIStatus: () => request('/ai/status'),
  refineWithAI: (rawText) => request('/ai/refine', { method: 'POST', body: JSON.stringify({ rawText }) }),
  loadDemo: () => request('/demo/load', { method: 'POST' }),
  resetDemo: () => request('/demo/reset', { method: 'POST' })
};
