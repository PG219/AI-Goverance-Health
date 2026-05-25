const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');

// GET all assets
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate('project', 'name description status')
      .populate('linkedRequirements', 'title description category status');
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single asset
router.get('/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('project', 'name description status')
      .populate('linkedRequirements', 'title description category status');
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create asset
router.post('/', async (req, res) => {
  try {
    const asset = new Asset({
      name: req.body.name,
      type: req.body.type,
      description: req.body.description,
      status: req.body.status,
      owner: req.body.owner,
      riskLevel: req.body.riskLevel,
      project: req.body.project || null,
      linkedRequirements: req.body.linkedRequirements || []
    });
    const newAsset = await asset.save();
    const populated = await Asset.findById(newAsset._id)
      .populate('project', 'name description status')
      .populate('linkedRequirements', 'title description category status');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update asset
router.put('/:id', async (req, res) => {
  try {
    const updated = await Asset.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        project: req.body.project || null,
        linkedRequirements: req.body.linkedRequirements || []
      },
      { new: true }
    )
      .populate('project', 'name description status')
      .populate('linkedRequirements', 'title description category status');
    if (!updated) return res.status(404).json({ message: 'Asset not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE asset
router.delete('/:id', async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST link requirement to asset
router.post('/:id/link-requirement', async (req, res) => {
  try {
    const { requirementId } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    if (!asset.linkedRequirements.includes(requirementId)) {
      asset.linkedRequirements.push(requirementId);
      await asset.save();
    }
    const populated = await Asset.findById(asset._id)
      .populate('project', 'name description status')
      .populate('linkedRequirements', 'title description category status');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;