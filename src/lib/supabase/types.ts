// Hand-written types matching supabase/schema.sql. Keep in sync manually
// (or regenerate with `supabase gen types typescript` once the project is
// linked to the Supabase CLI).

export type Role = "owner" | "manager" | "lead" | "member";
export type ProjectRole = "Manager" | "Lead" | "Member";
export type RequestStatus = "Pending" | "Scheduled" | "Completed";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface MemberNote {
  text: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  designation: string;
  role_type: string;
  project_role?: ProjectRole;
  projects: string[];
  experience_level: string;
  allocation_pct: number | null;
  reporting_manager: string;
  joining_date: string | null;
  prior_experience_years: number | null;
  employment_type: string;
  skills: string[];
  certifications: string;
  performance_rating: string;
  career_note: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  availability_status: string;
  attendance_rating: string;
  attendance_note: string;
  attitude_note: string;
  notes: MemberNote[];
  is_example: boolean;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  member_id: string | null;
  member_name: string;
  title: string;
  type: string;
  platform: string;
  date_completed: string | null;
  notes: string;
  is_example: boolean;
  created_at: string;
}

export interface TrainingPlan {
  id: string;
  member_id: string | null;
  member_name: string;
  topic: string;
  purpose: string;
  schedule: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface TrainingRequest {
  id: string;
  member_id: string | null;
  member_name: string;
  topic: string;
  reason: string;
  status: RequestStatus;
  requested_by: string | null;
  is_example: boolean;
  created_at: string;
}

export interface SkillEvent {
  id: string;
  member_id: string | null;
  member_name: string;
  skill: string;
  event_date: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      members: { Row: Member; Insert: Partial<Member>; Update: Partial<Member> };
      trainings: { Row: Training; Insert: Partial<Training>; Update: Partial<Training> };
      training_plans: { Row: TrainingPlan; Insert: Partial<TrainingPlan>; Update: Partial<TrainingPlan> };
      training_requests: { Row: TrainingRequest; Insert: Partial<TrainingRequest>; Update: Partial<TrainingRequest> };
      skill_events: { Row: SkillEvent; Insert: Partial<SkillEvent>; Update: Partial<SkillEvent> };
    };
  };
}
