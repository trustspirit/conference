import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import RegisterSuccessPage from './pages/RegisterSuccessPage'
import AdminAuthGuard from './components/AdminAuthGuard'
import SurveyListPage from './pages/admin/SurveyListPage'
import SurveyDetailPage from './pages/admin/SurveyDetailPage'
import SurveyEditPage from './pages/admin/SurveyEditPage'
import SurveyPreviewPage from './pages/admin/SurveyPreviewPage'
import AdminManagePage from './pages/admin/AdminManagePage'
import ToastContainer from './components/ToastContainer'

function App(): React.ReactElement {
  return (
    <>
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
      <ToastContainer />
    </>
  )
}

export default App
