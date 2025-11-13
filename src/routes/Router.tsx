import React from 'react'
import {Route, Routes } from 'react-router-dom'
import Homepage from '../pages/Homepage'
import ProjectAddPage from '../pages/ProjectAddPage'
import DiaryWritePage from '../pages/DiaryWritePage'
import ProjectManagePage from '../pages/ProjectManagePage'
import AuthPage from '../pages/AuthPage'

const Router = () => {
  return (

    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/project-add" element={<ProjectAddPage />} />
      <Route path="/diary-write" element={<DiaryWritePage />} />
      <Route path="/project-manage" element={<ProjectManagePage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
    </Routes>

  )
}

export default Router