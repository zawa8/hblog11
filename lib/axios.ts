import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosHeaders } from 'axios'

export const createAxiosInstance = (token?: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: '/',
    headers: new AxiosHeaders({
      'Content-Type': 'application/json'
    })
  })

  if (token) {
    instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (!(config.headers instanceof AxiosHeaders)) {
        config.headers = new AxiosHeaders(config.headers)
      }
      config.headers.set('Authorization', `Bearer ${token}`)
      return config
    })
  }

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.error('Authentication error:', error)
      }
      return Promise.reject(error)
    }
  )

  return instance
}
