document.addEventListener("DOMContentLoaded", async () => {
  const $ = s => document.querySelector(s), db = window.schoolDb;
  const loginScreen = $("#loginScreen"), shell = $("#adminShell");
  if (!window.schoolDbReady) { $("#loginFeedback").textContent = window.schoolConfigError; return; }
  const { data: { session } } = await db.auth.getSession();
  if (session) await enter(session.user);
  $("#adminLogin").addEventListener("submit", async ev => {
    ev.preventDefault(); const f = new FormData(ev.currentTarget);
    const { data, error } = await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});
    if (error) $("#loginFeedback").textContent = error.message; else await enter(data.user);
  });
  $("#signOut").addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });
  db.auth.onAuthStateChange((_event, session) => { if (!session) { shell.classList.add("hidden"); loginScreen.classList.remove("hidden"); } });
  document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
  $("#refreshAdmissions").addEventListener("click", loadAdmissions);
  $("#refreshAnnouncements").addEventListener("click", loadAnnouncements);
  $("#refreshEvents").addEventListener("click", loadEvents);
  $("#announcementForm").addEventListener("submit", saveAnnouncement);
  $("#eventForm").addEventListener("submit", saveEvent);
  async function enter(user) {
    const { data: profile, error } = await db.from("profiles").select("full_name,role,active").eq("id",user.id).single();
    if (error || !profile || profile.active === false || !["super_admin","school_owner","principal","vice_principal","admission_officer","accountant","teacher","librarian","hr_manager","receptionist"].includes(profile.role)) {
      await db.auth.signOut(); $("#loginFeedback").textContent = "This account has no active school staff profile. Ask the school owner to assign your role."; return;
    }
    if (!["super_admin","school_owner","principal","vice_principal","admission_officer"].includes(profile.role)) {
      $("#loginFeedback").textContent = `Signed in as ${profile.role}. This starter admin workspace currently grants dashboard access to school leadership and admissions roles.`;
      await db.auth.signOut(); return;
    }
    loginScreen.classList.add("hidden"); shell.classList.remove("hidden");
    $("#adminUserName").textContent = profile.full_name || user.email; $("#adminUserRole").textContent = profile.role.replaceAll("_"," ");
    $("#userInitials").textContent = (profile.full_name || user.email).slice(0,1).toUpperCase();
    $("#connectionState").textContent = "Connected"; $("#adminSchoolName").textContent = window.SCHOOL_CONFIG.SCHOOL_NAME || "School Admin";
    await Promise.all([loadOverview(),loadAdmissions(),loadAnnouncements(),loadEvents(),loadWebsite()]);
  }
  function showView(name) {
    document.querySelectorAll(".admin-view").forEach(v => v.classList.add("hidden"));
    $(`#view-${name}`)?.classList.remove("hidden");
    document.querySelectorAll(".side-link").forEach(b => b.classList.toggle("active",b.dataset.view===name));
    const label = document.querySelector(`[data-view="${name}"] span`)?.textContent || "Overview";
    $("#viewTitle").textContent = label;
  }
  async function loadOverview() {
    const [a,n,e] = await Promise.all([db.from("admissions").select("id,status,applicant_name,applying_for,created_at").order("created_at",{ascending:false}).limit(5),db.from("announcements").select("id",{count:"exact",head:true}).eq("published",true),db.from("school_events").select("id",{count:"exact",head:true}).eq("published",true).gte("starts_at",new Date().toISOString())]);
    const admissions = a.data || [], pending = admissions.filter(x=>x.status==="pending");
    $("#metricAdmissions").textContent = "—"; $("#metricPending").textContent = "—";
    const {count:ac} = await db.from("admissions").select("id",{count:"exact",head:true});
    const {count:pc} = await db.from("admissions").select("id",{count:"exact",head:true}).eq("status","pending");
    $("#metricAdmissions").textContent = ac ?? 0; $("#metricPending").textContent = pc ?? 0;
    $("#metricNews").textContent = n.count ?? 0; $("#metricEvents").textContent = e.count ?? 0;
    $("#pendingBadge").textContent = pc ?? 0;
    $("#recentAdmissions").innerHTML = admissions.length ? table(["Applicant","Class","Status"],admissions.map(x=>[x.applicant_name,x.applying_for,badge(x.status)])) : "<p class='muted pad'>No applications yet.</p>";
  }
  async function loadAdmissions() {
    const {data,error}=await db.from("admissions").select("*").order("created_at",{ascending:false});
    if(error){$("#admissionsTable").textContent=error.message;return;}
    $("#admissionsTable").innerHTML = data?.length ? `<table><thead><tr><th>Applicant</th><th>Class</th><th>Guardian</th><th>Contact</th><th>Status</th><th>Decision</th></tr></thead><tbody>${data.map(x=>`<tr><td><strong>${esc(x.applicant_name)}</strong><small>${new Date(x.created_at).toLocaleDateString()}</small></td><td>${esc(x.applying_for)}</td><td>${esc(x.guardian_name)}</td><td>${esc(x.email)}<small>${esc(x.phone)}</small></td><td>${badge(x.status)}</td><td><button class="small-button" data-decision="${x.id}" data-status="approved">Approve</button> <button class="small-button danger" data-decision="${x.id}" data-status="rejected">Reject</button></td></tr>`).join("")}</tbody></table>` : "<p class='muted pad'>No applications received.</p>";
    $("#admissionsTable").querySelectorAll("[data-decision]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await db.from("admissions").update({status:b.dataset.status}).eq("id",b.dataset.decision);if(error)alert(error.message);else{await loadAdmissions();await loadOverview();}}));
  }
  async function loadAnnouncements() {
    const {data,error}=await db.from("announcements").select("*").order("created_at",{ascending:false});
    $("#announcementsList").innerHTML=error?esc(error.message):(data||[]).map(x=>`<div class="list-item"><div><strong>${esc(x.title)}</strong><small>${esc(x.category)} · ${x.published?"Published":"Draft"}</small></div><div><button class="small-button" data-edit-news="${x.id}">Edit</button> <button class="small-button danger" data-delete-news="${x.id}">Delete</button></div></div>`).join("")||"<p class='muted'>No announcements.</p>";
    (data||[]).forEach(x=>{$(`[data-edit-news="${x.id}"]`)?.addEventListener("click",()=>{const f=$("#announcementForm");Object.entries({id:x.id,title:x.title,category:x.category,body:x.body,published:x.published}).forEach(([k,v])=>{if(f.elements[k].type==="checkbox")f.elements[k].checked=v;else f.elements[k].value=v??"";});});$(`[data-delete-news="${x.id}"]`)?.addEventListener("click",()=>removeRow("announcements",x.id,loadAnnouncements));});
  }
  async function saveAnnouncement(ev){ev.preventDefault();const f=ev.currentTarget,d=Object.fromEntries(new FormData(f));d.published=f.elements.published.checked;delete d.id;const id=f.elements.id.value;const q=id?db.from("announcements").update(d).eq("id",id):db.from("announcements").insert(d);const {error}=await q;$("#announcementFeedback").textContent=error?error.message:"Saved successfully.";if(!error){f.reset();f.elements.id.value="";await loadAnnouncements();await loadOverview();}}
  async function loadEvents(){const {data,error}=await db.from("school_events").select("*").order("starts_at");$("#eventsList").innerHTML=error?esc(error.message):(data||[]).map(x=>`<div class="list-item"><div><strong>${esc(x.title)}</strong><small>${new Date(x.starts_at).toLocaleString()} · ${x.published?"Published":"Draft"}</small></div><button class="small-button danger" data-delete-event="${x.id}">Delete</button></div>`).join("")||"<p class='muted'>No events.</p>";(data||[]).forEach(x=>$(`[data-delete-event="${x.id}"]`)?.addEventListener("click",()=>removeRow("school_events",x.id,loadEvents)));}
  async function saveEvent(ev){ev.preventDefault();const f=ev.currentTarget,d=Object.fromEntries(new FormData(f));d.published=f.elements.published.checked;d.starts_at=new Date(d.starts_at).toISOString();delete d.id;const {error}=await db.from("school_events").insert(d);$("#eventFeedback").textContent=error?error.message:"Event saved.";if(!error){f.reset();await loadEvents();await loadOverview();}}
  const websiteGroups = [
    ["Brand & appearance",[
      ["school_name","Official school name"],["tagline","Short tagline"],["logo_url","Logo image URL"],["favicon_url","Browser icon image URL"],
      ["theme_primary","Primary colour (hex, e.g. #102b52)"],["theme_accent","Accent colour (hex, e.g. #d5a84b)"],["hero_image_url","Homepage hero background image URL"]]],
    ["Navigation",[["nav_about","About link text"],["nav_academics","Academics link text"],["nav_admissions","Admissions link text"],["nav_life","School Life link text"],["nav_news","News & Events link text"],["nav_contact","Contact link text"],["nav_portal","Portal link text"]]],
    ["Hero section",[["hero_eyebrow","Small heading"],["hero_title","Main headline"],["hero_text","Introduction"],["hero_button1","First button text"],["hero_button1_url","First button destination (e.g. #admissions)"],["hero_button2","Second button text"],["hero_button2_url","Second button destination (e.g. #about)"],["hero_proof1","Trust point 1"],["hero_proof2","Trust point 2"],["hero_proof3","Trust point 3"],["hero_note_title","Admissions badge title"],["hero_note_text","Admissions badge message"]]],
    ["Statistics",[["stat_students","Student number"],["stat_students_label","Student label"],["stat_teachers","Teacher number"],["stat_teachers_label","Teacher label"],["stat_years","Years number"],["stat_years_label","Years label"],["stat_programmes","Programme number"],["stat_programmes_label","Programme label"]]],
    ["About & school promise",[["about_eyebrow","About small heading"],["about_title","About headline"],["welcome_text","Welcome paragraph"],["about_link_text","About link text"],["about_link_url","About link destination"],["promise_eyebrow","Promise small heading"],["promise_title","Promise headline"],["promise_text","Promise paragraph"]]],
    ["Academics",[["academics_eyebrow","Academics small heading"],["academics_title","Academics headline"],["academics_intro","Academics introduction"],["programme_cards","Programme cards (JSON array: title, description)","textarea"]]],
    ["School life",[["life_eyebrow","School life small heading"],["life_title","School life headline"],["life_intro","School life introduction"],["life_tiles","School life cards (JSON array: label, title, image_url)","textarea"]]],
    ["Admissions",[["admissions_eyebrow","Admissions small heading"],["admissions_title","Admissions headline"],["admissions_intro","Admissions introduction"],["admissions_bullet1","Admissions benefit 1"],["admissions_bullet2","Admissions benefit 2"],["admissions_bullet3","Admissions benefit 3"],["admission_form_title","Application form title"],["admission_form_note","Application form note"],["admission_name_label","Applicant name label"],["admission_class_label","Class label"],["admission_guardian_label","Parent/guardian label"],["admission_email_label","Email label"],["admission_phone_label","Phone label"],["admission_message_label","Message label"],["admission_submit_text","Submit button text"],["admissions_open","Admissions status (true or false)","select"]]],
    ["News & events",[["news_eyebrow","News small heading"],["news_title","News headline"],["news_link_text","News link text"]]],
    ["Portal",[["portal_eyebrow","Portal small heading"],["portal_title","Portal headline"],["portal_intro","Portal introduction"],["portal_form_title","Portal sign-in title"],["portal_submit_text","Portal button text"],["portal_help_text","Portal help text"]]],
    ["Contact",[["contact_eyebrow","Contact small heading"],["contact_title","Contact headline"],["contact_intro","Contact introduction"],["phone","School phone"],["email","Official email"],["address","School address"]]],
    ["Footer",[["footer_tagline","Footer statement"],["footer_brand_line","Footer brand strapline"],["footer_admin_link","Admin link text"]]]
  ];
  renderWebsiteEditor();
  $("#publishWebsiteButton").addEventListener("click", saveWebsite);
  function renderWebsiteEditor(){
    const host=$("#websiteEditorFields");
    host.innerHTML=websiteGroups.map(([group,fields])=>`<details class="panel" open style="margin:14px 0;padding:16px"><summary style="cursor:pointer;font-weight:700">${esc(group)}</summary><div class="admin-columns" style="margin-top:14px">${fields.map(([key,label,type])=>`<label>${esc(label)}${type==="textarea"?`<textarea data-site-key="${key}" rows="5" placeholder='${key==="programme_cards"?'[{"title":"Early Years","description":"Description"}]':'Enter JSON array'}'></textarea>`:type==="select"?`<select data-site-key="${key}"><option value="true">Open</option><option value="false">Closed</option></select>`:`<input data-site-key="${key}" ${key==="email"?'type="email"': 'type="text"'}>`}</label>`).join("")}</div></details>`).join("");
  }
  async function loadWebsite(){
    const {data,error}=await db.from("site_settings").select("key,value");
    if(error){$("#websiteFeedback").textContent=error.message;return;}
    const s=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
    document.querySelectorAll("[data-site-key]").forEach(el=>{const v=s[el.dataset.siteKey];if(v!==undefined)el.value=String(v);});
    if(s.school_name)$("#adminSchoolName").textContent=s.school_name;
  }
  async function saveWebsite(){
    const updates=[...document.querySelectorAll("[data-site-key]")].map(el=>({key:el.dataset.siteKey,value:el.value.trim()}));
    for(const row of updates){if(["programme_cards","life_tiles"].includes(row.key)&&row.value){try{const parsed=JSON.parse(row.value);if(!Array.isArray(parsed))throw new Error("must be a JSON array");}catch(e){$("#websiteFeedback").textContent=`${row.key}: enter a valid JSON array (${e.message}).`;return;}}}
    const {error}=await db.from("site_settings").upsert(updates,{onConflict:"key"});
    $("#websiteFeedback").textContent=error?`Could not publish: ${error.message}`:"All website settings published successfully. Refresh your public website to see the changes.";
    if(!error)await loadWebsite();
  }
  async function removeRow(tableName,id,refresh){if(!confirm("Delete this record?"))return;const {error}=await db.from(tableName).delete().eq("id",id);if(error)alert(error.message);else{await refresh();await loadOverview();}}
  function table(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}
  function badge(s){return `<span class="badge ${s==="approved"?"good":s==="rejected"?"bad":"pending"}">${esc(s||"pending")}</span>`;}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
});