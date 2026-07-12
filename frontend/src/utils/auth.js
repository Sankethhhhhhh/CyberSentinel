import axios from 'axios'

export async function loginUser(email, password) {
  const res = await axios.post('/auth/login', { email, password })
  return res.data
}

export async function registerUser(name, email, password) {
  const res = await axios.post('/auth/register', { name, email, password })
  return res.data
}

export async function fetchCurrentUser() {
  const res = await axios.get('/auth/me')
  return res.data
}

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

axios.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setToken(null)
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)
