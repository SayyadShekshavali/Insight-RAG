import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Github, FileText, CheckCircle, ArrowRight, 
  MessageSquare, Loader, Sparkles, AlertCircle, Bookmark, Star
} from 'lucide-react';
import { selectAccessToken, selectCurrentUser } from '../../store/authSlice.js';
import { api } from '../../lib/api.js';

// Helper component for citation icons
const SourceIcon = ({ type, className = "h-3.5 w-3.5" }) => {
  switch (type?.toLowerCase()) {
    case 'github':
      return <Github className={className} />;
    case 'slack':
      return <span className={`font-mono font-medium ${className}`}>#</span>;
    case 'jira':
    case 'confluence':
      return <span className={`font-mono font-bold text-brand-teal ${className}`}>A</span>; // Atlassian
    case 'pdf':
    case 'docx':
    case 'xlsx':
    case 'file':
      return <FileText className={className} />;
    default:
      return <FileText className={className} />;
  }
};

function EmployeeChat() {
  const accessToken = useSelector(selectAccessToken);
  const user = useSelector(selectCurrentUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlThreadId = searchParams.get('threadId');

  const [question, setQuestion] = useState('');
  const [threadId, setThreadId] = useState(urlThreadId);
  const [messages, setMessages] = useState([]);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [streamingCitations, setStreamingCitations] = useState([]);
  const [streamingConfidence, setStreamingConfidence] = useState(null);
  const [streamingFollowUps, setStreamingFollowUps] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [error, setError] = useState('');

  const chatEndRef = useRef(null);

  // Sync thread detail if threadId in URL changes
  useEffect(() => {
    if (urlThreadId) {
      setThreadId(urlThreadId);
      const fetchThread = async () => {
        try {
          const res = await api.get(`/chat/thread/${urlThreadId}`);
          if (res.ok) {
            const data = await res.json();
            setMessages(data.messages || []);
            setIsSaved(data.isSaved);
            setThreadTitle(data.title);
            setError('');
          } else {
            setSearchParams({});
            setThreadId(null);
            setMessages([]);
            setError('');
          }
        } catch (e) {
          setSearchParams({});
          setThreadId(null);
          setMessages([]);
          setError('');
        }
      };
      fetchThread();
    } else {
      setThreadId(null);
      setMessages([]);
      setIsSaved(false);
      setThreadTitle('');
      setError('');
    }
  }, [urlThreadId, accessToken]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingAnswer, isStreaming]);

  // Submit search query
  const handleSearch = async (e, forcedQuestion = '') => {
    if (e) e.preventDefault();
    const query = forcedQuestion || question;
    if (!query.trim() || isStreaming) return;

    setQuestion('');
    setError('');
    
    // Add user message immediately
    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    
    setIsStreaming(true);
    setStreamingAnswer('');
    setStreamingCitations([]);
    setStreamingConfidence(null);
    setStreamingFollowUps([]);

    try {
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          question: query, 
          threadId, 
          documentId: searchParams.get('scopedDocId') || undefined 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch streaming response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finished = false;
      let accumulatedText = '';
      let buffer = '';
      let finalCitations = [];
      let finalConfidence = 85;
      let finalFollowUps = [];

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = finished ? '' : (lines.pop() || '');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmedLine.substring(6));
                
                if (parsed.event === 'thread_created') {
                  setThreadId(parsed.threadId);
                  setSearchParams({ threadId: parsed.threadId }, { replace: true });
                } else if (parsed.event === 'token') {
                  accumulatedText += parsed.text;
                  setStreamingAnswer(accumulatedText);
                } else if (parsed.event === 'complete') {
                  finalCitations = parsed.citations || [];
                  finalConfidence = parsed.confidence || 85;
                  finalFollowUps = parsed.followUpQuestions || [];
                  setStreamingCitations(finalCitations);
                  setStreamingConfidence(finalConfidence);
                  setStreamingFollowUps(finalFollowUps);
                }
              } catch (err) {
                // Ignore parsing errors for partial stream chunks
              }
            }
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const parsed = JSON.parse(buffer.trim().substring(6));
          if (parsed.event === 'token') {
            accumulatedText += parsed.text;
          } else if (parsed.event === 'complete') {
            finalCitations = parsed.citations || [];
            finalConfidence = parsed.confidence || 85;
            finalFollowUps = parsed.followUpQuestions || [];
          }
        } catch (e) {}
      }

      // Sync the completed assistant turn to the local state
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: accumulatedText || 'No response synthesized.',
          citations: finalCitations,
          confidence: finalConfidence,
          followUpQuestions: finalFollowUps
        }
      ]);
      setStreamingAnswer('');

    } catch (err) {
      setError('Connection to server lost. Please verify the backend is active.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error: Connection lost. The server could not stream back the RAG response.'
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  // Sync and auto-trigger query if a question is passed via URL parameters (from Knowledge Graph click)
  useEffect(() => {
    const urlQuestion = searchParams.get('question');
    if (urlQuestion) {
      // Clear query params to prevent repeating searches
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('question');
      setSearchParams(newParams, { replace: true });
      
      // Auto-trigger search
      handleSearch(null, decodeURIComponent(urlQuestion));
    }
  }, [searchParams, setSearchParams]);

  const handleToggleSave = async () => {
    if (!threadId) return;
    try {
      const res = await api.post(`/chat/save/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.isSaved);
      }
    } catch (e) {
      // Ignored
    }
  };

  const startNewChat = () => {
    setThreadId(null);
    setSearchParams({});
    setMessages([]);
    setStreamingAnswer('');
    setIsSaved(false);
    setThreadTitle('');
    setError('');
  };

  // Helper to parse text and inject citation chips inline
  const renderTextWithCitations = (text, citations = []) => {
    if (!text) return '';
    
    // Pattern to look for references like [1], [2], [auth.controller.js] or [source_1]
    const parts = text.split(/(\[\d+\]|\[[a-zA-Z0-9_\-\.]+\])/g);
    
    return parts.map((part, index) => {
      const isCitationMatch = part.startsWith('[') && part.endsWith(']');
      if (isCitationMatch) {
        // Try parsing as index or title
        const marker = part.slice(1, -1);
        const citeIndex = parseInt(marker, 10);
        
        let cite = null;
        if (!isNaN(citeIndex) && citations[citeIndex - 1]) {
          cite = citations[citeIndex - 1];
        } else {
          cite = citations.find(c => c.title?.toLowerCase() === marker.toLowerCase());
        }

        if (cite) {
          return (
            <a
              key={index}
              href={cite.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mx-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-background-card hover:bg-border-hairline text-brand-teal-light border border-border-hairline align-middle transition-colors cursor-pointer"
              title={cite.snippet}
            >
              <SourceIcon type={cite.sourceType} className="h-2.5 w-2.5 shrink-0" />
              <span>{cite.title}</span>
            </a>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const activeMessages = [...messages];
  const hasConversation = activeMessages.length > 0;

  return (
    <div className="flex flex-col h-full bg-background-page">
      {/* Action Bar (when in active thread) */}
      {threadId && (
        <div className="flex items-center justify-end px-6 py-2 border-b border-border-hairline/45 bg-background-sidebar/30 shrink-0 select-none gap-2">
          <button
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium transition-colors ${
              isSaved
                ? 'bg-brand-teal/20 text-brand-teal font-semibold'
                : 'bg-background-card text-text-secondary hover:text-text-primary'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save chat'}</span>
          </button>
          <button
            onClick={startNewChat}
            className="rounded-control bg-background-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            New Chat
          </button>
        </div>
      )}

      {/* Main Conversation Container */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-[720px] mx-auto space-y-8">
          
          {/* Welcome Screen / Search-first state */}
          {!hasConversation && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/15 border border-brand-teal/40 text-brand-teal shadow-lg shadow-brand-teal/20"
              >
                <Sparkles className="h-7 w-7" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-xl font-bold tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent"
              >
                Ask anything across your codebase, docs, and tickets
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-1.5 text-sm text-text-secondary max-w-[420px]"
              >
                Search Slack channels, Jira tickets, Confluence spaces, PDFs, and repositories in one single search bar.
              </motion.p>
            </div>
          )}

          {/* Dialogue Threads */}
          <AnimatePresence>
            {activeMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'user' ? (
                  /* User message bubble */
                  <div className="max-w-[80%] rounded-card bg-brand-teal/15 px-4 py-2.5 text-sm text-text-primary">
                    {msg.content}
                  </div>
                ) : (
                  /* Assistant message (no bubble, inline chips) */
                  <div className="w-full space-y-3">
                    <div className="text-sm leading-relaxed text-text-primary select-text whitespace-pre-wrap">
                      {renderTextWithCitations(msg.content, msg.citations)}
                    </div>

                    {/* Metadata & Actions row */}
                    {msg.confidence !== undefined && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Confidence score pill */}
                        <div className="inline-flex items-center gap-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 px-2 py-0.5 text-[10px] font-mono font-medium text-brand-teal">
                          <CheckCircle className="h-3 w-3" />
                          <span>{msg.confidence}% confidence</span>
                        </div>
                        
                        {/* Citation summaries */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                            <span>Cited {msg.citations.length} sources:</span>
                            {msg.citations.map((cite, cIdx) => (
                              <a
                                key={cIdx}
                                href={cite.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-brand-teal transition-colors"
                                title={cite.title}
                              >
                                <SourceIcon type={cite.sourceType} className="h-3 w-3 inline align-text-bottom" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Follow-up question chips */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="flex flex-col gap-2 pt-2">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-mono">Suggested Follow-ups</span>
                        <div className="flex flex-wrap gap-2">
                          {msg.followUpQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={(e) => handleSearch(e, q)}
                              className="rounded-control bg-background-card hover:bg-white/5 text-xs px-3 py-1.5 text-text-secondary hover:text-text-primary transition-all text-left"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Currently streaming token display */}
            {isStreaming && streamingAnswer && (
              <div className="flex flex-col items-start w-full space-y-3">
                <div className="text-sm leading-relaxed text-text-primary select-text whitespace-pre-wrap">
                  {renderTextWithCitations(streamingAnswer, streamingCitations)}
                  {/* Streaming indicator */}
                  <span className="inline-block h-3 w-1 bg-brand-teal ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {/* Typing Loader */}
            {isStreaming && !streamingAnswer && (
              <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
                <Loader className="h-3.5 w-3.5 animate-spin text-brand-teal" />
                <span>Reranking index and synthesizing answer...</span>
              </div>
            )}
          </AnimatePresence>

          {error && (
            <div className="flex items-center gap-2 rounded-control border border-status-error/30 bg-status-error/10 p-3 text-xs text-status-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Floating Query Form Pinned to Bottom */}
      <footer className="border-t border-border-hairline bg-background-sidebar px-4 py-4 shrink-0">
        <div className="max-w-[720px] mx-auto relative flex flex-col gap-2">
          {searchParams.get('scopedDocId') && searchParams.get('scopedDocTitle') && (
            <div className="flex items-center gap-1.5 self-start select-none">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/15 border border-brand-teal/30 px-2.5 py-1 text-[11px] font-mono font-medium text-brand-teal">
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[200px]">Pre-scoped: {decodeURIComponent(searchParams.get('scopedDocTitle'))}</span>
                <button
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('scopedDocId');
                    newParams.delete('scopedDocTitle');
                    setSearchParams(newParams);
                  }}
                  className="hover:text-brand-teal-light text-text-tertiary ml-1 font-bold text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isStreaming}
              placeholder="Ask anything across your codebase, docs, and tickets..."
              className="w-full rounded-control border border-border-hairline bg-background-page pl-4 pr-12 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none transition-all shadow-inner focus:shadow-md focus:scale-[1.002]"
            />
            <button
              type="submit"
              disabled={isStreaming || !question.trim()}
              className="absolute right-2 top-2 rounded-control bg-brand-teal hover:bg-brand-teal-light text-background-page p-2 transition-colors disabled:opacity-30 disabled:hover:bg-brand-teal"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-text-tertiary select-none font-mono">
            Insight RAG will synthesize answers from connected integrations. Citations resolve back to origin.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default EmployeeChat;
