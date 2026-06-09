import { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import axios from 'axios';

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I am your AI Support Assistant. Ask me anything about the database statistics or list specific ticket priorities!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState([
    'Show critical P1 tickets',
    'How many bug tickets do we have?',
    'Show recent billing tickets'
  ]);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    // Add user message
    const userMsg = {
      sender: 'user',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // call FastAPI backend
      const response = await axios.post('/api/chat', {
        message: messageText,
        history: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
      });

      const botMsg = {
        sender: 'bot',
        text: response.data.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      if (response.data.suggested_actions) {
        setSuggestedActions(response.data.suggested_actions);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = {
        sender: 'bot',
        text: 'Sorry, I encountered an error communicating with the backend. Please ensure the server is running.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-all flex items-center justify-center group border border-slate-200"
          title="Open AI Chat Assistant"
        >
          <FiMessageSquare className="w-5 h-5" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 duration-350 ease-out transition-all text-xs font-bold whitespace-nowrap">
            Ask Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-96 h-[500px] bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col overflow-hidden animate-fade-in transition-all">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 text-slate-800 p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <FiCpu className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="font-extrabold text-xs text-slate-900 leading-none">Triage AI Assistant</h3>
                <span className="text-[9px] text-blue-600 font-extrabold tracking-wide">ONLINE</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <FiX className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm text-left ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="bg-white text-slate-800 border border-slate-200/60 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs shadow-sm flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {suggestedActions.length > 0 && !loading && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto flex space-x-1.5 scrollbar-none">
              {suggestedActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(action)}
                  className="text-[10px] font-bold bg-slate-55 hover:bg-blue-50 hover:text-blue-600 text-slate-650 px-3 py-1.5 rounded-full border border-slate-200/65 whitespace-nowrap transition-all"
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me a question..."
              className="flex-1 bg-slate-50 text-slate-800 text-xs px-4 py-2.5 rounded-2xl border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
            />
            <button
              onClick={() => handleSendMessage()}
              className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-2xl transition-all shadow-sm active:scale-95 border border-slate-200"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
