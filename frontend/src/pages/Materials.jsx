import { useState, useEffect } from "react";
import axios from "axios";
import { FileText, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
const ITEMS_PER_PAGE = 12; // Number of materials per page

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSubjects();
    fetchMaterials();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filter changes
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

  // Pagination calculations
  const totalPages = Math.ceil(materials.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMaterials = materials.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
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
        pages.push('ellipsis-start');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" data-testid="materials-title">Study Materials</h1>
        <p className="page-description" data-testid="materials-description">
          Access notes, PDFs, and online resources organized by subject
        </p>
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

      {/* Results count */}
      {!loading && materials.length > 0 && (
        <div className="results-info">
          <p className="results-text">
            Showing {startIndex + 1}-{Math.min(endIndex, materials.length)} of {materials.length} materials
          </p>
        </div>
      )}

      <div className="materials-grid">
        {loading ? (
          <div className="loading" data-testid="materials-loading">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="no-results" data-testid="no-materials">No materials found</div>
        ) : (
          currentMaterials.map((material) => (
            <Card key={material.id} className="material-card" data-testid={`material-card-${material.id}`}>
              <CardHeader>
                <div className="material-header">
                  <div className="material-icon-wrapper">
                    {getTypeIcon(material.type)}
                  </div>
                  <div>
                    <CardTitle className="material-title">{material.title}</CardTitle>
                    <div className="material-meta">
                      <span className="meta-badge subject" data-testid={`material-subject-${material.id}`}>
                        {material.subject}
                      </span>
                      <span className="meta-badge type" data-testid={`material-type-${material.id}`}>
                        {getTypeBadge(material.type)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="material-description" data-testid={`material-desc-${material.id}`}>
                  {material.description}
                </p>
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

      {/* Pagination */}
      {!loading && materials.length > ITEMS_PER_PAGE && (
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

export default Materials;