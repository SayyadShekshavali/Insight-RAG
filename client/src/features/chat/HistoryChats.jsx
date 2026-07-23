import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Trash2, Search, Calendar, MessageSquare, Github, FileText, Loader } from 'lucide-react';
import { api } from '../../lib/api.js';

// Citation icons helper
const SourceIcon = ({ type, className = "h-3.5 w-3.5" }) => {
  switch (type?.toLowerCase()) {
    case 'github':
      return <Github className={className} />;
    case 'slack':
      return <span className={`font-mono font-medium ${className}`}>#</span>;
    case 'jira':
    case 'confluence':
      return <span className={`font-mono font-bold text-brand-teal ${className}`}>A</span>;
    case 'pdf':
    case 'docx':
    case 'xlsx':
    case 'file':
      return <FileText className={className} />;
    default:
      return <FileText className={className} />;
  }
};

export function HistoryChats() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      } else {
        setError('Failed to load search history.');
      }
    } catch (err) {
      setError('An error occurred loading search history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleToggleSave = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/chat/save/${id}`);
      if (res.ok) {
        const data = await res.json();
        setThreads(prev => prev.map(t => t.id === id ? { ...t, isSaved: data.isSaved } : t));
      }
    } catch (err) {
      // Ignore
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation from history?')) return;
    try {
      const res = await api.delete(`/chat/${id}`);
      if (res.ok) {
        setThreads(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      // Ignore
    }
  };

  const filtered = threads.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.snippet.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-page text-text-primary p-6">
      {/* Title */}
      <div className="flex items-center gap-2 mb-6 select-none">
        <MessageSquare className="h-5 w-5 text-brand-teal" />
        <h1 className="text-lg font-medium tracking-tight text-text-primary">Your chat history</h1>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter conversation history..."
          className="w-full rounded-control border border-border-hairline bg-background-card pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none transition-all shadow-inner focus:shadow-md"
        />
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm font-mono p-4">
            <Loader className="h-4 w-4 animate-spin text-brand-teal" />
            <span>Loading search history...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-status-error p-4">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-hairline p-8 text-center max-w-md mt-4">
            <MessageSquare className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-medium text-text-primary">No history found</h3>
            <p className="mt-1 text-xs text-text-secondary">Start typing in the Universal Search console to ask your first question.</p>
          </div>
        ) : (
          <div className="border border-border-hairline rounded-card bg-background-card overflow-hidden">
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/chat?threadId=${t.id}`)}
                className={`flex items-center justify-between p-3.5 hover:bg-background-page cursor-pointer transition-colors border-b border-border-hairline last:border-0`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  {/* Title & Preview snippet */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-text-primary truncate select-none">{t.title}</span>
                    <Calendar className="h-3 w-3 text-text-tertiary ml-2" />
                    <span className="text-[10px] font-mono text-text-tertiary">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-text-secondary truncate mt-1">{t.snippet}</p>
                </div>

                {/* Right actions & sources meta */}
                <div className="flex items-center gap-4 shrink-0 select-none">
                  {/* Cited Sources */}
                  {t.sourcesUsed && t.sourcesUsed.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-background-sidebar rounded-full border border-border-hairline px-2.5 py-0.5">
                      <span className="text-[9px] font-mono text-text-tertiary uppercase mr-1">Sources</span>
                      {t.sourcesUsed.slice(0, 4).map((src, sIdx) => (
                        <SourceIcon key={sIdx} type={src} className="h-3 w-3 text-text-secondary" />
                      ))}
                      {t.sourcesUsed.length > 4 && (
                        <span className="text-[9px] font-mono text-text-tertiary font-bold">+{t.sourcesUsed.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleSave(e, t.id)}
                      className={`rounded p-1.5 transition-colors ${
                        t.isSaved 
                          ? 'text-brand-teal hover:bg-background-card hover:text-text-primary' 
                          : 'text-text-tertiary hover:bg-background-card hover:text-text-primary'
                      }`}
                      title={t.isSaved ? 'Unsave conversation' : 'Save conversation'}
                    >
                      <Star className={`h-4 w-4 ${t.isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, t.id)}
                      className="rounded p-1.5 text-text-tertiary hover:bg-background-card hover:text-status-error transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryChats;
