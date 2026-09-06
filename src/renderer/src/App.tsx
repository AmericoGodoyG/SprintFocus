import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import MainLayout from './components/layout/MainLayout'
import StudyFlowSlider from './components/layout/StudyFlowSlider'

function App() {
  const initTheme = useTheme((state) => state.initTheme)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<StudyFlowSlider />} />
        <Route path="/pomodoro" element={<StudyFlowSlider />} />
        <Route path="/metrics" element={<StudyFlowSlider />} />
        <Route path="/calendar" element={<StudyFlowSlider />} />
      </Route>
    </Routes>
  )
}

export default App
