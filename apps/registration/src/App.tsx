import React from 'react'
import { Routes, Route } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import RegisterSuccessPage from './pages/RegisterSuccessPage'
import AdminAuthGuard from './components/AdminAuthGuard'
import SurveyListPage from './pages/admin/SurveyListPage'
import SurveyDetailPage from './pages/admin/SurveyDetailPage'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/register/:surveyId" element={<RegisterPage />} />
      <Route path="/register/:surveyId/success" element={<RegisterSuccessPage />} />
      <Route path="/admin" element={<AdminAuthGuard><SurveyListPage /></AdminAuthGuard>} />
      <Route path="/admin/survey/:surveyId" element={<AdminAuthGuard><SurveyDetailPage /></AdminAuthGuard>} />
    </Routes>
  )
}

export default App
