import { NavLink, Link } from 'react-router-dom';
import { FiGrid, FiUpload, FiList, FiBarChart2, FiDownload, FiSettings, FiCpu } from 'react-icons/fi';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const userType = localStorage.getItem('userType') || 'demo';
  const isDemo = userType === 'demo';

  const menuItems = [
    // Landing page removed from hamburger menu
    { name: 'Dashboard', path: '/dashboard', icon: <FiGrid className="w-4.5 h-4.5" /> },
    { name: 'Upload Tickets', path: '/upload', icon: <FiUpload className="w-4.5 h-4.5" /> },
    { name: 'AI Results', path: '/results', icon: <FiList className="w-4.5 h-4.5" /> },
    { name: 'Analytics', path: '/analytics', icon: <FiBarChart2 className="w-4.5 h-4.5" /> },
    { name: 'Reports', path: '/reports', icon: <FiDownload className="w-4.5 h-4.5" /> },
    { name: 'Settings', path: '/settings', icon: <FiSettings className="w-4.5 h-4.5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      <aside className={`w-64 bg-slate-900 text-slate-200 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-30 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>


      {/* Brand Logo Link to Landing page */}
      <Link to="/" className="p-6 border-b border-slate-800/60 flex items-center space-x-3 bg-transparent hover:bg-slate-800/60 transition-colors">
        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center">
          <FiCpu className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="text-left">
          <h1 className="font-extrabold text-sm text-slate-100 leading-none tracking-tight">TriageAgent</h1>
          <span className="text-[9px] font-bold text-blue-300 tracking-wider">VERSION 1.0</span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150 group text-xs font-semibold ${isActive
                ? 'bg-slate-800 text-slate-100 border border-slate-700/60 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`
            }
          >
            <span className="transition-transform group-hover:scale-105">
              {item.icon}
            </span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Workspace Session info */}
      <div className="p-4 mx-4 my-6 card-dark rounded-2xl flex flex-col items-center text-center shadow-sm">
        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1 border ${isDemo
            ? 'bg-blue-800/40 border-blue-600 text-blue-300'
            : 'bg-emerald-800/30 border-emerald-600 text-emerald-300'
          }`}>
          {isDemo ? 'Demo Mode' : 'Clean Slate'}
        </span>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          {isDemo
            ? 'Accessing seeded support dataset'
            : 'Accessing local clean session'}
        </p>
      </div>
      </aside>
    </>
  );
};


export default Sidebar;
