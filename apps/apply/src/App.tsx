import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import {
  RequireAuth,
  RequireAdmin,
  RequireLeader,
  RequireApplicant,
  PublicOnly,
  RequireIncompleteProfile,
} from './components/RouteGuards'
import Spinner from './components/Spinner'
import { getDefaultRoute } from './lib/roles'
import { ROUTES } from './utils/constants'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'))
const CompleteProfilePage = lazy(() => import('./pages/Auth/CompleteProfilePage'))
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'))
const AdminReview = lazy(() => import('./pages/Admin/AdminReview'))
const AdminRoles = lazy(() => import('./pages/Admin/AdminRoles'))
const UserApplication = lazy(() => import('./pages/User/UserApplication'))
const AccountSettings = lazy(() => import('./pages/User/AccountSettings'))
const LeaderDashboard = lazy(() => import('./pages/Leader/LeaderDashboard'))
const LeaderPending = lazy(() => import('./pages/Leader/LeaderPending'))
const LeaderRecommendations = lazy(() => import('./pages/Leader/LeaderRecommendations'))

function AppLayout() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  )
}

function RootRedirect() {
  const { appUser } = useAuth()
  return <Navigate to={getDefaultRoute(appUser?.role)} replace />
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: (
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        ),
      },
      {
        path: ROUTES.COMPLETE_PROFILE,
        element: (
          <RequireIncompleteProfile>
            <CompleteProfilePage />
          </RequireIncompleteProfile>
        ),
      },
      {
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <RootRedirect /> },
          {
            path: ROUTES.ADMIN_ROOT,
            element: (
              <RequireAdmin>
                <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />
              </RequireAdmin>
            ),
          },
          {
            path: ROUTES.ADMIN_DASHBOARD,
            element: (
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            ),
          },
          {
            path: ROUTES.ADMIN_REVIEW,
            element: (
              <RequireAdmin>
                <AdminReview />
              </RequireAdmin>
            ),
          },
          {
            path: ROUTES.ADMIN_ROLES,
            element: (
              <RequireAdmin>
                <AdminRoles />
              </RequireAdmin>
            ),
          },
          {
            path: ROUTES.APPLICATION,
            element: (
              <RequireApplicant>
                <UserApplication />
              </RequireApplicant>
            ),
          },
          { path: ROUTES.ACCOUNT_SETTINGS, element: <AccountSettings /> },
          {
            path: ROUTES.LEADER_DASHBOARD,
            element: (
              <RequireLeader requireApproved>
                <LeaderDashboard />
              </RequireLeader>
            ),
          },
          {
            path: ROUTES.LEADER_RECOMMENDATIONS,
            element: (
              <RequireLeader>
                <LeaderRecommendations />
              </RequireLeader>
            ),
          },
          {
            path: ROUTES.LEADER_PENDING,
            element: (
              <RequireLeader>
                <LeaderPending />
              </RequireLeader>
            ),
          },
        ],
      },
      { path: '*', element: <Navigate to={ROUTES.LOGIN} replace /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
