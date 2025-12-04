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
import { FileText, BookOpen, Calculator, MessageSquare, GraduationCap, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import ManagePapers from "./admin/ManagePapers";
import ManageMaterials from "./admin/ManageMaterials";
import ManageRequests from "./admin/ManageRequests";
import Footer from "./components/ui/Footer";
import ProtectedRoute from "./admin/components/ProtectedRoute";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Navigation = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav-bar">
      <div className="nav-container">
        <Link to="/" className="nav-logo" data-testid="nav-logo">
          <GraduationCap className="logo-icon" />
          <span className="logo-text">Campus Toolkit</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={isActive("/") ? "nav-link active" : "nav-link"} data-testid="nav-home">
            Home
          </Link>
          <Link to="/papers" className={isActive("/papers") ? "nav-link active" : "nav-link"} data-testid="nav-papers">
            Exam Papers
          </Link>
          <Link to="/materials" className={isActive("/materials") ? "nav-link active" : "nav-link"} data-testid="nav-materials">
            Study Materials
          </Link>
          <Link to="/calculator" className={isActive("/calculator") ? "nav-link active" : "nav-link"} data-testid="nav-calculator">
            Attendance
          </Link>
          <Link to="/request" className={isActive("/request") ? "nav-link active" : "nav-link"} data-testid="nav-request">
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

const Papers = () => {
  const [papers, setPapers] = useState([]);
  const [filters, setFilters] = useState({ years: [], departments: [], subjects: [] });
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilters();
    fetchPapers();
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [selectedYear, selectedDept, selectedSubject]);

  const fetchFilters = async () => {
    try {
      const response = await axios.get(`${API}/filters`);
      setFilters(response.data);
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedDept) params.department = selectedDept;
      if (selectedSubject) params.subject = selectedSubject;

      const response = await axios.get(`${API}/papers`, { params });
      setPapers(response.data);
    } catch (error) {
      console.error("Error fetching papers:", error);
      toast.error("Failed to load exam papers");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedYear("");
    setSelectedDept("");
    setSelectedSubject("");
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="papers-title">Previous Year Exam Papers</h1>
        <p className="page-description" data-testid="papers-description">Browse and download question papers by year, department, and subject</p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <Label htmlFor="year-filter">Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="year-filter" data-testid="filter-year">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Years</SelectItem>
                {filters.years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="filter-group">
            <Label htmlFor="dept-filter">Department</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger id="dept-filter" data-testid="filter-department">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Departments</SelectItem>
                {filters.departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="filter-group">
            <Label htmlFor="subject-filter">Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject-filter" data-testid="filter-subject">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subjects</SelectItem>
                {filters.subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="filter-actions">
            <Button onClick={clearFilters} variant="outline" data-testid="clear-filters-btn">
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="papers-grid">
        {loading ? (
          <div className="loading" data-testid="papers-loading">Loading papers...</div>
        ) : papers.length === 0 ? (
          <div className="no-results" data-testid="no-papers">No papers found with the selected filters</div>
        ) : (
          papers.map((paper) => (
            <Card key={paper.id} className="paper-card" data-testid={`paper-card-${paper.id}`}>
              <CardHeader>
                <CardTitle className="paper-title">{paper.title}</CardTitle>
                <CardDescription>
                  <div className="paper-meta">
                    <span className="meta-badge year" data-testid={`paper-year-${paper.id}`}>{paper.year}</span>
                    <span className="meta-badge dept" data-testid={`paper-dept-${paper.id}`}>{paper.department}</span>
                    <span className="meta-badge dept" data-testid={`paper-dept-${paper.id}`}>{paper.type}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="paper-subject" data-testid={`paper-subject-${paper.id}`}>{paper.subject}</p>
                <Button className="download-btn" asChild data-testid={`download-btn-${paper.id}`}>
                  <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="btn-icon" />
                    Download PDF
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
    fetchMaterials();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [selectedSubject]);

const fetchSubjects = async () => {
  try {
    const response = await axios.get(`${API}/material-subjects`);
    setSubjects(response.data.subjects); 
  } catch (error) {
    console.error("Error fetching subjects:", error);
  }
};


  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSubject && selectedSubject !== "__all__") {
        params.subject = selectedSubject;
      }


      const response = await axios.get(`${API}/materials`, { params });
      setMaterials(response.data);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Failed to load study materials");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="type-icon" />;
      case "drive":
        return <ExternalLink className="type-icon" />;
      case "link":
        return <ExternalLink className="type-icon" />;
      default:
        return <BookOpen className="type-icon" />;
    }
  };

  const getTypeBadge = (type) => {
    const labels = { pdf: "PDF", drive: "Google Drive", link: "External Link" };
    return labels[type] || type;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="materials-title">Study Materials</h1>
        <p className="page-description" data-testid="materials-description">Access notes, PDFs, and online resources organized by subject</p>
      </div>

      <div className="filters-section">
        <div className="filters-grid single">
          <div className="filter-group">
            <Label htmlFor="subject-filter">Filter by Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject-filter" data-testid="materials-filter-subject">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="materials-grid">
        {loading ? (
          <div className="loading" data-testid="materials-loading">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="no-results" data-testid="no-materials">No materials found</div>
        ) : (
          materials.map((material) => (
            <Card key={material.id} className="material-card" data-testid={`material-card-${material.id}`}>
              <CardHeader>
                <div className="material-header">
                  <div className="material-icon-wrapper">
                    {getTypeIcon(material.type)}
                  </div>
                  <div>
                    <CardTitle className="material-title">{material.title}</CardTitle>
                    <div className="material-meta">
                      <span className="meta-badge subject" data-testid={`material-subject-${material.id}`}>{material.subject}</span>
                      <span className="meta-badge type" data-testid={`material-type-${material.id}`}>{getTypeBadge(material.type)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="material-description" data-testid={`material-desc-${material.id}`}>{material.description}</p>
                <Button className="access-btn" asChild data-testid={`access-btn-${material.id}`}>
                  <a href={material.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="btn-icon" />
                    Access Resource
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
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