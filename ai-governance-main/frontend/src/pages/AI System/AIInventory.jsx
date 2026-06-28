import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "@/config/env";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Database, Eye, Plus, Search, Filter, Download,
  AlertTriangle, CheckCircle, Clock, Settings, X, Zap, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const API = BACKEND_URL;
const getToken = () => {
  return localStorage.getItem("token") || "";
};
const authHeaders = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });
const ASSET_TYPES = ["NLP Model", "ML Model", "Computer Vision", "Speech AI", "Other"];
const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["Active", "Under Review", "Inactive"];

const emptyForm = {
  name: "", type: "ML Model", description: "", status: "Active",
  owner: "", riskLevel: "Low", project: "", linkedRequirements: [],
};

const AIInventory = () => {
  const navigate = useNavigate();
  const notify = (type, title, message) => {
    if (window.showNotification) {
      window.showNotification(type, title, message);
    } else {
      alert(`${title ? title + ": " : ""}${message}`);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterProject, setFilterProject] = useState("");

  const [discovering, setDiscovering] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredAssets, setDiscoveredAssets] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  async function handleAiDiscovery() {
    if (!filterProject) {
      notify("warning", "Project Required", "Please select a project from the project filter dropdown to run AI Asset Discovery.");
      return;
    }
    setDiscovering(true);
    try {
      const response = await fetch(`${API}/assets/discover`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ projectId: filterProject }),
      });
      const data = await response.json();
      if (data.success) {
        if (data.data.length === 0) {
          notify("info", "Discovery Complete", data.message || "No new assets discovered from the project requirements.");
        } else {
          setDiscoveredAssets(data.data.map(asset => ({ ...asset, selected: true })));
          setShowDiscoveryModal(true);
        }
      } else {
        notify("error", "Discovery Failed", (data.error || "Failed to discover assets.") + (data.details ? ` Details: ${data.details}` : ""));
      }
    } catch (e) {
      console.error("Discovery error:", e);
      notify("error", "AI Agent Error", "Error executing AI discovery agent: " + e.message);
    }
    setDiscovering(false);
  }

  async function handleSaveDiscoveredAssets() {
    const assetsToSave = discoveredAssets.filter(a => a.selected);
    if (assetsToSave.length === 0) {
      setShowDiscoveryModal(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all(assetsToSave.map(async (asset) => {
        const payload = {
          name: asset.name,
          type: asset.type || "ML Model",
          description: asset.description || "",
          status: "Active",
          owner: asset.owner || "Data Team",
          riskLevel: asset.riskLevel || "Low",
          project: filterProject || null,
          linkedRequirements: []
        };
        return fetch(`${API}/assets`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      }));
      notify("success", "Registration Success", `Successfully registered ${assetsToSave.length} discovered assets!`);
      setShowDiscoveryModal(false);
      fetchAll();
    } catch (e) {
      console.error("Save discovered assets error:", e);
      notify("error", "Save Failed", "Error saving discovered assets.");
      setLoading(false);
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const headers = authHeaders();
      const [aRes, pRes, rRes] = await Promise.all([
        fetch(`${API}/assets`, { headers }),
        fetch(`${API}/projects`, { headers }),
        fetch(`${API}/requirements`, { headers }),
      ]);
      
      const aData = aRes.ok ? await aRes.json() : [];
      const pData = pRes.ok ? await pRes.json() : [];
      const rData = rRes.ok ? await rRes.json() : [];

      setAssets(Array.isArray(aData) ? aData : Array.isArray(aData?.data) ? aData.data : []);
      setProjects(Array.isArray(pData) ? pData : Array.isArray(pData?.data) ? pData.data : []);
      setRequirements(Array.isArray(rData) ? rData : Array.isArray(rData?.data) ? rData.data : []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
    setLoading(false);
  }

  function openAddModal() {
    setEditingAsset(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(e, asset) {
    e.stopPropagation();
    setEditingAsset(asset);
    setForm({
      name: asset.name || "",
      type: asset.type || "ML Model",
      description: asset.description || "",
      status: asset.status || "Active",
      owner: asset.owner || "",
      riskLevel: asset.riskLevel || "Low",
      project: asset.project?._id || asset.project || "",
      linkedRequirements: asset.linkedRequirements?.map(r => r._id || r) || [],
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, project: form.project || null };
    try {
      if (editingAsset) {
        await fetch(`${API}/assets/${editingAsset._id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API}/assets`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchAll();
    } catch (e) {
      console.error("Save error:", e);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this asset?")) return;
    await fetch(`${API}/assets/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    fetchAll();
  }

  function toggleRequirement(reqId) {
    setForm(f => ({
      ...f,
      linkedRequirements: f.linkedRequirements.includes(reqId)
        ? f.linkedRequirements.filter(r => r !== reqId)
        : [...f.linkedRequirements, reqId],
    }));
  }

  const getRiskBadge = (risk) => {
    const norm = (risk || "Low").toLowerCase().trim();
    const map = {
      high: "bg-red-100 text-red-800",
      critical: "bg-red-200 text-red-900",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    const labels = {
      high: "High Risk",
      critical: "Critical Risk",
      medium: "Medium Risk",
      low: "Low Risk",
    };
    return <Badge className={`${map[norm] || "bg-gray-100 text-gray-800"} hover:opacity-80`}>{labels[norm] || risk}</Badge>;
  };

  const getStatusBadge = (status) => {
    const norm = (status || "Active").toLowerCase().trim();
    const map = {
      active: "bg-green-100 text-green-800",
      "under review": "bg-yellow-100 text-yellow-800",
      inactive: "bg-gray-100 text-gray-800",
      deprecated: "bg-gray-200 text-gray-800",
    };
    const labels = {
      active: "Active",
      "under review": "Under Review",
      inactive: "Inactive",
      deprecated: "Deprecated",
    };
    return <Badge className={`${map[norm] || "bg-gray-100 text-gray-800"} hover:opacity-80`}>{labels[norm] || status}</Badge>;
  };

  const filteredAssets = assets.filter(a => {
    const matchSearch = a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProject = filterProject
      ? (a.project?._id || a.project) === filterProject : true;
    return matchSearch && matchProject;
  });

  const highRiskCount = assets.filter(a => {
    const r = (a.riskLevel || "").toLowerCase().trim();
    return r === "high" || r === "critical";
  }).length;
  const activeCount = assets.filter(a => (a.status || "").toLowerCase().trim() === "active").length;
  const uniqueProjectsLinked = new Set(assets.map(a => a.project?._id || a.project).filter(Boolean)).size;

  return (
    <div className="flex-1 min-h-screen bg-background">
      <main className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Database className="w-8 h-8" />
                AI Inventory
              </h1>
              <p className="text-muted-foreground">
                Comprehensive catalog of all AI systems mapped to projects and requirements
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800" 
                onClick={handleAiDiscovery} 
                disabled={discovering}
              >
                <RefreshCw className={`w-4 h-4 ${discovering ? "animate-spin" : ""}`} />
                {discovering ? "Discovering..." : "AI Discover Assets"}
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button className="gap-2" onClick={openAddModal}>
                <Plus className="w-4 h-4" />
                Add Asset
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search assets by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-background"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.projectName || p.name}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{assets.length}</div>
              <p className="text-xs text-muted-foreground">Registered AI assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Assets</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
              <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects Linked</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {uniqueProjectsLinked}
              </div>
              <p className="text-xs text-muted-foreground">Unique projects mapped to assets</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              AI Assets Inventory
            </CardTitle>
            <CardDescription>
              AI systems mapped to projects and security requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading assets...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No assets found. Click "Add Asset" to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow
                      key={asset._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/ai-inventory/${asset._id}`)}
                    >
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>
                        {asset.project ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                            {asset.project.projectName || asset.project.name || "Linked"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {asset.linkedRequirements?.length > 0 ? (
                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                            {asset.linkedRequirements.length} linked
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>{getRiskBadge(asset.riskLevel || asset.risk)}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{asset.owner || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm"
                            onClick={(e) => openEditModal(e, asset)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={(e) => handleDelete(e, asset._id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">
                  {editingAsset ? "Edit Asset" : "Add New Asset"}
                </h2>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Asset Name *</label>
                  <Input required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Fraud Detection Model" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Type</label>
                    <select value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                      {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Risk Level</label>
                    <select value={form.riskLevel}
                      onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                      {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Status</label>
                    <select value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Owner</label>
                    <Input value={form.owner}
                      onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                      placeholder="e.g. Data Team" />
                  </div>
                </div>

                {/* Project Dropdown */}
                <div>
                  <label className="block text-xs font-medium mb-1">Project</label>
                  <select value={form.project}
                    onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="">— No Project —</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.projectName || p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Requirements Checklist */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Link Requirements
                    <span className="ml-1 text-muted-foreground font-normal">(select all that apply)</span>
                  </label>
                  {requirements.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No requirements available.</p>
                  ) : (
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                      {requirements.map(req => (
                        <label key={req._id}
                          className="flex items-start gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                          <input type="checkbox"
                            checked={form.linkedRequirements.includes(req._id)}
                            onChange={() => toggleRequirement(req._id)}
                            className="mt-0.5 accent-blue-600" />
                          <div>
                            <p className="text-sm font-medium">{req.title || req.name}</p>
                            {req.category && (
                              <p className="text-xs text-muted-foreground">{req.category}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Description</label>
                  <textarea value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                    placeholder="Brief description..." />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAsset ? "Save Changes" : "Add Asset"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* AI Discovery Preview Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600 animate-pulse" />
                    AI Discovered Assets Preview
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review and confirm the technical assets identified by AI from your project requirements
                  </p>
                </div>
                <button onClick={() => setShowDiscoveryModal(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4 my-6">
                {discoveredAssets.map((asset, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border transition-all ${
                      asset.selected 
                        ? "border-indigo-500 bg-indigo-50/30" 
                        : "border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 w-full">
                        <input 
                          type="checkbox"
                          checked={!!asset.selected}
                          onChange={() => {
                            setDiscoveredAssets(prev => prev.map((a, idx) => 
                              idx === index ? { ...a, selected: !a.selected } : a
                            ));
                          }}
                          className="mt-1.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input 
                              type="text"
                              value={asset.name}
                              onChange={(e) => {
                                setDiscoveredAssets(prev => prev.map((a, idx) => 
                                  idx === index ? { ...a, name: e.target.value } : a
                                ));
                              }}
                              className="font-bold text-sm bg-transparent border-b border-dashed border-gray-400 focus:border-indigo-600 outline-none w-64"
                            />
                            <Badge className="bg-purple-100 text-purple-800 border-none hover:bg-purple-100">
                              {asset.type}
                            </Badge>
                            <Badge className={`${
                              asset.riskLevel === "High" || asset.riskLevel === "Critical"
                                ? "bg-red-100 text-red-800"
                                : asset.riskLevel === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            } border-none hover:opacity-80`}>
                              {asset.riskLevel} Risk
                            </Badge>
                          </div>
                          <textarea
                            value={asset.description}
                            rows={2}
                            onChange={(e) => {
                              setDiscoveredAssets(prev => prev.map((a, idx) => 
                                idx === index ? { ...a, description: e.target.value } : a
                              ));
                            }}
                            className="text-xs text-muted-foreground mt-2 w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:bg-white rounded p-1 outline-none resize-none"
                          />
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-[10px] text-gray-400 font-semibold">Suggested Owner:</span>
                            <input 
                              type="text"
                              value={asset.owner}
                              onChange={(e) => {
                                setDiscoveredAssets(prev => prev.map((a, idx) => 
                                  idx === index ? { ...a, owner: e.target.value } : a
                                ));
                              }}
                              className="text-[10px] text-gray-600 bg-transparent border-b border-dashed border-gray-400 focus:border-indigo-600 outline-none w-32"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowDiscoveryModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveDiscoveredAssets}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Confirm and Register Assets ({discoveredAssets.filter(a => a.selected).length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInventory;