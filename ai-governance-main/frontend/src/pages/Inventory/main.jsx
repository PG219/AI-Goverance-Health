import { useState, useEffect } from "react";
import axios from "axios";

import { Search, Filter, Plus, RefreshCw, Edit, Download, Upload, Trash2, Settings, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AddRecordDialog from "./modals/AddRecordDialog";
import EditRecordDialog from "./modals/EditRecordDialog";
import DeleteConfirmationDialog from "./modals/DeleteRecordDialog";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getStatusBadge = (status) => {
  const statusConfig = {
    critical: { label: "Critical", variant: "destructive" },
    high: { label: "High", variant: "destructive" },
    medium: { label: "Medium", variant: "secondary" },
    low: { label: "Low", variant: "outline" },
    incomplete: { label: "Incomplete", variant: "secondary" },
    unavailable: { label: "Unavailable", variant: "outline" }
  };
  const config = statusConfig[status] || statusConfig.unavailable;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const Inventory = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    type: "Vendor",
    contact: "",
    aiUsage: "Low",
    status: "low"
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // ✅ YOUR TASK - Fetch assets from Asset Inventory API
  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/assets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success && response.data.data.length > 0) {
          const formatted = response.data.data.map((asset, index) => ({
            id: index + 1,
            _id: asset._id,
            name: asset.name,
            type: asset.type || "System",
            contact: asset.owner || "-",
            lastUpdated: new Date(asset.updatedAt).toLocaleString(),
            aiUsage: asset.criticality || "Low",
            dataProcessing: asset.data_classification || "-",
            status: (asset.criticality || "low").toLowerCase()
          }));
          setData(formatted);
        }
      } catch (err) {
        console.error("Error fetching assets:", err);
        toast({
          title: "Error",
          description: "Failed to fetch assets from database.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  const fetchFromConfluence = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/requirements/confluence/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const newAssets = response.data.data || [];
        if (newAssets.length === 0) {
          toast({ title: "No assets found", description: "Couldn't find any inventory items in Confluence." });
        } else {
          const formattedAssets = newAssets.map((asset, index) => ({
            id: data.length + index + 1,
            name: asset.name,
            type: asset.type || "System",
            contact: asset.contact || "-",
            lastUpdated: new Date().toLocaleString(),
            aiUsage: asset.aiUsage || "Low",
            dataProcessing: asset.dataProcessing || "-",
            status: (asset.status || asset.aiUsage || "low").toLowerCase()
          }));
          setData(prev => [...prev, ...formattedAssets]);
          toast({ title: "Success", description: `Extracted ${newAssets.length} assets from Confluence.` });
        }
      }
    } catch (error) {
      console.error("Confluence asset fetch error:", error);
      toast({ title: "Error", description: "Failed to connect to Confluence MCP.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredData.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    }
  };

  const handleAddNew = async () => {
    try {
      const token = localStorage.getItem("token");
      // ✅ Save to YOUR Asset API
      await axios.post(`${API_BASE_URL}/assets`, {
        name: newItem.name,
        type: newItem.type === "Vendor" ? "Other" : "Application",
        owner: newItem.contact || "Unknown",
        criticality: newItem.aiUsage,
        status: "Active",
        data_classification: "Internal"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const id = data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1;
      const newRecord = {
        ...newItem,
        id,
        lastUpdated: new Date().toLocaleString(),
        dataProcessing: "-"
      };
      setData([...data, newRecord]);
      setNewItem({ name: "", type: "Vendor", contact: "", aiUsage: "Low", status: "low" });
      setShowAddDialog(false);
      toast({ title: "Success", description: "New asset added successfully." });
    } catch (err) {
      console.error("Error adding asset:", err);
      toast({ title: "Error", description: "Failed to save asset.", variant: "destructive" });
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const formatted = response.data.data.map((asset, index) => ({
          id: index + 1,
          _id: asset._id,
          name: asset.name,
          type: asset.type || "System",
          contact: asset.owner || "-",
          lastUpdated: new Date(asset.updatedAt).toLocaleString(),
          aiUsage: asset.criticality || "Low",
          dataProcessing: asset.data_classification || "-",
          status: (asset.criticality || "low").toLowerCase()
        }));
        setData(formatted);
      }
      setSelectedItems([]);
      setSearchQuery("");
      setFilterType("all");
      toast({ title: "Refreshed", description: "Data has been refreshed from database." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to refresh.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", description: "Please select items to delete.", variant: "destructive" });
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleBulkEdit = () => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", description: "Please select items to edit.", variant: "destructive" });
      return;
    }
    setShowEditDialog(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      // Delete from YOUR API
      const toDelete = data.filter(item => selectedItems.includes(item.id));
      for (const item of toDelete) {
        if (item._id) {
          await axios.delete(`${API_BASE_URL}/assets/${item._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      setData(data.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      setShowDeleteDialog(false);
      toast({ title: "Deleted", description: `${selectedItems.length} item(s) deleted successfully.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete assets.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    const csvContent = [
      ["Name", "Type", "Contact", "Last Updated", "AI Usage", "Data Processing"],
      ...filteredData.map(item => [item.name, item.type, item.contact, item.lastUpdated, item.aiUsage, item.dataProcessing])
    ].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-data.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Data exported successfully." });
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        toast({ title: "Upload initiated", description: `Processing ${file.name}...` });
        setTimeout(() => {
          toast({ title: "Upload complete", description: "File uploaded successfully." });
        }, 2000);
      }
    };
    input.click();
  };

  const handleItemAction = (action, item) => {
    switch (action) {
      case "view":
        toast({ title: "View Details", description: `Viewing details for ${item.name}` });
        break;
      case "edit":
        setEditingItem(item);
        setShowEditDialog(true);
        break;
      case "duplicate":
        const duplicated = {
          ...item,
          id: Math.max(...data.map(i => i.id)) + 1,
          name: `${item.name} (Copy)`,
          lastUpdated: new Date().toLocaleString()
        };
        setData([...data, duplicated]);
        toast({ title: "Duplicated", description: `${item.name} has been duplicated.` });
        break;
      case "delete":
        setData(data.filter(i => i.id !== item.id));
        toast({ title: "Deleted", description: `${item.name} has been deleted.` });
        break;
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" ||
      item.type.toLowerCase() === filterType.toLowerCase() ||
      item.status === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Asset Inventory</h1>

          <Tabs defaultValue="all-records" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all-records">All Records</TabsTrigger>
              <TabsTrigger value="third-party">Third Party Records</TabsTrigger>
              <TabsTrigger value="system">System Records</TabsTrigger>
              <TabsTrigger value="company">Company Records</TabsTrigger>
            </TabsList>

            <TabsContent value="all-records" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Asset</DialogTitle>
                        <DialogDescription>Create a new asset record.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Name</Label>
                          <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Type</Label>
                          <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value})}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Vendor">Vendor</SelectItem>
                              <SelectItem value="System">System</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Owner</Label>
                          <Input value={newItem.contact} onChange={(e) => setNewItem({...newItem, contact: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Criticality</Label>
                          <Select value={newItem.aiUsage} onValueChange={(value) => setNewItem({...newItem, aiUsage: value, status: value.toLowerCase()})}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Critical">Critical</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddNew}>Add Asset</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-64" />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />Filters
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setFilterType("all")}>All Records</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("critical")}>Critical</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("high")}>High</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("medium")}>Medium</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("low")}>Low</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedItems.length} of {filteredData.length} item(s) selected</span>
                  <Button variant="outline" size="icon" onClick={handleRefresh}>
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="default" className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={fetchFromConfluence} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Syncing..." : "Sync from Confluence"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleBulkEdit}><Edit className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={handleDownload}><Download className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={handleUpload}><Upload className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={handleBulkDelete}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="rounded-md border">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading assets...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox checked={selectedItems.length === filteredData.length && filteredData.length > 0} onCheckedChange={handleSelectAll} />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Criticality</TableHead>
                        <TableHead>Data Classification</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No assets found. Click "Add New" to get started!
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, checked)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-blue-600 hover:underline cursor-pointer">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.type}</TableCell>
                            <TableCell>{item.contact}</TableCell>
                            <TableCell>{item.lastUpdated}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>{item.dataProcessing}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleItemAction("view", item)}>View Details</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleItemAction("edit", item)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleItemAction("duplicate", item)}>Duplicate</DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleItemAction("delete", item)}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="third-party">
              <div className="text-center py-8 text-gray-500">Third Party Records content would go here</div>
            </TabsContent>
            <TabsContent value="system">
              <div className="text-center py-8 text-gray-500">System Records content would go here</div>
            </TabsContent>
            <TabsContent value="company">
              <div className="text-center py-8 text-gray-500">Company Records content would go here</div>
            </TabsContent>
          </Tabs>

          <AddRecordDialog open={showAddDialog} onOpenChange={setShowAddDialog} newItem={newItem} setNewItem={setNewItem} onAdd={handleAddNew} />
          <DeleteConfirmationDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} selectedCount={selectedItems.length} onConfirm={confirmBulkDelete} />
          <EditRecordDialog open={showEditDialog} onOpenChange={setShowEditDialog} selectedItems={selectedItems} editingItem={editingItem} onUpdate={() => { setShowEditDialog(false); toast({ title: "Updated", description: "Record(s) updated successfully." }); }} />
        </div>
      </main>
    </div>
  );
};

export default Inventory;