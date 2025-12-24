import api from '../api/axios';

export default {
  login: async (credentials) => {
    // credentials = { email, password }
    const { data } = await api.post('/auth/login', credentials);
    return data; // Retorna { access_token, user: { role: '...', ... } }
  }
};