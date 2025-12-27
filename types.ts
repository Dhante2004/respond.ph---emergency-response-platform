
export type UserType = 'citizen' | 'pdrrmo_admin' | 'agency_admin';
export type AgencyType = 'BFP' | 'PNP' | 'PCG' | 'NONE';
export type VerificationStatus = 'pending' | 'verified' | 'false';
export type AccountVerificationStatus = 'unverified' | 'pending' | 'verified';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical' | 'none';
export type IncidentStatus = 'submitted' | 'assigned' | 'en_route' | 'on_scene' | 'resolved';
export type IncidentType = 'fire' | 'crime' | 'medical' | 'flood' | 'accident' | 'other';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  userType: UserType;
  agency?: AgencyType;
  accountVerificationStatus: AccountVerificationStatus;
  idImageUrl?: string;
}

export interface Report {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userIsVerified: boolean;
  incidentType: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  addressLandmark: string;
  verificationStatus: VerificationStatus;
  priorityLevel: PriorityLevel;
  currentStatus: IncidentStatus;
  assignedAgency: AgencyType;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusLog {
  id: string;
  reportId: string;
  status: IncidentStatus;
  changedBy: string;
  timestamp: string;
}
