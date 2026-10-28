import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
});

// Unwrap data, and turn failures into Errors with a readable message and per-field errors.
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    let message = typeof err.response?.data === 'object' ? err.response.data.message : undefined;
    if (!message) {
      if (err.code === 'ECONNABORTED') message = 'The server took too long to answer. Try again.';
      else if (!err.response) message = 'Cannot reach the server. Check that the API is running.';
      else if (status >= 500) message = 'The server could not complete that request. Try again.';
      else message = 'Something went wrong. Try again.';
    }
    const error = new Error(message);
    error.status = status;
    error.fields = err.response?.data?.details?.fields ?? {};
    if (status === 401 && !err.config?.url?.startsWith('/auth/')) {
      window.dispatchEvent(new Event('wp:unauthorized'));
    }
    return Promise.reject(error);
  },
);
