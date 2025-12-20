import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, BookOpen, Calculator, MessageSquare, GraduationCap, Download, ExternalLink,Menu } from "lucide-react";
import { toast } from "sonner";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import ManagePapers from "./admin/ManagePapers";
import ManageMaterials from "./admin/ManageMaterials";
import ManageRequests from "./admin/ManageRequests";
import Footer from "./components/ui/Footer";
import ProtectedRoute from "./admin/components/ProtectedRoute";
import Papers from "./pages/Papers";
import Materials from "./pages/Materials";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Replace your existing Navigation component with this:

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isActive = (path) => location.pathname === path;
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="nav-bar">
      <div className="nav-container">
        <Link to="/" className="nav-logo" data-testid="nav-logo" onClick={closeMenu}>
          <GraduationCap className="logo-icon" />
          <span className="logo-text">Campus Toolkit</span>
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <Menu size={24}  /> : <Menu size={24} />}
        </button>
        
        {/* Navigation links */}
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link 
            to="/" 
            className={isActive("/") ? "nav-link active" : "nav-link"} 
            data-testid="nav-home"
            onClick={closeMenu}
          >
            Home
          </Link>
          <Link 
            to="/papers" 
            className={isActive("/papers") ? "nav-link active" : "nav-link"} 
            data-testid="nav-papers"
            onClick={closeMenu}
          >
            Exam Papers
          </Link>
          <Link 
            to="/materials" 
            className={isActive("/materials") ? "nav-link active" : "nav-link"} 
            data-testid="nav-materials"
            onClick={closeMenu}
          >
            Study Materials
          </Link>
          <Link 
            to="/calculator" 
            className={isActive("/calculator") ? "nav-link active" : "nav-link"} 
            data-testid="nav-calculator"
            onClick={closeMenu}
          >
            Attendance
          </Link>
          <Link 
            to="/request" 
            className={isActive("/request") ? "nav-link active" : "nav-link"} 
            data-testid="nav-request"
            onClick={closeMenu}
          >
            Request
          </Link>
        </div>
      </div>
    </nav>
  );
};

const Home = () => {
  return (
    <div className="page-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title" data-testid="hero-title">Your Academic Success Hub</h1>
          <p className="hero-subtitle" data-testid="hero-subtitle">
            Access exam papers, study materials, track attendance, and request resources - all in one place
          </p>
          <div className="hero-buttons">
            <Link to="/papers">
              <Button size="lg" className="hero-btn primary" data-testid="hero-papers-btn">
                <FileText className="btn-icon" />
                Browse Papers
              </Button>
            </Link>
            <Link to="/materials">
              <Button size="lg" variant="outline" className="hero-btn secondary" data-testid="hero-materials-btn">
                <BookOpen className="btn-icon" />
                Study Materials
              </Button>
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <img src="https://images.unsplash.com/photo-1620829813573-7c9e1877706f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxzdHVkZW50JTIwc3R1ZHlpbmclMjBsYXB0b3B8ZW58MHx8fHwxNzYzNzk5MjY3fDA&ixlib=rb-4.1.0&q=85" alt="Student studying" data-testid="hero-image" />
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title" data-testid="features-title">Quick Access</h2>
        <div className="features-grid">
          <Link to="/papers" className="feature-card-link">
            <Card className="feature-card" data-testid="feature-papers">
              <CardHeader>
                <div className="feature-icon papers">
                  <FileText />
                </div>
                <CardTitle>Exam Papers</CardTitle>
                <CardDescription>Browse previous year question papers by department and subject</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link to="/materials" className="feature-card-link">
            <Card className="feature-card" data-testid="feature-materials">
              <CardHeader>
                <div className="feature-icon materials">
                  <BookOpen />
                </div>
                <CardTitle>Study Materials</CardTitle>
                <CardDescription>Access notes, PDFs, and Google Drive resources organized by subject</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link to="/calculator" className="feature-card-link">
            <Card className="feature-card" data-testid="feature-calculator">
              <CardHeader>
                <div className="feature-icon calculator">
                  <Calculator />
                </div>
                <CardTitle>Attendance Calculator</CardTitle>
                <CardDescription>Calculate your attendance percentage and safe skip count</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link to="/request" className="feature-card-link">
            <Card className="feature-card" data-testid="feature-request">
              <CardHeader>
                <div className="feature-icon request">
                  <MessageSquare />
                </div>
                <CardTitle>Request Materials</CardTitle>
                <CardDescription>Can't find something? Request papers or materials here</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};


const AttendanceCalculator = () => {
  const [attended, setAttended] = useState("");
  const [total, setTotal] = useState("");
  const [threshold, setThreshold] = useState("75");
  const [result, setResult] = useState(null);

  const calculate = () => {
    const attendedNum = parseInt(attended);
    const totalNum = parseInt(total);
    const thresholdNum = parseFloat(threshold);

    // VALIDATION
    if (isNaN(attendedNum) || isNaN(totalNum) || isNaN(thresholdNum)) {
      toast.error("Please enter valid numbers");
      return;
    }

    if (attendedNum > totalNum) {
      toast.error("Attended classes cannot exceed total classes");
      return;
    }

    if (totalNum === 0) {
      toast.error("Total classes must be greater than 0");
      return;
    }

    if (thresholdNum <= 0 || thresholdNum >= 100) {
      toast.error("Threshold must be between 1 and 99");
      return;
    }

    // CURRENT ATTENDANCE %
    const percentage = (attendedNum / totalNum) * 100;

    let canSkip = 0;
    let needToAttend = 0;

    // ⭐ SAFE CASE — calculate classes you can skip
    if (percentage >= thresholdNum) {
      const rawSkip = (100 * attendedNum) / thresholdNum - totalNum;
      canSkip = Math.max(0, Math.floor(rawSkip));
    }

    // ⭐ LOW ATTENDANCE — calculate required classes
    else {
      const denom = 1 - thresholdNum / 100;

      if (denom <= 0) {
        toast.error("Threshold must be less than 100");
        return;
      }

      const rawNeed =
        ((thresholdNum * totalNum) / 100 - attendedNum) / denom;

      needToAttend = Math.max(0, Math.ceil(rawNeed));
    }

    // FINAL RESULT OBJECT
    setResult({
      percentage: percentage.toFixed(2),
      canSkip,
      needToAttend,
      status: percentage >= thresholdNum ? "safe" : "warning"
    });
  };

  const reset = () => {
    setAttended("");
    setTotal("");
    setThreshold("75");
    setResult(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="calculator-title">Attendance Calculator</h1>
        <p className="page-description" data-testid="calculator-description">
          Calculate your attendance percentage and find out how many classes you can skip
        </p>
      </div>

      <div className="calculator-section">
        <Card className="calculator-card">
          <CardHeader>
            <CardTitle>Enter Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="calculator-form">
              <div className="form-group">
                <Label htmlFor="attended">Classes Attended</Label>
                <Input
                  id="attended"
                  type="number"
                  placeholder="e.g., 45"
                  value={attended}
                  onChange={(e) => setAttended(e.target.value)}
                />
              </div>

              <div className="form-group">
                <Label htmlFor="total">Total Classes</Label>
                <Input
                  id="total"
                  type="number"
                  placeholder="e.g., 60"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </div>

              <div className="form-group">
                <Label htmlFor="threshold">Minimum Required Attendance (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  placeholder="e.g., 75"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <Button onClick={calculate} className="calc-btn">
                  Calculate
                </Button>
                <Button onClick={reset} variant="outline">
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className={`result-card ${result.status}`}>
            <CardHeader>
              <CardTitle>Your Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="result-grid">

                <div className="result-item">
                  <div className="result-label">Current Attendance</div>
                  <div className={`result-value ${result.status}`}>
                    {result.percentage}%
                  </div>
                </div>

                {result.status === "safe" ? (
                  <div className="result-item">
                    <div className="result-label">Classes You Can Skip</div>
                    <div className="result-value safe">
                      {result.canSkip} classes
                    </div>
                  </div>
                ) : (
                  <div className="result-item">
                    <div className="result-label">Classes Needed to Attend</div>
                    <div className="result-value warning">
                      {result.needToAttend} classes
                    </div>
                  </div>
                )}

                <div className="result-message">
                  {result.status === "safe"
                    ? `Great! Your attendance is above ${threshold}%. You can skip up to ${result.canSkip} classes without falling below the threshold.`
                    : `Warning! Your attendance is below ${threshold}%. You need to attend at least ${result.needToAttend} consecutive classes to reach the required threshold.`}
                </div>

              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


const RequestForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    details: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(`${API}/requests`, formData);
      toast.success("Request submitted successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        department: "",
        details: ""
      });
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="request-title">Request Materials</h1>
        <p className="page-description" data-testid="request-description">Can't find the paper or material you're looking for? Let us know!</p>
      </div>

      <div className="request-section">
        <Card className="request-card">
          <CardHeader>
            <CardTitle>Submit Your Request</CardTitle>
            <CardDescription>Fill out the form below and we'll try to add the requested material</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-group">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  data-testid="input-name"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john.doe@college.edu"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  data-testid="input-department"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="details">Request Details</Label>
                <Textarea
                  id="details"
                  name="details"
                  placeholder="Please describe what you're looking for (subject, year, type of material, etc.)"
                  value={formData.details}
                  onChange={handleChange}
                  required
                  rows={6}
                  data-testid="input-details"
                />
              </div>
              <Button type="submit" className="submit-btn" disabled={submitting} data-testid="submit-request-btn">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function App() {

  return (
    <div className="App">
      <BrowserRouter>
        <Navigation />

        <Routes>

          {/* USER ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/calculator" element={<AttendanceCalculator />} />
          <Route path="/request" element={<RequestForm />} />

          {/* ADMIN ROUTES */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/papers"
            element={
              <ProtectedRoute>
                <ManagePapers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/materials"
            element={
              <ProtectedRoute>
                <ManageMaterials />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute>
                <ManageRequests />
              </ProtectedRoute>
            }
          />

        </Routes>
        <Footer/>
      </BrowserRouter>
    </div>
  );
}


export default App;