import { AuthProvider } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './components/Login'
import MainLayout from './components/layout/MainLayout'

// Pages
import DashboardPage from './pages/DashboardPage'
import PeopleDirectoryPage from './pages/PeopleDirectoryPage'
import HierarchyMindMapPage from './pages/HierarchyMindMapPage'
import AttendancePage from './pages/AttendancePage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Layout Routes */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="directory" element={<PeopleDirectoryPage />} />
            <Route path="mindmap" element={<HierarchyMindMapPage />} />
            <Route path="attendance" element={<AttendancePage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
