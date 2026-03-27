import React, { useRef } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import { Home, Users, List, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation'
import InstallBanner from '../InstallBanner'

const ROUTES = ['/', '/directory', '/mindmap', '/attendance']

export default function MainLayout() {
  const location = useLocation()
  const { onSwipeLeft, onSwipeRight, currentIndex } = useSwipeNavigation()
  const mainTouchStart = useRef(null)

  return (
    <div className="h-screen w-screen bg-gradient-dark text-gray-100 font-sans selection:bg-church-blue-400/30 flex flex-col overflow-hidden relative">
      {/* Shared Decorative Dot Pattern */}
      <div className="absolute inset-0 bg-dot-pattern bg-dot-md text-church-blue-500 opacity-10 pointer-events-none z-0"></div>
      
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden h-full">
        {/* Desktop Navigation */}
        <nav className="hidden md:block relative z-50 bg-black/60 backdrop-blur-md border-b border-church-blue-500/30 shadow-2xl shrink-0">
          <div className="max-w-[1440px] mx-auto px-0 md:px-2 h-16 flex items-center justify-between">
            {/* Desktop Brand */}
            <div className="flex items-center -ml-2">
              <img src="/lec-shield-logo.png" alt="LEC Shield" className="w-12 h-12 object-contain scale-[1.35] origin-right -mr-1.5" />
              <div className="w-[1px] h-10 bg-white/30 mr-2 z-10"></div>
              <div className="text-left py-1 z-10">
                <p className="text-white font-black text-[11px] md:text-xs tracking-wider uppercase leading-tight mb-0">Love Economy</p>
                <p className="text-white font-black text-[11px] md:text-xs tracking-wider uppercase leading-tight">Church</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
              <NavItem to="/" icon={<Home size={18} />} label="Home" />
              <NavItem to="/directory" icon={<Users size={18} />} label="Directory" />
              <NavItem to="/mindmap" icon={<List size={18} />} label="Map" />
              <NavItem to="/attendance" icon={<CheckCircle2 size={18} />} label="Attendance" />
            </div>
          </div>
        </nav>

        {/* Mobile Header */}
        <header className="md:hidden relative z-50 bg-black/80 backdrop-blur-md border-b border-church-blue-500/20 px-4 h-14 flex items-center justify-between shadow-lg shrink-0 w-full">
          <div className="flex items-center">
            <img src="/lec-shield-logo.png" alt="" className="w-9 h-9 object-contain drop-shadow-lg" />
            <div className="w-px h-6 bg-white/20 mx-2"></div>
            <div className="flex flex-col justify-center">
                <p className="text-white font-black text-[9px] tracking-widest uppercase leading-tight mb-0">Love Economy</p>
                <p className="text-church-blue-400 font-black text-[9px] tracking-widest uppercase leading-tight">Church</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main
          className="flex-1 overflow-y-auto custom-scrollbar touch-pan-y"
          onTouchStart={(e) => {
            // Disable swipe navigation on mindmap — ReactFlow needs touch for panning
            if (location.pathname === '/mindmap') return;
            mainTouchStart.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            if (location.pathname === '/mindmap') return;
            if (mainTouchStart.current === null) return
            const diff = e.changedTouches[0].clientX - mainTouchStart.current
            const swipeThreshold = 80
            if (diff < -swipeThreshold) onSwipeLeft()
            else if (diff > swipeThreshold) onSwipeRight()
            mainTouchStart.current = null
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Tabs */}
        <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full">
          <div className="bg-black/95 backdrop-blur-2xl border-t border-white/10 px-4 pt-3 pb-6 flex items-center justify-around shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.5)]">
            <TabItem to="/" icon={<Home size={22} />} />
            <TabItem to="/directory" icon={<Users size={22} />} />
            <TabItem to="/mindmap" icon={<List size={22} />} />
            <TabItem to="/attendance" icon={<CheckCircle2 size={22} />} />
          </div>
        </nav>
        {/* PWA Install Banner */}
        <InstallBanner />
      </div>
    </div>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200
        ${isActive
          ? 'bg-gradient-church text-white shadow-lg'
          : 'text-gray-400 hover:text-church-blue-400 hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

function TabItem({ to, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        p-3 rounded-2xl transition-all duration-300 relative
        ${isActive
          ? 'bg-gradient-church text-white shadow-lg scale-110 -translate-y-1'
          : 'text-gray-500 hover:text-church-blue-400'
        }
      `}
    >
      {({ isActive }) => (
        <>
          {icon}
          {isActive && (
            <motion.div 
              layoutId="activeTab"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
            />
          )}
        </>
      )}
    </NavLink>
  )
}
