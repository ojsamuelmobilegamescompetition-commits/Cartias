document.addEventListener("DOMContentLoaded", async () => {
  const $ = (s) => document.querySelector(s);
  $("#year").textContent = new Date().getFullYear();
  $("#menuToggle").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
  if (!window.schoolDbReady) {
    $("#admissionFeedback").textContent = window.schoolConfigError;
    $("#portalFeedback").textContent = "Portal sign-in will be available after Supabase setup.";
    return;
  }
  const db = window.schoolDb;
  const { data: settings } = await db.from("site_settings").select("key,value");
  const s = Object.fromEntries((settings || []).map(x => [x.key, x.value]));
  const put = (id, value) => { if (value !== undefined && value !== null && value !== "") document.getElementById(id).textContent = value; };
  put("schoolName", s.school_name); put("footerSchoolName", s.school_name); put("copyrightName", s.school_name);
  put("contactPhone", s.phone); put("contactEmail", s.email); put("contactLocation", s.address);
  put("contactAddress", s.address); put("heroTitle", s.hero_title); put("heroText", s.hero_text); put("welcomeText", s.welcome_text);
  put("admissionStatus", s.admissions_open === "false" ? "Applications currently closed" : "Applications open");
  document.title = `${s.school_name || "School"} | Home`;
  const { data: news } = await db.from("announcements").select("id,title,body,category,created_at").eq("published", true).order("created_at", {ascending:false}).limit(3);
  const newsBox = $("#newsCards");
  if (news?.length) newsBox.innerHTML = news.map(n => `<article class="info-card"><span class="eyebrow">${escapeHtml(n.category || "SCHOOL NEWS")}</span><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml((n.body || "").slice(0,180))}</p><small>${new Date(n.created_at).toLocaleDateString()}</small></article>`).join("");
  const { data: events } = await db.from("school_events").select("id,title,description,starts_at,location").eq("published",true).gte("starts_at",new Date().toISOString()).order("starts_at").limit(3);
  if (events?.length) newsBox.insertAdjacentHTML("beforeend", events.map(e => `<article class="info-card event-card"><span class="eyebrow">UPCOMING EVENT · ${new Date(e.starts_at).toLocaleDateString()}</span><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.description || e.location || "")}</p></article>`).join(""));
  $("#admissionForm").addEventListener("submit", async ev => {
    ev.preventDefault(); const form = ev.currentTarget; const data = Object.fromEntries(new FormData(form));
    if (s.admissions_open === "false") { $("#admissionFeedback").textContent = "Admissions are currently closed. Please contact the school."; return; }
    const { error } = await db.from("admissions").insert({...data, status:"pending"});
    $("#admissionFeedback").textContent = error ? `Could not submit: ${error.message}` : "Application enquiry submitted. The admissions team will contact you.";
    if (!error) form.reset();
  });
  $("#portalLogin").addEventListener("submit", async ev => {
    ev.preventDefault(); const f = new FormData(ev.currentTarget);
    const { error } = await db.auth.signInWithPassword({email:f.get("email"), password:f.get("password")});
    $("#portalFeedback").textContent = error ? error.message : "Signed in. Your portal dashboard is being prepared; contact the school if you need access enabled.";
    if (!error) setTimeout(() => location.href = "admin.html", 900);
  });
});
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }