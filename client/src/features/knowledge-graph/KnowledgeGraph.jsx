import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { 
  MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare } from 'lucide-react';

// Custom nodes styles depending on node type
const nodeTypes = {}; // We can use standard nodes and custom styling in data

// Initial Nodes layout
const initialNodes = [
  // Services
  { 
    id: 's-gateway', 
    position: { x: 250, y: 50 }, 
    data: { label: 'Express API Gateway (5000)' },
    style: { background: '#04342C', color: '#1D9E75', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', width: 220 }
  },
  { 
    id: 's-python', 
    position: { x: 150, y: 200 }, 
    data: { label: 'FastAPI AI Engine (8000)' },
    style: { background: '#04342C', color: '#1D9E75', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', width: 200 }
  },
  { 
    id: 's-qdrant', 
    position: { x: 150, y: 350 }, 
    data: { label: 'Qdrant Vector Cluster' },
    style: { background: '#04342C', color: '#1D9E75', border: '1px solid #1D9E75', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', width: 200 }
  },
  { 
    id: 's-mongo', 
    position: { x: 380, y: 200 }, 
    data: { label: 'MongoDB Database (27017)' },
    style: { background: '#101F30', color: '#3B82F6', border: '1px solid #3B82F6', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', width: 200 }
  },

  // Repositories
  { 
    id: 'r-server', 
    position: { x: 580, y: 50 }, 
    data: { label: 'GitHub: insight-rag/server' },
    style: { background: '#2B1E43', color: '#A78BFA', border: '1px solid #8B5CF6', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', width: 200 }
  },
  { 
    id: 'r-ai', 
    position: { x: 580, y: 150 }, 
    data: { label: 'GitHub: insight-rag/python-ai' },
    style: { background: '#2B1E43', color: '#A78BFA', border: '1px solid #8B5CF6', borderRadius: '8px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', width: 200 }
  },

  // APIs
  { 
    id: 'a-ask', 
    position: { x: 50, y: 50 }, 
    data: { label: 'POST /api/chat/ask' },
    style: { background: '#3F2715', color: '#F59E0B', border: '1px solid #D97706', borderRadius: '6px', padding: '8px', fontSize: '10px', fontFamily: 'monospace', width: 150 }
  },
  { 
    id: 'a-index', 
    position: { x: 50, y: 120 }, 
    data: { label: 'POST /index' },
    style: { background: '#3F2715', color: '#F59E0B', border: '1px solid #D97706', borderRadius: '6px', padding: '8px', fontSize: '10px', fontFamily: 'monospace', width: 150 }
  },

  // Documents
  { 
    id: 'd-auth', 
    position: { x: 830, y: 50 }, 
    data: { label: 'auth.controller.js' },
    style: { background: '#1F2937', color: '#9CA3AF', border: '1px solid #4B5563', borderRadius: '6px', padding: '8px', fontSize: '10px', fontFamily: 'monospace', width: 150 }
  },
  { 
    id: 'd-rbac', 
    position: { x: 830, y: 110 }, 
    data: { label: 'rbac.js' },
    style: { background: '#1F2937', color: '#9CA3AF', border: '1px solid #4B5563', borderRadius: '6px', padding: '8px', fontSize: '10px', fontFamily: 'monospace', width: 150 }
  },
  { 
    id: 'd-incident', 
    position: { x: 830, y: 170 }, 
    data: { label: 'slack-incidents.txt' },
    style: { background: '#1F2937', color: '#9CA3AF', border: '1px solid #4B5563', borderRadius: '6px', padding: '8px', fontSize: '10px', fontFamily: 'monospace', width: 150 }
  }
];

// Initial Edges/Links layout
const initialEdges = [
  // Gateway routes requests to Python AI
  { id: 'e-g-py', source: 's-gateway', target: 's-python', animated: true, style: { stroke: '#1D9E75' } },
  // Gateway queries/saves metadata to Mongo
  { id: 'e-g-db', source: 's-gateway', target: 's-mongo', style: { stroke: '#3B82F6' } },
  // Python indexes to Qdrant
  { id: 'e-py-qd', source: 's-python', target: 's-qdrant', animated: true, style: { stroke: '#1D9E75' } },
  
  // API endpoints mapping
  { id: 'e-g-ask', source: 'a-ask', target: 's-gateway', style: { stroke: '#D97706', strokeDasharray: '5,5' } },
  { id: 'e-p-idx', source: 'a-index', target: 's-python', style: { stroke: '#D97706', strokeDasharray: '5,5' } },

  // Repository contents mapping
  { id: 'e-r-auth', source: 'r-server', target: 'd-auth', style: { stroke: '#8B5CF6' } },
  { id: 'e-r-rbac', source: 'r-server', target: 'd-rbac', style: { stroke: '#8B5CF6' } },
  { id: 'e-r-ai', source: 'r-ai', target: 's-python', style: { stroke: '#8B5CF6' } }
];

function KnowledgeGraph() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const getNodeDescription = (id) => {
    switch (id) {
      case 's-gateway':
        return 'Express.js backend server serving as the main entry API gateway. Handles user signup/login, authentication, RBAC authorization, and proxies RAG streams to the frontend.';
      case 's-python':
        return 'Python FastAPI AI service. Runs the LangGraph chunking, vector embedding generation, and hybrid search pipeline. Connects to the Gemini LLM service.';
      case 's-qdrant':
        return 'Qdrant Vector Database. Stores the document point vectors with metadata payloads (org_id, title, source_type). Used for fast cosine similarity search.';
      case 's-mongo':
        return 'MongoDB primary document store. Persists the user account definitions, organization profiles, uploaded file metadata index, and user query analytics.';
      case 'r-server':
        return 'GitHub repository for the backend server. Written in plain JavaScript. Enforces express rate limiting and JWT auth token rotations.';
      case 'r-ai':
        return 'GitHub repository for the python RAG server. Implements Rank-BM25 search rankings and handles multi-format file parsers.';
      case 'a-ask':
        return 'Express REST endpoint proxied to FastAPI. Streams token-by-token syntheses to the Employee Chat Shell.';
      case 'a-index':
        return 'FastAPI background indexing worker. Triggered by document uploads, splits content, and records vectors in Qdrant.';
      case 'd-auth':
        return 'User credential authenticator script. Handles bcrypt password hashing comparisons and reads permissions role off user profiles.';
      case 'd-rbac':
        return 'Role-Based Access Control middleware. Enforces route checks and blocks unauthorised requests with a 403 Forbidden code.';
      case 'd-incident':
        return 'Incident log document synced from the Slack connector channel #incidents. Logs system restarts and db outages.';
      default:
        return 'Workspace item indexed and connected to the RAG database network.';
    }
  };

  const handleAskNode = (node) => {
    if (!node) return;
    const query = encodeURIComponent(`Explain what is ${node.data.label} and how it functions inside the workspace.`);
    navigate(`/chat?question=${query}`);
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col space-y-4">
      <div>
        <h2 className="text-lg font-medium text-text-primary">Workspace Knowledge Graph</h2>
        <p className="text-xs text-text-secondary mt-1">
          Interactive full-bleed visualization of active microservices, APIs, repositories, and documents indexed in the vector store.
        </p>
      </div>

      {/* React Flow Container */}
      <div className="flex-1 rounded-card border border-border-hairline bg-[#101215] overflow-hidden relative">
        {/* Color Code Legend floating inside graph */}
        <div className="absolute top-4 left-4 z-10 bg-[#16181D]/90 border border-border-hairline rounded-control p-3.5 space-y-2 text-[10px] font-mono select-none pointer-events-auto backdrop-blur-md">
          <div className="text-[9px] uppercase tracking-wider text-text-secondary mb-1.5 font-bold">Node Typology</div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-[#04342C] border border-[#1D9E75]"></span>
            <span className="text-text-primary">Microservices (Gateway/RAG Engine)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-[#2B1E43] border border-[#8B5CF6]"></span>
            <span className="text-text-primary">GitHub Code Repositories</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-[#3F2715] border border-[#D97706]"></span>
            <span className="text-text-primary">API Request Routes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-[#1F2937] border border-[#4B5563]"></span>
            <span className="text-text-primary">Workspace Files & Logs</span>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          className="w-full h-full"
        >
          <Background color="#2A2D33" gap={16} size={1} />
          <Controls className="!bg-[#16181D] !border !border-border-hairline !rounded-control !shadow-md fill-white" />
          <MiniMap 
            nodeColor={(node) => {
              if (node.id.startsWith('s-')) return '#1D9E75';
              if (node.id.startsWith('r-')) return '#8B5CF6';
              if (node.id.startsWith('a-')) return '#D97706';
              return '#4B5563';
            }}
            maskColor="rgba(20, 22, 26, 0.7)"
            className="!bg-[#16181D] !border !border-border-hairline !rounded-control"
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#16181D]/95 border-l border-border-hairline z-20 p-5 backdrop-blur-md overflow-y-auto flex flex-col justify-between select-none">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-hairline/40 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Node Details</span>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="text-text-secondary hover:text-text-primary text-base font-bold px-1"
                >
                  ×
                </button>
              </div>
              <div>
                <span className={`text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full ${
                  selectedNode.id.startsWith('s-') ? 'bg-[#04342C] text-[#1D9E75] border border-[#1D9E75]/30' :
                  selectedNode.id.startsWith('r-') ? 'bg-[#2B1E43] text-[#A78BFA] border border-[#8B5CF6]/30' :
                  selectedNode.id.startsWith('a-') ? 'bg-[#3F2715] text-[#F59E0B] border border-[#D97706]/30' :
                  'bg-[#1F2937] text-[#9CA3AF] border border-[#4B5563]/30'
                }`}>
                  {selectedNode.id.startsWith('s-') ? 'Microservice' :
                   selectedNode.id.startsWith('r-') ? 'Code Repository' :
                   selectedNode.id.startsWith('a-') ? 'API Endpoint' :
                   'File Resource'}
                </span>
                <h3 className="text-sm font-medium text-text-primary font-mono mt-3 break-all">{selectedNode.data.label}</h3>
              </div>
              <div className="border-t border-border-hairline/20 pt-3">
                <h4 className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">Functional Role</h4>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed font-sans">
                  {getNodeDescription(selectedNode.id)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handleAskNode(selectedNode)}
              className="mt-6 w-full inline-flex items-center justify-center gap-1.5 rounded bg-brand-teal hover:bg-brand-teal-light text-background-page py-2.5 text-xs font-semibold transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Ask AI about this</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeGraph;
