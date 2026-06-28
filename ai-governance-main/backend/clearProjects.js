import mongoose from 'mongoose';
import connectDB from './config.js';
import Project from './models/Projects.js';
import Risks from './models/Risks.js';
import ControlAssessment from './models/ControlAssessment.js';
import Comments from './models/Comments.js';
import GovernanceAssessmentScore from './models/GovernanceAssessmentScore.js';
import TemplateResponse from './models/TemplateResponse.js';
import Asset from './models/Asset.js';
import SecurityRequirement from './models/SecurityRequirement.js';
import DataElements from './models/DataElements.js';
import ChatSession from './models/ChatSession.js';
import ThirdParty from './models/ThirdParty.js';

const clearDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing projects and related data...');
    
    const projectRes = await Project.deleteMany({});
    console.log(`Deleted ${projectRes.deletedCount} projects`);

    const risksRes = await Risks.deleteMany({});
    console.log(`Deleted ${risksRes.deletedCount} risks`);

    const controlRes = await ControlAssessment.deleteMany({});
    console.log(`Deleted ${controlRes.deletedCount} control assessments`);

    const commentsRes = await Comments.deleteMany({});
    console.log(`Deleted ${commentsRes.deletedCount} comments`);

    const scoreRes = await GovernanceAssessmentScore.deleteMany({});
    console.log(`Deleted ${scoreRes.deletedCount} governance scores`);

    const responseRes = await TemplateResponse.deleteMany({});
    console.log(`Deleted ${responseRes.deletedCount} template responses`);

    const assetRes = await Asset.deleteMany({});
    console.log(`Deleted ${assetRes.deletedCount} assets`);

    const reqRes = await SecurityRequirement.deleteMany({});
    console.log(`Deleted ${reqRes.deletedCount} security requirements`);

    const dataElRes = await DataElements.deleteMany({});
    console.log(`Deleted ${dataElRes.deletedCount} data elements`);

    const chatRes = await ChatSession.deleteMany({});
    console.log(`Deleted ${chatRes.deletedCount} chat sessions`);

    const tpRes = await ThirdParty.deleteMany({});
    console.log(`Deleted ${tpRes.deletedCount} third-party assessments`);

    console.log('Database cleared successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
