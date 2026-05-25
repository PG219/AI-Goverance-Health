import { useEffect, useState } from "react";

const API = "http://localhost:3001";

const ASSET_TYPES = ["model", "dataset", "api", "infrastructure", "tool", "other"];
const RISK_LEVELS = ["low", "medium", "high", "critical"];
const STATUSES = ["active", "inactive", "deprecated"];

const emptyForm = {
  name: "",
  type: "other",
  description: "",
  status: "active",
  owner: "",
  riskLevel: "low",
  project: "",
  linkedRequirements: [],
};

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");

  // Fetch all data on mount
  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [aRes, pRes, rRes] = await Promise.all([
        fetch(`${API}/assets`),
        fetch(`${API}/projects`),
        fetch(`${API}/requirements`),
      ]);
      setAssets(await aRes.json());
      setProjects(await pRes.json());
      setRequirements(await rRes.json());
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

  function openEditModal(asset) {
    setEditingAsset(asset);
    setForm({
      name: asset.name || "",
      type: asset.type || "other",
      description: asset.description || "",
      status: asset.status || "active",
      owner: asset.owner || "",
      riskLevel: asset.riskLevel || "low",
      project: asset.project?._id || asset.project || "",
      linkedRequirements: asset.linkedRequirements?.map(r => r._id || r) || [],
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      project: form.project || null,
      linkedRequirements: form.linkedRequirements,
    };

    try {
      if (editingAsset) {
        await fetch(`${API}/assets/${editingAsset._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchAll();
    } catch (e) {
      console.error("Save error:", e);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this asset?")) return;
    await fetch(`${API}/assets/${id}`, { method: "DELETE" });
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

  const riskColors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const statusColors = {
    active: "bg-blue-100 text-blue-700",
    inactive: "bg-gray-100 text-gray-600",
    deprecated: "bg-red-100 text-red-500",
  };

  const filteredAssets = assets.filter(a => {
    const matchSearch =
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase());
    const matchProject = filterProject
      ? (a.project?._id || a.project) === filterProject
      : true;
    return matchSearch && matchProject;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage AI assets mapped to projects and requirements
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Assets Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading assets...</div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No assets found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Requirements</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map(asset => (
                <tr key={asset._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{asset.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{asset.type}</td>
                  <td className="px-4 py-3">
                    {asset.project ? (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                        {asset.project.name || asset.project}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {asset.linkedRequirements?.length > 0 ? (
                      <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                        {asset.linkedRequirements.length} linked
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${riskColors[asset.riskLevel]}`}>
                      {asset.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{asset.owner || "—"}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(asset)}
                      className="text-blue-500 hover:text-blue-700 text-xs underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset._id)}
                      className="text-red-400 hover:text-red-600 text-xs underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingAsset ? "Edit Asset" : "Add New Asset"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Asset Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. GPT-4 Risk Classifier"
                  />
                </div>

                {/* Type + Risk */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Risk Level</label>
                    <select
                      value={form.riskLevel}
                      onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Status + Owner */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
                    <input
                      value={form.owner}
                      onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Data Team"
                    />
                  </div>
                </div>

                {/* Project Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Project
                  </label>
                  <select
                    value={form.project}
                    onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— No Project —</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Requirements Multi-select */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Link Requirements
                    <span className="ml-1 text-gray-400 font-normal">(select all that apply)</span>
                  </label>
                  {requirements.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No requirements available.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                      {requirements.map(req => (
                        <label
                          key={req._id}
                          className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.linkedRequirements.includes(req._id)}
                            onChange={() => toggleRequirement(req._id)}
                            className="mt-0.5 accent-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{req.title}</p>
                            {req.category && (
                              <p className="text-xs text-gray-400">{req.category}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the asset..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                  >
                    {editingAsset ? "Save Changes" : "Add Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}