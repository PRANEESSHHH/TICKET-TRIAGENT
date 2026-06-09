import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiBell, FiLogOut, FiMenu } from 'react-icons/fi';

const Navbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Read login role
  const userType = localStorage.getItem('userType') || 'demo';
  const isDemo = userType === 'demo';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/upload')) return 'Upload Tickets';
    if (path.startsWith('/processing')) return 'AI Processing Queue';
    if (path.startsWith('/results')) return 'Classified Support Tickets';
    if (path.startsWith('/details') || path.startsWith('/ticket')) return 'Ticket Detailed Analysis';
    if (path.startsWith('/analytics')) return 'Performance Analytics';
    if (path.startsWith('/reports')) return 'Data Reports & Export';
    if (path.startsWith('/settings')) return 'Global Configurations';
    return 'Triage Agent';
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  return (
    <header className="h-20 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-10 animate-fade-in-down">

      {/* Title & Menu Trigger */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 lg:hidden transition-colors border-none"
          title="Toggle Navigation Menu"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <div className="text-left">
          <h2 className="text-sm md:text-lg font-bold text-slate-100 leading-tight">
            {getPageTitle()}
          </h2>
          <p className="text-[9px] md:text-[11px] text-slate-300 mt-0.5 truncate max-w-[150px] sm:max-w-none">
            Support ticket triage analytics engine
          </p>
        </div>
      </div>


      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">

        {/* Workspace indicator tag */}
        <span className={`hidden md:inline-block text-[10px] font-bold px-3 py-1 rounded-full border ${isDemo
            ? 'bg-blue-700/30 border-blue-600 text-blue-200'
            : 'bg-emerald-700/25 border-emerald-600 text-emerald-200'
          }`}>
          {isDemo ? 'Demo Dataset' : 'Clean Slate (New User)'}
        </span>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl hover:bg-slate-700/50 text-slate-200 relative transition-colors border-none"
          >
            <FiBell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-ping"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute right-0 mt-3 w-80 bg-slate-800/90 text-slate-100 rounded-2xl shadow-xl border border-slate-700 py-4 z-30 animate-fade-in-down">
                <div className="px-4 pb-2 border-b border-slate-700/60 flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-100">Notifications</span>
                  <span className="text-[10px] bg-blue-700 text-blue-200 px-2 py-0.5 rounded-full font-semibold">1 New</span>
                </div>
                <div className="divide-y divide-slate-700 max-h-60 overflow-y-auto">
                  <div className="p-4 hover:bg-slate-800/60 transition-colors cursor-pointer text-left">
                    <p className="text-xs text-slate-100 font-bold">Database loaded!</p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      {isDemo ? '100 sample support tickets seeded.' : 'Clean workspace session initiated.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-700/40 transition-colors border-none"
          >
            <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm ${isDemo ? 'bg-blue-600' : 'bg-emerald-600'
              }`}>
              {isDemo ? 'DS' : 'NU'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-100 leading-none">
                {isDemo ? 'Demo Agent' : 'New User'}
              </p>
              <span className="text-[9px] text-slate-300 mt-0.5 block">
                {isDemo ? 'demo@example.com' : 'newuser@example.com'}
              </span>
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowUserMenu(false)}
              ></div>
              <div className="absolute right-0 mt-3 w-56 bg-slate-800/95 text-slate-100 rounded-2xl shadow-xl border border-slate-700 py-2 z-30 animate-fade-in-down">
                <div className="px-4 py-2 border-b border-slate-700 text-left">
                  <p className="text-[10px] text-slate-300">Signed in as</p>
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {isDemo ? 'demo@example.com' : 'newuser@example.com'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 mt-1 text-xs text-red-400 hover:bg-red-700/20 flex items-center space-x-2 transition-colors font-semibold"
                >
                  <FiLogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
