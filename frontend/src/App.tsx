import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover'
import Songs from './pages/Songs'
import SongDetail from './pages/SongDetail'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/AppLayout'

function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute>
      <AppLayout>{children}</AppLayout>
    </PrivateRoute>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/dashboard',
    element: <AppPage><Dashboard /></AppPage>,
  },
  {
    path: '/discover',
    element: <AppPage><Discover /></AppPage>,
  },
  {
    path: '/songs',
    element: <AppPage><Songs /></AppPage>,
  },
  {
    path: '/songs/:id',
    element: <AppPage><SongDetail /></AppPage>,
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
