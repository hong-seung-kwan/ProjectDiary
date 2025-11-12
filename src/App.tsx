import { BrowserRouter } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar'
import Router from './routes/Router'
import { addDoc, collection } from 'firebase/firestore'
import { db } from './firebase/firebase'

function App() {

  const testAdd = async () => {
    await addDoc(collection(db, "testCollection"), {
      message: "Firebase 연결 성공!",
      createdAt: new Date().toISOString()
    });
    alert("데이터 추가 완료");
  }
  return (
    <BrowserRouter>
      <div className='flex'>
        <Sidebar />
        <div className='ml-56 w-full min-h-screen bg-gray-50 p-8'>
          <button
            onClick={testAdd}
            className='mb-4 bg-blue-500 text-white px-4 py-2 rounded-lg'
          >
            firebase연결 테스트
          </button>
          <Router />
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
