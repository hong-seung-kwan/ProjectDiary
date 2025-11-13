import React from 'react'
import {Route, Routes } from 'react-router-dom'
import Homepage from '../pages/Homepage'
import ProjectAddPage from '../pages/ProjectAddPage'
import DiaryWritePage from '../pages/DiaryWritePage'
import ProjectManagePage from '../pages/ProjectManagePage'
import AuthPage from '../pages/AuthPage'
import PrivateRoute from './PrivateRoute'

const Router = () => {
  return (

    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/project-add" element={<PrivateRoute><ProjectAddPage /></PrivateRoute>} />
      <Route path="/diary-write" element={<PrivateRoute><DiaryWritePage /></PrivateRoute>} />
      <Route path="/project-manage" element={<PrivateRoute><ProjectManagePage /></PrivateRoute>} />
      
    </Routes>

  )
}

export default Router