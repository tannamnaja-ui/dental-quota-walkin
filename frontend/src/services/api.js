import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// cache ข้อมูลที่ไม่เปลี่ยนบ่อย (หายไปเมื่อ reload หน้า)
const _cache = {};
async function cached(key, fn) {
  if (_cache[key]) return _cache[key];
  const res = await fn();
  _cache[key] = res;
  return res;
}

export const authAPI = {
  login: (data) => apiClient.post('/auth/login', data),
};

export const configAPI = {
  get:         ()     => apiClient.get('/config/db'),
  test:        (data) => apiClient.post('/config/db/test', data),
  save:        (data) => apiClient.post('/config/db/save', data),
  checkTables: ()     => apiClient.get('/config/db/tables'),
  createTable: (name) => apiClient.post(`/config/db/table/${name}`),
};

export const quotaAPI = {
  get:       (date) => apiClient.get('/quota', { params: date ? { date } : {} }),
  setup:     (data) => apiClient.post('/quota/setup', data),
  setupBulk: (data) => apiClient.post('/quota/setup-bulk', data),
  use:       (id)   => apiClient.post(`/quota/${id}/use`),
  update:    (id, max_walkin_quota, current_walkin_count) =>
    apiClient.put(`/quota/${id}`, {
      max_walkin_quota,
      ...(current_walkin_count !== undefined ? { current_walkin_count } : {}),
    }),
  delete:    (id)   => apiClient.delete(`/quota/${id}`),
};

export const walkinAPI = {
  register:     (data)            => apiClient.post('/walkin/register', data),
  getQueue:     ()                => apiClient.get('/walkin/queue'),
  updateStatus: (queueId, status) => apiClient.put(`/walkin/queue/${queueId}/status`, { status }),
};

export const doctorAPI = {
  getAll:         ()    => apiClient.get('/doctors'),
  getPositions:   ()    => cached('positions',   () => apiClient.get('/doctors/positions')),
  getSpecialties: ()    => cached('specialties', () => apiClient.get('/doctors/specialties')),
  getHisDoctors:  (ids) => apiClient.get('/doctors/his', {
    params: { position_ids: Array.isArray(ids) ? ids.join(',') : ids },
  }),
};
