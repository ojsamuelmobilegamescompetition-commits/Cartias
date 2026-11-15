SCHOOL WEBSITE - COMPLETE PUBLIC CONTENT EDITOR

Replace these files in your existing GitHub project:
- admin.html -> project root/admin.html
- index.html -> project root/index.html
- admin.js -> project root/js/admin.js
- public.js -> project root/js/public.js

Keep your existing css/styles.css, js/config.js, js/supabase-client.js and all other project files. Do not upload this ZIP as a single file.

The editor saves all fields to the existing Supabase site_settings table (key, value). It does not require a schema change if your current table has those columns and allows the signed-in school owner to select/upsert rows under its RLS policies. If publishing fails with a permission/RLS error, the site_settings table policies must permit authorised school owners to read and update settings. Never expose a service-role key in browser JavaScript.

For programme_cards and life_tiles, enter a JSON array. Example programme_cards:
[{"title":"Early Years","description":"Play-based learning."},{"title":"Primary School","description":"Strong foundations."}]

Example life_tiles:
[{"label":"01 / CREATE","title":"Arts, music & creativity","image_url":"https://example.com/arts.jpg"},{"label":"02 / COMPETE","title":"Sport & teamwork","image_url":"https://example.com/sport.jpg"}]

Image fields accept publicly accessible image URLs. Direct phone photo upload requires a Supabase Storage bucket and upload permissions, and is not included in this URL-based editor.
