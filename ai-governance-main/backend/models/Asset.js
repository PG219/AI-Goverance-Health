const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['model', 'dataset', 'api', 'infrastructure', 'tool', 'other'],
    default: 'other'
  },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated'],
    default: 'active'
  },
  owner: { type: String, default: '' },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  // Link to a Project
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },

  // Linked security requirements
  linkedRequirements: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SecurityRequirement'
    }
  ],

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);