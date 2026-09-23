-- Seed data migrated from the original Claude Artifact ("Learning & Development
-- Tracker" / team-roster.html), so this project starts with the same 30-person
-- roster instead of an empty table. Run this once in Supabase's SQL Editor,
-- AFTER supabase/schema.sql. Safe to run once; running it twice will duplicate
-- these rows (there's no unique constraint on name).

insert into public.members (
name, designation, role_type, projects, experience_level, allocation_pct,
  reporting_manager, joining_date, prior_experience_years, employment_type,
  skills, certifications, performance_rating, career_note, email, phone,
  location, timezone, availability_status, attendance_rating, attendance_note,
  attitude_note, notes, is_example
) values
('Abhijith K Sabu', 'Software Engineer', 'Developer', '{"GoGym"}', 'Senior (5–8 yrs)', 50, '', '2023-04-25', 2.3, 'FTE', '{"Flutter"}', '', '', '', '', '', '', '', 'Partially Allocated', 'Good', '', '', '[]'::jsonb, false),
('Abin Abraham', 'Senior Software Engineer', 'Developer', '{"GoGym"}', 'Mid (2–5 yrs)', NULL, '', '2025-10-30', 3, '', '{"Angular"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Akhil Ashok', 'Staff Software Engineer', 'Developer', '{"Slavic"}', 'Senior (5–8 yrs)', NULL, '', '2025-08-21', 6, '', '{"Angular"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Althaf', 'Staff Software Engineer', 'Developer', '{"Slavic"}', 'Senior (5–8 yrs)', NULL, '', '2022-11-01', 4.4, '', '{"Angular"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Anuvindha Rajeev', 'Business Analyst', 'BA', '{"Slavic Web & Mobile"}', 'Mid (2–5 yrs)', NULL, '', '2022-11-01', 1.1, '', '{"Project Management"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Gokul', 'Software Development Engineer Test', 'QA', '{"Slavic Mobile"}', 'Lead / Principal (8+ yrs)', NULL, '', '2023-10-16', 6, '', '{"Manual & Automation Testing"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Gopika Gopan', 'Scrum Master', 'Scrum Master / PM', '{"GoGym"}', 'Lead / Principal (8+ yrs)', NULL, '', '2022-11-01', 6.5, '', '{"Project Management"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Harikrishnan A P', 'Senior Software Engineer', 'Developer', '{"Slavic"}', 'Mid (2–5 yrs)', NULL, '', '2025-11-20', 3.3, '', '{"Salesforce"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Indu M', 'Senior QA Engineer', 'QA', '{"GoGym"}', 'Senior (5–8 yrs)', NULL, '', '2025-05-26', 6.4, '', '{"Manual & Automation Testing"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Iwin Tom', 'Staff Software Engineer', 'Developer', '{"Slavic"}', 'Senior (5–8 yrs)', NULL, '', '2025-09-01', 6, '', '{"Java"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Jayasree Kuniyil', 'Senior Delivery Manager', 'Management', '{"GoGym","Slavic"}', 'Lead / Principal (8+ yrs)', NULL, '', '2022-11-01', 16.1, '', '{"Management"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Jewel J Mathew', 'Sr QA Automation Engineer', 'QA', '{"GoGym"}', 'Senior (5–8 yrs)', NULL, '', '2025-09-01', 4.6, '', '{"Manual & Automation Testing"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Jibin', 'Senior Software Engineer', 'Developer', '{"Slavic"}', 'Senior (5–8 yrs)', NULL, '', '2025-09-18', 4, '', '{"Angular"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Kiran Pradeep', 'Staff Software Engineer', 'Developer', '{"GoGym"}', 'Lead / Principal (8+ yrs)', NULL, '', '2023-03-20', 4.7, '', '{"Dot Net"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Mohammed Riyazdeen', 'Senior Quality Assurance Engineer', 'QA', '{"Slavic"}', 'Senior (5–8 yrs)', NULL, '', '2025-08-11', 5, '', '{"Software testing"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Nobin Joseph', 'Senior QA Automation Engineer', 'QA', '{"Slavic"}', 'Senior (5–8 yrs)', NULL, '', '2025-11-06', 5.5, '', '{"Software testing"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Premji T', 'Senior Software Engineer', 'Developer', '{"Slavic"}', 'Lead / Principal (8+ yrs)', NULL, '', '2026-01-29', 9, '', '{"Angular"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Reshma Bosco', 'Sr.Software Engineer', 'Developer', '{"GoGym"}', 'Senior (5–8 yrs)', NULL, '', '2025-12-01', 5.5, '', '{"Dot Net"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Roshni Rachel .R', 'Software Engineer', 'Developer', '{"Slavic Mobile"}', 'Senior (5–8 yrs)', NULL, '', '2025-05-13', 3.8, '', '{"Mobile- Flutter"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Snidha', 'Senior Staff Software Engineer', 'Developer', '{"Slavic"}', 'Lead / Principal (8+ yrs)', NULL, '', '2023-06-26', 9.7, '', '{"Salesforce"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Sooraj Nair HS', 'Solution Architect', 'Architect', '{"GoGym","Venex","Communication Hub"}', 'Lead / Principal (8+ yrs)', NULL, '', '2023-02-13', 12.8, '', '{"Front end web (Angular, React), Android Native"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Suhail T S', 'Senior Software Engineer', 'Developer', '{"Slavic Mobile"}', 'Senior (5–8 yrs)', NULL, '', '2023-01-01', 4.1, '', '{"Mobile- Flutter","React native","Android","Node"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Swaminathan Soundarajan', 'Software Engineer', 'Developer', '{"GoGym"}', 'Senior (5–8 yrs)', NULL, '', '2023-02-02', 3.2, '', '{"Angular"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Vaisakh K V', 'Associate Principal Engineer', 'Developer', '{"Slavic"}', 'Lead / Principal (8+ yrs)', NULL, '', '2025-11-20', 12.11, '', '{"Java"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Valan Abisha', 'Software Engineer', 'Developer', '{"Slavic"}', 'Mid (2–5 yrs)', NULL, '', '2025-11-27', 3.1, '', '{"Java"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Vineeth Madathil', 'Sr. Staff Software Engineer UX', 'Designer', '{"GoGym"}', 'Lead / Principal (8+ yrs)', NULL, '', '2023-06-12', 12, '', '{"Product Design - UX"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Vishnu Muraleedharan', 'Associate Business Analyst', 'BA', '{"GoGym"}', 'Mid (2–5 yrs)', NULL, '', '2022-11-01', 0.8, '', '{"Project Management"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Vishnuprasad R', 'Sr.Software Engineer', 'Developer', '{"GoGym"}', 'Senior (5–8 yrs)', NULL, '', '2025-05-22', 5.2, '', '{"Dot Net"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Vivek', 'Senior Software Engineer', 'Developer', '{"Slavic"}', 'Lead / Principal (8+ yrs)', NULL, '', '2025-07-07', 10.2, '', '{"Java"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false),
('Yadhukrishna P R', 'Software Engineer', 'QA', '{"Slavic"}', 'Mid (2–5 yrs)', NULL, '', '2026-01-12', 2.3, '', '{"Salesforce"}', '', '', '', '', '', '', '', '', '', '', '', '[]'::jsonb, false);
