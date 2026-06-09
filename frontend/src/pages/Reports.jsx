import { useState } from 'react';
import { FiDownload, FiFileText, FiDatabase, FiTable } from 'react-icons/fi';

const Reports = () => {
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (priority) params.append('priority', priority);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleExportCSV = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    window.open(`${cleanApiBase}/api/export/csv${buildQueryString()}`, '_blank');
  };

  const handleExportJSON = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    window.open(`${cleanApiBase}/api/export/json${buildQueryString()}`, '_blank');
  };

  const handleDownloadDatabase = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    window.open(`${cleanApiBase}/api/export/database`, '_blank');
  };

  return (
    <div className="space-y-8 pb-10 text-left">
      {/* Filters Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="font-extrabold text-base text-slate-850 mb-2">Configure Report Filter</h3>
        <p className="text-xs text-slate-400 mb-6">Choose specific categories or date brackets to scope your downloadable datasets.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Category */}
          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-3 rounded-xl outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Bug">Bug</option>
              <option value="Billing">Billing</option>
              <option value="Feature">Feature</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-3 rounded-xl outline-none focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="P1 Critical">P1 Critical</option>
              <option value="P2 High">P2 High</option>
              <option value="P3 Medium">P3 Medium</option>
              <option value="P4 Low">P4 Low</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* CSV Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[280px] hover:border-slate-350 transition-all">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl w-fit text-blue-600">
              <FiTable className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-850">Export to CSV</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                Download support ticket records formatted as a comma-separated values spreadsheet. Excellent for Excel or spreadsheet tool analysis.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <FiDownload />
            <span>Download CSV Report</span>
          </button>
        </div>

        {/* JSON Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[280px] hover:border-slate-350 transition-all">
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 p-3 rounded-2xl w-fit text-purple-600">
              <FiFileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-850">Export to JSON</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                Download raw structured tickets database objects. Perfect for external system integrations, migrations, and developer audits.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportJSON}
            className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <FiDownload />
            <span>Download JSON Log</span>
          </button>
        </div>

        {/* Database Snapshot Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[280px] hover:border-slate-350 transition-all">
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl w-fit text-emerald-500">
              <FiDatabase className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-850">Database Snapshot</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                Download a binary replica of the active SQLite database file. Useful for backing up schemas, configurations, and data tables offline.
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadDatabase}
            className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <FiDownload />
            <span>Download tickets.db Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
