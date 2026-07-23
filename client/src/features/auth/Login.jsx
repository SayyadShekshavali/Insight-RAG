import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { setCredentials } from '../../store/authSlice.js';
import { api } from '../../lib/api.js';

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login API call
        const res = await api.post('/auth/login', { email, password, role });
        if (res.ok) {
          const data = await res.json();
          dispatch(setCredentials({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          }));
          
          // Role based redirect
          if (data.user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } else {
          const errData = await res.json();
          setError(errData.message || 'Authentication failed. Please check credentials.');
        }
      } else {
        // Signup API call (Registers user + creates new Org)
        const payload = {
          email,
          password,
          role,
          orgName: orgName || 'Dev Workspace'
        };

        const res = await api.post('/auth/signup', payload);
        if (res.ok) {
          const data = await res.json();
          dispatch(setCredentials({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          }));
          
          if (data.user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        } else {
          const errData = await res.json();
          setError(errData.message || 'Registration failed. Try again.');
        }
      }
    } catch (err) {
      setError('A network or server error occurred. Please verify connections.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-page px-4">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[420px] rounded-card border border-border-hairline bg-background-card p-8"
      >
        <div className="text-center">
          <img src="/logo.png" alt="Insight RAG Logo" className="mx-auto h-16 w-16 rounded-2xl object-cover border border-brand-teal/40 shadow-lg shadow-brand-teal/30" />
          <h2 className="mt-4 text-xl font-medium tracking-tight text-text-primary">
            {isLogin ? 'Sign in to Insight RAG' : 'Create an organization'}
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            {isLogin ? 'Enter your employee or administrator credentials' : 'Set up your team workspace in seconds'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-control border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error space-y-2 text-center"
          >
            <div>{error}</div>
            {error.includes('Admin') && role === 'employee' && (
              <button
                type="button"
                onClick={() => { setRole('admin'); setError(''); }}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline text-brand-teal hover:text-brand-teal-light cursor-pointer"
              >
                👑 Switch to Admin Login now
              </button>
            )}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Explicit Role Selection Prompt */}
          <div className="space-y-1.5 rounded-card border border-border-hairline bg-background-sidebar/40 p-3 select-none">
            <span className="text-xs font-medium text-text-primary block text-center">
              Do you want to log in as Admin?
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center justify-center gap-1.5 rounded-control py-2 text-xs font-medium transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'border border-brand-teal bg-brand-teal/20 text-brand-teal font-semibold shadow-sm'
                    : 'border border-border-hairline bg-background-card text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>👑 Yes, Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('employee')}
                className={`flex items-center justify-center gap-1.5 rounded-control py-2 text-xs font-medium transition-all cursor-pointer ${
                  role === 'employee'
                    ? 'border border-brand-teal bg-brand-teal/20 text-brand-teal font-semibold shadow-sm'
                    : 'border border-border-hairline bg-background-card text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>👤 Employee</span>
              </button>
            </div>
            <p className="text-[10px] text-text-tertiary text-center pt-1">
              {role === 'admin' ? 'Admins connect integrations and manage security.' : 'Employees access AI chat search and document knowledge.'}
            </p>
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Organization Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'admin' ? "admin@insightrag.dev" : "employee@insightrag.dev"}
              className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-control bg-brand-teal py-2 text-sm font-medium text-background-page hover:bg-brand-teal-light focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Processing...' : isLogin ? (role === 'admin' ? 'Sign in to Admin Console' : 'Sign in to Employee Workspace') : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-secondary">
          {isLogin ? (
            <p>
              Need a team workspace?{' '}
              <button 
                onClick={() => { setIsLogin(false); setError(''); }}
                className="font-medium text-brand-teal hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                onClick={() => { setIsLogin(true); setError(''); }}
                className="font-medium text-brand-teal hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
