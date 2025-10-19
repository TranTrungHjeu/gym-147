const axios = require('axios');

const createHttpClient = (baseURL, options = {}) => {
  const instance = axios.create({
    baseURL,
    timeout: options.timeout || 5000,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        error.status = error.response.status;
        error.data = error.response.data;
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

module.exports = { createHttpClient };
