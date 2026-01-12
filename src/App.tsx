import { BrowserRouter } from 'react-router-dom'
import './App.css'
import Sidebar from './components/Sidebar'
import Router from './routes/Router'
import { AuthProvider } from './context/AuthContext'

function App() {

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
