import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, LayoutGrid, List, MessageSquare, ExternalLink, Calendar, Database, Loader } from 'lucide-react';
import { api } from '../../lib/api.js';

const SourceIcon = ({ type, className = "h-5 w-5" }) => {
  switch (type?.toLowerCase()) {
    case 'pdf':
    case 'docx':
    case 'xlsx':
    case 'file':
      return <FileText className={`${className} text-brand-teal`} />;
    case 'github':
      return <span className={`${className} font-mono font-bold text-text-primary`}>GH</span>;
    case 'slack':
      return <span className={`${className} font-mono font-bold text-amber-500`}>#</span>;
    case 'jira':
      return <span className={`${className} font-mono font-extrabold text-blue-500`}>JI</span>;
    case 'confluence':
      return <span className={`${className} font-mono font-extrabold text-sky-400`}>CF</span>;
    default:
      return <FileText className={className} />;
  }
};

export function EmployeeDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        setError('Failed to fetch indexed documents.');
      }
    } catch (err) {
      setError('An error occurred loading documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleAskAI = (doc) => {
    navigate(`/chat?scopedDocId=${doc._id}&scopedDocTitle=${encodeURIComponent(doc.title)}`);
  };

  const filtered = documents.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.sourceType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background-page text-text-primary p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 select-none">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-brand-teal" />
          <h1 className="text-lg font-medium tracking-tight text-text-primary">Workspace knowledge base</h1>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-control bg-background-card border border-border-hairline p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded p-1 transition-colors ${viewMode === 'grid' ? 'bg-brand-teal/15 text-brand-teal' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded p-1 transition-colors ${viewMode === 'list' ? 'bg-brand-teal/15 text-brand-teal' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search document names or formats..."
          className="w-full rounded-control border border-border-hairline bg-background-card pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none transition-all shadow-inner focus:shadow-md"
        />
      </div>

      {/* Docs Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm font-mono p-4">
            <Loader className="h-4 w-4 animate-spin text-brand-teal" />
            <span>Loading database indexes...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-status-error p-4">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-hairline p-8 text-center max-w-md mt-4">
            <FileText className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-medium text-text-primary">No documents indexed</h3>
            <p className="mt-1 text-xs text-text-secondary">Admins can upload files or connect OAuth integrations in the Operations Console.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <div
                key={doc._id}
                onClick={() => navigate(`/documents/${doc._id}`)}
                className="flex flex-col justify-between rounded-card bg-background-card hover:bg-background-sidebar/50 p-4 transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-control bg-background-sidebar p-2 shrink-0">
                      <SourceIcon type={doc.sourceType} />
                    </div>
                    {/* Size / Status Badge */}
                    <div className="flex flex-col items-end shrink-0 select-none">
                      <span className="text-[10px] font-mono text-text-tertiary">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'API source'}
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider font-mono font-medium mt-1 px-1.5 py-0.5 rounded-full ${
                        doc.indexingStatus === 'indexed' ? 'bg-status-success/15 text-status-success' :
                        doc.indexingStatus === 'processing' ? 'bg-status-warning/15 text-status-warning' :
                        'bg-status-error/15 text-status-error'
                      }`}>
                        {doc.indexingStatus}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-text-primary mt-3 group-hover:text-brand-teal-light transition-colors line-clamp-2 select-all" title={doc.title}>
                    {doc.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between mt-4 pt-1 select-none">
                  <div className="flex items-center gap-1 text-[10px] text-text-tertiary font-mono">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(doc.lastSyncedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAskAI(doc);
                      }}
                      className="inline-flex items-center gap-1 rounded bg-brand-teal hover:bg-brand-teal-light text-background-page px-2 py-1 text-[11px] font-medium transition-colors"
                      title="Start scoped conversation"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View Layout */
          <div className="rounded-card bg-background-card overflow-hidden">
            {filtered.map((doc) => (
              <div
                key={doc._id}
                onClick={() => navigate(`/documents/${doc._id}`)}
                className="flex items-center justify-between p-3.5 hover:bg-background-sidebar/35 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="rounded bg-background-sidebar border border-border-hairline p-1.5 shrink-0">
                    <SourceIcon type={doc.sourceType} className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-sm font-medium text-text-primary group-hover:text-brand-teal-light transition-colors truncate">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-tertiary font-mono">
                      <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'API integration'}</span>
                      <span>•</span>
                      <span>Synced {new Date(doc.lastSyncedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 select-none">
                  <span className={`text-[9px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 rounded-full ${
                    doc.indexingStatus === 'indexed' ? 'bg-status-success/15 text-status-success' :
                    doc.indexingStatus === 'processing' ? 'bg-status-warning/15 text-status-warning' :
                    'bg-status-error/15 text-status-error'
                  }`}>
                    {doc.indexingStatus}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAskAI(doc);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand-teal hover:bg-brand-teal-light text-background-page px-2 py-1 text-[11px] font-medium transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Ask AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeDocuments;
