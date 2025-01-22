import axios, { AxiosInstance } from 'axios'

export const createAxiosInstance = (token?: string): AxiosInstance => {
  const instance = axios.create()
  if (token) {
    instance.interceptors.request.use((config) => {
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }
  return instance
}
