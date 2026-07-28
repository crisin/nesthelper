import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

/** Sent by the backend when onboarding (first password change) is still open. */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const { config, response } = error as {
      config?: { url?: string }
      response?: { status?: number; data?: { code?: string } }
    }
    // A failed login is a 401 too — that one belongs to the form, not to an
    // expired session, and must not overwrite the login page's own error.
    const isLoginAttempt = config?.url?.endsWith('/auth/login')

    if (response?.status === 401 && !isLoginAttempt) {
      useAuthStore
        .getState()
        .clearAuth('Deine Sitzung ist abgelaufen. Bitte melde dich neu an.')
    } else if (
      response?.status === 403 &&
      response.data?.code === PASSWORD_CHANGE_REQUIRED
    ) {
      // The persisted user is stale — an admin reset the password since login.
      // Flipping the flag makes PrivateRoute redirect to /set-password.
      useAuthStore.getState().updateUser({ mustChangePassword: true })
    }
    return Promise.reject(error)
  },
)

export default api
