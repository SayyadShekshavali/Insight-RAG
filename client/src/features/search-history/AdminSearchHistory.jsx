import React, { useState, useEffect } from 'react';
import { 
  Search, Download, Github, FileText, CheckCircle, 
  ThumbsUp, ThumbsDown, Filter, HelpCircle, Loader2 
} from 'lucide-react';
import { api } from '../../lib/api.js';

// Connector icon selector
const SourceIcon = ({ type, className = "h-3.5 w-3.5" }) => {
  switch (type?.toLowerCase()) {
    case 'github':
      return <Github className={className} />;
    case 'slack':
      return <span className={`font-mono font-bold ${className}`}>#</span>;
    case 'jira':
    case 'confluence':
      return <span className={`font-mono font-bold text-brand-teal ${className}`}>A</span>;
    default:
      return <FileText className={className} />;
  }
};

function AdminSearchHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('0');

  useEffect(() => {
    fetchLogs();
  }, [sourceFilter, confidenceFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        source: sourceFilter,
        confidenceThreshold: confidenceFilter,
        search
      });
      if (employeeFilter) {
        queryParams.append('employee', employeeFilter);
      }

      const res = await api.get(`/analytics/logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      // Mock data fallback if offline
      setLogs([
        { 
          _id: '1', 
          question: 'What is the token expiration duration in auth.controller.js?', 
          confidence: 94, 
          sourcesUsed: ['github'], 
          feedback: 'up', 
          timestamp: new Date(Date.now() - 600000).toISOString(),
          userId: { email: 'employee1@insightrag.dev' }
        },
        { 
          _id: '2', 
          question: 'Why did the database crash this morning?', 
          confidence: 88, 
          sourcesUsed: ['slack'], 
          feedback: 'up', 
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          userId: { email: 'employee2@insightrag.dev' }
        },
        { 
          _id: '3', 
          question: 'How do we fix popups opening to blank page in integrations Connect?', 
          confidence: 45, 
          sourcesUsed: ['jira'], 
          feedback: 'down', 
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          userId: { email: 'employee1@insightrag.dev' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Direct link to the CSV export endpoint
    const token = localStorage.getItem('accessToken');
    window.open(`/api/analytics/export?token=${token}`, '_blank');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-text-primary">Search Logs History</h2>
          <p className="text-xs text-text-secondary mt-1">Audit employee queries, citations referenced, response confidence, and satisfaction feedback.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 rounded-control bg-background-card border border-border-hairline hover:bg-background-sidebar text-xs font-mono font-medium px-3.5 py-2 text-brand-teal transition-colors self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          Export Logs CSV
        </button>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="rounded-card border border-border-hairline bg-background-card p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">
          <Filter className="h-3.5 w-3.5 text-brand-teal" />
          <span>Filter parameters</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Question Text Search */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-secondary font-mono">Question / Search term</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search queries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-control border border-border-hairline bg-background-sidebar pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
            </div>
          </div>

          {/* Employee Email Search */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-secondary font-mono">Employee email</label>
            <input
              type="text"
              placeholder="e.g. employee1"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none"
            />
          </div>

          {/* Source Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-secondary font-mono">Source integration</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-1.5 text-xs text-text-primary focus:border-brand-teal focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="github">GitHub</option>
              <option value="slack">Slack</option>
              <option value="jira">Jira</option>
              <option value="pdf">Files (PDF/Docs)</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-secondary font-mono">Confidence threshold</label>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-1.5 text-xs text-text-primary focus:border-brand-teal focus:outline-none"
            >
              <option value="0">All confidence scores</option>
              <option value="80">&gt;= 80% confidence</option>
              <option value="90">&gt;= 90% confidence</option>
              <option value="50">&lt; 50% (Weak hits)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="rounded-control bg-brand-teal hover:bg-brand-teal-light text-background-page px-4 py-1.5 text-xs font-medium transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="rounded-card bg-background-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-background-sidebar/30 text-text-secondary select-none font-mono">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Question Query</th>
                <th className="p-3">Sources Cited</th>
                <th className="p-3">Confidence</th>
                <th className="p-3 text-center">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-teal inline" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-tertiary">
                    No search records matches found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-background-sidebar/35 transition-colors">
                    <td className="p-3 text-text-tertiary font-mono">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-text-primary font-medium">
                      {log.userId?.email?.split('@')[0]}
                    </td>
                    <td className="p-3 text-text-primary truncate max-w-[280px]" title={log.question}>
                      {log.question}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {log.sourcesUsed && log.sourcesUsed.length > 0 ? (
                          log.sourcesUsed.map((source, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex h-5 w-5 items-center justify-center rounded bg-background-sidebar text-text-secondary border border-border-hairline font-mono"
                              title={source}
                            >
                              <SourceIcon type={source} className="h-2.5 w-2.5" />
                            </span>
                          ))
                        ) : (
                          <span className="text-text-tertiary font-mono text-[10px]">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-medium">
                      <span className={log.confidence >= 80 ? 'text-brand-teal' : log.confidence >= 50 ? 'text-status-warning' : 'text-status-error'}>
                        {log.confidence}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {log.feedback === 'up' && (
                        <ThumbsUp className="h-3.5 w-3.5 text-status-success inline" />
                      )}
                      {log.feedback === 'down' && (
                        <ThumbsDown className="h-3.5 w-3.5 text-status-error inline" />
                      )}
                      {!log.feedback && (
                        <span className="text-text-tertiary font-mono text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminSearchHistory;
