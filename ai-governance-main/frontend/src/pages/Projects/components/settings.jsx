import React, { useState, useEffect } from "react";
import { BACKEND_URL } from "@/config/env";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import OutlinedInput from "@mui/material/OutlinedInput";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const owners = ["VerifyWise Admin", "Admin User", "John Doe"];
const teamMembers = ["Alice Smith", "John Doe", "VerifyWise Admin", "Admin User", "Bob Johnson"];
const regulations = ["ISO 42001", "EU AI Act", "NIST AI RMF", "GDPR"];
const riskLevels = ["High risk", "Medium risk", "Low risk"];
const highRiskRoles = ["Deployer", "Developer", "Operator", "Maintainer"];

const BASE_URL = BACKEND_URL; // backend port

const Settings = ({ project }) => {
  const [projectTitle, setProjectTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [owner, setOwner] = useState("");
  const [selectedRegulations, setSelectedRegulations] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [riskLevel, setRiskLevel] = useState("High risk");
  const [highRiskRole, setHighRiskRole] = useState("Deployer");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (project) {
      setProjectTitle(project.projectId || "");
      setGoal(project.projectName || "");
      setOwner(project.owner?.name || owners[0]);
      setStartDate(project.createdAt ? dayjs(project.createdAt) : dayjs());
      setSelectedRegulations([regulations[0], regulations[1]]);
      setSelectedMembers(teamMembers.slice(0, 2));
      setRiskLevel(riskLevels[0]);
      setHighRiskRole(highRiskRoles[0]);
    }
  }, [project]);

  const handleSave = () => {
    console.log("Settings saved:", {
      projectTitle,
      goal,
      owner,
      selectedRegulations,
      startDate: startDate?.format("YYYY-MM-DD"),
      selectedMembers,
      riskLevel,
      highRiskRole,
    });
  };

  const handleDeleteProject = async () => {
    if (!project?.projectId) {
      setDeleteError("Project data is not loaded. Please refresh and try again.");
      return;
    }

    if (isDeleting) {
      setDeleteError("");
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setDeleteError("You are not authenticated. Please log in again.");
          setIsDeleting(false);
          return;
        }

        // ✅ FIXED: /projects/ not /api/projects/
        const response = await fetch(`${BASE_URL}/projects/${project.projectId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        let data = {};
        try {
          data = await response.json();
        } catch (_) {}

        if (!response.ok) {
          setDeleteError(data.error || `Server returned ${response.status}. Please try again.`);
          return;
        }

        // Success — redirect to projects list
        window.location.href = "/projects";

      } catch (error) {
        console.error("Delete fetch error:", error);
        setDeleteError("Could not reach the server. Make sure the backend is running on port 3001.");
      } finally {
        setIsDeleting(false);
      }

    } else {
      setDeleteError("");
      setIsDeleting(true);
      setTimeout(() => {
        setIsDeleting(false);
        setDeleteError("");
      }, 3000);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-xl shadow-lg border border-gray-100 mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Project Settings</h2>

      <form className="flex flex-col gap-6">

        {/* === SECTION 1: PROJECT BASICS === */}
        <div className="grid md:grid-cols-2 gap-6">
          <TextField
            label="Project Title *"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            className="rounded-lg"
          />
          <FormControl fullWidth size="small" className="rounded-lg">
            <InputLabel>Owner *</InputLabel>
            <Select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              label="Owner *"
            >
              {owners.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Goal */}
        <TextField
          label="Goal (Project Description) *"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          multiline
          rows={3}
          fullWidth
          variant="outlined"
          className="rounded-lg"
        />

        {/* === SECTION 2: COMPLIANCE & TEAM === */}
        <div className="grid md:grid-cols-2 gap-6">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start Date *"
              value={startDate}
              onChange={setStartDate}
              format="MM/DD/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  InputProps: {
                    startAdornment: (
                      <CalendarTodayIcon fontSize="small" className="mr-2 text-gray-500" />
                    ),
                  },
                },
              }}
            />
          </LocalizationProvider>

          <FormControl fullWidth size="small" className="rounded-lg">
            <InputLabel>Monitored Regulations & Standards *</InputLabel>
            <Select
              multiple
              value={selectedRegulations}
              onChange={(e) => setSelectedRegulations(e.target.value)}
              input={<OutlinedInput label="Monitored Regulations & Standards *" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              )}
            >
              {regulations.map((reg) => (
                <MenuItem key={reg} value={reg}>{reg}</MenuItem>
              ))}
            </Select>
            <div className="text-xs text-gray-500 mt-1 pl-1">Add all monitored regulations.</div>
          </FormControl>
        </div>

        {/* Team Members */}
        <FormControl fullWidth size="small" className="rounded-lg">
          <InputLabel>Team Members *</InputLabel>
          <Select
            multiple
            value={selectedMembers}
            onChange={(e) => setSelectedMembers(e.target.value)}
            input={<OutlinedInput label="Team Members *" />}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {teamMembers.map((member) => (
              <MenuItem key={member} value={member}>{member}</MenuItem>
            ))}
          </Select>
          <div className="text-xs text-gray-500 mt-1 pl-1">
            Only added members will be able to see the project.
          </div>
        </FormControl>

        {/* === SECTION 3: AI CLASSIFICATION === */}
        <div className="pt-4 border-t mt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">AI Classification</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-gray-700 font-medium text-sm mb-1">AI Risk Classification</div>
              <div className="text-xs text-blue-600 mb-2">
                To define the risk classification,{" "}
                <a href="#" className="underline hover:text-blue-800">please see this guide</a>
              </div>
              <FormControl fullWidth size="small" className="rounded-lg">
                <Select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  displayEmpty
                >
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div>
              <div className="text-gray-700 font-medium text-sm mb-1">Type of High Risk Role</div>
              <div className="text-xs text-blue-600 mb-2">
                If you are not sure about the role,{" "}
                <a href="#" className="underline hover:text-blue-800">please see this documentation</a>
              </div>
              <FormControl fullWidth size="small" className="rounded-lg">
                <Select
                  value={highRiskRole}
                  onChange={(e) => setHighRiskRole(e.target.value)}
                  displayEmpty
                >
                  {highRiskRoles.map((role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        </div>

        {/* === SECTION 4: ACTIONS (SAVE / DELETE) === */}
        <div className="mt-8 pt-6 flex justify-between items-center border-t">

          <div className="flex flex-col">
            <Button
              variant={isDeleting ? "contained" : "outlined"}
              color="error"
              startIcon={<DeleteIcon />}
              sx={{ textTransform: "none", transition: "all 0.3s" }}
              onClick={handleDeleteProject}
            >
              {isDeleting ? "Confirm Deletion" : "Delete Project"}
            </Button>

            {isDeleting && !deleteError && (
              <div className="text-xs mt-1 text-red-500">
                Click again to permanently confirm deletion.
              </div>
            )}

            {deleteError && (
              <div className="text-xs mt-2 text-red-600 font-medium max-w-xs">
                ⚠ {deleteError}
              </div>
            )}
          </div>

          <Button
            variant="contained"
            color="primary"
            sx={{ textTransform: "none", paddingX: 4 }}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>

      </form>
    </div>
  );
};

export default Settings;