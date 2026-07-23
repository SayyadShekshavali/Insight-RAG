import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, MessageSquare, Calendar, Shield, Loader, Search } from 'lucide-react';
import { api } from '../../lib/api.js';

export function DocumentPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightTerm = searchParams.get('highlight');

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/documents/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDoc(data);
        } else {
          setError('Failed to load document content.');
        }
      } catch (err) {
        setError('Error connecting to knowledge base server.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleAskAI = () => {
    if (!doc) return;
    navigate(`/chat?scopedDocId=${doc._id}&scopedDocTitle=${encodeURIComponent(doc.title)}`);
  };

  // Helper to render text with highlighted segments
  const renderHighlightedContent = (content) => {
    if (!content) return '';
    if (!highlightTerm) return content;

    // Normalize whitespace for search matching
    const normalizedHighlight = highlightTerm.replace(/\s+/g, ' ').trim();
    if (!normalizedHighlight || normalizedHighlight.length < 5) return content;

    // Try finding exact match first
    const cleanContent = content;
    const highlightIdx = cleanContent.toLowerCase().indexOf(normalizedHighlight.toLowerCase());

    if (highlightIdx !== -1) {
      const before = cleanContent.slice(0, highlightIdx);
      const match = cleanContent.slice(highlightIdx, highlightIdx + normalizedHighlight.length);
      const after = cleanContent.slice(highlightIdx + normalizedHighlight.length);

      return (
        <>
          {before}
          <span className="bg-brand-teal/20 text-brand-teal border-b-2 border-brand-teal font-medium px-0.5 rounded select-all animate-pulse">
            {match}
          </span>
          {after}
        </>
      );
    }

    // Try splitting highlightTerm into words if exact match fails
    const words = normalizedHighlight.split(' ').filter(w => w.length > 3);
    if (words.length > 0) {
      // Find the first word and try to highlight a window
      const regex = new RegExp(`(${words.slice(0, 3).join('\\s+')})`, 'gi');
      const parts = content.split(regex);
      return parts.map((part, idx) => {
        if (regex.test(part)) {
          return (
            <span key={idx} className="bg-brand-teal/15 text-brand-teal border-b border-brand-teal/40 font-medium px-0.5 rounded">
              {part}
            </span>
          );
        }
        return part;
      });
    }

    return content;
  };

  return (
    <div className="flex flex-col h-full bg-background-page text-text-primary p-6">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between mb-6 border-b border-border-hairline pb-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-control border border-border-hairline bg-background-card p-1.5 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-teal" />
            <h1 className="text-md font-medium tracking-tight text-text-primary">Document preview</h1>
          </div>
        </div>

        {doc && (
          <button
            onClick={handleAskAI}
            className="inline-flex items-center gap-1.5 rounded bg-brand-teal hover:bg-brand-teal-light text-background-page px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Ask AI about this</span>
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto bg-background-card border border-border-hairline rounded-card p-6 shadow-inner select-text">
        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm font-mono p-4">
            <Loader className="h-4 w-4 animate-spin text-brand-teal" />
            <span>Reading file buffers...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-status-error p-4">{error}</div>
        ) : !doc ? (
          <div className="text-sm text-text-secondary p-4">Document not found.</div>
        ) : (
          <article className="max-w-[800px] mx-auto space-y-6">
            {/* Metadata Info Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-hairline/40 pb-4 text-xs text-text-tertiary select-none font-mono">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Synced: {new Date(doc.lastSyncedAt).toLocaleString()}</span>
                </div>
                <div>
                  Size: {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'API stream'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-status-success" />
                <span>Authorized for organization domain</span>
              </div>
            </div>

            {/* Document Title Header */}
            <h2 className="text-lg font-medium text-text-primary tracking-tight">
              {doc.title}
            </h2>

            {/* Document Content View */}
            <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap font-mono mt-4 border border-border-hairline/25 rounded p-4 bg-background-sidebar overflow-x-auto">
              {renderHighlightedContent(doc.content)}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

export default DocumentPreview;
