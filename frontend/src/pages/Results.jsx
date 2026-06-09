import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiEdit2, FiEye, FiDownload, FiChevronLeft, FiChevronRight, FiAlertCircle } from 'react-icons/fi';

const Results = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);

  // Edit ticket state
  const [editingTicket, setEditingTicket] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');

  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/results', {
        params: {
          page,
          limit,
          search: search || undefined,
          category: categoryFilter || undefined,
          priority: priorityFilter || undefined,
          sort_by: sortBy,
          sort_desc: sortDesc
        }
      });
      setTickets(response.data.tickets || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error("Error loading tickets, using mock data:", error);
      setTickets([
        { id: 1, ticket_id: 'TC-4829', title: 'Double charge on card subscription renewal', category: 'Billing', priority: 'P1 Critical', reasoning: 'Duplicate charge reported by customer, high financial friction.', confidence: 0.96, processing_time: 0.8, created_at: new Date().toISOString() },
        { id: 2, ticket_id: 'TC-9283', title: 'App crash when clicking Save on user profile details', category: 'Bug', priority: 'P2 High', reasoning: 'Code crash causing application freeze, prevents core profile edits.', confidence: 0.94, processing_time: 0.6, created_at: new Date().toISOString() },
        { id: 3, ticket_id: 'TC-2810', title: 'Requesting Google OAuth / SSO integration', category: 'Feature', priority: 'P3 Medium', reasoning: 'Standard enterprise feature integration request.', confidence: 0.88, processing_time: 1.2, created_at: new Date().toISOString() },
        { id: 4, ticket_id: 'TC-1827', title: 'Broken CSS layout alignment on Safari mobile browser', category: 'Bug', priority: 'P4 Low', reasoning: 'Minor visual layout issue, does not block application workflows.', confidence: 0.82, processing_time: 0.4, created_at: new Date().toISOString() },
      ]);
      setTotal(4);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter, priorityFilter, sortBy, sortDesc]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTickets();
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchTickets]);

  const handleEditClick = (ticket) => {
    setEditingTicket(ticket);
    setEditCategory(ticket.category);
    setEditPriority(ticket.priority);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`/api/ticket/${editingTicket.id}`, {
        category: editCategory,
        priority: editPriority
      });
      setEditingTicket(null);
      fetchTickets();
    } catch (err) {
      console.error("Error updating ticket details:", err);
      setTickets(prev => prev.map(t => 
        t.id === editingTicket.id 
          ? { ...t, category: editCategory, priority: editPriority, confidence: 1.0, reasoning: 'Manually adjusted.' } 
          : t
      ));
      setEditingTicket(null);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Bug': return 'bg-red-50 border-red-200 text-red-600';
      case 'Billing': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Feature': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  const getPriorityColor = (pri) => {
    if (pri.includes('P1')) return 'bg-red-500 text-white';
    if (pri.includes('P2')) return 'bg-orange-500 text-white';
    if (pri.includes('P3')) return 'bg-blue-500 text-white';
    return 'bg-slate-500 text-white';
  };

  const handleExportCSV = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    window.open(`${cleanApiBase}/api/export/csv`, '_blank');
  };

  return (
    <div className="space-y-6 pb-10 text-left">
      {/* Control Header Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
        {/* Search Input */}
        <div className="relative w-full md:max-w-sm flex items-center">
          <FiSearch className="w-4.5 h-4.5 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tickets by ID, title..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs pl-11 pr-4 py-2.5 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-450"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 hidden sm:inline"><FiFilter className="inline mr-1" />Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-2.5 py-2 rounded-xl outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Bug">Bugs</option>
              <option value="Billing">Billing</option>
              <option value="Feature">Features</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1">
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-2.5 py-2 rounded-xl outline-none focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="P1 Critical">P1 Critical</option>
              <option value="P2 High">P2 High</option>
              <option value="P3 Medium">P3 Medium</option>
              <option value="P4 Low">P4 Low</option>
            </select>
          </div>

          {/* Sort Menu */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-2.5 py-2 rounded-xl outline-none focus:border-blue-500"
          >
            <option value="created_at">Date Created</option>
            <option value="confidence">Confidence</option>
            <option value="processing_time">Delay Time</option>
          </select>

          <button
            onClick={() => setSortDesc(!sortDesc)}
            className="border border-slate-200 p-2 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-semibold"
            title="Toggle Sort Order"
          >
            {sortDesc ? 'Desc' : 'Asc'}
          </button>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
          >
            <FiDownload />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Datagrid */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-3">
            <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs text-slate-500">Loading support queue database...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-3">
            <FiAlertCircle className="w-10 h-10 text-slate-350" />
            <h4 className="font-extrabold text-base text-slate-750">No Tickets Found</h4>
            <p className="text-xs text-slate-400 max-w-sm">No ticket records matched your current searching filters. Check your settings or upload new tickets.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase">
                  <th className="py-4 pl-6 w-28">ID</th>
                  <th className="py-4">Ticket Title</th>
                  <th className="py-4 w-32">Category</th>
                  <th className="py-4 w-28">Priority</th>
                  <th className="py-4 w-24">Confidence</th>
                  <th className="py-4 w-24">Delay</th>
                  <th className="py-4 pr-6 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-6 font-mono text-[11px] font-bold text-slate-400">{t.ticket_id}</td>
                    <td className="py-4">
                      <div className="font-bold text-xs text-slate-800 truncate max-w-[280px]">
                        {t.title}
                      </div>
                      <span className="text-[10px] text-slate-450 block truncate max-w-[280px] mt-0.5">{t.description}</span>
                    </td>
                    <td className="py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryColor(t.category)}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-xs text-slate-650">
                      {Math.round(t.confidence * 100)}%
                    </td>
                    <td className="py-4 font-mono text-xs text-slate-450">
                      {t.processing_time}s
                    </td>
                    <td className="py-4 pr-6 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/ticket/${t.id}`)}
                        className="p-2 hover:bg-slate-100 text-blue-600 rounded-lg transition-colors inline-block border-none"
                        title="View Detailed Classification"
                      >
                        <FiEye className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleEditClick(t)}
                        className="p-2 hover:bg-slate-100 text-amber-600 rounded-lg transition-colors inline-block border-none"
                        title="Edit Categories"
                      >
                        <FiEdit2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!loading && tickets.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/10">
            <span>Showing Page {page} of {totalPages} • Total {total} records</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 px-2">
                {page}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 p-6 rounded-3xl shadow-xl relative"
            >
              <h3 className="font-extrabold text-sm text-slate-850 mb-2">Adjust Support Triage</h3>
              <p className="text-xs text-slate-400 mb-4">Manually override AI ticket parameters for {editingTicket.ticket_id}.</p>

              <div className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500"
                  >
                    <option value="Bug">Bug</option>
                    <option value="Billing">Billing</option>
                    <option value="Feature">Feature</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500"
                  >
                    <option value="P1 Critical">P1 Critical</option>
                    <option value="P2 High">P2 High</option>
                    <option value="P3 Medium">P3 Medium</option>
                    <option value="P4 Low">P4 Low</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="bg-slate-900 hover:bg-slate-850 text-white px-5 py-2 text-xs font-semibold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Results;
