import React from 'react';

// Common placeholder helper
const PagePlaceholder = ({ title }) => (
  <div className="flex h-full w-full items-center justify-center bg-background-page text-text-primary p-6">
    <div className="rounded-card border border-border-hairline bg-background-card p-12 text-center max-w-md">
      <h2 className="text-xl font-medium tracking-tight text-brand-teal">{title}</h2>
      <p className="mt-2 text-sm text-text-secondary">This feature is currently under active implementation. Access has been verified and authorized by the server middleware.</p>
    </div>
  </div>
);

// Employee Shell Pages
export const SavedChats = () => <PagePlaceholder title="Employee: Saved Chats" />;
export const HistoryChats = () => <PagePlaceholder title="Employee: Search History" />;
export const EmployeeDocuments = () => <PagePlaceholder title="Employee: Documents" />;
export const DocumentPreview = () => <PagePlaceholder title="Employee: Document Preview & Citations" />;

// Admin Shell Pages
export const AdminDashboard = () => <PagePlaceholder title="Admin: Dashboard Console" />;
export const AdminUsers = () => <PagePlaceholder title="Admin: User Management" />;
export const AdminIntegrations = () => <PagePlaceholder title="Admin: Integration Connectors" />;
export const AdminDocuments = () => <PagePlaceholder title="Admin: Document Management" />;
export const AdminSearchHistory = () => <PagePlaceholder title="Admin: Global Search Logs" />;
export const AdminAnalytics = () => <PagePlaceholder title="Admin: AI Analytics Engine" />;
export const AdminAISettings = () => <PagePlaceholder title="Admin: LLM & Retrieval Settings" />;
export const AdminOrgSettings = () => <PagePlaceholder title="Admin: Organization Settings" />;

// Shared Page
export const KnowledgeGraph = () => <PagePlaceholder title="Insight RAG Knowledge Graph" />;
