SCHOOL WEBSITE + SCHOOL OPERATIONS DASHBOARD UPDATE

GITHUB: upload/replace these files at the exact paths:
1. admin.html                 -> repository root
2. index.html                 -> repository root (same public website file as before)
3. js/admin.js                -> inside js/
4. js/admin-operations.js     -> inside js/ (NEW FILE)
5. js/public.js               -> inside js/

Keep your existing css/styles.css, js/config.js and js/supabase-client.js.
Do not upload duplicate JavaScript files into the repository root.

SUPABASE DATABASE:
This update uses the existing tables in your schema.sql: admissions, announcements,
school_events, students, school_classes, subjects, attendance, results, fee_payments,
profiles, site_settings and audit_logs. If you have not already run schema.sql in
Supabase SQL Editor, run it once before using these modules. Do not run it repeatedly
as a reset script.

IMAGE STORAGE:
If you have not already done so, run storage-setup.sql once in Supabase SQL Editor.
This is needed for the Website content image upload controls.

DASHBOARD MODULES ADDED/UPGRADED:
- Admissions: update application status (pending, under review, more information,
  approved, rejected).
- News & notices: create, edit, publish/unpublish and delete announcements.
- Events: create, edit, publish/unpublish and delete events.
- Students: add, edit, list and delete student records; assign classes.
- Teachers & staff / Admin team & roles: view existing profiles; school owner can
  change staff roles and active status.
- Academic records: create classes and subjects, record attendance, enter results,
  and view recent results.
- Fees & payments: review existing payment records and update their status after
  verifying evidence with the bank/payment provider.
- Website content: edit homepage fields and upload images directly to Supabase Storage.
- School settings: add, update and delete site_settings key/value entries.
- Activity log: view stored audit_logs entries.

IMPORTANT LIMITATIONS / SECURITY:
- To create a new staff login, first create/invite the user in Supabase Authentication.
  Then create their public.profiles row using the Auth user's UUID. The browser app does
  not create Auth users or assign privileged roles to prevent privilege escalation.
- Staff role editing is restricted by the database RLS policy to school_owner/super_admin.
- Payment status must only be marked verified after independently checking the provider
  dashboard or bank statement. This dashboard is not a payment gateway and does not
  perform server-side payment verification.
- Report-card templates, school-specific grading rules, automated promotion, bulk CSV
  import, parent/student portals and payment gateway integration are not included.
- Database Row Level Security still controls access. If a module shows a permission
  error, check the user's profile role and the policies in your Supabase schema.

After uploading, wait for GitHub Pages/your hosting provider to redeploy. Then open the
admin page, sign out and sign back in, and test with sample records before entering live
student or financial data.
