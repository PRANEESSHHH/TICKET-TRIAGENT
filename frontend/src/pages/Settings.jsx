import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCpu, FiKey, FiSave, FiInfo } from 'react-icons/fi';

const Settings = () => {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/settings');
        setModelName(response.data.model_name || 'gemini-1.5-flash');
        setSystemPrompt(response.data.system_prompt || '');
        setHasApiKey(response.data.has_api_key);
        setMaskedKey(response.data.masked_api_key || '');
        if (response.data.has_api_key) {
          setApiKey(response.data.masked_api_key || '');
        }
      } catch (err) {
        console.error("Error loading settings from backend:", err);
        setSystemPrompt("You are a professional support ticket classification agent...");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        model_name: modelName,
        system_prompt: systemPrompt
      };

      if (apiKey && apiKey !== maskedKey) {
        payload.gemini_api_key = apiKey;
      } else if (apiKey === '') {
        payload.gemini_api_key = '';
      }

      const response = await axios.post('/api/settings', payload);
      setSuccessMsg(response.data.message || 'Settings updated successfully!');
      
      const refreshedSettings = await axios.get('/api/settings');
      setHasApiKey(refreshedSettings.data.has_api_key);
      setMaskedKey(refreshedSettings.data.masked_api_key || '');
      setApiKey(refreshedSettings.data.masked_api_key || '');

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update configurations.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-10 text-left">
      <form onSubmit={handleSaveSettings} className="space-y-8">
        
        {/* AI Agent Configurations */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6">
          <h3 className="font-extrabold text-base text-slate-850 pb-3 border-b border-slate-100 flex items-center space-x-2">
            <FiCpu className="text-blue-600 w-5 h-5 animate-pulse" />
            <span>AI Model Settings</span>
          </h3>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 px-1 flex items-center space-x-1">
                <FiKey className="inline" /> <span>Google Gemini API Key</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? "••••••••••••••••" : "AIKey_..."}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-4 py-3.5 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-450"
              />
              <div className="flex items-start space-x-1.5 mt-2 text-[10px] text-slate-400 px-1">
                <FiInfo className="mt-0.5 flex-shrink-0" />
                <span>
                  Provide a valid `GEMINI_API_KEY` to run actual Gemini 1.5 flash classifications. Leave blank to run our local rule-based pattern matching classifier.
                </span>
              </div>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">Active LLM Model</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3.5 py-3.5 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Fast)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Thorough - High Cap)</option>
              </select>
            </div>

            {/* Prompt Config */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">System Instruction Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs p-4 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all font-mono leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs px-4 py-3 rounded-2xl flex items-center space-x-2">
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-250 text-red-700 text-xs px-4 py-3 rounded-2xl flex items-center space-x-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto justify-center bg-slate-900 hover:bg-slate-850 text-white px-6 py-4 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2.5"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <FiSave className="w-4.5 h-4.5" />
          )}
          <span>Save Configuration Settings</span>
        </button>

      </form>
    </div>
  );
};

export default Settings;
