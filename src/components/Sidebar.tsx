import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate()
    const { user, loading } = useAuth()

    if (loading) return null;

    const handleLogout = async () => {
        await signOut(auth)
        alert("로그아웃 되었습니다.")
        navigate('/login')
    }

    const menus = user
        ? [
            { name: "홈", path: "/" },
            { name: "프로젝트 추가", path: "project-add" },
            { name: "일지 작성", path: "diary-write" },
            { name: "프로젝트 관리", path: "project-manage" },
            { name: "일지 목록", path: "/diary-list"},
        ]
        : [
            { name: '홈', path: '/' },
            { name: '로그인', path: '/login' }
        ]

    return (
        <div className='fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 shadow-sm'>
            <div className='px-5 py-6'>
                <h1 className='text-lg font-bold text-blue-600 mb-2'>Project Diary</h1>
                <p className='text-xs text-gray-500 mb-8'>프로젝트 일지를 관리해보세요.</p>


                {/* 로그인 로그아웃 테스트 용 */}
                {user && (
                    <div className='mb-4 text-sm text-gray-600'>
                        <p className='font-medium'>{user.email}</p>
                        <button
                            onClick={handleLogout}
                            className='text-xs text-red-500 hover:underline mt-1'
                        >
                            로그아웃
                        </button>
                    </div>
                )}

                {/* 사이드바 메뉴 */}
                <nav className='flex flex-col space-y-2'>
                    {menus.map((menu) => {
                        const isActive = location.pathname === menu.path;
                        return (
                            <Link
                                key={menu.path}
                                to={menu.path}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? "bg-blue-100 text-blue-600"
                                        : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                {menu.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}

export default Sidebar