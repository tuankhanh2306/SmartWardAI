package vn.edu.uth.smartward.triage;

/**
 * Candidate cluster located within the spatial search radius R.
 */
public record SpatialCandidate(String clusterCode, double distanceMeters) {}
