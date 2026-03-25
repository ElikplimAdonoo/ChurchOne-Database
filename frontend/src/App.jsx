import { AuthProvider } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
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

          {/* Public Main Layout Routes */}
          <Route element={<MainLayout />}>
            {/* Public but inside MainLayout */}
            <Route index element={<DashboardPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
              <Route path="directory" element={<PeopleDirectoryPage />} />
              <Route path="mindmap" element={<HierarchyMindMapPage />} />
              <Route path="attendance" element={<AttendancePage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
