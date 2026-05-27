import React, { useState, useEffect, useRef } from "react";
import {
  MessagesSquare,
  FileUp,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus
} from "lucide-react";
import axios from "axios";
import { getProjects } from "../../services/projectService.js";
import {
  getRequirementChatSession,
  saveRequirementChatSession,
} from "../../services/requirementsService.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const Collection = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [confluenceLoading, setConfluenceLoading] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [existingRequirements, setExistingRequirements] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat', 'docs', 'jira'
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualReq, setManualReq] = useState({ title: "", description: "", category: "Compliance" });
  const chatEndRef = useRef(null);

  // Per-project chat history
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  // Tracks which project's session has finished loading, so the debounced
  // save below can't overwrite a freshly-selected project with stale state.
  const loadedProjectRef = useRef(null);

  // Fetch already saved requirements to prevent duplicates
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/requirements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setExistingRequirements(res.data.data.map(r => r.title));
        }
      } catch (err) {
        console.error("Error fetching existing reqs:", err);
      }
    };
    fetchExisting();
  }, []);

  // LOAD PROJECTS FOR THE CHAT-HISTORY SELECTOR
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data || []);
        // Default to the first project so a chat is always scoped to one.
        if (!selectedProjectId && data?.[0]?.projectId) {
          setSelectedProjectId(data[0].projectId);
        }
      } catch (err) {
        console.error("Failed to load projects for chat history:", err);
      }
    };
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // LOAD THE SELECTED PROJECT'S CHAT SESSION
  useEffect(() => {
    if (!selectedProjectId) return;

    // Block saves until this project's session is loaded.
    loadedProjectRef.current = null;

    const loadChatSession = async () => {
      try {
        const response = await getRequirementChatSession(selectedProjectId);
        const session = response.data || {};
        setSessionId(session.sessionId || `session-${selectedProjectId}-${Date.now()}`);
        setMessages(session.messages || []);
        setRequirements(session.pendingRequirements || []);
      } catch (err) {
        console.error("Failed to load chat session:", err);
        setMessages([]);
        setRequirements([]);
      } finally {
        loadedProjectRef.current = selectedProjectId;
      }
    };

    loadChatSession();
  }, [selectedProjectId]);

  // SAVE CHAT + STAGED REQUIREMENTS PER PROJECT (debounced)
  useEffect(() => {
    if (!selectedProjectId) return;
    // Don't save until the current project's session has loaded.
    if (loadedProjectRef.current !== selectedProjectId) return;

    const timer = setTimeout(() => {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      saveRequirementChatSession(selectedProjectId, {
        sessionId,
        messages,
        pendingRequirements: requirements,
        lastTopic: lastUser?.content || "",
      }).catch(err => console.error("Failed to save chat session:", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedProjectId, sessionId, messages, requirements]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_BASE_URL}/requirements/collect`, {
        session_id: sessionId,
        messages: [...messages, userMessage]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { session_id, requirements: newReqs, answer } = response.data.data;
      setSessionId(session_id);
      setMessages(prev => [...prev, { role: "assistant", content: answer || "I've analyzed your input and extracted the requirements." }]);

      // Filter out duplicates from the chat extraction too
      const filteredReqs = newReqs.filter(req => !existingRequirements.includes(req.title));
      setRequirements(prev => [...prev, ...filteredReqs]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualReq.title || !manualReq.description) {
      alert("Please provide both a title and description.");
      return;
    }

    // Add to the local list with source 'manual'
    setRequirements(prev => [{
      ...manualReq,
      source: "manual",
      id: "MANUAL-" + Date.now()
    }, ...prev]);

    // Reset and close
    setManualReq({ title: "", description: "", category: "Compliance" });
    setShowManualModal(false);
  };

  const VALID_CATEGORIES = [
    "Authentication", "Access Control", "Encryption",
    "Data Protection", "Logging", "Network Security",
    "Physical Security", "Incident Response", "Compliance",
    "AI Security", "IoT Security", "Other"
  ];

  const removeRequirement = (title) => {
    setRequirements(prev => prev.filter(item => item.title !== title));
  };

  const saveRequirement = async (req) => {
    try {
      // Generate a valid ID format: REQ-2026-001
      const year = new Date().getFullYear();
      const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
      const generatedId = `REQ-${year}-${randomNum}`;

      // Normalize category: if the source provides an invalid category, fall back to "Other"
      const rawCategory = req.category || "Compliance";
      const safeCategory = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : "Other";

      // Determine valid source type for DB schema
      const getSourceType = (src = "") => {
        const s = src.toLowerCase();
        if (s.includes("document")) return "document";
        if (s.includes("jira")) return "jira";
        if (s.includes("confluence")) return "confluence";
        if (s.includes("chat")) return "chat";
        return "manual";
      };

      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_BASE_URL}/requirements`, {
        id: generatedId,
        projectId: selectedProjectId || undefined,
        title: req.title.length < 5 ? `${req.title} Project` : req.title,
        description: req.description && req.description.length >= 10 
          ? req.description 
          : `Requirement extracted from ${req.source || "external source"}. See ${req.title} for more details.`,
        category: safeCategory,
        priority: req.priority || "High",
        status: "Draft",
        source: {
          type: getSourceType(req.source || activeTab),
          timestamp: new Date(),
          reference: req.source || ""
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success || response.data._id) {
        setRequirements(prev => prev.filter(item => item.title !== req.title));
        setExistingRequirements(prev => [...prev, req.title]);
        alert(`Requirement Added successfully with ID: ${generatedId}`);
      }
    } catch (error) {
      console.error("Error saving requirement:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.errors?.join(", ") || error.message;
      alert(`Failed to save: ${errorMessage}`);
    }
  };

  const fetchFromJira = async () => {
    setJiraLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/requirements/jira`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // FILTER: Only show what is NOT already saved
        const newItems = response.data.data.filter(item => !existingRequirements.includes(item.title));
        setRequirements(prev => [...prev, ...newItems]);

        if (newItems.length > 0) {
          alert(`Successfully extracted ${newItems.length} new requirements from Jira.`);
        } else {
          alert("Jira is already up to date.");
        }
      }
    } catch (error) {
      console.error("Jira fetch error:", error);
      alert("Failed to connect to Jira. Please check your credentials.");
    } finally {
      setJiraLoading(false);
    }
  };

  const fetchFromConfluence = async () => {
    setConfluenceLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE_URL}/requirements/confluence?query=requirements`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const extractedReqs = response.data.data || [];

        if (extractedReqs.length === 0) {
          alert("I checked Confluence but couldn't find any new requirements. Please ensure your project documentation is available.");
          return;
        }

        // FILTER: Only show what is NOT already saved
        const newItems = extractedReqs.filter(item => !existingRequirements.includes(item.title));
        setRequirements(prev => [...prev, ...newItems]);

        if (newItems.length > 0) {
          alert(`Successfully extracted ${newItems.length} new requirements from Confluence.`);
        } else {
          alert("Confluence is already up to date.");
        }
      }
    } catch (error) {
      console.error("Confluence fetch error:", error);
      alert("Failed to connect to Confluence MCP. Please check your credentials.");
    } finally {
      setConfluenceLoading(false);
    }
  };

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setLoading(true);

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId || "upload-session");

    try {
      const response = await axios.post(`${API_BASE_URL}/requirements/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const { requirements: newReqs, error: aiError } = response.data.data;

        if (!aiError && newReqs) {
          // Filter and add new requirements
          const filteredReqs = newReqs.filter(req => !requirements.some(r => r.title === req.title));
          
          if (filteredReqs.length > 0) {
            setRequirements(prev => [...prev, ...filteredReqs]);
            alert(`Successfully extracted ${filteredReqs.length} new requirements from document.`);
          } else if (newReqs.length > 0) {
            alert("No new requirements found. All items in the document are already in your list.");
          } else {
            alert("Document analyzed, but no security requirements were found inside.");
          }
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      {/* ... header code ... */}
      {/* Header */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Requirement Collection</h1>
          <p className="text-sm text-gray-500">Extract, categorize, and map security requirements via multiple channels.</p>
          <div className="mt-2 flex items-center space-x-2">
            <label className="text-xs font-semibold text-gray-500">Project:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-sm rounded-lg border-gray-200 bg-white px-3 py-1.5 focus:border-indigo-500 focus:ring-indigo-500"
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                <>
                  <option value="" disabled>Select a project to resume…</option>
                  {projects.map(project => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.projectName} ({project.projectId})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center px-4 py-2 rounded-lg transition-all ${activeTab === "chat" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            <MessagesSquare className="w-5 h-5 mr-2" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex items-center px-4 py-2 rounded-lg transition-all ${activeTab === "docs" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            <FileUp className="w-5 h-5 mr-2" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("jira")}
            className={`flex items-center px-4 py-2 rounded-lg transition-all ${activeTab === "jira" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100"}`}
          >
            <CloudDownload className="w-5 h-5 mr-2" />
            Integrations
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Chat/Input Area */}
        <div className="w-1/2 flex flex-col border-r bg-white">
          {activeTab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                    <MessagesSquare className="w-16 h-16 mb-4 opacity-20" />
                    <p className="max-w-xs">Start a conversation to extract security requirements for your project.</p>
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${m.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none shadow-sm"}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin text-indigo-600" />
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe your security requirements..."
                    className="w-full pl-4 pr-12 py-3 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-1.5 p-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </form>
            </>
          )}

          {activeTab === "docs" && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-md p-10 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${uploading ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-indigo-400"}`}
              >
                {uploading ? (
                  <RefreshCw className="w-16 h-16 mx-auto mb-4 text-indigo-600 animate-spin" />
                ) : (
                  <FileUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                )}
                <h3 className="text-lg font-semibold text-gray-700">
                  {uploading ? "Analyzing Document..." : "Upload Security Documents"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {uploading ? "Our AI is extracting requirements. This will take a moment." : "Drop PDF, Word, Excel, or Markdown files here to extract requirements automatically."}
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.xlsx,.xls,.txt,.md"
                  disabled={uploading}
                />
                {!uploading && (
                  <label 
                    htmlFor="file-upload" 
                    onClick={(e) => e.stopPropagation()}
                    className="mt-6 inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"
                  >
                    Select Files
                  </label>
                )}
              </div>
            </div>
          )}

          {activeTab === "jira" && (
            <div className="flex-1 p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={fetchFromJira}
                  className="p-6 border rounded-2xl bg-white hover:border-indigo-500 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                    {jiraLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CloudDownload className="w-6 h-6" />}
                  </div>
                  <h3 className="font-bold text-gray-900">JIRA Integration</h3>
                  <p className="text-xs text-gray-500 mt-1">Import requirements directly from JIRA tickets & epics.</p>
                  <button className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50" disabled={jiraLoading}>
                    {jiraLoading ? "Syncing..." : "Sync Now →"}
                  </button>
                </div>
                <div
                  onClick={fetchFromConfluence}
                  className="p-6 border rounded-2xl bg-white hover:border-indigo-500 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4 text-cyan-600 group-hover:scale-110 transition-transform">
                    {confluenceLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CloudDownload className="w-6 h-6" />}
                  </div>
                  <h3 className="font-bold text-gray-900">Confluence</h3>
                  <p className="text-xs text-gray-500 mt-1">Extract requirements from Confluence documentation pages.</p>
                  <button className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50" disabled={confluenceLoading}>
                    {confluenceLoading ? "Syncing..." : "Sync Now →"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Requirements Feed */}
        <div className="w-1/2 flex flex-col bg-gray-50 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-white">
            <h2 className="font-bold text-gray-900 flex items-center">
              Extracted Requirements
              <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{requirements.length}</span>
            </h2>
            <button
              onClick={() => setShowManualModal(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Manual
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {requirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p>No requirements identified yet.</p>
              </div>
            ) : (
              requirements.map((req, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow group relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">
                        {req.category || "General"}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {req.complianceMappings?.map((m, i) => (
                        <span key={i} title={m.framework} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-200">
                          {m.framework}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{req.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-gray-400 italic">Extracted from {req.source || activeTab}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => removeRequirement(req.title)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => saveRequirement(req)}
                        className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
                      >
                        Add Requirement
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
            <div className="px-8 py-6 border-b bg-indigo-50">
              <h3 className="text-xl font-bold text-gray-900">Manual Requirement Entry</h3>
              <p className="text-xs text-gray-600 mt-1">Directly add a new security rule to your collection.</p>
            </div>

            <form onSubmit={handleManualSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Requirement Title</label>
                <input
                  type="text"
                  required
                  value={manualReq.title}
                  onChange={(e) => setManualReq({ ...manualReq, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. Multi-Factor Authentication"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={manualReq.category}
                  onChange={(e) => setManualReq({ ...manualReq, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  {["Authentication", "Access Control", "Encryption", "Data Protection", "Logging", "Network Security", "Physical Security", "Incident Response", "Compliance", "AI Security", "IoT Security", "Other"].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={manualReq.description}
                  onChange={(e) => setManualReq({ ...manualReq, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  placeholder="Describe the security rule in detail (at least 10 characters)..."
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collection;
