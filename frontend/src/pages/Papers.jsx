import { useState, useEffect } from "react";
import axios from "axios";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const ITEMS_PER_PAGE = 12; // Number of papers per page

const Papers = () => {
  const [papers, setPapers] = useState([]);
  const [filters, setFilters] = useState({ years: [], departments: [], subjects: [] });
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchFilters();
    fetchPapers();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
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
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(papers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPapers = papers.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="papers-title">Previous Year Exam Papers</h1>
        <p className="page-description" data-testid="papers-description">
          Browse and download question papers by year, department, and subject
        </p>
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

      {/* Results count */}
      {!loading && papers.length > 0 && (
        <div className="results-info">
          <p className="results-text">
            Showing {startIndex + 1}-{Math.min(endIndex, papers.length)} of {papers.length} papers
          </p>
        </div>
      )}

      <div className="papers-grid">
        {loading ? (
          <div className="loading" data-testid="papers-loading">Loading papers...</div>
        ) : papers.length === 0 ? (
          <div className="no-results" data-testid="no-papers">No papers found with the selected filters</div>
        ) : (
          currentPapers.map((paper) => (
            <Card key={paper.id} className="paper-card" data-testid={`paper-card-${paper.id}`}>
              <CardHeader>
                <CardTitle className="paper-title">{paper.title}</CardTitle>
                <CardDescription>
                  <div className="paper-meta">
                    <span className="meta-badge year" data-testid={`paper-year-${paper.id}`}>{paper.year}</span>
                    <span className="meta-badge dept" data-testid={`paper-dept-${paper.id}`}>{paper.department}</span>
                    <span className="meta-badge dept" data-testid={`paper-type-${paper.id}`}>{paper.type}</span>
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

      {/* Pagination */}
      {!loading && papers.length > ITEMS_PER_PAGE && (
        <Pagination className="pagination-wrapper">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default Papers;