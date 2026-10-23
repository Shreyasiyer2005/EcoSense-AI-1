-- EcoSense AI Database Initialization Script
-- PostgreSQL 14+ with PostGIS Extension

-- Create database (run this manually if needed)
-- CREATE DATABASE ecosense_ai;

-- Connect to the database
\c ecosense_ai;

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Phase 1: Basic schema setup
-- Additional tables will be added in subsequent phases

-- Create locations table (Phase 2)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('pincode', 'place', 'coordinates', 'polygon')),
    input_value TEXT NOT NULL,
    country_code VARCHAR(2) DEFAULT 'IN',
    resolved_name TEXT,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326),
    area_km2 DECIMAL(10, 2),
    bbox GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index on geometry column
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_locations_centroid ON locations USING GIST(centroid);

-- Create analyses table (Phase 2)
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    analysis_type VARCHAR(50) DEFAULT 'environmental_change',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_analyses_location ON analyses(location_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'EcoSense AI database initialized successfully!';
    RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
END $$;
