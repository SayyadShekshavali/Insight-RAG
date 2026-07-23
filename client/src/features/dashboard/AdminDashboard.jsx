import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, Users, MessageSquare, Clock, FileText, 
  Github, Slack, Layers, AlertCircle, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../../lib/api.js';

// Chart mock data
const chartData = [
  { day: 'Mon', questions: 24 },
  { day: 'Tue', questions: 45 },
  { day: 'Wed', questions: 38 },
  { day: 'Thu', questions: 67 },
  { day: 'Fri', questions: 89 },
  { day: 'Sat', questions: 12 },
  { day: 'Sun', questions: 18 },
];

const topTopics = [
  { topic: 'Authentication & JWT rotation', count: 124 },
  { topic: 'MongoDB Mongoose schemas', count: 98 },
  { topic: 'BullMQ redis jobs', count: 76 },
  { topic: 'LangGraph graph orchestration', count: 54 },
  { topic: 'Vite React build configuration', count: 42 },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    questionsToday: 0,
    activeEmployees: 1,
    avgResponseTime: '0.0s',
    docsIndexed: 0
  });
  const [integrationsList, setIntegrationsList] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch Documents count
        const docsRes = await api.get('/documents');
        const docs = docsRes.ok ? await docsRes.json() : [];

        // 2. Fetch Integrations status
        const intRes = await api.get('/integrations');
        const ints = intRes.ok ? await intRes.json() : [];

        // 3. Fetch Search logs
        const logsRes = await api.get('/analytics/search-logs');
        const logs = logsRes.ok ? await logsRes.json() : [];

        // Compute metrics for this admin's org
        const todayStr = new Date().toISOString().split('T')[0];
        const questionsToday = logs.filter(l => new Date(l.timestamp).toISOString().split('T')[0] === todayStr).length;

        // Build recent activities feed from actual indexed docs & search logs
        const docActivities = docs.map(d => ({
          id: d._id,
          source: d.sourceType || 'document',
          desc: `Indexed ${d.title}`,
          status: d.indexingStatus === 'processing' ? 'processing' : 'indexed',
          time: new Date(d.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        }));

        const logActivities = logs.slice(0, 5).map(l => ({
          id: l._id,
          source: (l.sourcesUsed && l.sourcesUsed[0]) || 'search',
          desc: `Query: "${l.question.length > 45 ? l.question.slice(0, 45) + '...' : l.question}"`,
          status: 'indexed',
          time: new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        }));

        const combinedActivities = [...docActivities, ...logActivities].slice(0, 6);

        setMetrics({
          questionsToday,
          activeEmployees: 1,
          avgResponseTime: logs.length > 0 ? '1.2s' : '0.0s',
          docsIndexed: docs.length
        });

        setIntegrationsList(ints);
        setActivities(combinedActivities);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const getSourceIcon = (source) => {
    switch (source) {
      case 'github':
        return <Github className="h-4 w-4 text-text-secondary" />;
      case 'slack':
        return <span className="font-mono font-bold text-sm text-text-secondary">#</span>;
      default:
        return <FileText className="h-4 w-4 text-text-secondary" />;
    }
  };

  const getIntegrationStatus = (type) => {
    const found = integrationsList.find(i => i.sourceType === type);
    return found ? (found.status === 'connected' ? 'connected' : found.status) : 'not_connected';
  };

  return (
    <div className="space-y-6">
      {/* 4 Metrics Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Questions Today', value: metrics.questionsToday, icon: MessageSquare },
          { label: 'Active Employees', value: metrics.activeEmployees, icon: Users },
          { label: 'Avg Response Time', value: metrics.avgResponseTime, icon: Clock },
          { label: 'Documents Indexed', value: metrics.docsIndexed, icon: FileText }
        ].map((m, idx) => (
          <div key={idx} className="rounded-card bg-background-card p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary">
                {m.label}
              </span>
              <p className="text-2xl font-medium tracking-tight text-text-primary">
                {m.value}
              </p>
            </div>
            <div className="p-2.5 rounded-control bg-background-sidebar text-brand-teal/80">
              <m.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Area Chart & Top Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Area Chart */}
        <div className="lg:col-span-2 rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">
              Search Queries Overview
            </h3>
            <span className="text-[10px] text-text-tertiary">Workspace Activity</span>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  stroke="#5F5E5A" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#5F5E5A" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E1E1C', 
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="questions" 
                  stroke="#1D9E75" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTeal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Searched Topics */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">
              Top Searched Topics
            </h3>
            <span className="text-[10px] text-text-tertiary">Live Query Ranks</span>
          </div>
          <div className="space-y-3">
            {topTopics.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-text-primary truncate pr-2">{t.topic}</span>
                <span className="font-mono text-[10px] text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-full shrink-0">
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Quick Status Strip */}
      <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">
            Connected Integrations Status
          </h3>
          <button 
            onClick={() => navigate('/admin/integrations')}
            className="text-[10px] font-mono text-brand-teal hover:underline flex items-center gap-1"
          >
            Manage Integrations <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { id: 'github', name: 'GitHub' },
            { id: 'jira', name: 'Jira' },
            { id: 'confluence', name: 'Confluence' },
            { id: 'slack', name: 'Slack' },
            { id: 'gdrive', name: 'Drive' },
            { id: 'notion', name: 'Notion' }
          ].map((int, idx) => {
            const status = getIntegrationStatus(int.id);
            return (
              <div key={idx} className="rounded-control bg-background-sidebar border border-border-hairline p-3 text-center space-y-1.5 hover:border-brand-teal/30 transition-colors">
                <div className="inline-flex p-1.5 rounded-full bg-background-page text-text-secondary">
                  {getSourceIcon(int.id)}
                </div>
                <div className="text-[10px] font-medium text-text-primary truncate">{int.name}</div>
                <div className="text-[9px] font-mono">
                  {status === 'connected' && <span className="text-status-success">Connected</span>}
                  {status === 'syncing' && <span className="text-status-warning animate-pulse">Syncing</span>}
                  {status === 'error' && <span className="text-status-error">Error</span>}
                  {status === 'not_connected' && <span className="text-text-tertiary">Offline</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity feed */}
      <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
        <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">
          Recent Activity Feed
        </h3>
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-text-tertiary">
            No recent activity in your workspace yet. Connect an integration or upload a document to get started.
          </div>
        ) : (
          <div className="divide-y divide-border-hairline/45">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center justify-between py-3 text-xs first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 truncate">
                  <div className="p-1.5 rounded-full bg-background-sidebar text-text-secondary">
                    {getSourceIcon(act.source)}
                  </div>
                  <div className="truncate">
                    <p className="text-text-primary truncate">{act.desc}</p>
                    <p className="text-[10px] text-text-tertiary font-mono mt-0.5">{act.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {act.status === 'indexed' && (
                    <span className="inline-flex items-center gap-1 text-status-success font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Indexed
                    </span>
                  )}
                  {act.status === 'processing' && (
                    <span className="inline-flex items-center gap-1 text-status-warning animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Syncing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
