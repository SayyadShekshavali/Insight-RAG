import React, { useState, useEffect } from 'react';
import { Building, ShieldAlert, Save, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.js';

function AdminOrgSettings() {
  const [orgName, setOrgName] = useState('Insight RAG Dev Org');
  const [allowedDomains, setAllowedDomains] = useState('insightrag.dev, company.com');
  const [retention, setRetention] = useState('indefinite');
  const [saved, setSaved] = useState(false);
  const [deletingLogs, setDeletingLogs] = useState(false);
  const [deletingDocs, setDeletingDocs] = useState(false);

  useEffect(() => {
    fetchOrgDetails();
  }, []);

  const fetchOrgDetails = async () => {
    try {
      const res = await api.get('/auth/me'); // gets active user details including org info
      if (res.ok) {
        const data = await res.json();
        if (data.orgName) {
          setOrgName(data.orgName);
        }
      }
    } catch (e) {}
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClearLogs = async () => {
    if (!confirm('WARNING: Are you absolutely sure you want to permanently erase ALL search logs? This action is irreversible.')) return;
    setDeletingLogs(true);
    try {
      // Send delete logs request (simulated)
      await new Promise(r => setTimeout(r, 1500));
      alert('Search history logs successfully cleared.');
    } catch (e) {
    } finally {
      setDeletingLogs(false);
    }
  };

  const handleClearDocs = async () => {
    if (!confirm('CRITICAL WARNING: Are you sure you want to delete ALL indexed documents and vectors? This will completely clear your RAG search knowledge base.')) return;
    setDeletingDocs(true);
    try {
      // Clear documents table and Qdrant index (simulated)
      await new Promise(r => setTimeout(r, 2000));
      alert('Documents index and vectors purged successfully.');
    } catch (e) {
    } finally {
      setDeletingDocs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-medium text-text-primary">Organization Settings</h2>
        <p className="text-xs text-text-secondary mt-1">Manage tenant branding, define workspace membership domains, and control data privacy retentions.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Profile Details */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border-hairline/45 pb-3">
            <Building className="h-4 w-4 text-brand-teal" />
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Tenant Parameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Org Name */}
            <div className="space-y-1">
              <label className="text-[10px] text-text-secondary font-mono">Organization name</label>
              <input 
                type="text" 
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-1.5 text-xs text-text-primary focus:border-brand-teal focus:outline-none"
              />
            </div>

            {/* Allowed Domains */}
            <div className="space-y-1">
              <label className="text-[10px] text-text-secondary font-mono">Allowed signup domains</label>
              <input 
                type="text" 
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="e.g. company.com, dev.company.com"
                className="w-full rounded-control border border-border-hairline bg-background-sidebar px-3 py-1.5 text-xs text-text-primary focus:border-brand-teal focus:outline-none"
              />
              <p className="text-[9px] text-text-tertiary">Comma-separated email domains authorized to join this workspace.</p>
            </div>

          </div>
        </div>

        {/* Data Retention configs */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Search Audit Retention</h3>
          
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-secondary font-mono">Logs retention duration</label>
            <select
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="w-full max-w-xs rounded-control border border-border-hairline bg-background-sidebar px-3 py-1.5 text-xs text-text-primary focus:border-brand-teal focus:outline-none"
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="365">1 Year</option>
              <option value="indefinite">Indefinite (No deletion)</option>
            </select>
          </div>
          <p className="text-[10px] text-text-tertiary">Search history logs and citation records older than this duration will be automatically pruned.</p>
        </div>

        {/* Safety Zone (Delete actions) */}
        <div className="rounded-card border border-status-error/35 bg-[#2A161A]/10 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-status-error/20 pb-3">
            <ShieldAlert className="h-4 w-4 text-status-error" />
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-status-error">Safety Delete Zone</h3>
          </div>
          <p className="text-xs text-text-secondary">High-risk actions. Purging logs or indexed files cannot be recovered once executed.</p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            
            {/* Erase logs */}
            <button
              type="button"
              disabled={deletingLogs}
              onClick={handleClearLogs}
              className="inline-flex items-center justify-center gap-2 rounded-control border border-status-error/45 hover:bg-[#EF4444]/10 text-xs font-medium px-4 py-2 text-status-error transition-colors"
            >
              {deletingLogs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Clear all search history logs
            </button>

            {/* Erase docs */}
            <button
              type="button"
              disabled={deletingDocs}
              onClick={handleClearDocs}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-status-error hover:bg-status-error/85 text-background-page text-xs font-medium px-4 py-2 transition-colors"
            >
              {deletingDocs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Purge documents & vector database
            </button>

          </div>
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <div className="flex items-center gap-1.5 text-xs text-brand-teal font-mono">
              <CheckCircle className="h-4 w-4" />
              <span>Settings saved!</span>
            </div>
          ) : <div />}
          
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-control bg-brand-teal hover:bg-brand-teal-light text-background-page px-5 py-2 text-xs font-medium transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save Organization settings
          </button>
        </div>

      </form>
    </div>
  );
}

export default AdminOrgSettings;
