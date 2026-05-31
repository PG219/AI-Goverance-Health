import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import Asset from '../models/Asset.js';
import SecurityRequirement from '../models/SecurityRequirement.js';
import Project from '../models/Projects.js';

const router = express.Router();

// GET all assets
router.get('/', async (req, res) => {
  try {
    const { type, criticality, status, projectId } = req.query;
    const filter = {};
    if (type)       filter.type       = type;
    if (criticality) filter.criticality = criticality;
    if (status)     filter.status     = status;
    if (projectId)  filter.projectId  = projectId;

    const assets = await Asset.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: assets, total: assets.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single asset by ID
router.get('/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset)
      return res.status(404).json({ success: false, error: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new asset
router.post('/', async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, error: 'Asset already exists' });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update asset
router.put('/:id', async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!asset)
      return res.status(404).json({ success: false, error: 'Asset not found' });
    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE asset
router.delete('/:id', async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset)
      return res.status(404).json({ success: false, error: 'Asset not found' });
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST link a requirement to an asset
router.post('/:id/link-requirement', async (req, res) => {
  try {
    const { requirementId } = req.body;
    if (!requirementId)
      return res.status(400).json({ success: false, error: 'requirementId is required' });

    const asset = await Asset.findById(req.params.id);
    if (!asset)
      return res.status(404).json({ success: false, error: 'Asset not found' });

    // Add requirement if not already linked
    if (!asset.linkedRequirements.includes(requirementId)) {
      asset.linkedRequirements.push(requirementId);
      await asset.save();
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST discover AI assets from requirements
router.post('/discover', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    // Resolve project to support both ObjectId and custom prefix string
    let projectDoc = null;
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      projectDoc = await Project.findById(projectId);
    }
    if (!projectDoc) {
      projectDoc = await Project.findOne({ projectId });
    }

    if (!projectDoc) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // 1. Find all security requirements matching either representation (using lean for clean JSON)
    const requirements = await SecurityRequirement.find({
      $or: [
        { projectId: projectDoc.projectId },
        { projectId: projectDoc._id.toString() }
      ]
    }).lean();

    if (requirements.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No requirements found for this project to discover assets from.'
      });
    }

    // 2. Query the Python FastAPI discovery agent
    const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000';
    const agentResponse = await axios.post(`${AGENT_URL}/agent/collection/discover-assets`, {
      requirements
    });

    const discoveredAssets = agentResponse.data.assets || [];
    res.json({ success: true, data: discoveredAssets });
  } catch (error) {
    const detail = error.response?.data?.detail || error.response?.data?.error || error.message;
    console.error('Error in asset discovery:', detail);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to discover assets from requirements',
      details: detail 
    });
  }
});

export default router;