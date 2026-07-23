import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Guards
import { GuestRoute, ProtectedRoute, AdminRoute, EmployeeRoute } from './RouteGuards.jsx';
import EmployeeLayout from '../features/chat/EmployeeLayout.jsx';
import AdminLayout from '../features/dashboard/AdminLayout.jsx';

// Feature Pages
import Login from '../features/auth/Login.jsx';

import SavedChats from '../features/chat/SavedChats.jsx';
import HistoryChats from '../features/chat/HistoryChats.jsx';
import EmployeeDocuments from '../features/documents/EmployeeDocuments.jsx';
import DocumentPreview from '../features/documents/DocumentPreview.jsx';

import AdminIntegrations from '../features/integrations/AdminIntegrations.jsx';
import AdminDocuments from '../features/documents/AdminDocuments.jsx';
import AdminDashboard from '../features/dashboard/AdminDashboard.jsx';
import AdminUsers from '../features/users/AdminUsers.jsx';
import AdminSearchHistory from '../features/search-history/AdminSearchHistory.jsx';
import AdminAnalytics from '../features/analytics/AdminAnalytics.jsx';
import KnowledgeGraph from '../features/knowledge-graph/KnowledgeGraph.jsx';
import AdminAISettings from '../features/settings/AdminAISettings.jsx';
import AdminOrgSettings from '../features/settings/AdminOrgSettings.jsx';

import EmployeeChat from '../features/chat/EmployeeChat.jsx';

export function AppRoutes() {
  return (
    <Routes>
      {/* Guest Authentication Routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Authenticated Routes Area */}
      <Route element={<ProtectedRoute />}>
        
        {/* 1. Employee Shell Router (ChatGPT-style interface) */}
        <Route element={<EmployeeRoute />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/" element={<EmployeeChat />} />
            <Route path="/chat" element={<EmployeeChat />} />
            <Route path="/saved" element={<SavedChats />} />
            <Route path="/history" element={<HistoryChats />} />
            <Route path="/documents" element={<EmployeeDocuments />} />
            <Route path="/documents/:id" element={<DocumentPreview />} />
            <Route path="/graph" element={<KnowledgeGraph />} />
            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

        {/* 2. Admin Shell Router (Vercel/Linear dashboard register) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/integrations" element={<AdminIntegrations />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/history" element={<AdminSearchHistory />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/graph" element={<KnowledgeGraph />} />
            <Route path="/admin/settings" element={<AdminAISettings />} />
            <Route path="/admin/org" element={<AdminOrgSettings />} />
            {/* Catch-all redirect to Admin Dashboard */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>

      </Route>

      {/* Unhandled requests redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
