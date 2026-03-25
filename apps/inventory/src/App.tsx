import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { ThemeProvider, ToastProvider } from 'trust-ui-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'
import ProtectedRoute from './components/ProtectedRoute'
import ConsentDialog from './components/ConsentDialog'
import Spinner from './components/Spinner'
import AppLayout from './components/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const ItemsPage = lazy(() => import('./pages/ItemsPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const DanglingPage = lazy(() => import('./pages/DanglingPage'))

function AuthenticatedLayout() {
  const { needsConsent, user } = useAuth()
  return (
    <ProjectProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Spinner />
          </div>
        }
      >
        {user && needsConsent && <ConsentDialog />}
        <AppLayout />
      </Suspense>
    </ProjectProvider>
  )
}

function PublicLayout() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ path: '/login', element: <LoginPage /> }]
  },
  {
    element: (
      <ProtectedRoute>
        <AuthenticatedLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/items" replace /> },
      { path: '/items', element: <ItemsPage /> },
      {
        path: '/admin/projects',
        element: (
          <ProtectedRoute requiredRoles={['admin']}>
            <ProjectsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute requiredRoles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/admin/dangling',
        element: (
          <ProtectedRoute requiredRoles={['admin']}>
            <DanglingPage />
          </ProtectedRoute>
        )
      }
    ]
  },
  { path: '*', element: <Navigate to="/login" replace /> }
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <ToastProvider position="bottom-right">
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
