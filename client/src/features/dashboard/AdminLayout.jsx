import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, Link, FileText, History, 
  BarChart3, Settings, ShieldAlert, LogOut, ChevronRight, Share2, Menu, X
} from 'lucide-react';
import { selectCurrentUser, logoutUser } from '../../store/authSlice.js';
import ThemeSelector from '../../components/ThemeSelector.jsx';

function AdminLayout() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Integrations', path: '/admin/integrations', icon: Link },
    { name: 'Documents', path: '/admin/documents', icon: FileText },
    { name: 'Search history', path: '/admin/history', icon: History },
    { name: 'AI analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Knowledge Graph', path: '/admin/graph', icon: Share2 },
    { name: 'AI settings', path: '/admin/settings', icon: Settings },
    { name: 'Org settings', path: '/admin/org', icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background-page text-text-primary">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Admin Sidebar */}
      <motion.div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-hairline bg-background-sidebar select-none transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ width: mobileMenuOpen ? 256 : (collapsed ? 64 : 240) }}
      >
        {/* Header Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border-hairline">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Insight RAG Logo" className="h-9 w-9 rounded-xl object-cover border border-brand-teal/40 shadow-md shadow-brand-teal/30" />
            {(!collapsed || mobileMenuOpen) && (
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-sm bg-gradient-to-r from-teal-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">Insight RAG</span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-brand-teal">Admin Panel</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex rounded-control p-1 text-text-tertiary hover:bg-background-card hover:text-text-primary transition-colors"
          >
            <ChevronRight className={`h-4 w-4 transform transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden rounded-control p-1 text-text-tertiary hover:bg-background-card hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-teal/15 text-brand-teal font-semibold'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!collapsed || mobileMenuOpen) && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Profile Pin */}
        <div className="relative border-t border-border-hairline p-2">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center gap-3 rounded-control p-2 hover:bg-background-card transition-colors text-left"
          >
            <div className="h-7 w-7 flex items-center justify-center rounded-full bg-brand-teal text-background-page font-mono text-xs font-medium uppercase shrink-0">
              {user?.email?.charAt(0) || 'A'}
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-text-primary">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="truncate text-[10px] text-text-tertiary font-mono uppercase">
                  {user?.role}
                </p>
              </div>
            )}
          </button>

          {/* Profile Popover */}
          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-14 left-2 z-20 w-[200px] rounded-card border border-border-hairline bg-background-card p-3 shadow-lg"
                >
                  <div className="border-b border-border-hairline pb-2 mb-2">
                    <p className="text-xs font-medium text-text-primary truncate">{user?.email}</p>
                    <p className="text-[10px] text-text-tertiary font-mono mt-0.5 uppercase tracking-wider">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-xs text-text-secondary hover:bg-background-sidebar hover:text-text-primary transition-colors mb-1"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    View as Employee
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-xs text-status-error hover:bg-status-error/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout Session
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Main Admin View Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Info Header */}
        <header className="flex h-14 items-center justify-between border-b border-border-hairline px-4 sm:px-6 bg-background-sidebar shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-text-secondary hover:bg-background-card hover:text-text-primary"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">
              Management Console
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-mono text-text-tertiary">Org ID: {user?.orgId?.slice(-6)}</span>
            <ThemeSelector compact={true} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative p-3 sm:p-6 bg-background-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
