import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,  // Increased to 30 seconds for Gmail processing
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.response?.data?.detail || err.message)
    return Promise.reject(err)
  }
)

export default api
