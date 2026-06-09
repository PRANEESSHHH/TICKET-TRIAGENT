import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCpu, FiPlay, FiTerminal, FiCheckCircle } from 'react-icons/fi';

const Processing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketsToProcess = useMemo(
    () => location.state?.tickets || [],
    [location.state?.tickets]
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState([]);
  const [processedTickets, setProcessedTickets] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [running, setRunning] = useState(false);
  const socketRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (ticketsToProcess.length === 0) {
      navigate('/upload');
    }
  }, [ticketsToProcess, navigate]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const startProcessing = () => {
    if (running || isCompleted) return;
    setRunning(true);
    setLogs(["Connecting to AI Agent websocket server..."]);

    // Extract current login user type and token
    const userType = localStorage.getItem('userType') || 'demo';
    const token = localStorage.getItem('token') || '';

    // Resolve WebSocket URL based on configured API base URL
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    let wsBase = apiBase.replace(/^http/, 'ws');
    if (apiBase.startsWith('/')) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsBase = `${wsProtocol}//${window.location.host}${apiBase}`;
    }
    const cleanWsBase = wsBase.endsWith('/') ? wsBase.slice(0, -1) : wsBase;
    
    // Connect to FastAPI websocket passing user_type and token parameters
    const tokenParam = token ? `&token=${token}` : '';
    const socket = new WebSocket(`${cleanWsBase}/api/ws/process?user_type=${userType}${tokenParam}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setLogs(prev => [...prev, "Connected! Sending tickets payload...", "AI agent triage session started."]);
      socket.send(JSON.stringify({ tickets: ticketsToProcess }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'info') {
        setLogs(prev => [...prev, `[SYSTEM] ${data.message}`]);
      } 
      else if (data.type === 'progress') {
        setCurrentIndex(data.index);
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [
          ...prev, 
          `[${timestamp}] Ticket ${data.ticket_id} (${data.index + 1}/${data.total}): ${data.step}`
        ]);
      } 
      else if (data.type === 'ticket_completed') {
        setProcessedTickets(prev => [...prev, data.ticket]);
      } 
      else if (data.type === 'completed') {
        setIsCompleted(true);
        setRunning(false);
        setLogs(prev => [...prev, "✔ Classification complete. 100% database synchronization completed."]);
        socket.close();
      } 
      else if (data.type === 'error') {
        setLogs(prev => [...prev, `❌ Error: ${data.message}`]);
        setRunning(false);
        socket.close();
      }
    };

    socket.onerror = () => {
      setLogs(prev => [...prev, "❌ WebSocket Connection Error. Ensure backend server is running and accessible."]);
      setRunning(false);
    };

    socket.onclose = () => {
      setLogs(prev => [...prev, "WebSocket connection closed."]);
    };
  };

  const progressPercent = ticketsToProcess.length > 0 
    ? Math.round(((currentIndex + (isCompleted ? 1 : 0)) / ticketsToProcess.length) * 100) 
    : 0;

  const getCategoryCount = (cat) => {
    return processedTickets.filter(t => t.category === cat).length;
  };

  const getP1Count = () => {
    return processedTickets.filter(t => t.priority.includes('P1')).length;
  };

  return (
    <div className="space-y-8 pb-10 text-left">
      {/* Action Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="font-extrabold text-base text-slate-850">AI Classification Engine</h3>
          <p className="text-xs text-slate-400">Triage batch: {ticketsToProcess.length} pending support tickets</p>
        </div>
        {!running && !isCompleted && (
          <button
            onClick={startProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center space-x-2"
          >
            <FiPlay className="w-4 h-4" />
            <span>Start AI Analysis</span>
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => navigate('/results')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 animate-bounce"
          >
            <FiCheckCircle className="w-4 h-4" />
            <span>View Triaged Results</span>
          </button>
        )}
      </div>

      {/* Progress & Animated Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Card (1 col) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[380px]">
          <div>
            <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-6">Triage Status</h4>
            
            <div className="flex items-center justify-center my-6">
              <div className="relative">
                <div className={`w-20 h-20 bg-blue-50/50 border border-blue-200 rounded-full flex items-center justify-center ${running ? 'animate-pulse' : ''}`}>
                  <FiCpu className={`w-8 h-8 text-blue-600 ${running ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                </div>
                {running && (
                  <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping"></div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-450">Processing Progress</span>
                <span className="text-slate-700">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                {isCompleted 
                  ? 'All tickets processed successfully!' 
                  : running 
                    ? `Processing Ticket ${currentIndex + 1} of ${ticketsToProcess.length}` 
                    : 'Awaiting execution launch'}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <span className="text-[9px] text-slate-400 font-bold block uppercase">Bugs Found</span>
              <span className="text-base font-black text-red-500">{getCategoryCount('Bug')}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-bold block uppercase">P1 Criticals</span>
              <span className="text-base font-black text-amber-600">{getP1Count()}</span>
            </div>
          </div>
        </div>

        {/* Live Terminal Log (2 cols) */}
        <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col h-[380px]">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-200">
            <FiTerminal className="w-4.5 h-4.5 text-blue-600" />
            <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">AI Agent Execution Console</h4>
          </div>
          
          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 py-4 scrollbar-thin">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`${
                  log.includes('❌') 
                    ? 'text-red-655 font-bold' 
                    : log.includes('✔') 
                      ? 'text-emerald-600 font-bold' 
                      : log.includes('[SYSTEM]') 
                        ? 'text-blue-600 font-bold' 
                        : 'text-slate-600'
                }`}
              >
                {log}
              </div>
            ))}
            {running && (
              <div className="text-blue-500 animate-pulse text-[10px] font-mono">Running analysis pipelines...</div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Processing;
