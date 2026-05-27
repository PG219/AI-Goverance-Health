import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const pendingRequirementSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  priority: String,
  status: String,
  owner: String,
  verification_method: String,
  acceptance_criteria: [String],
  linked_assets: [String],
  compliance_mappings: [{
    framework: String,
    version: String,
    control: String,
    controlId: String,
  }],
  // Collection page sends extra display fields (source, id, complianceMappings).
  // strict:false keeps them so a pending requirement survives a reload unchanged.
}, { _id: false, strict: false });

const chatSessionSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  messages: [chatMessageSchema],
  pendingRequirements: [pendingRequirementSchema],
  lastTopic: String,
}, {
  timestamps: true,
});

chatSessionSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ChatSession', chatSessionSchema);
