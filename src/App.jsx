import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Doc from './pages/Doc'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/doc/:id" element={<Doc />} />
          <Route path="/shared/:token" element={<Doc shared />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
