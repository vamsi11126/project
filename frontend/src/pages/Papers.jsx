import { useEffect, useState } from "react";
import axios from "axios";
import { Download, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API } from "@/lib/api";

const ITEMS_PER_PAGE = 12;

function extractDriveFileId(url) {
  if (!url) {
    return null;
  }

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function getPreviewUrl(url) {
  const driveFileId = extractDriveFileId(url);

  if (driveFileId) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }

  return url;
}

const Papers = () => {
  const [papers, setPapers] = useState([]);
  const [filters, setFilters] = useState({ years: [], departments: [], subjects: [] });
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPaper, setPreviewPaper] = useState(null);

  useEffect(() => {
    fetchFilters();
    fetchPapers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
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

  const totalPages = Math.ceil(papers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPapers = papers.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (setter) => (value) => {
    setter(value === "__all__" ? "" : value);
  };

  const getPageNumbers = () => {
    const pages = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis-start");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis-end");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="papers-title">Previous Year Exam Papers</h1>
        <p className="page-description" data-testid="papers-description">
          Browse, preview, and download question papers by year, department, and subject
        </p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <Label htmlFor="year-filter">Year</Label>
            <Select value={selectedYear || "__all__"} onValueChange={handleFilterChange(setSelectedYear)}>
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
            <Select value={selectedDept || "__all__"} onValueChange={handleFilterChange(setSelectedDept)}>
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
            <Select value={selectedSubject || "__all__"} onValueChange={handleFilterChange(setSelectedSubject)}>
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
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    className="sm:flex-1"
                    onClick={() => setPreviewPaper(paper)}
                    data-testid={`view-btn-${paper.id}`}
                  >
                    <Eye className="btn-icon" />
                    View
                  </Button>
                  <Button className="download-btn sm:flex-1" asChild data-testid={`download-btn-${paper.id}`}>
                    <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="btn-icon" />
                      Download PDF
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
                {page === "ellipsis-start" || page === "ellipsis-end" ? (
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

      <Dialog open={Boolean(previewPaper)} onOpenChange={(open) => !open && setPreviewPaper(null)}>
        <DialogContent className="w-[96vw] max-w-6xl p-0 overflow-hidden">
          {previewPaper && (
            <>
              <DialogHeader className="border-b px-4 py-4 sm:px-6">
                <DialogTitle className="pr-8">{previewPaper.title}</DialogTitle>
                <DialogDescription>
                  {previewPaper.subject} | {previewPaper.department} | {previewPaper.year}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 p-4 sm:p-6">
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setPreviewPaper(null)}>
                    Close
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border bg-slate-50">
                  <iframe
                    key={previewPaper.id}
                    src={getPreviewUrl(previewPaper.pdfUrl)}
                    title={`Preview of ${previewPaper.title}`}
                    className="h-[65vh] w-full sm:h-[78vh]"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" asChild>
                    <a href={previewPaper.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="btn-icon" />
                      Open in New Tab
                    </a>
                  </Button>
                  <Button asChild>
                    <a href={previewPaper.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="btn-icon" />
                      Download PDF
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Papers;
