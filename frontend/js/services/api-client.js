import { API_BASE } from '../core/config.js';

const NETWORK_ERROR = 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.';
const NOTIFY_EVENT = 'pitch-point:notifications-changed';

class ApiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, { body, query } = {}) {
  const url = new URL(`${API_BASE}${path}`, location.href);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-Requested-With'] = 'PitchPoint';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiRequestError(NETWORK_ERROR, 0);
  }
  let data = null;
  try { data = await response.json(); } catch { }
  if (!response.ok) throw new ApiRequestError(data?.error || 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.', response.status);
  return data;
}

const notifyChanged = () => window.dispatchEvent(new Event(NOTIFY_EVENT));

// ---- entities
function records(name) {
  const base = `/entities/${encodeURIComponent(name)}`;
  return {
    async filter(q = {}, options = {}) {
      const data = await request('GET', base, { query: { where: JSON.stringify(q || {}), sort: options.sort, limit: options.limit } });
      return { items: data.items || [], total: data.total ?? (data.items || []).length };
    },
    async list(sort, limit) {
      return (await this.filter({}, { sort, limit })).items;
    },
    async get(key) {
      return request('GET', `${base}/${encodeURIComponent(key)}`);
    },
    async create(input) {
      return request('POST', base, { body: input || {} });
    },
    async bulkCreate(rows) {
      return Promise.all(rows.map(row => this.create(row)));
    },
    async update(key, input) {
      const row = await request('PATCH', `${base}/${encodeURIComponent(key)}`, { body: input || {} });
      if (name === 'Notification') notifyChanged();
      return row;
    },
    async delete(key) {
      await request('DELETE', `${base}/${encodeURIComponent(key)}`);
    },
    async count(q = {}) {
      return (await this.filter(q)).total;
    },
    async aggregate({ query = {}, groupBy, avg = [] }) {
      const rows = (await this.filter(query)).items;
      const groups = {};
      for (const row of rows) (groups[row[groupBy]] ||= []).push(row);
      return {
        rows: Object.entries(groups).map(([key, items]) => ({
          [groupBy]: key,
          count: items.length,
          ...Object.fromEntries(avg.map(field => [`avg_${field}`, items.reduce((sum, row) => sum + Number(row[field] || 0), 0) / items.length]))
        }))
      };
    }
  };
}

// ---- business functions
const id = value => encodeURIComponent(value ?? '');
const FUNCTION_ROUTES = {
  createHold: p => ['POST', '/bookings/holds', p],
  payBooking: p => ['POST', `/bookings/${id(p.booking_id)}/payment`, p],
  cancelBooking: p => ['POST', `/bookings/${id(p.booking_id)}/cancellation`, p],
  syncBookings: () => ['POST', '/bookings/sync', {}],
  submitReview: p => ['POST', '/reviews', p],
  getAvailability: p => ['GET', `/pitches/${id(p.pitch_id)}/availability`, null, { local_date: p.local_date }],
  nextAvailableDate: p => ['GET', `/pitches/${id(p.pitch_id)}/next-available-date`],
  searchPitches: p => ['GET', '/search/pitches', null, { q: p.q, location: p.location, pitchType: p.pitchType, date: p.date, time: p.time }],
  createPitchWithSchedule: p => ['POST', '/pitches', p],
  setPitchStatus: p => ['POST', `/pitches/${id(p.pitch_id)}/status`, p],
  startMessage: p => ['POST', '/conversations', p],
  sendMessage: p => ['POST', `/conversations/${id(p.conversation_id)}/messages`, p],
  warnCustomer: p => ['POST', `/conversations/${id(p.conversation_id)}/warnings`, p],
  respondWarning: p => ['POST', `/warnings/${id(p.warning_id)}/responses`, p],
  submitAppeal: p => ['POST', '/appeals', p],
  adminAction: p => ['POST', '/admin/actions', p]
};
const CHANGES_NOTIFICATIONS = new Set(['payBooking', 'cancelBooking', 'adminAction', 'setPitchStatus', 'sendMessage', 'startMessage', 'warnCustomer', 'respondWarning']);

async function invoke(name, params = {}) {
  const route = FUNCTION_ROUTES[name];
  if (!route) return { data: { error: 'Chức năng này hiện chưa được hỗ trợ.' } };
  const [method, path, body, query] = route(params || {});
  try {
    const data = await request(method, path, { body: method === 'GET' ? undefined : (body || {}), query });
    if (CHANGES_NOTIFICATIONS.has(name)) notifyChanged();
    return { data: data || {} };
  } catch (err) {
    return { data: { error: err.message } };
  }
}

// ---- auth
let meRequest = null;
let meAt = 0;
const resetMe = () => { meRequest = null; meAt = 0; };

export const api = {
  entities: new Proxy({}, { get: (_, name) => records(String(name)) }),
  functions: { invoke },
  app: { async getPublicSettings() { return { id: 'pitch-point', public_settings: {} }; } },
  updates(query = {}) {
    return request('GET', '/updates', { query });
  },
  settings: {
    async rules() {
      const KEY = 'pitch-point:rules';
      try {
        const cached = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        if (cached && Date.now() - cached.at < 30000) return cached.values;
      } catch { }
      const values = await request('GET', '/settings');
      try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), values })); } catch { }
      return values;
    },
    forgetRules() {
      try { sessionStorage.removeItem('pitch-point:rules'); } catch { }
    },
    async adminList() {
      return (await request('GET', '/admin/settings')).settings || [];
    }
  },
  auth: {
    me() {
      if (!meRequest || Date.now() - meAt > 1500) {
        meAt = Date.now();
        meRequest = request('GET', '/auth/session').then(data => {
          if (!data?.user) throw new ApiRequestError('Vui lòng đăng nhập.', 401);
          return data.user;
        });
        meRequest.catch(resetMe);
      }
      return meRequest;
    },
    async loginViaEmailPassword(email, password) {
      resetMe();
      return request('POST', '/auth/login', { body: { email, password } });
    },
    async register({ email, password, full_name, phone }) {
      return request('POST', '/auth/register', { body: { email, password, full_name, phone } });
    },
    async updateMe(values) {
      resetMe();
      return request('PATCH', '/auth/me', { body: values || {} });
    },
    async logout() {
      resetMe();
      await request('POST', '/auth/logout');
    },
    redirectToLogin() {
      location.assign('login.html');
    },
    async changePassword(currentPassword, newPassword) {
      resetMe();
      return request('POST', '/auth/password', { body: { current_password: currentPassword, new_password: newPassword } });
    },
    async resetPasswordRequest(email, note = '') {
      return request('POST', '/auth/password-reset', { body: { email, note } });
    },
    loginWithProvider() {
      throw new Error('Hiện chưa hỗ trợ đăng nhập bằng Google.');
    }
  },
  integrations: {
    Core: {
      async UploadPublicFile({ image }) {
        return request('POST', '/uploads/images', { body: { image } });
      }
    }
  }
};
