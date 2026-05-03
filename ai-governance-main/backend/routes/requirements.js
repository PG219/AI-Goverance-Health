import express from 'express';
import axios from 'axios';
import SecurityRequirement from '../models/SecurityRequirement.js';
import { validateRequirement } from '../services/requirementValidator.js';

const router = express.Router();
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000';

import multer from 'multer';
import FormData from 'form-data';

const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// AI AGENT COLLECTION - Proxy to Python Agent
// ============================================
// POST /requirements/collect - Send chat messages to AI collection agent
router.post('/collect', async (req, res) => {
  try {
    const { session_id, messages } = req.body;
    if (!messages) {
      return res.status(400).json({ success: false, error: 'messages is required' });
    }
    const response = await axios.post(`${AGENT_URL}/agent/collection/collect`, { session_id, messages });
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error calling collection agent:', error.message);
    res.status(500).json({ success: false, error: 'Failed to communicate with AI agent' });
  }
});

// POST /requirements/upload - Upload and analyze security documents
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('session_id', req.body.session_id || 'upload-session');

    const response = await axios.post(`${AGENT_URL}/agent/collection/upload`, formData, {
      headers: { ...formData.getHeaders() },
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error forwarding file to AI agent:', error.message);
    const detail = error.response?.data?.detail || error.response?.data?.error || error.message;
    res.status(500).json({ success: false, error: 'Failed to analyze document', details: detail });
  }
});

// GET /requirements/jira - Fetch from Jira
router.get('/jira', async (req, res) => {
  try {
    const response = await axios.get(`${AGENT_URL}/agent/integrations/jira`);
    res.json({ success: true, ...response.data });
  } catch (error) {
    console.error('Error fetching from Jira agent:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch from Jira' });
  }
});

// GET /requirements/confluence - Fetch from Confluence via MCP
router.get('/confluence', async (req, res) => {
  try {
    const query = req.query.query || "security requirements";
    const pageId = req.query.page_id || "";
    let url = `${AGENT_URL}/agent/integrations/confluence/mcp?query=${encodeURIComponent(query)}`;
    if (pageId) url += `&page_id=${encodeURIComponent(pageId)}`;
    
    const response = await axios.get(url);
    res.json({ success: true, ...response.data });
  } catch (error) {
    console.error('Error fetching from Confluence agent (MCP):', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch from Confluence MCP' });
  }
});

// GET /requirements/confluence/assets - Fetch assets from Confluence via MCP
router.get('/confluence/assets', async (req, res) => {
  try {
    const query = req.query.query || "assets inventory";
    const url = `${AGENT_URL}/agent/integrations/confluence/assets?query=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url);
    res.json({ success: true, ...response.data });
  } catch (error) {
    console.error('Error fetching assets from Confluence agent (MCP):', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch assets from Confluence MCP' });
  }
});

// ============================================
// STANDARD CRUD OPERATIONS
// ============================================

// GET all requirements
router.get('/', async (req, res) => {
  try {
    const { projectId, category, priority, status } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (category)  filter.category  = category;
    if (priority)  filter.priority  = priority;
    if (status)    filter.status    = status;

    const requirements = await SecurityRequirement.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: requirements, total: requirements.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single requirement by ID
router.get('/:id', async (req, res) => {
  try {
    const requirement = await SecurityRequirement.findOne({ id: req.params.id });
    if (!requirement)
      return res.status(404).json({ success: false, error: 'Requirement not found' });
    res.json({ success: true, data: requirement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new requirement
router.post('/', async (req, res) => {
  try {
    const validation = validateRequirement(req.body);
    if (!validation.valid)
      return res.status(400).json({ success: false, errors: validation.errors });

    const requirement = new SecurityRequirement(req.body);
    await requirement.save();
    res.status(201).json({ success: true, data: requirement });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, error: 'Requirement ID already exists' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update requirement
router.put('/:id', async (req, res) => {
  try {
    const requirement = await SecurityRequirement.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!requirement)
      return res.status(404).json({ success: false, error: 'Requirement not found' });
    res.json({ success: true, data: requirement });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE requirement
router.delete('/:id', async (req, res) => {
  try {
    const requirement = await SecurityRequirement.findOneAndDelete({ id: req.params.id });
    if (!requirement)
      return res.status(404).json({ success: false, error: 'Requirement not found' });
    res.json({ success: true, message: 'Requirement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;