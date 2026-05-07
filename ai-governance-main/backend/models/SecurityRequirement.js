import mongoose from 'mongoose';

// Compliance mapping schema for detailed framework mappings
const complianceMappingSchema = new mongoose.Schema({
  framework: {
    type: String,
    enum: ['ISO 27001', 'IEC 62443', 'OWASP ASVS', 'NIST CSF',
           'PCI DSS', 'GDPR', 'NIS2', 'MDR', 'HIPAA'],
    required: true
  },
  version: { type: String },
  control: { type: String, required: true },
  controlId: { type: String } // For Jira/external tool references
}, { _id: false });

// Enhanced requirement schema merging both implementations
const securityRequirementSchema = new mongoose.Schema({
  // Identifier (can be auto-generated or custom)
  id: {
    type: String,
    sparse: true,
    match: /^REQ-[0-9]{4}-[0-9]{3}$/
  },
  
  // Basic Information
  projectId: {
    type: String,
    index: true
  },
  title: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    minlength: 10
  },
  
  // Classification
  category: {
    type: String,
    required: true,
    enum: [
      'Authentication', 'Access Control', 'Encryption',
      'Data Protection', 'Logging', 'Network Security',
      'Physical Security', 'Incident Response', 'Compliance',
      'AI Security', 'IoT Security', 'Other'
    ],
    default: 'Other'
  },
  priority: {
    type: String,
    required: true,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'High'
  },
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'In Progress', 'Implemented', 'Rejected', 'Mapped'],
    default: 'Draft'
  },
  
  // Compliance & Mapping
  compliance_mappings: [complianceMappingSchema],
  complianceMappings: [complianceMappingSchema], // Support both naming conventions
  linked_assets: [{ type: String }],
  
  // Source Tracking
  source: {
    type: { type: String, enum: ['chat', 'document', 'manual', 'jira', 'confluence'] },
    timestamp: { type: Date },
    reference: { type: String }
  },
  externalId: String, // Jira ticket ID or Confluence page ID
  
  // Implementation Details
  verification_method: { type: String },
  acceptance_criteria: [{ type: String }],
  owner: { type: String },
  review_date: { type: Date },
  
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

export default mongoose.model('SecurityRequirement', securityRequirementSchema);
