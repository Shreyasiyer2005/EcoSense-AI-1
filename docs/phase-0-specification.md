# EcoSense AI - Phase 0: Requirements & Architecture Specification

**Note:** The complete Phase 0 specification was delivered as an artifact in the session.
This document serves as the architectural foundation for all implementation phases.

## Quick Reference

**Project:** AI-Based Environmental Change Detection Using Satellite Data and U-Net Deep Learning  
**Study Area:** Coorg (Kodagu), Karnataka, India  
**Technology Stack:** React + Vite + TypeScript, Node.js + Express, Python + FastAPI, PostgreSQL + PostGIS

## Key Architectural Decisions

1. **Satellite Provider:** Copernicus Data Space Ecosystem (Free)
2. **AI Agent:** Provider-agnostic with deterministic fallback
3. **Budget:** ₹0 (free services only)
4. **U-Net:** Staged implementation with verification
5. **Deployment:** Local development first
6. **Geocoding:** Nominatim with usage policy compliance

## Phase Implementation Order

1. Foundation & Repository Setup ✓ (Current)
2. Location Input & Geocoding
3. Satellite Data Integration
4. NDVI & Change Detection
5. U-Net Land Cover Classification
6. Environmental Indicators
7. AI Environmental Agent
8. Dashboard & Visualization
9. Reports & Additional Pages
10. Testing & Validation
11. Documentation & Deployment Prep

## Acceptance Criteria

All features must be:
- Backed by real integration or clearly marked as unavailable
- Scientifically responsible (no fabricated data)
- Secure (secrets excluded from Git)
- Testable with evidence
- Documented with methodology

Refer to the full Phase 0 artifact for complete specification details.
