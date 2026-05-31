import mongoose from 'mongoose';

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

assetSchema.pre("validate", function (next) {
  if (this.type) {
    let t = this.type.toLowerCase().trim();
    if (t.includes("model") || t.includes("vision") || t.includes("speech") || t.includes("nlp")) {
      this.type = "model";
    } else if (t.includes("dataset") || t.includes("data")) {
      this.type = "dataset";
    } else if (t.includes("api") || t.includes("service")) {
      this.type = "api";
    } else if (t.includes("infra") || t.includes("hardware") || t.includes("cloud")) {
      this.type = "infrastructure";
    } else if (t.includes("tool") || t.includes("software")) {
      this.type = "tool";
    } else {
      this.type = "other";
    }
  }

  if (this.status) {
    let s = this.status.toLowerCase().trim();
    if (s === "active" || s === "inactive" || s === "deprecated") {
      this.status = s;
    } else {
      this.status = "active";
    }
  }

  if (this.riskLevel) {
    let r = this.riskLevel.toLowerCase().trim();
    if (['low', 'medium', 'high', 'critical'].includes(r)) {
      this.riskLevel = r;
    } else {
      this.riskLevel = "low";
    }
  }

  next();
});

export default mongoose.model('Asset', assetSchema);