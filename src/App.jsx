import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Landing from './pages/Landing'
import NewClip from './pages/NewClip'
import Analyze from './pages/Analyze'
import Results from './pages/Results'
import Editor from './pages/Editor'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import Settings from './pages/Settings'
import BrandKit from './pages/BrandKit'
import Templates from './pages/Templates'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppShell />}>
        <Route path="/new" element={<NewClip />} />
        <Route path="/analyze/:id" element={<Analyze />} />
        <Route path="/project/:id/results" element={<Results />} />
        <Route path="/project/:id/editor/:clipId" element={<Editor />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/brand" element={<BrandKit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
