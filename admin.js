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
  $("#websiteForm").addEventListener("submit", saveWebsite);
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
  async function loadWebsite(){const {data}=await db.from("site_settings").select("key,value");const s=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));const f=$("#websiteForm");Object.keys(s).forEach(k=>{if(f.elements[k])f.elements[k].value=s[k]??"";});}
  async function saveWebsite(ev){ev.preventDefault();const f=ev.currentTarget,d=Object.fromEntries(new FormData(f));const updates=Object.entries(d).map(([key,value])=>({key,value:String(value)}));const {error}=await db.from("site_settings").upsert(updates,{onConflict:"key"});$("#websiteFeedback").textContent=error?error.message:"Website content published. Refresh the public website to see the changes.";if(!error)await loadWebsite();}
  async function removeRow(tableName,id,refresh){if(!confirm("Delete this record?"))return;const {error}=await db.from(tableName).delete().eq("id",id);if(error)alert(error.message);else{await refresh();await loadOverview();}}
  function table(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}
  function badge(s){return `<span class="badge ${s==="approved"?"good":s==="rejected"?"bad":"pending"}">${esc(s||"pending")}</span>`;}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
});