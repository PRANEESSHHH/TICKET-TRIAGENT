import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiCpu, FiTrendingUp, FiClock, FiFileText, FiEdit, FiDownload } from 'react-icons/fi';

const Details = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit states inside details page
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/ticket/${id}`);
        setTicket(response.data);
        setEditCategory(response.data.category);
        setEditPriority(response.data.priority);
      } catch (error) {
        console.error("Error fetching ticket details, using mock fallback:", error);
        const fallback = {
          id: parseInt(id),
          ticket_id: `TC-${1000 + parseInt(id)}`,
          title: 'Double charge on card subscription renewal',
          description: 'I was billed twice on my Mastercard for the monthly plan. The statement shows two duplicate transactions of $49.00 on the same day. Please refund the secondary charge immediately and audit my account transactions. Contact: customer@example.com.',
          category: 'Billing',
          priority: 'P1 Critical',
          reasoning: 'Customer reported a duplicate charge of $49.00 on their card. Double billing is a financial risk and causes high user friction, warranting a P1 Critical status. Category assigned as Billing.',
          confidence: 0.96,
          processing_time: 0.82,
          created_at: new Date().toISOString()
        };
        setTicket(fallback);
        setEditCategory(fallback.category);
        setEditPriority(fallback.priority);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketDetails();
  }, [id]);

  const handleSaveEdit = async () => {
    try {
      const response = await axios.put(`/api/ticket/${id}`, {
        category: editCategory,
        priority: editPriority
      });
      setTicket(response.data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setTicket(prev => ({
        ...prev,
        category: editCategory,
        priority: editPriority,
        confidence: 1.0,
        reasoning: 'Manually adjusted by support representative.'
      }));
      setIsEditing(false);
    }
  };

  const handleExportJSON = () => {
    if (!ticket) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ticket, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ticket_${ticket.ticket_id}_triage.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Bug': return 'bg-red-50 border-red-200 text-red-650';
      case 'Billing': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Feature': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-650';
    }
  };

  const getPriorityColor = (pri) => {
    if (pri.includes('P1')) return 'bg-red-50 border-red-250 text-red-650';
    if (pri.includes('P2')) return 'bg-orange-50 border-orange-250 text-orange-650';
    if (pri.includes('P3')) return 'bg-blue-50 border-blue-250 text-blue-650';
    return 'bg-slate-50 border-slate-250 text-slate-650';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 text-left">
      {/* Back Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          to="/results"
          className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold border-none"
        >
          <FiChevronLeft className="w-4.5 h-4.5" />
          <span>Back to support queue</span>
        </Link>

        <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 sm:flex-initial border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <FiEdit className="w-3.5 h-3.5" />
            <span>Override Triage</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Original Ticket details (3 cols) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm lg:col-span-3 space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-widest">{ticket?.ticket_id}</span>
            <h2 className="text-lg font-bold text-slate-850 mt-1 leading-snug">{ticket?.title}</h2>
            <span className="text-[9px] text-slate-400 mt-1 block">Created Date: {new Date(ticket?.created_at).toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Customer Support Issue</h4>
            <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
              <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                {ticket?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right: AI Triage Summary (2 cols) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <FiCpu className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">AI Classification Report</h3>
            </div>

            {/* Tags Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Triage Category</span>
                <span className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full border inline-block ${getCategoryColor(ticket?.category)}`}>
                  {ticket?.category}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center shadow-sm">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Severity Priority</span>
                <span className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full border inline-block ${getPriorityColor(ticket?.priority)}`}>
                  {ticket?.priority}
                </span>
              </div>
            </div>

            {/* Diagnostic stats */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-450">
                  <span>Confidence Quotient</span>
                  <span className="text-slate-700 flex items-center space-x-1"><FiTrendingUp className="inline" />{Math.round(ticket?.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${ticket?.confidence * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span>AI Execution Delay</span>
                <span className="font-bold text-slate-700 flex items-center space-x-1"><FiClock className="inline mr-1" />{ticket?.processing_time} seconds</span>
              </div>
            </div>

            {/* Reasoning text */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">AI Reasoning Logs</h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium">
                {ticket?.reasoning}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Viewer */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-4 pb-3 border-b border-slate-200 flex items-center space-x-2">
          <FiFileText className="text-blue-600 w-4 h-4" />
          <span>Structured Database JSON Record</span>
        </h4>
        <pre className="font-mono text-[11px] text-slate-700 overflow-x-auto p-4 bg-white border border-slate-200 rounded-2xl scrollbar-thin">
          {JSON.stringify(ticket, null, 2)}
        </pre>
      </div>

      {/* Override Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-200 p-6 rounded-3xl shadow-xl relative"
            >
              <h3 className="font-extrabold text-sm text-slate-850 mb-2">Override Triage Parameters</h3>
              <p className="text-xs text-slate-400 mb-4">Re-configure priority and category classifications.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-450 text-[10px] font-bold uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500"
                  >
                    <option value="Bug">Bug</option>
                    <option value="Billing">Billing</option>
                    <option value="Feature">Feature</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-455 text-[10px] font-bold uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-blue-500"
                  >
                    <option value="P1 Critical">P1 Critical</option>
                    <option value="P2 High">P2 High</option>
                    <option value="P3 Medium">P3 Medium</option>
                    <option value="P4 Low">P4 Low</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-550 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="bg-slate-900 hover:bg-slate-850 text-white px-5 py-2 text-xs font-semibold rounded-xl"
                >
                  Apply Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Details;
