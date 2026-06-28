import { authenticateToken } from "../middleware/auth.js";
import Project from "../models/Projects.js";
import Risks from "../models/Risks.js";
import ControlAssessment from "../models/ControlAssessment.js";
import Comments from "../models/Comments.js";
import GovernanceAssessmentScore from "../models/GovernanceAssessmentScore.js";
import TemplateResponse from "../models/TemplateResponse.js";
import Asset from "../models/Asset.js";
import SecurityRequirement from "../models/SecurityRequirement.js";
import DataElements from "../models/DataElements.js";
import ThirdParty from "../models/ThirdParty.js";
import express from "express";

const router = express.Router();

// ✅ Get all projects for logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id;

    const projects = await Project.find({ owner: ownerId })
      .sort({createdAt: -1})
      .populate("owner", "name"); // Only fetch "name" from User

    res.status(200).json(projects || []); // send [] if no projects
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ✅ Get single project
router.get("/:projectId", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { projectId } = req.params;

    const project = await Project.findOne({ projectId, owner: ownerId })
      .populate("owner", "name");

    if (!project) {
      return res.status(404).json({ error: "Project not found for this user" });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// ✅ Add a new project
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { projectName, workflow, template, status } = req.body;

    if (!projectName || !workflow || !template) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newProject = new Project({
      projectName,
      workflow,
      template,
      owner: req.user._id,
    });

    await newProject.save();
    res
      .status(201)
      .json({ message: "Project created successfully", project: newProject });
  } catch (error) {
    console.error("Error adding project:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Project ID already exists" });
    }
    res.status(500).json({ error: "Failed to create project" });
  }
});

// ✅ Update status of a project
router.patch("/:projectId/status", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updatedProject = await Project.findOneAndUpdate(
      { projectId, owner: req.user._id },
      { status },
      { new: true }
    );

    if (!updatedProject) {
      return res
        .status(404)
        .json({ error: "Project not found or you do not have permission" });
    }

    res.status(200).json({
      message: "Project status updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ error: "Failed to update project status" });
  }
});

// ✅ Delete a project
router.delete("/:projectId", authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ projectId: req.params.projectId, owner: req.user._id });
    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or you do not have permission" });
    }

    const projectObjectId = project._id;

    // Delete the project
    await Project.deleteOne({ _id: projectObjectId });

    // Cascade delete related records
    await Risks.deleteMany({ projectId: req.params.projectId });
    await ControlAssessment.deleteMany({ projectId: req.params.projectId });
    await Comments.deleteMany({ projectId: req.params.projectId });
    await GovernanceAssessmentScore.deleteMany({ projectId: req.params.projectId });
    await TemplateResponse.deleteMany({ projectId: req.params.projectId });
    await Asset.deleteMany({ project: projectObjectId });
    await SecurityRequirement.deleteMany({ projectId: req.params.projectId });
    await DataElements.deleteMany({ projectId: req.params.projectId });
    await ThirdParty.deleteMany({ projectId: req.params.projectId });

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
