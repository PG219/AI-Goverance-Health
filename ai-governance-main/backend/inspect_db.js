import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from './models/Asset.js';
import SecurityRequirement from './models/SecurityRequirement.js';
import Project from './models/Projects.js';
import Risks from './models/Risks.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/governance_db?authSource=admin';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected.');

    // Find the latest project
    const latestProject = await Project.findOne().sort({ createdAt: -1 });
    if (!latestProject) {
      console.log('No projects found!');
      process.exit(0);
    }
    console.log(`\n=== LATEST PROJECT ===`);
    console.log(`Name: ${latestProject.projectName}`);
    console.log(`ID: ${latestProject.projectId}`);
    console.log(`DbId: ${latestProject._id}`);
    console.log(`Workflow: ${latestProject.workflow}`);
    console.log(`Template: ${latestProject.template}`);

    // Fetch assets linked to this project
    const projectAssets = await Asset.find({ project: latestProject._id });
    console.log(`\n=== ASSETS LINKED TO THIS PROJECT (${projectAssets.length}) ===`);
    projectAssets.forEach((a, idx) => {
      console.log(`${idx + 1}. Name: ${a.name} | Type: ${a.type} | Risk Level: ${a.riskLevel}`);
    });

    // Fetch requirements linked to this project
    const projectReqs = await SecurityRequirement.find({
      $or: [
        { projectId: latestProject.projectId },
        { projectId: latestProject._id.toString() }
      ]
    });
    console.log(`\n=== REQUIREMENTS FOR THIS PROJECT (${projectReqs.length}) ===`);
    projectReqs.forEach((r, idx) => {
      console.log(`${idx + 1}. Title: ${r.title} | Category: ${r.category} | Priority: ${r.priority}`);
    });

    // Fetch generated risks for this project
    const projectRisks = await Risks.find({ projectId: latestProject.projectId, isActive: true });
    console.log(`\n=== GENERATED RISKS FOR THIS PROJECT (${projectRisks.length}) ===`);
    projectRisks.forEach((rk, idx) => {
      console.log(`${idx + 1}. Name: ${rk.riskName} | Severity: ${rk.severity} | ID: ${rk.riskAssessmentId}`);
    });

    // Let's also check all assets and requirements in the DB overall to compare
    const allAssets = await Asset.find({});
    const allReqs = await SecurityRequirement.find({});
    console.log(`\n=== TOTAL IN SYSTEM ===`);
    console.log(`Total Assets: ${allAssets.length}`);
    console.log(`Total Requirements: ${allReqs.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
