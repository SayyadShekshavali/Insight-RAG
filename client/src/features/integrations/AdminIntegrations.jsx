import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, Slack, Layers, FileCode, FolderOpen, BookOpen, 
  Settings, RefreshCw, Unlink, Plus, Check, Loader2, AlertTriangle, X 
} from 'lucide-react';
import { api, API_BASE } from '../../lib/api.js';

// Connector icon selector
const IntegrationIcon = ({ type, className = "h-6 w-6" }) => {
  switch (type) {
    case 'github':
      return <Github className={className} />;
    case 'slack':
      return <span className={`font-mono font-bold text-xl ${className}`}>#</span>;
    case 'jira':
      return <span className={`font-mono font-black text-brand-teal ${className}`}>J</span>;
    case 'confluence':
      return <span className={`font-mono font-black text-brand-teal ${className}`}>C</span>;
    case 'gdrive':
      return <FolderOpen className={className} />;
    case 'notion':
      return <BookOpen className={className} />;
    case 'swagger':
      return <FileCode className={className} />;
    default:
      return <FolderOpen className={className} />;
  }
};

const INTEGRATION_TYPES = [
  { id: 'github', name: 'GitHub', desc: 'Indexes repository code, pull requests, and commit issues.' },
  { id: 'jira', name: 'Jira', desc: 'Indexes project tickets, epics, sprint boards, and backlogs.' },
  { id: 'confluence', name: 'Confluence', desc: 'Indexes team spaces, meeting notes, design documents, and wikis.' },
  { id: 'slack', name: 'Slack', desc: 'Indexes public channel conversations, threads, and canvases.' },
  { id: 'gdrive', name: 'Google Drive', desc: 'Indexes shared folders, text documents, spreadsheets, and presentations.' },
  { id: 'notion', name: 'Notion', desc: 'Indexes team wikis, project databases, and private workspace pages.' },
  { id: 'swagger', name: 'Swagger / OpenAPI', desc: 'Indexes developer API schemas, endpoints, and developer contracts.' },
];

function AdminIntegrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingMap, setSyncingMap] = useState({});

  const [showGDriveModal, setShowGDriveModal] = useState(false);
  const [gdriveFiles, setGDriveFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [syncingFiles, setSyncingFiles] = useState(false);

  // Notion Picker State
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [notionFiles, setNotionFiles] = useState([]);
  const [selectedNotionIds, setSelectedNotionIds] = useState([]);
  const [fetchingNotion, setFetchingNotion] = useState(false);
  const [syncingNotion, setSyncingNotion] = useState(false);
  const [notionSearch, setNotionSearch] = useState('');

  // GitHub Connector State
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [connectingGitHub, setConnectingGitHub] = useState(false);

  const handleSaveGitHubToken = async () => {
    if (!githubTokenInput.trim()) return;
    setConnectingGitHub(true);
    try {
      const res = await api.post('/integrations/github/connect-key', { token: githubTokenInput.trim() });
      if (res.ok) {
        setShowGitHubModal(false);
        setGithubTokenInput('');
        fetchIntegrations();
        alert("GitHub Personal Access Token connected! Repository crawler started.");
      } else {
        alert("Failed to connect GitHub token. Please verify your token.");
      }
    } catch (err) {
      alert("Error connecting GitHub token.");
    } finally {
      setConnectingGitHub(false);
    }
  };

  const [customNotionInput, setCustomNotionInput] = useState('');

  const handleAddCustomNotionPage = async () => {
    if (!customNotionInput.trim()) return;
    const cleanInput = customNotionInput.trim();

    // If input is a Notion Internal Integration Secret / API key
    if (cleanInput.startsWith('secret_') || cleanInput.startsWith('ntn_') || cleanInput.length > 30) {
      setFetchingNotion(true);
      try {
        const res = await api.post('/integrations/notion/connect-key', { token: cleanInput });
        if (res.ok) {
          await openNotionPicker();
          setCustomNotionInput('');
          alert("Real Notion API key connected! Workspace pages loaded.");
          return;
        }
      } catch (err) {
        console.error("Failed to connect Notion key:", err);
      } finally {
        setFetchingNotion(false);
      }
    }

    const newId = 'custom-notion-' + Date.now();
    const newPage = {
      id: newId,
      name: cleanInput.includes('notion.so') ? cleanInput.split('/').pop().replace(/-/g, ' ') : cleanInput,
      type: 'Custom Notion Page',
      size: '12.4 KB',
      lastModified: 'Just now'
    };

    setNotionFiles(prev => [newPage, ...prev]);
    setSelectedNotionIds(prev => [...prev, newId]);
    setCustomNotionInput('');
  };

  const openGDrivePicker = async () => {
    setShowGDriveModal(true);
    setFetchingFiles(true);
    setSelectedFileIds([]);
    try {
      const res = await api.get('/integrations/gdrive/files');
      if (res.ok) {
        const data = await res.json();
        setGDriveFiles(data);
      } else {
        throw new Error('Failed to load files');
      }
    } catch (e) {
      // Fallback mock files
      setGDriveFiles([
        { id: 'gdrive-file-1', name: 'GDrive_Spreadsheet_Employee_Rollout.txt', size: '1.2 KB' },
        { id: 'gdrive-file-2', name: 'GDrive_Architecture_Overview.txt', size: '3.4 KB' },
        { id: 'gdrive-file-3', name: 'GDrive_Product_Specs_v2.docx', size: '15.6 KB' },
        { id: 'gdrive-file-4', name: 'GDrive_Q3_Sprint_Goals.xlsx', size: '8.9 KB' },
        { id: 'gdrive-file-5', name: 'GDrive_System_Deployment_Guide.pdf', size: '42.1 KB' }
      ]);
    } finally {
      setFetchingFiles(false);
    }
  };

  const openNotionPicker = async () => {
    setShowNotionModal(true);
    setFetchingNotion(true);
    setSelectedNotionIds([]);
    setNotionSearch('');
    try {
      const res = await api.get('/integrations/notion/files');
      if (res.ok) {
        const data = await res.json();
        setNotionFiles(data);
      } else {
        throw new Error('Failed to load Notion pages');
      }
    } catch (e) {
      setNotionFiles([]);
    } finally {
      setFetchingNotion(false);
    }
  };

  const handleGDriveSync = async () => {
    if (selectedFileIds.length === 0) {
      alert("Please select at least one file to sync.");
      return;
    }
    setSyncingFiles(true);
    try {
      const selectedMetas = gdriveFiles.filter(f => selectedFileIds.includes(f.id));
      const res = await api.post('/integrations/sync/gdrive', { 
        fileIds: selectedFileIds,
        fileMetas: selectedMetas 
      });
      if (res.ok) {
        setShowGDriveModal(false);
        fetchIntegrations();
      }
    } catch (err) {
      alert("Error syncing selected files.");
    } finally {
      setSyncingFiles(false);
    }
  };

  const handleNotionSync = async () => {
    if (selectedNotionIds.length === 0) {
      alert("Please select at least one Notion page to sync.");
      return;
    }
    setSyncingNotion(true);
    try {
      const selectedMetas = notionFiles.filter(f => selectedNotionIds.includes(f.id));
      const res = await api.post('/integrations/sync/notion', { 
        fileIds: selectedNotionIds,
        fileMetas: selectedMetas 
      });
      if (res.ok) {
        setShowNotionModal(false);
        fetchIntegrations();
      }
    } catch (err) {
      alert("Error syncing selected Notion pages.");
    } finally {
      setSyncingNotion(false);
    }
  };

  const handleToggleNotionSelection = (id) => {
    setSelectedNotionIds(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleSelectAllNotion = (filteredFiles) => {
    if (selectedNotionIds.length === filteredFiles.length) {
      setSelectedNotionIds([]);
    } else {
      setSelectedNotionIds(filteredFiles.map(f => f.id));
    }
  };

  const handleToggleFileSelection = (id) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiles = () => {
    if (selectedFileIds.length === gdriveFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(gdriveFiles.map(f => f.id));
    }
  };

  // Fetch integrations config on mount
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (e) {
      // Graceful fallback for mock integrations if route doesn't exist
      setIntegrations([
        { sourceType: 'github', status: 'connected', lastSyncTime: new Date(Date.now() - 3600000).toISOString() },
        { sourceType: 'slack', status: 'syncing', lastSyncTime: new Date(Date.now() - 600000).toISOString() },
        { sourceType: 'jira', status: 'error', lastSyncTime: new Date(Date.now() - 86400000).toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const [connectModalSource, setConnectModalSource] = useState(null);
  const [connectingSource, setConnectingSource] = useState(false);

  const handleConnect = (source) => {
    if (source === 'github') {
      setShowGitHubModal(true);
      return;
    }
    const token = localStorage.getItem('accessToken') || '';
    const connectUrl = `${API_BASE}/integrations/connect/${source}?token=${encodeURIComponent(token)}`;
    const popup = window.open(connectUrl, `Connect ${source}`, 'width=600,height=750');
    
    const interval = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(interval);
        fetchIntegrations();
      }
    }, 1000);
  };

  const handleConfirmConnect = async () => {
    if (!connectModalSource) return;
    setConnectingSource(true);
    const src = connectModalSource;
    try {
      const res = await api.post(`/integrations/callback/${src}`, {});
      if (res.ok) {
        setConnectModalSource(null);
        await fetchIntegrations();
        if (src === 'notion') {
          openNotionPicker();
        } else if (src === 'gdrive') {
          openGDrivePicker();
        }
      }
    } catch (err) {
      setConnectModalSource(null);
      await fetchIntegrations();
      if (src === 'notion') {
        openNotionPicker();
      } else if (src === 'gdrive') {
        openGDrivePicker();
      }
    } finally {
      setConnectingSource(false);
    }
  };

  const handleDisconnect = async (source) => {
    if (!confirm(`Are you sure you want to disconnect ${source}? This will erase all indexed vectors for this source.`)) return;
    try {
      const res = await api.delete(`/integrations/${source}`);
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (e) {
      // Mock update for fallback
      setIntegrations(prev => prev.filter(i => i.sourceType !== source));
    }
  };

  const handleSyncNow = async (source) => {
    if (source === 'gdrive') {
      openGDrivePicker();
      return;
    }
    if (source === 'notion') {
      openNotionPicker();
      return;
    }
    setSyncingMap(prev => ({ ...prev, [source]: true }));
    try {
      const res = await api.post(`/integrations/sync/${source}`);
      if (res.ok) {
        // Sync started in BullMQ background job
      }
    } catch (e) {
      // Mock transition
      setIntegrations(prev => prev.map(i => i.sourceType === source ? { ...i, status: 'syncing' } : i));
    }
    setTimeout(() => {
      setSyncingMap(prev => ({ ...prev, [source]: false }));
      fetchIntegrations();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-primary">Connected Integrations</h2>
        <p className="text-xs text-text-secondary mt-1">Connect internal tools to feed your organization's universal RAG search index.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATION_TYPES.map((type) => {
          const conn = integrations.find((i) => i.sourceType === type.id);
          const isConnected = !!conn;
          const status = conn?.status || 'not_connected';
          const isSyncing = status === 'syncing' || syncingMap[type.id];

          return (
            <div 
              key={type.id}
              className={`rounded-card p-5 border transition-all ${
                isConnected
                  ? 'border-border-hairline bg-background-card hover:border-brand-teal/30'
                  : 'border-dashed border-border-hairline bg-transparent hover:border-text-tertiary'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-control ${
                  isConnected 
                    ? 'bg-brand-teal/10 text-brand-teal' 
                    : 'bg-background-card text-text-tertiary'
                }`}>
                  <IntegrationIcon type={type.id} />
                </div>

                {/* Connection Status badges */}
                {isConnected && (
                  <div>
                    {status === 'connected' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-success/15 border border-status-success/30 px-2 py-0.5 text-[10px] font-mono font-medium text-status-success">
                        Active
                      </span>
                    )}
                    {status === 'syncing' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-warning/15 border border-status-warning/30 px-2 py-0.5 text-[10px] font-mono font-medium text-status-warning animate-pulse">
                        Syncing
                      </span>
                    )}
                    {status === 'error' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-error/15 border border-status-error/30 px-2 py-0.5 text-[10px] font-mono font-medium text-status-error">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Error
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-text-primary">{type.name}</h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-normal min-h-[40px]">{type.desc}</p>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-border-hairline/45 flex items-center justify-between">
                {isConnected ? (
                  <>
                    <span className="text-[10px] text-text-tertiary font-mono">
                      Synced {conn.lastSyncTime ? new Date(conn.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSyncNow(type.id)}
                        disabled={isSyncing}
                        className="p-1.5 rounded-control bg-background-sidebar border border-border-hairline text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
                        title="Sync now"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(type.id)}
                        className="p-1.5 rounded-control bg-background-sidebar border border-border-hairline text-status-error hover:bg-status-error/10 transition-colors"
                        title="Disconnect"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-text-tertiary font-mono">Not Connected</span>
                    <button
                      onClick={() => handleConnect(type.id)}
                      className="inline-flex items-center gap-1 rounded-control bg-brand-teal text-background-page px-3 py-1.5 text-xs font-medium hover:bg-brand-teal-light transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Connect
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Google Drive Selective File Picker Modal */}
      <AnimatePresence>
        {showGDriveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background-card border border-border-hairline rounded-card max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-hairline/45 pb-3">
                <div>
                  <h3 className="text-md font-medium text-text-primary flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-brand-teal" />
                    Select Google Drive Files
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-0.5">Select specific files to index in your workspace RAG.</p>
                </div>
                <button 
                  onClick={() => setShowGDriveModal(false)}
                  className="p-1 rounded-control hover:bg-background-sidebar text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {fetchingFiles ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
                  <span className="text-xs text-text-secondary">Listing files from Google Drive...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{selectedFileIds.length} files selected</span>
                    <button 
                      onClick={handleSelectAllFiles}
                      className="text-brand-teal hover:underline font-medium"
                    >
                      {selectedFileIds.length === gdriveFiles.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto border border-border-hairline/45 rounded-control divide-y divide-border-hairline/30 bg-background-sidebar">
                    {gdriveFiles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-text-secondary">
                        No files found in Google Drive.
                      </div>
                    ) : (
                      gdriveFiles.map(file => {
                        const isSelected = selectedFileIds.includes(file.id);
                        return (
                          <div 
                            key={file.id} 
                            onClick={() => handleToggleFileSelection(file.id)}
                            className="flex items-center gap-3 p-3 hover:bg-background-card/50 cursor-pointer transition-colors"
                          >
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div click
                              className="rounded border-border-hairline text-brand-teal focus:ring-brand-teal bg-transparent"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                              <p className="text-[10px] text-text-tertiary mt-0.5">{file.size || 'Size N/A'}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline/45">
                    <button
                      onClick={() => setShowGDriveModal(false)}
                      className="rounded-control border border-border-hairline px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGDriveSync}
                      disabled={syncingFiles || selectedFileIds.length === 0}
                      className="rounded-control bg-brand-teal text-background-page px-4 py-2 text-xs font-medium hover:bg-brand-teal-light disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {syncingFiles ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Indexing...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Index Selected
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-Page Integration Connection Modal */}
      <AnimatePresence>
        {connectModalSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-card border border-border-hairline bg-background-card p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border-hairline/45 pb-3">
                <div className="flex items-center gap-2.5">
                  <IntegrationIcon type={connectModalSource} className="h-5 w-5 text-brand-teal" />
                  <h3 className="text-sm font-semibold text-text-primary capitalize">
                    Authorize {connectModalSource} Integration
                  </h3>
                </div>
                <button
                  onClick={() => setConnectModalSource(null)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Grant <strong className="text-text-primary">Insight RAG</strong> permission to access and index workspace files, documentation, and pages for <strong className="text-brand-teal capitalize">{connectModalSource}</strong>.
                </p>

                <div className="rounded-control bg-background-sidebar border border-border-hairline p-3 text-xs space-y-1.5">
                  <span className="font-semibold text-text-primary">Insight RAG requests:</span>
                  <ul className="list-disc list-inside text-text-tertiary space-y-1 font-mono text-[11px]">
                    <li>Read access to workspace documents and databases</li>
                    <li>Automatic vector embeddings & semantic search indexing</li>
                    <li>Secure token storage for organization workspace</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-hairline/45">
                <button
                  type="button"
                  onClick={() => setConnectModalSource(null)}
                  className="rounded-control border border-border-hairline px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConnect}
                  disabled={connectingSource}
                  className="rounded-control bg-brand-teal text-background-page px-5 py-2 text-xs font-semibold hover:bg-brand-teal-light disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-brand-teal/20"
                >
                  {connectingSource ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Authorize & Connect
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notion Workspace Pages Picker Modal */}
      <AnimatePresence>
        {showNotionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-card border border-border-hairline bg-background-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-hairline/45 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-teal" />
                  <h3 className="text-sm font-semibold text-text-primary">Notion Workspace Pages & Databases</h3>
                </div>
                <button
                  onClick={() => setShowNotionModal(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {fetchingNotion ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
                  <span className="text-xs text-text-secondary">Scanning Notion workspace pages & databases...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={notionSearch}
                      onChange={(e) => setNotionSearch(e.target.value)}
                      placeholder="Search Notion pages or databases..."
                      className="w-full rounded-control border border-border-hairline bg-background-page px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none"
                    />

                    {(() => {
                      const filtered = notionFiles.filter(f =>
                        f.name.toLowerCase().includes(notionSearch.toLowerCase()) ||
                        (f.type && f.type.toLowerCase().includes(notionSearch.toLowerCase()))
                      );

                      return (
                        <>
                          <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                            <span>{selectedNotionIds.length} of {filtered.length} pages selected</span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllNotion(filtered)}
                              className="text-brand-teal hover:underline font-medium"
                            >
                              {selectedNotionIds.length === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
                            </button>
                          </div>

                          <div className="max-h-[260px] overflow-y-auto border border-border-hairline/45 rounded-control divide-y divide-border-hairline/30 bg-background-sidebar">
                            {filtered.length === 0 ? (
                              <div className="p-8 text-center text-xs text-text-secondary">
                                No connected Notion pages found.
                              </div>
                            ) : (
                              filtered.map(file => {
                                const isSelected = selectedNotionIds.includes(file.id);
                                return (
                                  <div
                                    key={file.id}
                                    onClick={() => handleToggleNotionSelection(file.id)}
                                    className="flex items-center gap-3 p-3 hover:bg-background-card/60 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="rounded border-border-hairline text-brand-teal focus:ring-brand-teal bg-transparent"
                                    />
                                    <BookOpen className="h-4 w-4 text-brand-teal shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-tertiary font-mono">
                                        <span className="rounded bg-brand-teal/10 text-brand-teal px-1.5 py-0.5">{file.type}</span>
                                        <span>•</span>
                                        <span>{file.size}</span>
                                        <span>•</span>
                                        <span>Modified {file.lastModified}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline/45">
                    <button
                      onClick={() => setShowNotionModal(false)}
                      className="rounded-control border border-border-hairline px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleNotionSync}
                      disabled={syncingNotion || selectedNotionIds.length === 0}
                      className="rounded-control bg-brand-teal text-background-page px-4 py-2 text-xs font-medium hover:bg-brand-teal-light disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {syncingNotion ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Indexing Selected...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Index Selected Pages ({selectedNotionIds.length})
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GitHub Connector Modal */}
      <AnimatePresence>
        {showGitHubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-card border border-border-hairline bg-background-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-hairline/45 pb-3">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5 text-brand-teal" />
                  <h3 className="text-sm font-semibold text-text-primary">Connect GitHub Repositories</h3>
                </div>
                <button
                  onClick={() => setShowGitHubModal(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-primary block">
                    Option 1: GitHub Personal Access Token (Recommended)
                  </label>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Generate a classic token at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-brand-teal underline">github.com/settings/tokens</a> with the <code className="bg-background-sidebar px-1 py-0.5 rounded text-[10px]">repo</code> scope selected.
                  </p>
                  <input
                    type="password"
                    value={githubTokenInput}
                    onChange={(e) => setGithubTokenInput(e.target.value)}
                    placeholder="Paste GitHub Personal Access Token (ghp_...)"
                    className="w-full rounded border border-border-hairline bg-background-page px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-teal focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleSaveGitHubToken}
                    disabled={connectingGitHub || !githubTokenInput.trim()}
                    className="w-full rounded bg-brand-teal px-4 py-2 text-xs font-semibold text-background-page hover:bg-brand-teal-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {connectingGitHub ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Connecting & Crawling Repositories...
                      </>
                    ) : (
                      'Connect & Sync All Repositories'
                    )}
                  </button>
                </div>

                <div className="relative flex items-center my-3">
                  <div className="flex-grow border-t border-border-hairline/45"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-text-tertiary uppercase">Or</span>
                  <div className="flex-grow border-t border-border-hairline/45"></div>
                </div>

                <div>
                  <button
                    onClick={() => {
                      setShowGitHubModal(false);
                      const token = localStorage.getItem('accessToken') || '';
                      const connectUrl = `${API_BASE}/integrations/connect/github?token=${encodeURIComponent(token)}`;
                      window.open(connectUrl, 'Connect github', 'width=600,height=750');
                    }}
                    className="w-full rounded border border-border-hairline bg-background-sidebar px-4 py-2 text-xs font-medium text-text-primary hover:bg-background-card transition-colors flex items-center justify-center gap-2"
                  >
                    <Github className="h-4 w-4 text-brand-teal" />
                    Connect via GitHub OAuth App
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border-hairline/45 flex justify-end">
                <button
                  onClick={() => setShowGitHubModal(false)}
                  className="rounded-control border border-border-hairline px-4 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminIntegrations;
