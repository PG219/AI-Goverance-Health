import express from 'express';
import Asset from '../models/Asset.js';

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
    if (!asset.linked_requirements.includes(requirementId)) {
      asset.linked_requirements.push(requirementId);
      await asset.save();
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;