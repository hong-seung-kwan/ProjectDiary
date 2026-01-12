import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'

const Homepage = lazy(() => import("../pages/Homepage"));
const ProjectAddPage = lazy(() => import('../pages/ProjectAddPage'));
const DiaryWritePage = lazy(() => import('../pages/DiaryWritePage'));
const ProjectManagePage = lazy(() => import('../pages/ProjectManagePage'));
const AuthPage = lazy(() => import("../pages/AuthPage"));
const DiaryListPage = lazy(() => import("../pages/DiaryListPage"));
const ProjectDetailPage = lazy(() => import("../pages/ProjectDetailPage"));

const Router = () => {
  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center h-screen text-gray-500'>
          페이지 로딩 중...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/project-add" element={<PrivateRoute><ProjectAddPage /></PrivateRoute>} />
        <Route path="/diary-write" element={<PrivateRoute><DiaryWritePage /></PrivateRoute>} />
        <Route path="/project-manage" element={<PrivateRoute><ProjectManagePage /></PrivateRoute>} />
        <Route path="/diary-list" element={<PrivateRoute><DiaryListPage /></PrivateRoute>} />
        <Route path="project/:projectId" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
      </Routes>
    </Suspense>
  )
}

export default Router