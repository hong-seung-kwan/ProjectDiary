import { type JSX } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({children}: {children: JSX.Element}) => {
    const {user, loading} = useAuth();

    if (loading) return <div>로딩 중...</div>
    if (!user) return <Navigate to="/auth" replace />;

  return children;
}

export default PrivateRoute;