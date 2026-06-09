import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FiDatabase, FiAlertCircle, FiCheckCircle, FiClock, 
  FiTrendingUp, FiArrowRight, FiLayers 
} from 'react-icons/fi';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch stats
        const statsRes = await axios.get('/api/stats');
        setStats(statsRes.data);

        // Fetch recent tickets
        const resultsRes = await axios.get('/api/results?limit=5');
        setRecentTickets(resultsRes.data.tickets || []);
      } catch (err) {
        console.error("Error fetching dashboard stats, using mock fallback:", err);
        setStats({
          total_tickets: 100,
          processed_today: 12,
          critical_tickets_count: 8,
          average_confidence: 0.92,
          average_processing_time: 0.65,
          category_distribution: [
            { category: 'Bug', count: 32, percentage: 32.0 },
            { category: 'Billing', count: 24, percentage: 24.0 },
            { category: 'Feature', count: 28, percentage: 28.0 },
            { category: 'Other', count: 16, percentage: 16.0 },
          ],
          priority_distribution: [
            { priority: 'P1 Critical', count: 8, percentage: 8.0 },
            { priority: 'P2 High', count: 22, percentage: 22.0 },
            { priority: 'P3 Medium', count: 48, percentage: 48.0 },
            { priority: 'P4 Low', count: 22, percentage: 22.0 },
          ]
        });
        setRecentTickets([
          { id: 1, ticket_id: 'TC-4829', title: 'Double charge on card subscription renewal', category: 'Billing', priority: 'P1 Critical', confidence: 0.96, created_at: new Date().toISOString() },
          { id: 2, ticket_id: 'TC-9283', title: 'App crash when clicking Save on user profile details', category: 'Bug', priority: 'P2 High', confidence: 0.94, created_at: new Date().toISOString() },
          { id: 3, ticket_id: 'TC-2810', title: 'Requesting Google OAuth / SSO integration', category: 'Feature', priority: 'P3 Medium', confidence: 0.88, created_at: new Date().toISOString() },
          { id: 4, ticket_id: 'TC-1827', title: 'Broken CSS layout alignment on Safari mobile browser', category: 'Bug', priority: 'P4 Low', confidence: 0.82, created_at: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Bug': return 'bg-red-50 border-red-200 text-red-650';
      case 'Billing': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Feature': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-650';
    }
  };

  const getPriorityColor = (pri) => {
    if (pri.includes('P1')) return 'bg-red-500 text-white';
    if (pri.includes('P2')) return 'bg-orange-500 text-white';
    if (pri.includes('P3')) return 'bg-blue-500 text-white';
    return 'bg-slate-500 text-white';
  };

  const getCategoryCount = (catName) => {
    if (!stats || !stats.category_distribution) return 0;
    const cat = stats.category_distribution.find(c => c.category.toLowerCase() === catName.toLowerCase());
    return cat ? cat.count : 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Tickets */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-sm flex items-center justify-between"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Queue</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {stats?.total_tickets}
            </h3>
            <span className="text-[9px] text-slate-450 mt-1.5 block font-semibold">Support tickets tracked</span>
          </div>
          <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
            <FiDatabase className="w-5 h-5 text-slate-600" />
          </div>
        </motion.div>

        {/* Critical Tickets */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-sm flex items-center justify-between"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical P1</span>
            <h3 className="text-2xl font-black text-red-500 mt-1">
              {stats?.critical_tickets_count}
            </h3>
            <span className="text-[9px] text-red-500 font-bold mt-1.5 block animate-pulse">SLA BLOCKERS ACTIVE</span>
          </div>
          <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl">
            <FiAlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </motion.div>

        {/* Processed Today */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-sm flex items-center justify-between"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processed Today</span>
            <h3 className="text-2xl font-black text-emerald-500 mt-1">
              {stats?.processed_today}
            </h3>
            <span className="text-[9px] text-slate-450 mt-1.5 block font-semibold">Triage count today</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
            <FiCheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        </motion.div>

        {/* Avg Confidence */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-sm flex items-center justify-between"
        >
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Confidence</span>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {stats ? `${Math.round(stats.average_confidence * 100)}%` : '0%'}
            </h3>
            <span className="text-[9px] text-slate-450 mt-1.5 block font-semibold">AI evaluation rating</span>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl">
            <FiTrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </motion.div>
      </div>

      {/* Metrics Row 2 - Categories */}
      <div className="text-left">
        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-4 px-1">
          Classification Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { title: 'Bugs Found', name: 'Bug', color: 'text-red-500', bg: 'bg-white' },
            { title: 'Billing Issues', name: 'Billing', color: 'text-amber-500', bg: 'bg-white' },
            { title: 'Feature Requests', name: 'Feature', color: 'text-blue-500', bg: 'bg-white' },
            { title: 'Other Queries', name: 'Other', color: 'text-slate-500', bg: 'bg-white' }
          ].map((item, idx) => (
            <div key={idx} className={`${item.bg} border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm`}>
              <span className="text-[10px] font-bold text-slate-400">{item.title}</span>
              <div className="flex justify-between items-baseline mt-2">
                <span className={`text-2xl font-black ${item.color}`}>
                  {getCategoryCount(item.name)}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {stats?.total_tickets > 0 
                    ? `${Math.round((getCategoryCount(item.name) / stats.total_tickets) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Performance KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Recent Tickets Table (Left 2 cols) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div className="text-left">
              <h3 className="font-extrabold text-base text-slate-900">Recent Ticket Activity</h3>
              <p className="text-[11px] text-slate-400">Latest support tickets analyzed by our AI agents</p>
            </div>
            <Link
              to="/results"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1.5 transition-all border-none"
            >
              <span>View Support Queue</span>
              <FiArrowRight />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase">
                  <th className="pb-3 pl-2">Ticket ID</th>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3 pr-2 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((t) => (
                  <tr 
                    key={t.id} 
                    className="group hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/ticket/${t.id}`)}
                  >
                    <td className="py-4 pl-2 font-mono text-[11px] font-bold text-slate-400">
                      {t.ticket_id}
                    </td>
                    <td className="py-4 font-bold text-xs text-slate-800 truncate max-w-[200px] text-left">
                      {t.title}
                    </td>
                    <td className="py-4 text-left">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(t.category)}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 text-left">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-4 pr-2 text-right font-bold text-slate-600 text-xs">
                      {Math.round(t.confidence * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processing Efficiency Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between text-left">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <FiClock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Triage Latency</h3>
              <p className="text-[10px] text-slate-400">Real-time processing averages</p>
            </div>
          </div>

          <div className="space-y-6 my-auto text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average AI Delay</span>
              <span className="text-4xl font-black text-slate-800 mt-1 inline-block">
                {stats?.average_processing_time}s
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 flex justify-around items-center bg-slate-50/50">
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase">LLM Engine</span>
                <span className="text-xs font-bold text-slate-700 mt-1 block">Gemini 1.5</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase">SLA Success</span>
                <span className="text-xs font-bold text-emerald-600 mt-1 block">100.0%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/upload')}
            className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2 mt-6"
          >
            <FiLayers className="w-4.5 h-4.5" />
            <span>Triage New Batch</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
