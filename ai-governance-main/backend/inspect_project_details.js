import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from './models/Projects.js';
import Risks from './models/Risks.js';
import Control from './models/ControlAssessment.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/governance_db?authSource=admin';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Find the latest project
    const latestProject = await Project.findOne().sort({ createdAt: -1 });
    if (!latestProject) {
      console.log('No projects found in MongoDB!');
      process.exit(0);
    }

    console.log('\n=========================================');
    console.log('LATEST PROJECT INFO');
    console.log('=========================================');
    console.log(`Name:      ${latestProject.projectName}`);
    console.log(`ID:        ${latestProject.projectId}`);
    console.log(`DbId:      ${latestProject._id}`);
    console.log(`Template:  ${latestProject.template}`);

    // Fetch generated risks
    const projectRisks = await Risks.find({ projectId: latestProject.projectId, isActive: true });
    console.log(`\n=========================================`);
    console.log(`GENERATED RISKS FOR THIS PROJECT (${projectRisks.length})`);
    console.log(`=========================================`);
    projectRisks.forEach((rk, idx) => {
      console.log(`${idx + 1}. [${rk.riskAssessmentId}] ${rk.riskName} (Severity: ${rk.severity})`);
    });

    // Fetch mapped controls
    const totalCount = await Control.countDocuments({});
    console.log(`Total controls in database overall: ${totalCount}`);
    
    const latestControls = await Control.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n=== LATEST 5 CONTROLS IN DB ===');
    latestControls.forEach((c, idx) => {
      console.log(`${idx + 1}. Code: ${c.code} | ProjectId: ${c.projectId} | CreatedAt: ${c.createdAt}`);
    });

    const projectControls = await Control.find({ projectId: latestProject.projectId, isActive: true });
    console.log(`\n=========================================`);
    console.log(`MAPPED CONTROLS FOR THIS PROJECT (${projectControls.length})`);
    console.log(`=========================================`);
    projectControls.forEach((c, idx) => {
      console.log(`${idx + 1}. Code: ${c.code} | Name: ${c.control} | Section: ${c.section} | Risks: ${JSON.stringify(c.relatedRisks)}`);
    });

  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await mongoose.connection.close();
  }
}

run();
