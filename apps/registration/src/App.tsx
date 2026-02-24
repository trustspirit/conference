import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import RegisterSuccessPage from './pages/RegisterSuccessPage'
import AdminAuthGuard from './components/AdminAuthGuard'
import Spinner from './components/ui/Spinner'
import ToastContainer from './components/ToastContainer'

const SurveyListPage = lazy(() => import('./pages/admin/SurveyListPage'))
const SurveyDetailPage = lazy(() => import('./pages/admin/SurveyDetailPage'))
const SurveyEditPage = lazy(() => import('./pages/admin/SurveyEditPage'))
const SurveyPreviewPage = lazy(() => import('./pages/admin/SurveyPreviewPage'))
const AdminManagePage = lazy(() => import('./pages/admin/AdminManagePage'))

function App(): React.ReactElement {
  return (
    <>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register/:surveyId" element={<RegisterPage />} />
          <Route path="/register/:surveyId/success" element={<RegisterSuccessPage />} />
          <Route path="/admin" element={<AdminAuthGuard><SurveyListPage /></AdminAuthGuard>} />
          <Route path="/admin/admins" element={<AdminAuthGuard><AdminManagePage /></AdminAuthGuard>} />
          <Route path="/admin/survey/:surveyId" element={<AdminAuthGuard><SurveyDetailPage /></AdminAuthGuard>} />
          <Route path="/admin/survey/:surveyId/edit" element={<AdminAuthGuard><SurveyEditPage /></AdminAuthGuard>} />
          <Route path="/admin/survey/:surveyId/preview" element={<AdminAuthGuard><SurveyPreviewPage /></AdminAuthGuard>} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </>
  )
}

export default App
