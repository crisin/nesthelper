import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import SetPassword from './pages/SetPassword'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import Discover from './pages/Discover'
import Favorites from './pages/Favorites'
import SongDetail from './pages/SongDetail'
import Collections from './pages/Collections'
import CollectionDetail from './pages/CollectionDetail'
import Analytics from './pages/Analytics'
import Timeline from './pages/Timeline'
import Settings from './pages/Settings'
import SpotifyLibrary from './pages/SpotifyLibrary'
import PrivateRoute from './components/PrivateRoute'
import SettingsSync from './components/SettingsSync'
import RequireAdmin from './components/RequireAdmin'
import AppLayout from './components/AppLayout'
import { CoverViewerProvider } from './contexts/CoverViewerContext'

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
  // Authenticated but deliberately outside AppLayout — nothing to navigate to
  // until the password is set.
  {
    path: '/set-password',
    element: (
      <PrivateRoute>
        <SetPassword />
      </PrivateRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <AppPage>
        <RequireAdmin>
          <Admin />
        </RequireAdmin>
      </AppPage>
    ),
  },
  {
    path: '/dashboard',
    element: <AppPage><Dashboard /></AppPage>,
  },
  {
    path: '/discover',
    element: <AppPage><Discover /></AppPage>,
  },
  {
    path: '/favorites',
    element: <AppPage><Favorites /></AppPage>,
  },
  {
    path: '/favorites/:id',
    element: <AppPage><SongDetail /></AppPage>,
  },
  {
    path: '/songs/:id',
    element: <AppPage><SongDetail /></AppPage>,
  },
  {
    path: '/collections',
    element: <AppPage><Collections /></AppPage>,
  },
  {
    path: '/collections/:id',
    element: <AppPage><CollectionDetail /></AppPage>,
  },
  {
    path: '/analytics',
    element: <AppPage><Analytics /></AppPage>,
  },
  {
    path: '/timeline',
    element: <AppPage><Timeline /></AppPage>,
  },
  {
    path: '/library',
    element: <AppPage><SpotifyLibrary /></AppPage>,
  },
  {
    path: '/settings',
    element: <AppPage><Settings /></AppPage>,
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return (
    <CoverViewerProvider>
      <SettingsSync />
      <RouterProvider router={router} />
    </CoverViewerProvider>
  )
}
