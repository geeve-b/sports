import { api } from './client';

export const authApi = {
  me: () => api.get('/auth/me'),
  login: (body) => api.post('/auth/login', body),
  register: (body) => api.post('/auth/register', body),
  logout: () => api.post('/auth/logout'),
  updateMe: (body) => api.put('/auth/me', body),
  changePassword: (body) => api.put('/auth/password', body),
};

export const teamsApi = {
  list: () => api.get('/teams'),
  publicList: () => api.get('/teams/public'),
  get: (id) => api.get(`/teams/${id}`),
  create: (body) => api.post('/teams', body),
  update: (id, body) => api.put(`/teams/${id}`, body),
  remove: (id) => api.delete(`/teams/${id}`),
};

export const playersApi = {
  list: (params) => api.get('/players', { params }),
  get: (id) => api.get(`/players/${id}`),
  create: (body) => api.post('/players', body),
  update: (id, body) => api.put(`/players/${id}`, body),
  remove: (id) => api.delete(`/players/${id}`),
  addInjury: (id, body) => api.post(`/players/${id}/injuries`, body),
  updateInjury: (id, injuryId, body) => api.put(`/players/${id}/injuries/${injuryId}`, body),
};

export const matchesApi = {
  list: (params) => api.get('/matches', { params }),
  get: (id) => api.get(`/matches/${id}`),
  create: (body) => api.post('/matches', body),
  update: (id, body) => api.put(`/matches/${id}`, body),
  remove: (id) => api.delete(`/matches/${id}`),
  saveLineup: (id, body) => api.put(`/matches/${id}/lineup`, body),
  addEvent: (id, body) => api.post(`/matches/${id}/events`, body),
  removeEvent: (id, eventId) => api.delete(`/matches/${id}/events/${eventId}`),
  saveStats: (id, stats) => api.put(`/matches/${id}/stats`, { stats }),
};

export const statsApi = {
  team: (id, params) => api.get(`/stats/team/${id}`, { params }),
  player: (id) => api.get(`/stats/players/${id}`),
};

export const trainingApi = {
  list: (params) => api.get('/training', { params }),
  create: (body) => api.post('/training', body),
  update: (id, body) => api.put(`/training/${id}`, body),
  remove: (id) => api.delete(`/training/${id}`),
  setAttendance: (id, attendance) => api.put(`/training/${id}/attendance`, { attendance }),
  checkIn: (id) => api.post(`/training/${id}/attendance/check-in`),
};

export const availabilityApi = {
  forMatch: (match) => api.get('/availability', { params: { match } }),
  mine: () => api.get('/availability/mine'),
  respond: (body) => api.put('/availability', body),
};

export const announcementsApi = {
  list: (params) => api.get('/announcements', { params }),
  ticker: () => api.get('/announcements/ticker'),
  create: (body) => api.post('/announcements', body),
  update: (id, body) => api.put(`/announcements/${id}`, body),
  remove: (id) => api.delete(`/announcements/${id}`),
};

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, body) => api.patch(`/admin/users/${id}`, body),
  removeUser: (id) => api.delete(`/admin/users/${id}`),
  seasons: () => api.get('/admin/seasons'),
  createSeason: (body) => api.post('/admin/seasons', body),
  updateSeason: (id, body) => api.put(`/admin/seasons/${id}`, body),
  removeSeason: (id) => api.delete(`/admin/seasons/${id}`),
};
