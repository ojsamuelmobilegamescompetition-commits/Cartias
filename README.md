# World-Class School Website — Supabase Edition

This package contains a responsive public school website and a separate administration website connected to one Supabase project.

## Included files

- `index.html` — public homepage, admission enquiry form, news/events and portal sign-in.
- `admin.html` — secure staff login and management workspace.
- `css/styles.css` — shared responsive design system.
- `js/config.js` — your Supabase project URL and browser-safe publishable/anon key.
- `js/supabase-client.js` — shared Supabase client setup.
- `js/public.js` — public content and form behaviour.
- `js/admin.js` — admin authentication, admissions decisions, announcements, events and homepage publishing.
- `supabase/schema.sql` — database tables, indexes/constraints and row-level security policies.

## Setup

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase and run all of `supabase/schema.sql`.
3. In Supabase project settings, copy the Project URL and publishable key (or legacy anon key).
4. Put both values in `js/config.js`. Do not use a `service_role` key in browser code.
5. Create the school owner's account in Supabase Authentication.
6. In Supabase SQL Editor, find that user's Auth UID and create the profile:
   ```sql
   insert into public.profiles(id, full_name, role)
   values ('PASTE-AUTH-USER-UUID', 'School Owner', 'school_owner');
   ```
7. Host the whole folder on an HTTPS static host (GitHub Pages, Netlify or Vercel). Keep the folder structure intact.
8. In Supabase Authentication URL Configuration, set your Site URL and add your deployed public and admin URLs to Redirect URLs.
9. Test public admission submission, admin sign-in, admission approval/rejection, announcement publishing and event publishing.

## How the two websites stay connected

Both pages use the same Supabase project. The admin website writes school content and decisions to the database. The public website reads published content from the same database. After a public page refresh, published updates appear.

## Important production requirements

This is a functional foundation, not a complete certified school ERP. The public website, Supabase connection, admission enquiry workflow, staff authentication, admission decisions, announcements, events and homepage settings are implemented. Other blueprint areas are represented in the database and admin navigation but still require complete user interfaces and school-specific workflows.

Before using real student or financial data, complete and independently test:
- Student, parent and teacher portals with record-level access rules (a student/parent must only see their own linked records).
- Class/subject setup, attendance, result entry, grading, report cards and publication.
- Fee invoices, payment gateway integration and server-side webhook verification.
- Document uploads using private Supabase Storage buckets, file validation and signed URLs.
- Email/SMS/WhatsApp delivery through trusted server-side functions.
- Staff payroll/HR, library, transport, hostel, inventory, visitor and alumni modules.
- Data retention, consent, safeguarding, privacy notices and applicable Nigerian data-protection obligations.
- Backups, restore drills, monitoring, rate limiting, CAPTCHA/spam controls and incident response.
- Accessibility review against WCAG 2.2 AA and performance/security testing.

## Security notes

- Row Level Security is enabled on all tables in the schema.
- Public users can submit admission enquiries but cannot read the admissions table.
- Never expose a Supabase service-role key in HTML, JavaScript, GitHub or any browser-delivered file.
- Do not let users select their own role. Privileged profiles must be assigned by the project owner using a trusted process.
- The current starter admin UI is restricted to leadership/admissions roles. The database includes additional role names for later module-specific permissions.
- The example schema is a starting policy model. Have a qualified developer/security reviewer validate every policy before production, especially student, parent, medical/safeguarding, payment and staff data.

## Customisation

Replace the placeholder school name, logo/brand mark, school photographs, contact details, programme descriptions and policies. Use photographs the school owns or is licensed to use. Keep essential information as readable HTML, not image-only posters.
