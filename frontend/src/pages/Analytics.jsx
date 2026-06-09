import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { FiTrendingUp, FiClock, FiDatabase, FiAlertTriangle } from 'react-icons/fi';

const COLORS = {
  Bug: '#EF4444',
  Billing: '#F59E0B',
  Feature: '#2563EB',
  Other: '#64748B'
};

const PRIORITY_COLORS = {
  'P1 Critical': '#EF4444',
  'P2 High': '#F97316',
  'P3 Medium': '#3B82F6',
  'P4 Low': '#64748B'
};

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [criticalIssues, setCriticalIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const statsRes = await axios.get('/api/stats');
        setStats(statsRes.data);

        const ticketsRes = await axios.get('/api/results?limit=100');
        const tickets = ticketsRes.data.tickets || [];

        const groupedDates = {};
        tickets.forEach(t => {
          const dateStr = new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
          groupedDates[dateStr] = (groupedDates[dateStr] || 0) + 1;
        });

        const trendArray = Object.keys(groupedDates).map(date => ({
          date,
          tickets: groupedDates[date]
        })).reverse();

        setTrendData(trendArray.slice(-7));

        const p1s = tickets.filter(t => t.priority.includes('P1')).slice(0, 5);
        setCriticalIssues(p1s);

      } catch (error) {
        console.error("Error fetching analytics statistics, loading mocks:", error);
        setStats({
          total_tickets: 100,
          processed_today: 14,
          critical_tickets_count: 8,
          average_confidence: 0.93,
          average_processing_time: 0.72,
          category_distribution: [
            { category: 'Bug', count: 32, percentage: 32 },
            { category: 'Billing', count: 24, percentage: 24 },
            { category: 'Feature', count: 28, percentage: 28 },
            { category: 'Other', count: 16, percentage: 16 }
          ],
          priority_distribution: [
            { priority: 'P1 Critical', count: 8, percentage: 8 },
            { priority: 'P2 High', count: 22, percentage: 22 },
            { priority: 'P3 Medium', count: 48, percentage: 48 },
            { priority: 'P4 Low', count: 22, percentage: 22 }
          ]
        });

        setTrendData([
          { date: 'Jun 1', tickets: 12 },
          { date: 'Jun 2', tickets: 19 },
          { date: 'Jun 3', tickets: 15 },
          { date: 'Jun 4', tickets: 25 },
          { date: 'Jun 5', tickets: 18 },
          { date: 'Jun 6', tickets: 11 }
        ]);

        setCriticalIssues([
          { id: 1, ticket_id: 'TC-8912', title: 'SQL Injection in dashboard user profile search input', category: 'Bug', priority: 'P1 Critical', created_at: new Date().toISOString() },
          { id: 2, ticket_id: 'TC-4820', title: 'Double charge on card checkout renewals', category: 'Billing', priority: 'P1 Critical', created_at: new Date().toISOString() },
          { id: 3, ticket_id: 'TC-1822', title: 'Critical database server down and returning 500 error code', category: 'Bug', priority: 'P1 Critical', created_at: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getPieData = () => {
    if (!stats || !stats.category_distribution) return [];
    return stats.category_distribution.map(item => ({
      name: item.category,
      value: item.count
    }));
  };

  const getBarData = () => {
    if (!stats || !stats.priority_distribution) return [];
    return stats.priority_distribution.map(item => ({
      name: item.priority.split(' ')[0],
      count: item.count,
      fullName: item.priority
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 text-left">
      {/* Overview Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Tickets', val: stats?.total_tickets, desc: 'Active session entries', icon: <FiDatabase className="w-4.5 h-4.5 text-blue-600" />, bg: 'bg-blue-50 border border-blue-100' },
          { label: 'Avg AI Confidence', val: stats ? `${Math.round(stats.average_confidence * 100)}%` : '0%', desc: 'Machine categorization score', icon: <FiTrendingUp className="w-4.5 h-4.5 text-purple-600" />, bg: 'bg-purple-50 border border-purple-100' },
          { label: 'Avg Triage Delay', val: stats ? `${stats.average_processing_time}s` : '0s', desc: 'LangChain pipeline delays', icon: <FiClock className="w-4.5 h-4.5 text-emerald-600" />, bg: 'bg-emerald-50 border border-emerald-100' },
          { label: 'SLA Urgencies', val: stats?.critical_tickets_count, desc: 'P1 Critical active', icon: <FiAlertTriangle className="w-4.5 h-4.5 text-red-650" />, bg: 'bg-red-50 border border-red-100' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{kpi.label}</span>
              <span className="text-xl font-black text-slate-800 mt-1 block">{kpi.val}</span>
              <span className="text-[10px] text-slate-400 block mt-1">{kpi.desc}</span>
            </div>
            <div className={`${kpi.bg} p-3 rounded-xl shadow-sm`}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Category Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h4 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider mb-6 px-2 border-l-4 border-blue-500 pl-3">Category Distribution</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {getPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '12px', 
                    color: '#0F172A',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748B' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h4 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider mb-6 px-2 border-l-4 border-amber-500 pl-3">Severity Priority Spread</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBarData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '12px', 
                    color: '#0F172A',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {getBarData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.fullName] || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Trend Chart & Critical Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Ticket Volume Trends (2 cols) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm lg:col-span-2">
          <h4 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider mb-6 px-2 border-l-4 border-indigo-500 pl-3">Incoming Ticket Volume Trend</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '12px', 
                    color: '#0F172A',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                />
                <Line type="monotone" dataKey="tickets" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Critical Issues List */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h4 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider mb-4 px-2 border-l-4 border-red-500 pl-3">Top Critical P1 Issues</h4>
          <div className="divide-y divide-slate-100">
            {criticalIssues.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-semibold">No active P1 Critical tickets in queue.</div>
            ) : (
              criticalIssues.map((issue) => (
                <div key={issue.id} className="py-3.5 flex items-start justify-between space-x-2">
                  <div className="truncate text-left">
                    <span className="font-mono text-[9px] font-bold text-slate-400 block">{issue.ticket_id}</span>
                    <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{issue.title}</span>
                  </div>
                  <span className="bg-red-50 border border-red-100 text-red-650 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    P1 Critical
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
