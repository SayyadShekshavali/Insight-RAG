import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Loader2, TrendingUp, AlertTriangle, UserCheck, 
  Clock, Sparkles, BookOpen, AlertCircle 
} from 'lucide-react';
import { api } from '../../lib/api.js';

function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/stats');
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (e) {
      // Mock stats fallback if offline
      setData({
        summary: {
          totalQuestions: 234,
          averageConfidence: 89,
          lowConfidenceRate: 8
        },
        dailyUsage: [
          { day: 'Mon', questions: 24, failed: 2 },
          { day: 'Tue', questions: 45, failed: 4 },
          { day: 'Wed', questions: 38, failed: 3 },
          { day: 'Thu', questions: 67, failed: 8 },
          { day: 'Fri', questions: 89, failed: 5 },
          { day: 'Sat', questions: 12, failed: 1 },
          { day: 'Sun', questions: 18, failed: 2 }
        ],
        topEmployees: [
          { email: 'employee1', questions: 114 },
          { email: 'employee2', questions: 78 },
          { email: 'admin1', questions: 22 },
          { email: 'employee3', questions: 12 },
          { email: 'admin2', questions: 8 }
        ],
        knowledgeGaps: [
          { topic: 'OAuth token security rotation', queries: 8, suggestion: 'Connect GitHub repository: server' },
          { topic: 'Deployment server cluster configs', queries: 5, suggestion: 'Upload PDF documentation' },
          { topic: 'API endpoints schema errors', queries: 4, suggestion: 'Upload Swagger/OpenAPI spec' }
        ]
      });
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-lg font-medium text-text-primary">AI Performance & Analytics</h2>
        <p className="text-xs text-text-secondary mt-1">Monitor response quality, active searchers, and pinpoint documentation knowledge gaps.</p>
      </div>

      {/* Top summary metric strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Workspace Queries', value: data.summary.totalQuestions, desc: 'Accumulated questions', icon: TrendingUp },
          { label: 'Avg Synthesizer Confidence', value: `${data.summary.averageConfidence}%`, desc: 'Average RAG match score', icon: Sparkles },
          { label: 'Weak Answers / Gaps Rate', value: `${data.summary.lowConfidenceRate}%`, desc: 'Questions with confidence < 60%', icon: AlertCircle }
        ].map((item, idx) => (
          <div key={idx} className="rounded-card bg-background-card p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary">{item.label}</span>
              <p className="text-2xl font-medium tracking-tight text-text-primary">{item.value}</p>
              <p className="text-[10px] text-text-tertiary">{item.desc}</p>
            </div>
            <div className="p-2.5 rounded-control bg-background-sidebar text-brand-teal/80">
              <item.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Queries vs Failures (Area Chart) */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Daily Usage & Failed Queries</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyUsage} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#5F5E5A" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#5F5E5A" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#101215', borderColor: '#2A2D33', borderRadius: '8px' }}
                  labelStyle={{ color: '#F1EFE8', fontSize: '11px', fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Area type="monotone" name="Total Searches" dataKey="questions" stroke="#1D9E75" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTeal)" />
                <Area type="monotone" name="Failed / Low Conf" dataKey="failed" stroke="#EF4444" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRed)" />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Active Employees (Horizontal Bar Chart) */}
        <div className="rounded-card border border-border-hairline bg-background-card p-5 space-y-4">
          <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Top Active Employees</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topEmployees} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" stroke="#5F5E5A" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="email" type="category" stroke="#5F5E5A" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#101215', borderColor: '#2A2D33', borderRadius: '8px' }}
                  itemStyle={{ color: '#9FE1CB', fontSize: '11px' }}
                />
                <Bar dataKey="questions" name="Searches" fill="#1D9E75" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Knowledge Gaps list */}
      <div className="rounded-card bg-background-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-warning" />
          <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-text-secondary">Identified Knowledge Gaps</h3>
        </div>
        <p className="text-xs text-text-secondary">These search topics generated weak or failed matches, indicating missing reference files or integrations.</p>

        <div className="space-y-2 pt-2">
          {data.knowledgeGaps.map((gap, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg hover:bg-white/5 transition-colors text-xs">
              <div>
                <p className="font-medium text-text-primary">{gap.topic}</p>
                <p className="text-[10px] font-mono text-text-tertiary mt-0.5">{gap.queries} failed searches this week</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded bg-brand-teal/10 px-3 py-1.5 text-[10px] font-mono text-brand-teal self-start sm:self-auto">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Recommendation: {gap.suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
