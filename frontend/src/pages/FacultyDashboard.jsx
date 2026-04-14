import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
    Calendar, Clock, User, FileText, CheckCircle, XCircle, 
    RefreshCw, Loader2, LogOut, Settings, 
    Plus, Trash2, Save, Building, UserCircle, Image as ImageIcon, Send, Edit3
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/lib/api";

const FacultyDashboard = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [status, setStatus] = useState("pending");
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    
    // Appointment Actions State
    const [meetingTime, setMeetingTime] = useState("");
    const [actionReason, setActionReason] = useState("");
    const [showActions, setShowActions] = useState(null); // ID of the appointment 
    const [actionType, setActionType] = useState(null); // 'accepted' or 'rejected'

    // Profile State
    const [profile, setProfile] = useState({
        name: "",
        department: "",
        cabin_number: "",
        image: "",
        available_time_slots: [],
        is_complete: false
    });
    const [newSlot, setNewSlot] = useState("");

    const token = localStorage.getItem("faculty_token");
    const facultyId = localStorage.getItem("faculty_id");

    const fetchAppointments = async (reset = false) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API}/faculty/me/appointments`, {
                params: { status, limit: 100, skip: 0 },
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(res.data);
        } catch (err) {
            toast.error("Failed to load appointments.");
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        if (!token) return;
        setProfileLoading(true);
        try {
            const res = await axios.get(`${API}/faculty/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(res.data);
        } catch (err) {
            toast.error("Failed to load profile.");
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate("/faculty/login");
            return;
        }
        fetchProfile();
        fetchAppointments(true);
    }, [status, token]);

    const handleUpdateAppointment = async (id, chosenStatus) => {
        setActionLoading(id);
        try {
            const payload = {
                faculty_id: facultyId,
                appointment_status: chosenStatus,
                meeting_time: chosenStatus === "accepted" ? (meetingTime || new Date().toISOString()) : null,
                faculty_message: actionReason
            };

            await axios.patch(`${API}/appointments/${id}/status`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(`Appointment updated successfully.`);
            setShowActions(null);
            setActionType(null);
            setMeetingTime("");
            setActionReason("");
            fetchAppointments(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Update failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            await axios.post(`${API}/faculty/profile`, profile, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Profile updated successfully!");
            fetchProfile();
        } catch (err) {
            toast.error("Profile update failed.");
        } finally {
            setProfileLoading(false);
        }
    };

    const handleAddSlot = () => {
        if (!newSlot.trim()) return;
        setProfile({
            ...profile,
            available_time_slots: [...profile.available_time_slots, newSlot.trim()]
        });
        setNewSlot("");
    };

    const handleRemoveSlot = (index) => {
        const updated = profile.available_time_slots.filter((_, i) => i !== index);
        setProfile({ ...profile, available_time_slots: updated });
    };

    const handleLogout = () => {
        localStorage.removeItem("faculty_token");
        localStorage.removeItem("faculty_id");
        toast.info("Logged out successfully.");
        navigate("/faculty/login");
    };

    return (
        <div className="page-container max-w-6xl mx-auto py-10 px-4 min-h-screen">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Faculty Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Welcome, {profile.name || "Professor"}</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" size="sm" onClick={() => fetchAppointments(true)} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="appointments" className="space-y-8">
                <TabsList className="bg-muted p-1 rounded-xl shadow-inner ring-1 ring-black/5">
                    <TabsTrigger value="appointments" className="rounded-lg px-6 py-2">
                        <Clock className="w-4 h-4 mr-2" />
                        Appointments ({appointments.length})
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="rounded-lg px-6 py-2">
                        <Settings className="w-4 h-4 mr-2" />
                        Profile Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="appointments" className="space-y-6">
                    <div className="flex gap-2">
                        {["pending", "accepted", "rejected"].map((s) => (
                            <Button 
                                key={s}
                                variant={status === s ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatus(s)}
                                className="capitalize shadow-sm"
                            >
                                {s}
                            </Button>
                        ))}
                    </div>

                    <div className="grid gap-6 pb-20">
                        {appointments.length === 0 && !loading && (
                            <Card className="border-dashed py-20 text-center">
                                <CardContent className="flex flex-col items-center">
                                    <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-10" />
                                    <p className="text-lg font-medium text-muted-foreground">No {status} appointments</p>
                                </CardContent>
                            </Card>
                        )}
                        
                        {appointments.map((apt) => (
                            <Card key={apt.id} className="hover:shadow-md transition-all bg-white/60 backdrop-blur-sm border-none ring-1 ring-border/40 overflow-hidden">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b bg-muted/5 p-6">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-bold">{apt.student_name}</CardTitle>
                                        <CardDescription className="font-mono text-xs uppercase tracking-wider font-semibold">
                                            {apt.registration_number} • {apt.year} Year • Sec {apt.section}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={apt.appointment_status === "accepted" ? "success" : apt.appointment_status === "rejected" ? "destructive" : "secondary"} className="px-3 py-1 text-xs">
                                            {apt.appointment_status}
                                        </Badge>
                                        {apt.appointment_status !== 'pending' && (
                                            <Button variant="ghost" size="xs" className="h-7 text-[10px] uppercase font-bold tracking-tighter hover:bg-primary/10" onClick={() => {
                                                setShowActions(apt.id);
                                                setActionType(apt.appointment_status);
                                                setActionReason(apt.faculty_message || "");
                                            }}>
                                                <Edit3 className="w-3 h-3 mr-1" /> Change Status
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 px-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <p className="text-xs font-black uppercase text-muted-foreground flex items-center">
                                                <FileText className="w-3 h-3 mr-1" /> Student's Request
                                            </p>
                                            <p className="text-sm border rounded-xl p-4 bg-white/50 min-h-[80px] leading-relaxed">"{apt.reason}"</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black uppercase text-muted-foreground flex items-center">
                                                <Clock className="w-3 h-3 mr-1" /> Preferred Time
                                            </p>
                                            <p className="text-sm border rounded-xl p-4 bg-primary/5 font-bold text-primary flex items-center min-h-[80px]">
                                                {apt.chosen_slot || "No preference specified"}
                                            </p>
                                        </div>
                                    </div>

                                    {apt.faculty_message && !showActions && (
                                        <div className="mt-6 p-5 rounded-2xl border-2 border-dashed bg-blue-50/20 border-blue-100 animate-in fade-in zoom-in-95">
                                            <p className="text-[10px] font-black uppercase text-blue-600/60 mb-2 flex items-center gap-1">
                                                <Send className="w-3 h-3" /> Your Message To Student
                                            </p>
                                            <p className="text-sm text-foreground/80 font-medium leading-relaxed italic">"{apt.faculty_message}"</p>
                                        </div>
                                    )}

                                    {showActions === apt.id && (
                                        <div className={`mt-6 p-5 rounded-2xl border-2 shadow-inner space-y-5 animate-in fade-in slide-in-from-top-2 ${
                                            actionType === 'accepted' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'
                                        }`}>
                                            <div className="flex gap-2">
                                                <Button size="xs" variant={actionType === 'accepted' ? 'default' : 'outline'} className="rounded-full h-7 text-[10px]" onClick={() => setActionType('accepted')}>ACCEPT MODE</Button>
                                                <Button size="xs" variant={actionType === 'rejected' ? 'destructive' : 'outline'} className="rounded-full h-7 text-[10px]" onClick={() => setActionType('rejected')}>REJECT MODE</Button>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 pb-1">
                                                    {actionType === 'accepted' ? <CheckCircle className="w-3 h-3 text-green-600"/> : <XCircle className="w-3 h-3 text-red-600"/>}
                                                    {actionType === 'accepted' ? "Meeting Instructions" : "Root Cause for Rejection"}
                                                </Label>
                                                <Textarea 
                                                    placeholder={actionType === 'accepted' ? "e.g., Come to my office after the 3rd period." : "e.g., Already committed to another review."}
                                                    className="bg-white/80 border-none shadow-sm min-h-[100px] text-sm"
                                                    value={actionReason}
                                                    onChange={(e) => setActionReason(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end border-t border-black/5 pt-4">
                                                <Button variant="ghost" size="sm" className="h-9 px-4 text-xs font-bold" onClick={() => {setShowActions(null); setActionType(null); setActionReason("");}}>Cancel</Button>
                                                <Button 
                                                    size="sm" 
                                                    variant={actionType === 'accepted' ? "default" : "destructive"}
                                                    className={`h-9 px-6 font-bold text-xs uppercase tracking-widest shadow-lg ${actionType === 'accepted' ? "bg-green-600 hover:bg-green-700" : ""}`}
                                                    onClick={() => handleUpdateAppointment(apt.id, actionType)}
                                                    disabled={actionLoading === apt.id}
                                                >
                                                    {actionLoading === apt.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                                    Update Status
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                
                                {apt.appointment_status === "pending" && !showActions && (
                                    <CardFooter className="flex gap-3 justify-end border-t pt-5 bg-muted/5 px-6">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-destructive border-transparent hover:bg-destructive/10 font-bold text-xs uppercase"
                                            onClick={() => { setShowActions(apt.id); setActionType('rejected'); setActionReason(""); }}
                                        >
                                            <XCircle className="w-4 h-4 mr-2 text-destructive" /> Reject
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700 shadow-xl font-bold text-xs uppercase"
                                            onClick={() => { setShowActions(apt.id); setActionType('accepted'); setActionReason(""); }}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Accept
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="profile" className="pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="md:col-span-2 shadow-2xl border-none ring-1 ring-border/50 bg-white/80 backdrop-blur-md">
                            <CardHeader>
                                <CardTitle>Public Persona</CardTitle>
                                <CardDescription>Update your professional identity in the directory.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black tracking-widest uppercase">Display Name</Label>
                                            <div className="relative">
                                                <UserCircle className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    className="pl-10 h-11"
                                                    value={profile.name} 
                                                    onChange={e => setProfile({...profile, name: e.target.value})}
                                                    placeholder="Dr. Christopher Nolan"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black tracking-widest uppercase">Department</Label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    className="pl-10 h-11"
                                                    value={profile.department} 
                                                    onChange={e => setProfile({...profile, department: e.target.value})}
                                                    placeholder="School of Computer Science"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black tracking-widest uppercase">Cabin Number</Label>
                                            <Input 
                                                className="h-11"
                                                value={profile.cabin_number} 
                                                onChange={e => setProfile({...profile, cabin_number: e.target.value})}
                                                placeholder="Example: Block-A, 405"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black tracking-widest uppercase">Image URL (Optional)</Label>
                                            <div className="relative">
                                                <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    className="pl-10 h-11"
                                                    value={profile.image} 
                                                    onChange={e => setProfile({...profile, image: e.target.value})}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between border-t mt-8">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={profile.is_complete ? "success" : "warning"} className="py-1 px-4 text-[10px] uppercase font-bold tracking-widest">
                                                {profile.is_complete ? "Active In Directory" : "Draft (Not Listed)"}
                                            </Badge>
                                        </div>
                                        <Button type="submit" className="h-11 px-8 font-black text-xs uppercase tracking-widest shadow-xl" disabled={profileLoading}>
                                            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                            Commit Changes
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xl border-none ring-1 ring-border/50">
                            <CardHeader>
                                <CardTitle>Availability</CardTitle>
                                <CardDescription>Set your standard weekly slots.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest">Add New Slot</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={newSlot} 
                                            className="h-11"
                                            onChange={(e) => setNewSlot(e.target.value)}
                                            placeholder="Example: Mon 10-12 AM"
                                        />
                                        <Button size="icon" onClick={handleAddSlot} className="h-11 w-11 shrink-0"><Plus className="w-5 h-5"/></Button>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 px-1 scrollbar-thin">
                                    {profile.available_time_slots.map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border group hover:border-primary/30 transition-colors shadow-sm">
                                            <span className="text-sm font-bold opacity-80">{slot}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
                                                onClick={() => handleRemoveSlot(idx)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {profile.available_time_slots.length === 0 && (
                                        <div className="flex flex-col items-center py-16 opacity-20 border-4 border-dashed rounded-2xl">
                                            <Clock className="w-8 h-8 mb-2" />
                                            <p className="text-[10px] font-black">NO SLOTS ADDED</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FacultyDashboard;
