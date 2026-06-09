import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiCpu, FiEye, FiEyeOff, FiUser } from 'react-icons/fi';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill out all fields.');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.post('/api/auth/signup', {
          email,
          password
        });
        setSuccess(response.data.message || 'Account created successfully! You can now log in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Registration failed. Check if username exists.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const response = await axios.post('/api/auth/login', {
          email,
          password
        });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userType', response.data.email);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', response.data.email);
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('userType', 'demo');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      navigate('/dashboard');
    }, 300);
  };

  return (
    <div className="auth-root login-root bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center relative px-6 overflow-hidden selection:bg-slate-700 selection:text-slate-100">
      
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md card-dark border border-slate-600 p-8 rounded-3xl shadow-xl relative"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-blue-600 p-3 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/10 mb-3">
            <FiCpu className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            {mode === 'login' ? 'Agent Sign In' : 'Create Agent Account'}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            {mode === 'login' ? 'Access the ticket triage dashboard' : 'Register a new credentials login'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-slate-800 p-1 rounded-2xl mb-6 border border-slate-600/40">
          <button
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login' 
                ? 'bg-slate-700 text-slate-100 shadow-sm border border-slate-600/40 btn-strong-border' 
                : 'text-slate-300 hover:text-slate-100 btn-strong-border'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'signup' 
                ? 'bg-slate-700 text-slate-100 shadow-sm border border-slate-600/40 btn-strong-border' 
                : 'text-slate-300 hover:text-slate-100 btn-strong-border'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 text-xs px-4 py-2.5 rounded-xl text-center font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-xs px-4 py-2.5 rounded-xl text-center font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Email */}
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <FiMail className="w-4.5 h-4.5 text-slate-400 absolute left-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@company.com"
                required
                className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-xs pl-11 pr-4 py-3 rounded-2xl outline-none focus:border-blue-500 focus:bg-slate-700 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1">
              Password
            </label>
            <div className="relative flex items-center">
              <FiLock className="w-4.5 h-4.5 text-slate-400 absolute left-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-xs pl-11 pr-11 py-3 rounded-2xl outline-none focus:border-blue-500 focus:bg-slate-700 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 absolute right-4 text-slate-300 hover:text-slate-100 transition-colors"
              >
                {showPassword ? <FiEyeOff className="w-4.5 h-4.5" /> : <FiEye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (Signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <FiLock className="w-4.5 h-4.5 text-slate-400 absolute left-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-xs pl-11 pr-4 py-3 rounded-2xl outline-none focus:border-blue-500 focus:bg-slate-700 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Remember Me */}
          {mode === 'login' && (
            <div className="flex items-center justify-between py-1 px-1">
              <label className="flex items-center space-x-2.5 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-xs select-none">Remember this session</span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-bold transition-all shadow-sm flex items-center justify-center space-x-2 text-xs disabled:opacity-50 disabled:pointer-events-none btn-strong-border"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-slate-700"></div>
          <span className="bg-slate-900 px-3 text-[10px] text-slate-300 font-bold uppercase absolute">
            Or Skip Credentials
          </span>
        </div>

        {/* Demo Login Bypassing Credentials */}
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-100 py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-sm btn-strong-border"
        >
          <FiUser className="w-4.5 h-4.5 text-blue-300" />
          <span>Continue as Demo Account</span>
        </button>
      </motion.div>
    </div>
  );
};

export default Login;
