import { BrowserRouter } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar'
import Router from './routes/Router'
import { addDoc, collection } from 'firebase/firestore'
import { db } from './firebase/firebase'
import { AuthProvider } from './context/AuthContext'

function App() {

  const testAdd = async () => {
    await addDoc(collection(db, "testCollection"), {
      message: "Firebase 연결 성공!",
      createdAt: new Date().toISOString()
    });
    alert("데이터 추가 완료");
  }
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className='flex'>
          <Sidebar />
          <div className='ml-56 w-full min-h-screen bg-gray-50 p-8'>
            <Router />
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
