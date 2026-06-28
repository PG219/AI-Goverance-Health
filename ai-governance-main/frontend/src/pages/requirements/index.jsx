import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Search, Plus, MoreHorizontal, Download,
  ChevronLeft, ChevronRight, ShieldCheck,
  Zap, MessageCircle, Check, X, Trash2
} from "lucide-react";
import {
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  collectRequirements,
  getRequirementChatSession,
  saveRequirementChatSession,
} from "../../services/requirementsService.js";
import { getProjects } from "../../services/projectService.js";

// ── Colour helpers ──────────────────────────────────────────
const priorityColor = (p) => {
  switch (p) {
    case "Critical": return "bg-red-100 text-red-800";
    case "High":     return "bg-orange-100 text-orange-800";
    case "Medium":   return "bg-yellow-100 text-yellow-800";
    case "Low":      return "bg-green-100 text-green-800";
    default:         return "bg-gray-100 text-gray-800";
  }
};

const statusColor = (s) => {
  switch (s) {
    case "Approved":     return "bg-green-100 text-green-800";
    case "Implemented":  return "bg-blue-100 text-blue-800";
    case "In Progress":  return "bg-amber-100 text-amber-800";
    case "Draft":        return "bg-gray-100 text-gray-800";
    case "Rejected":     return "bg-red-100 text-red-800";
    default:             return "bg-gray-100 text-gray-800";
  }
};

const CATEGORIES = [
  "Authentication", "Access Control", "Encryption",
  "Data Protection", "Logging", "Network Security",
  "Physical Security", "Incident Response",
  "Compliance", "AI Security", "IoT Security", "Other",
];

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES   = ["Draft", "Approved", "In Progress", "Implemented", "Rejected"];
const FRAMEWORKS = ["ISO 27001", "IEC 62443", "OWASP ASVS", "NIST CSF", "PCI DSS", "GDPR", "NIS2", "MDR", "HIPAA"];

// ── Empty form state ────────────────────────────────────────
const emptyForm = {
  id: "", title: "", description: "", category: "",
  priority: "", status: "Draft", owner: "",
  verification_method: "", acceptance_criteria: "",
  framework: "", control: "", linked_assets: "",
};

// ══════════════════════════════════════════════════════════════
export default function RequirementsPage() {
  const [requirements, setRequirements] = useState([]);
  const notify = (type, title, message) => {
    if (window.showNotification) {
      window.showNotification(type, title, message);
    } else {
      alert(`${title ? title + ": " : ""}${message}`);
    }
  };
  const [projects, setProjects]         = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null); 
  const menuRef = useRef(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState(null);

  // tabs
  const [activeTab, setActiveTab]       = useState("all");

  // filters
  const [search, setSearch]             = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");

  // pagination
  const [currentPage, setCurrentPage]   = useState(1);
  const ITEMS_PER_PAGE = 10;

  // modal
  const [showModal, setShowModal]       = useState(false);
  const [selectedDetailReq, setSelectedDetailReq] = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [formError, setFormError]       = useState("");
  const [saving, setSaving]             = useState(false);

  // AI Collection
  const [aiMessages, setAiMessages]     = useState([]);
  const [aiInput, setAiInput]           = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiSessionId, setAiSessionId] = useState("session-" + Date.now());
  const [aiPendingRequirements, setAiPendingRequirements] = useState([]);
  const [aiSavingPending, setAiSavingPending] = useState(false);
  // Tracks which project's session has finished loading, so the debounced
  // save can't overwrite a freshly-selected project with stale state.
  const loadedProjectRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getRequirements({ projectId: selectedProjectId });
      setRequirements(res.data || []);
    } catch (err) {
      setError("Failed to load requirements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchData();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data || []);
        if (!selectedProjectId && data?.[0]?.projectId) {
          setSelectedProjectId(data[0].projectId);
        }
      } catch (err) {
        console.error("Failed to load projects for chat history:", err);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    // Block saves until this project's session is loaded.
    loadedProjectRef.current = null;

    const loadChatSession = async () => {
      try {
        const response = await getRequirementChatSession(selectedProjectId);
        const session = response.data || {};
        setAiSessionId(session.sessionId || `session-${selectedProjectId}-${Date.now()}`);
        setAiMessages(session.messages || []);
        setAiPendingRequirements(session.pendingRequirements || []);
      } catch (err) {
        console.error("Failed to load requirement chat session:", err);
      } finally {
        loadedProjectRef.current = selectedProjectId;
      }
    };

    loadChatSession();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    // Don't save until the current project's session has loaded.
    if (loadedProjectRef.current !== selectedProjectId) return;

    const timer = setTimeout(() => {
      saveRequirementChatSession(selectedProjectId, {
        sessionId: aiSessionId,
        messages: aiMessages,
        pendingRequirements: aiPendingRequirements,
      }).catch(err => console.error("Failed to save requirement chat session:", err));
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedProjectId, aiSessionId, aiMessages, aiPendingRequirements]);

  // ── Close menu on click outside ────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  // ── Filter + search ────────────────────────────────────────
  const filtered = requirements.filter((r) => {
    const matchSearch   = r.title?.toLowerCase().includes(search.toLowerCase()) ||
                          r.id?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || r.category === filterCategory;
    const matchPriority = filterPriority === "all" || r.priority === filterPriority;
    const matchStatus   = filterStatus   === "all" || r.status   === filterStatus;
    return matchSearch && matchCategory && matchPriority && matchStatus;
  });

  // ── Pagination ─────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ── Create ─────────────────────────────────────────────────
  const handleCreate = async () => {
    setFormError("");
    if (!form.id || !form.title || !form.description || !form.category || !form.priority) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (!/^REQ-[0-9]{4}-[0-9]{3}$/.test(form.id)) {
      setFormError("ID must follow format REQ-YYYY-NNN e.g. REQ-2026-006");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        projectId: selectedProjectId,
        acceptance_criteria: form.acceptance_criteria
          ? form.acceptance_criteria.split("\n").filter(Boolean)
          : [],
        linked_assets: form.linked_assets
          ? form.linked_assets.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        compliance_mappings: form.framework && form.control
          ? [{ framework: form.framework, control: form.control }]
          : [],
      };
      delete payload.framework;
      delete payload.control;

      await createRequirement(payload);
      setShowModal(false);
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.errors?.join(", ") || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Update Status ──────────────────────────────────────────
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateRequirement(id, { status: newStatus });
      fetchData(); // Refresh list
    } catch (err) {
      notify("error", "Update Failed", `Failed to update status to ${newStatus}`);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this requirement?")) return;
    try {
      await deleteRequirement(id);
      fetchData();
    } catch {
      notify("error", "Delete Failed", "Failed to delete requirement.");
    }
  };

  // ── AI Collection ──────────────────────────────────────────
  const handleAiCollect = async () => {
    if (!aiInput.trim()) return;

    const inputText = aiInput.trim();
    const userMsg = { role: "user", content: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);

    try {
      if (aiPendingRequirements.length > 0 && /^(yes|y|confirm|approve|save|add|ok|okay)$/i.test(inputText)) {
        await savePendingAiRequirements();
        return;
      }

      const response = await collectRequirements(aiSessionId, [...aiMessages, userMsg]);
      const agentData = response.data || {};
      const extracted = normalizeAiRequirements(agentData.requirements || []);

      if (extracted.length > 0) {
        setAiPendingRequirements(extracted);
      }

      const assistantMsg = { 
        role: "assistant", 
        content: buildAiAssistantMessage(agentData.answer, extracted)
      };
      setAiMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = { 
        role: "assistant", 
        content: `Error: ${err.response?.data?.error || err.message}` 
      };
      setAiMessages(prev => [...prev, errorMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  const normalizeAiRequirements = (items) => {
    const validCategories = new Set(CATEGORIES);
    const validPriorities = new Set(PRIORITIES);

    return items
      .filter(item => item && typeof item === "object")
      .map((item, index) => ({
        title: item.title || `AI Requirement ${index + 1}`,
        description: item.description || item.summary || "Review and complete this requirement.",
        category: validCategories.has(item.category) ? item.category : "Other",
        priority: validPriorities.has(item.priority) ? item.priority : "Medium",
        status: "Draft",
        owner: item.owner || "Security Team",
        verification_method: item.verification_method || "Manual review",
        acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria : [],
        linked_assets: Array.isArray(item.linked_assets) ? item.linked_assets : [],
        compliance_mappings: Array.isArray(item.compliance_mappings) ? item.compliance_mappings : [],
      }));
  };

  const buildAiAssistantMessage = (answer, extracted) => {
    if (!extracted.length) {
      return answer || "Tell me a little more about the system, data, users, and compliance needs.";
    }

    const list = extracted
      .map((req, index) => `${index + 1}. ${req.title} (${req.priority}, ${req.category})`)
      .join("\n");

    return `${answer || "I found these candidate requirements:"}\n\n${list}\n\nShould I add these to the requirements inventory?`;
  };

  const nextRequirementId = (offset = 0) => {
    const year = new Date().getFullYear();
    const existingNumbers = requirements
      .map(req => {
        const match = String(req.id || "").match(/^REQ-\d{4}-(\d{3})$/);
        return match ? Number(match[1]) : 0;
      })
      .filter(Boolean);
    const next = Math.max(0, ...existingNumbers) + offset + 1;
    return `REQ-${year}-${String(next).padStart(3, "0")}`;
  };

  const savePendingAiRequirements = async () => {
    if (aiPendingRequirements.length === 0) return;

    setAiSavingPending(true);
    setAiLoading(true);
    try {
      for (let index = 0; index < aiPendingRequirements.length; index += 1) {
        const req = aiPendingRequirements[index];
        await createRequirement({
          id: nextRequirementId(index),
          projectId: selectedProjectId || undefined,
          ...req,
        });
      }

      const savedCount = aiPendingRequirements.length;
      setAiPendingRequirements([]);
      await fetchData();
      setAiMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Added ${savedCount} requirement${savedCount === 1 ? "" : "s"} to the inventory. What should we collect next: data protection, access control, logging, model governance, or compliance mapping?`,
        },
      ]);
    } catch (err) {
      setAiMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `I could not save the pending requirements: ${err.response?.data?.error || err.response?.data?.errors?.join(", ") || err.message}`,
        },
      ]);
    } finally {
      setAiSavingPending(false);
      setAiLoading(false);
    }
  };

  const rejectPendingAiRequirements = () => {
    setAiPendingRequirements([]);
    setAiMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: "No problem. I have not added them. Tell me what to change, or describe the next area you want to collect.",
      },
    ]);
  };

  const firstMapping = (req, framework) => {
    const mappings = req.compliance_mappings?.length ? req.compliance_mappings : req.complianceMappings || [];
    return mappings.find(m => m.framework === framework)?.control || "";
  };

  const assetRowsFromRequirements = () => {
    const assets = new Map();
    requirements.forEach(req => {
      (req.linked_assets || []).forEach(asset => {
        const key = String(asset || "").trim();
        if (!key) return;
        if (!assets.has(key)) {
          assets.set(key, {
            id: key.match(/^CA-/i) ? key : `CA-${String(assets.size + 1).padStart(3, "0")}`,
            name: key,
            type: "Information System",
            description: `Asset referenced by ${req.id || req.title}`,
            criticality: req.priority === "Critical" ? "Critical" : req.priority || "Medium",
            owner: req.owner || "Security Team",
            location: "TBD",
            confidentiality: req.category === "Data Protection" ? "Critical" : "High",
            integrity: "High",
            availability: req.priority === "Critical" ? "Critical" : "High",
            iso: firstMapping(req, "ISO 27001"),
            zone: "Zone 1",
          });
        }
      });
    });

    if (assets.size === 0) {
      assets.set("AI Platform", {
        id: "CA-001",
        name: "AI Platform",
        type: "Information System",
        description: "Primary AI governance platform inventory item",
        criticality: "High",
        owner: "Security Team",
        location: "Cloud",
        confidentiality: "High",
        integrity: "High",
        availability: "High",
        iso: "A.8.1",
        zone: "Zone 1",
      });
    }

    return Array.from(assets.values());
  };

  const riskLevel = (score) => {
    if (score >= 16) return "High";
    if (score >= 9) return "Medium";
    return "Low";
  };

  const threatForRequirement = (req, index) => {
    const threatMap = {
      Authentication: ["Phishing", "Credential theft or MFA bypass"],
      "Access Control": ["Insider Threat", "Unauthorized privilege escalation"],
      Encryption: ["Man-in-the-Middle", "Interception or exposure of unencrypted data"],
      "Data Protection": ["Data Breach", "Unauthorized access to sensitive data"],
      Logging: ["Audit Evasion", "Security events are not detected or retained"],
      "Network Security": ["Network Intrusion", "Unauthorized lateral movement"],
      "Incident Response": ["Delayed Response", "Incident is not contained in time"],
      Compliance: ["Compliance Gap", "Missing evidence for audit obligations"],
      "AI Security": ["Model Abuse", "Prompt injection or unsafe model behavior"],
    };
    const [attackType, vector] = threatMap[req.category] || ["Security Control Failure", "Requirement is not implemented effectively"];
    return {
      id: `T-${String(index + 1).padStart(3, "0")}`,
      attackType,
      targetAsset: req.linked_assets?.[0] || "AI Platform",
      targetRequirement: req.id,
      vector,
      likelihood: req.priority === "Critical" ? "High" : "Medium",
      impact: req.priority === "Low" ? "Medium" : req.priority || "High",
      riskLevel: req.priority === "Critical" || req.priority === "High" ? "High" : "Medium",
      iso: firstMapping(req, "ISO 27001"),
      iec: firstMapping(req, "IEC 62443"),
    };
  };

  const exportHealthcareAssessment = () => {
    const today = new Date().toISOString().slice(0, 10);
    const reqs = requirements.length ? requirements : [];
    const assets = assetRowsFromRequirements();
    const threats = reqs.map(threatForRequirement);
    const riskRows = reqs.map((req, index) => {
      const likelihood = req.priority === "Critical" ? 4 : req.priority === "High" ? 3 : 2;
      const impact = req.priority === "Critical" ? 5 : req.priority === "High" ? 4 : 3;
      const score = likelihood * impact;
      return {
        id: `R-${String(index + 1).padStart(3, "0")}`,
        name: `${req.title} Risk`,
        asset: req.linked_assets?.[0] || assets[0]?.id || "CA-001",
        threat: threats[index]?.id || "",
        vulnerability: req.description,
        likelihood,
        impact,
        score,
        level: riskLevel(score),
        treatment: score >= 9 ? "Mitigate" : "Accept",
        controls: req.verification_method || "Control implementation and evidence review",
        residual: score >= 16 ? "Medium" : "Low",
        owner: req.owner || "Security Team",
        review: req.review_date ? String(req.review_date).slice(0, 10) : today,
      };
    });

    const isoRows = reqs.flatMap(req => {
      const mappings = req.compliance_mappings?.length ? req.compliance_mappings : req.complianceMappings || [];
      return mappings
        .filter(m => m.framework === "ISO 27001")
        .map(m => [
          m.control,
          req.title,
          req.description,
          "Yes",
          req.status,
          req.linked_assets?.join(", ") || "All Systems",
          req.id,
          "",
          req.verification_method || "Evidence review",
          req.owner || "Security Team",
        ]);
    });

    const iecRows = reqs.flatMap(req => {
      const mappings = req.compliance_mappings?.length ? req.compliance_mappings : req.complianceMappings || [];
      return mappings
        .filter(m => m.framework === "IEC 62443")
        .map(m => [
          m.control,
          "FR 1 - IAC",
          req.title,
          req.description,
          req.priority === "Critical" ? "SL 3" : "SL 2",
          req.linked_assets?.join(", ") || "All Systems",
          req.status,
          req.verification_method || "Planned control",
          req.owner || "Security Team",
          `Aligned with ${req.id}`,
        ]);
    });

    const workbook = XLSX.utils.book_new();
    const sheets = {
      "Project Overview": [
        ["RAKFORT-HEALTHCARE PROJECT - Cyber Risk Assessment"],
        [],
        ["Project Name:", "RAKFORT-HEALTHCARE"],
        ["Assessment Date:", today],
        ["Version:", "1.0"],
        ["Industry:", "Healthcare"],
        [],
        ["Objective"],
        ["AI-assisted security requirement collection and healthcare cyber risk assessment"],
      ],
      "Cyber Assets Inventory": [
        ["Asset ID", "Asset Name", "Asset Type", "Description", "Criticality", "Owner", "Location", "Confidentiality", "Integrity", "Availability", "ISO 27001 Control", "IEC 62443 Zone"],
        ...assets.map(a => [a.id, a.name, a.type, a.description, a.criticality, a.owner, a.location, a.confidentiality, a.integrity, a.availability, a.iso, a.zone]),
      ],
      "Requirements Matrix": [
        ["Req ID", "Category", "Requirement Name", "Description", "Priority", "Target Value", "ISO 27001 Control", "IEC 62443 Requirement", "Status", "Owner", "Verification Method"],
        ...reqs.map(req => [req.id, req.category, req.title, req.description, req.priority, req.acceptance_criteria?.[0] || "Defined", firstMapping(req, "ISO 27001"), firstMapping(req, "IEC 62443"), req.status, req.owner || "Security Team", req.verification_method || "Manual review"]),
      ],
      "Threat & Attack Vectors": [
        ["Threat ID", "Attack Type", "Target Asset", "Target Requirement", "Attack Vector", "Likelihood", "Impact", "Risk Level", "ISO 27001 Reference", "IEC 62443 FR"],
        ...threats.map(t => [t.id, t.attackType, t.targetAsset, t.targetRequirement, t.vector, t.likelihood, t.impact, t.riskLevel, t.iso, t.iec]),
      ],
      "Risk Register": [
        ["Risk ID", "Risk Name", "Asset", "Threat", "Vulnerability", "Likelihood (1-5)", "Impact (1-5)", "Risk Score", "Risk Level", "Treatment Strategy", "Control Measures", "Residual Risk", "Owner", "Review Date"],
        ...riskRows.map(r => [r.id, r.name, r.asset, r.threat, r.vulnerability, r.likelihood, r.impact, r.score, r.level, r.treatment, r.controls, r.residual, r.owner, r.review]),
      ],
      "ISO 27001 Controls": [
        ["Control ID", "Control Name", "Control Description", "Applicable", "Implementation Status", "Related Assets", "Related Requirements", "Related Risks", "Evidence", "Owner"],
        ...(isoRows.length ? isoRows : [["A.8.1", "Inventory of assets", "Assets are identified and documented", "Yes", "In Progress", "All Assets", "All", "All", "Asset register", "Security Team"]]),
      ],
      "IEC 62443 Mapping": [
        ["Requirement", "Foundational Req", "Requirement Name", "Description", "Security Level", "Related Assets", "Implementation Status", "Controls Implemented", "Owner", "Notes"],
        ...(iecRows.length ? iecRows : [["CR 1.1", "FR 1 - IAC", "Human user identification and authentication", "Unique identification and authentication of all human users", "SL 2", "All Systems", "In Progress", "Authentication controls", "Security Team", "Generated baseline"]]),
      ],
      "Control Effectiveness": [
        ["Control ID", "Control Name", "Type", "Implementation Date", "Last Test Date", "Test Result", "Effectiveness", "Issues Found", "Next Review", "Status"],
        ...reqs.map(req => [req.id, req.title, req.category === "Logging" ? "Detective" : "Preventive", today, "", "Not Tested", req.status === "Implemented" ? "90%" : "TBD", "Pending validation", req.review_date ? String(req.review_date).slice(0, 10) : today, req.status]),
      ],
      "Risk Treatment Plan": [
        ["Risk ID", "Risk Name", "Current Risk", "Treatment", "Action Plan", "Budget", "Responsible", "Start Date", "Target Date", "Status", "Completion %"],
        ...riskRows.map(r => [r.id, r.name, r.level, r.treatment, r.controls, "TBD", r.owner, today, r.review, r.treatment === "Mitigate" ? "Planned" : "Accepted", "0%"]),
      ],
      "Compliance Dashboard": [
        ["RAKFORT-HEALTHCARE - Compliance & Risk Dashboard"],
        [],
        ["Assessment Summary"],
        ["Total Assets:", assets.length, "", "High Risks:", riskRows.filter(r => r.level === "High").length],
        ["Critical Assets:", assets.filter(a => a.criticality === "Critical").length, "", "Medium Risks:", riskRows.filter(r => r.level === "Medium").length],
        ["Total Requirements:", reqs.length, "", "Low Risks:", riskRows.filter(r => r.level === "Low").length],
        ["Total Risks Identified:", riskRows.length],
      ],
    };

    Object.entries(sheets).forEach(([name, rows]) => {
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    });

    XLSX.writeFile(workbook, `RAKFORT_Healthcare_Risk_Assessment_${today}.xlsx`);
  };

  // ── Summary counts ─────────────────────────────────────────
  const counts = {
    total:       requirements.length,
    critical:    requirements.filter(r => r.priority === "Critical").length,
    implemented: requirements.filter(r => r.status  === "Implemented").length,
    inProgress:  requirements.filter(r => r.status  === "In Progress").length,
  };

  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <main className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Security Requirements
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all healthcare security requirements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportHealthcareAssessment}>
              <Download className="w-4 h-4 mr-2" /> Export Assessment
            </Button>
            <Button onClick={() => { setForm(emptyForm); setFormError(""); setShowModal(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Requirement
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              All Requirements
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Collection
            </TabsTrigger>
          </TabsList>

          {/* ═════════════════════════════════════════════ */}
          {/* TAB 1: All Requirements */}
          {/* ═════════════════════════════════════════════ */}
          <TabsContent value="all">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total",       value: counts.total,       color: "text-foreground" },
                { label: "Critical",    value: counts.critical,    color: "text-red-600"    },
                { label: "Implemented", value: counts.implemented, color: "text-blue-600"   },
                { label: "In Progress", value: counts.inProgress,  color: "text-amber-600"  },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 text-center">
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{label}</p>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-56 font-semibold">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.projectId || p._id} value={p.projectId || p._id}>
                      {p.projectName || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by ID or title..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>

              {[
                { value: filterCategory, setter: setFilterCategory, placeholder: "All Categories", options: CATEGORIES },
                { value: filterPriority, setter: setFilterPriority, placeholder: "All Priorities", options: PRIORITIES },
                { value: filterStatus,   setter: setFilterStatus,   placeholder: "All Statuses",   options: STATUSES   },
              ].map(({ value, setter, placeholder, options }) => (
                <Select key={placeholder} value={value}
                  onValueChange={(v) => { setter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{placeholder}</SelectItem>
                    {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
            </div>

            {/* Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">Loading requirements...</TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-destructive py-10">{error}</TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">No requirements found.</TableCell>
                    </TableRow>
                  ) : paginated.map((req) => (
                    <TableRow 
                      key={req._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedDetailReq(req)}
                    >
                      <TableCell className="font-mono text-sm font-medium">{req.id}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="font-medium truncate">{req.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{req.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColor(req.priority)}>{req.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(req.status)}>{req.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{req.owner || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.compliance_mappings?.slice(0, 2).map((m, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {m.framework}
                            </Badge>
                          ))}
                          {req.compliance_mappings?.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{req.compliance_mappings.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="relative" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 bg-gray-50 border-gray-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Three dots clicked for req:", req._id);
                            setActiveMenuId(activeMenuId === req._id ? null : req._id);
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-700" />
                        </Button>

                        {activeMenuId === req._id && (
                          <div 
                            ref={menuRef}
                            className="absolute right-12 top-0 w-36 bg-white border-2 border-gray-200 shadow-2xl rounded-lg z-[9999] py-2"
                            style={{ minWidth: '150px' }}
                          >
                            <button
                              onClick={() => { setSelectedDetailReq(req); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              View Details
                            </button>
                            <div className="border-t my-1"></div>
                            <button
                              onClick={() => { handleStatusUpdate(req.id, "Approved"); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { handleStatusUpdate(req.id, "Rejected"); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 font-medium"
                            >
                              Reject
                            </button>
                            <div className="border-t my-1"></div>
                            <button
                              onClick={() => { handleDelete(req.id); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {!isLoading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filtered.length} total)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ═════════════════════════════════════════════ */}
          {/* TAB 2: AI Collection */}
          {/* ═════════════════════════════════════════════ */}
          <TabsContent value="ai">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                AI Requirement Collection
              </h2>
              <p className="text-muted-foreground mb-6">
                Chat with the AI agent to automatically extract and create security requirements.
              </p>

              {/* Chat Messages */}
              <div className="border rounded-lg p-4 bg-muted/30 min-h-[400px] max-h-[500px] overflow-y-auto mb-4">
                {aiMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-center">
                    <div>
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-muted-foreground">Start a conversation to collect requirements...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                          <p className="text-sm">Thinking...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              {aiPendingRequirements.length > 0 && (
                <div className="mb-4 rounded-lg border bg-background p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-medium">Pending inventory additions</p>
                      <p className="text-sm text-muted-foreground">
                        Review these before adding them to the requirements inventory.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={savePendingAiRequirements} disabled={aiSavingPending}>
                        <Check className="w-4 h-4 mr-1" />
                        {aiSavingPending ? "Adding..." : "Add"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={rejectPendingAiRequirements} disabled={aiSavingPending}>
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {aiPendingRequirements.map((req, index) => (
                      <div key={`${req.title}-${index}`} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{req.title}</span>
                          <Badge className={priorityColor(req.priority)}>{req.priority}</Badge>
                          <Badge variant="outline">{req.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{req.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder={aiPendingRequirements.length ? "Type yes to add these, or describe changes..." : "Describe the system, data, users, or compliance needs..."}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAiCollect()}
                  disabled={aiLoading}
                />
                <Button 
                  onClick={handleAiCollect} 
                  disabled={aiLoading || !aiInput.trim()}
                  className="gap-2">
                  <Zap className="w-4 h-4" />
                  {aiLoading ? "Processing..." : "Send"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                💡 Tip: Ask the AI to extract requirements from compliance frameworks, specifications, or documents.
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Requirement Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Security Requirement</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              {/* ID */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium">Requirement ID <span className="text-red-500">*</span></label>
                <Input placeholder="REQ-2026-006" value={form.id}
                  onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Format: REQ-YYYY-NNN</p>
              </div>

              {/* Title */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Implement Multi-Factor Authentication" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Description */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                <textarea rows={3} placeholder="Describe the requirement in detail..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Category <span className="text-red-500">*</span></label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Priority <span className="text-red-500">*</span></label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Owner</label>
                <Input placeholder="e.g. Security Officer" value={form.owner}
                  onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
              </div>

              {/* Framework */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Compliance Framework</label>
                <Select value={form.framework} onValueChange={v => setForm(f => ({ ...f, framework: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select framework" /></SelectTrigger>
                  <SelectContent>
                    {FRAMEWORKS.map(fw => <SelectItem key={fw} value={fw}>{fw}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Control */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Control Reference</label>
                <Input placeholder="e.g. A.9.2.4" value={form.control}
                  onChange={e => setForm(f => ({ ...f, control: e.target.value }))} />
              </div>

              {/* Linked Assets */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium">Linked Assets</label>
                <Input placeholder="e.g. CA-004, CA-010, CA-013 (comma separated)" value={form.linked_assets}
                  onChange={e => setForm(f => ({ ...f, linked_assets: e.target.value }))} />
              </div>

              {/* Verification Method */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium">Verification Method</label>
                <Input placeholder="e.g. Manual testing and penetration test" value={form.verification_method}
                  onChange={e => setForm(f => ({ ...f, verification_method: e.target.value }))} />
              </div>

              {/* Acceptance Criteria */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium">Acceptance Criteria</label>
                <textarea rows={3} placeholder="Enter each criterion on a new line..."
                  value={form.acceptance_criteria}
                  onChange={e => setForm(f => ({ ...f, acceptance_criteria: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{formError}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Saving..." : "Save Requirement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Requirement Details Modal */}
        <Dialog open={!!selectedDetailReq} onOpenChange={(open) => !open && setSelectedDetailReq(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">{selectedDetailReq?.id}</Badge>
                <Badge className={priorityColor(selectedDetailReq?.priority)}>{selectedDetailReq?.priority} Priority</Badge>
                <Badge className={statusColor(selectedDetailReq?.status)}>{selectedDetailReq?.status}</Badge>
              </div>
              <DialogTitle className="text-xl font-bold">
                {selectedDetailReq?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                  {selectedDetailReq?.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</h4>
                  <Badge variant="outline" className="text-sm font-medium">{selectedDetailReq?.category}</Badge>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Owner</h4>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedDetailReq?.owner || "—"}</p>
                </div>
              </div>

              {selectedDetailReq?.compliance_mappings?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Compliance Mappings</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDetailReq.compliance_mappings.map((m, i) => (
                      <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs">
                        {m.framework} : {m.control}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedDetailReq?.linked_assets?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Linked Assets</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDetailReq.linked_assets.map((asset, i) => (
                      <Badge key={i} className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900">
                        {asset}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedDetailReq?.verification_method && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Verification Method</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                    {selectedDetailReq.verification_method}
                  </p>
                </div>
              )}

              {selectedDetailReq?.acceptance_criteria?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Acceptance Criteria</h4>
                  <ul className="space-y-2">
                    {selectedDetailReq.acceptance_criteria.map((criterion, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDetailReq(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
