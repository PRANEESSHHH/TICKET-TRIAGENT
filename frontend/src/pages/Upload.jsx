import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFileText, FiX, FiCpu, FiAlertTriangle } from 'react-icons/fi';

const Upload = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualJson, setManualJson] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileParsing(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileParsing(e.target.files[0]);
    }
  };

  const handleManualJsonSubmit = async () => {
    if (!manualJson.trim()) {
      setError('Please paste valid JSON before testing.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const jsonBlob = new Blob([manualJson], { type: 'application/json' });
      const manualFile = new File([jsonBlob], 'manual_input.json', { type: 'application/json' });
      await handleFileParsing(manualFile);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to parse manual JSON input.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileParsing = async (selectedFile) => {
    if (!selectedFile.name.endsWith('.json')) {
      setError('Unsupported file type. Please upload a JSON file containing support tickets.');
      return;
    }
    setError('');
    setLoading(true);
    setFile(selectedFile);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTickets(response.data.tickets);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to parse JSON file. Ensure it is a valid list of tickets.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setTickets([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerInputClick = () => {
    fileInputRef.current.click();
  };

  const handleProcessTickets = () => {
    if (tickets.length === 0) return;
    navigate('/processing', { state: { tickets } });
  };

  const handleLoadSampleDataset = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/export/json');
      if (response.data && response.data.length > 0) {
        const formatted = response.data.map(t => ({
          ticket_id: t.ticket_id,
          title: t.title,
          description: t.description
        }));
        setTickets(formatted.slice(0, 10)); // preview first 10
        setFile({ name: 'sample_dataset_10.json', size: 4096 });
      } else {
        const localMocks = [
          { ticket_id: "TC-8921", title: "Double charged on monthly premium", description: "I was billed twice on my invoice #9021 for the monthly team plan. Please refund one payment." },
          { ticket_id: "TC-4721", title: "App crashes when switching to dashboard timeline view", description: "Whenever I click on the timeline tab, the screen turns white and the client crashes. Stacks: Type Error on chart rendering." },
          { ticket_id: "TC-1029", title: "SSO Google auth integration request", description: "Our enterprise plan requires Google SSO authentication to comply with company audit requirements. Do you have an ETA?" },
          { ticket_id: "TC-5021", title: "Typo on pricing card", description: "On the pricing page, 'Annual' is misspelled as 'Anual'. Just a small fix." },
          { ticket_id: "TC-3911", title: "Password recovery link sends invalid token", description: "I requested a password reset. The email link is received, but clicking it shows 'Invalid reset code' immediately." }
        ];
        setTickets(localMocks);
        setFile({ name: 'mock_demo_tickets.json', size: 1024 });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch sample dataset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 text-left">
      {/* Upload Box Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <h3 className="font-extrabold text-base text-slate-850 mb-2">Upload Support Tickets</h3>
        <p className="text-xs text-slate-400 mb-6">Upload a structured JSON file containing ticket titles and descriptions to run AI categorization.</p>

        {/* Drag and Drop Container */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={file ? null : triggerInputClick}
          className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all relative ${
            dragActive 
              ? 'border-blue-500 bg-blue-50/20' 
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
          } ${file ? 'cursor-default pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-full text-blue-600">
                  <FiUploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Drag and drop your JSON file here, or <span className="text-blue-600 hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports JSON file with keys: ticket_id, title, description</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between w-full max-w-md bg-white border border-slate-200 p-4 rounded-2xl pointer-events-auto shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-emerald-600">
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[9px] text-slate-400">Ready to triage • {tickets.length} tickets</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded-lg transition-colors"
                >
                  <FiX className="w-4.5 h-4.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="absolute inset-0 bg-white/80 rounded-3xl flex flex-col items-center justify-center space-y-3 pointer-events-auto">
              <span className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-[10px] text-slate-500 font-bold">Uploading and parsing file...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-650 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
            <FiAlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 border border-slate-200 rounded-3xl bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-slate-850 text-sm">Manual JSON Entry</h4>
              <p className="text-[10px] text-slate-400">Paste JSON directly and validate it as a structured ticket payload.</p>
            </div>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              {showManualEntry ? 'Hide' : 'Show'} Manual Entry
            </button>
          </div>

          {showManualEntry && (
            <div className="space-y-3">
              <textarea
                value={manualJson}
                onChange={(e) => setManualJson(e.target.value)}
                placeholder='Paste JSON here, for example: [{"ticket_id":"TC-1001","title":"Login issue","description":"User cannot login."}]'
                rows={8}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleManualJsonSubmit}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm"
                >
                  Validate & Load JSON
                </button>
                <button
                  onClick={() => {
                    setManualJson('');
                    setError('');
                  }}
                  className="border border-slate-200 bg-white text-slate-700 px-4 py-2 rounded-2xl text-xs font-bold transition-all hover:border-slate-300"
                >
                  Clear Input
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-6">
          {!file && (
            <button
              onClick={handleLoadSampleDataset}
              className="border border-slate-200 hover:border-slate-350 bg-white text-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm"
            >
              Load Demo Dataset
            </button>
          )}

          {file && (
            <button
              onClick={handleProcessTickets}
              disabled={tickets.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
            >
              <FiCpu className="w-4 h-4" />
              <span>Process {tickets.length} Tickets</span>
            </button>
          )}
        </div>
      </div>

      {/* File Preview Table */}
      {tickets.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
        >
          <div className="mb-4">
            <h4 className="font-extrabold text-base text-slate-850">File Preview Data</h4>
            <p className="text-xs text-slate-400">Verifying structured entries before triggering AI model categorization</p>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full min-w-[550px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase sticky top-0 bg-white">
                  <th className="pb-3 pl-2">Ticket ID</th>
                  <th className="pb-3">Title</th>
                  <th className="pb-3 pr-2">Description Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-4 pl-2 font-mono text-[11px] text-slate-450">{t.ticket_id}</td>
                    <td className="py-4 font-bold text-xs text-slate-800 truncate max-w-[200px]">{t.title}</td>
                    <td className="py-4 pr-2 text-xs text-slate-450 truncate max-w-[300px]">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Upload;
