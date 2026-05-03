import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  // Identifier
  id: {
    type: String,
    sparse: true,
    match: /^ASSET-[A-Z]+-[0-9]{3}$/
  },

  // Basic Information
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 200
  },
  description: {
    type: String,
    default: ''
  },

  // Classification
  type: {
    type: String,
    required: true,
    enum: ['Application', 'API', 'Database', 'Service', 'Infrastructure', 'Other'],
    default: 'Other'
  },
  criticality: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium'
  },
  data_classification: {
    type: String,
    enum: ['Public', 'Internal', 'Confidential', 'Restricted'],
    default: 'Internal'
  },

  // Ownership
  owner: {
    type: String,
    required: true
  },

  // Technical Details
  tech_stack: [{ type: String }],
  dependencies: [{ type: String }],

  // Linked Requirements (connects to your teammate's work)
  linked_requirements: [{ type: String }],

  // Project Reference
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Projects'
  },

  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Deprecated'],
    default: 'Active'
  },

  // User Reference
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export default mongoose.model('Asset', assetSchema);