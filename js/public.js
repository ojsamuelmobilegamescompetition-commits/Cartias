document.addEventListener("DOMContentLoaded", async () => {
  const $ = s => document.querySelector(s);
  const text = (id, value) => { const el=document.getElementById(id); if(el && value!==undefined && value!==null && value!=="") el.textContent=String(value); };
  const attr = (id, name, value) => { const el=document.getElementById(id); if(el && value) el.setAttribute(name,value); };
  $("#year").textContent = new Date().getFullYear();
  $("#menuToggle").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
  if (!window.schoolDbReady) {
    $("#admissionFeedback").textContent = window.schoolConfigError;
    $("#portalFeedback").textContent = "Portal sign-in will be available after Supabase setup.";
    return;
  }
  const db=window.schoolDb;
  const {data:settings,error:settingsError}=await db.from("site_settings").select("key,value");
  if(settingsError) console.error("Could not load website settings",settingsError);
  const s=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
  const map={
    school_name:["schoolName","footerSchoolName","copyrightName"],tagline:["brandTagline"],hero_eyebrow:["heroEyebrow"],hero_title:["heroTitle"],hero_text:["heroText"],
    hero_proof1:["heroProof1"],hero_proof2:["heroProof2"],hero_proof3:["heroProof3"],hero_note_title:["heroNoteTitle"],
    stat_students:["statStudents"],stat_students_label:["statStudentsLabel"],stat_teachers:["statTeachers"],stat_teachers_label:["statTeachersLabel"],stat_years:["statYears"],stat_years_label:["statYearsLabel"],stat_programmes:["statProgrammes"],stat_programmes_label:["statProgrammesLabel"],
    about_eyebrow:["aboutEyebrow"],about_title:["aboutTitle"],welcome_text:["welcomeText"],promise_eyebrow:["promiseEyebrow"],promise_title:["promiseTitle"],promise_text:["promiseText"],
    academics_eyebrow:["academicsEyebrow"],academics_title:["academicsTitle"],academics_intro:["academicsIntro"],life_eyebrow:["lifeEyebrow"],life_title:["lifeTitle"],life_intro:["lifeIntro"],
    admissions_eyebrow:["admissionsEyebrow"],admissions_title:["admissionsTitle"],admissions_intro:["admissionsIntro"],admissions_bullet1:["admissionsBullet1"],admissions_bullet2:["admissionsBullet2"],admissions_bullet3:["admissionsBullet3"],
    admission_form_title:["admissionFormTitle"],admission_form_note:["admissionFormNote"],admission_submit_text:["admissionSubmitText"],news_eyebrow:["newsEyebrow"],news_title:["newsTitle"],news_link_text:["newsLink"],
    portal_eyebrow:["portalEyebrow"],portal_title:["portalTitle"],portal_intro:["portalIntro"],portal_form_title:["portalFormTitle"],portal_submit_text:["portalSubmitText"],portal_help_text:["portalHelpText"],
    contact_eyebrow:["contactEyebrow"],contact_title:["contactTitle"],contact_intro:["contactIntro","contactAddress"],phone:["contactPhone"],email:["contactEmail"],address:["contactLocation"],footer_tagline:["footerTagline"],footer_brand_line:["footerBrandLine"],footer_admin_link:["footerAdminLink"]
  };
  Object.entries(map).forEach(([key,ids])=>ids.forEach(id=>text(id,s[key])));
  const navMap={nav_about:"navAbout",nav_academics:"navAcademics",nav_admissions:"navAdmissions",nav_life:"navLife",nav_news:"navNews",nav_contact:"navContact",nav_portal:"navPortal"};
  Object.entries(navMap).forEach(([k,id])=>text(id,s[k]));
  attr("aboutLink","href",s.about_link_url);text("aboutLink",s.about_link_text);
  attr("newsLink","href",s.news_link_url);text("newsLink",s.news_link_text);
  [1,2].forEach(n=>{text("heroButton"+n,s["hero_button"+n]);attr("heroButton"+n,"href",s["hero_button"+n+"_url"]);});
  text("admissionStatus",s.admissions_open==="false"?"Applications currently closed":(s.hero_note_text||"Applications open"));
  const logo=$("#schoolLogo"), mark=$("#schoolMark");
  if(s.logo_url && logo){logo.src=s.logo_url;logo.hidden=false;if(mark)mark.hidden=true;logo.onerror=()=>{logo.hidden=true;if(mark)mark.hidden=false;};}
  if(s.hero_image_url) document.querySelector(".hero")?.style.setProperty("background-image",`linear-gradient(90deg,rgba(8,24,48,.78),rgba(8,24,48,.25)),url("${String(s.hero_image_url).replace(/[\"\\]/g,'')}")`);
  if(s.theme_primary)document.documentElement.style.setProperty("--primary",s.theme_primary);
  if(s.theme_accent)document.documentElement.style.setProperty("--accent",s.theme_accent);
  if(s.school_name)document.title=`${s.school_name} | Home`;
  const renderCards=(id,raw,kind)=>{if(!raw)return;try{const arr=JSON.parse(raw);if(!Array.isArray(arr))return;const host=$("#"+id);if(!host)return;host.innerHTML=arr.map((x,i)=>kind==="programme"?`<article class="info-card"><span class="card-number">${String(i+1).padStart(2,"0")}</span><h3>${escapeHtml(x.title||"")}</h3><p>${escapeHtml(x.description||"")}</p></article>`:`<article class="life-tile tile-${["one","two","three"][i%3]}" ${x.image_url?`style="background-image:linear-gradient(#0005,#0005),url('${escapeHtml(x.image_url)}')"`:""}><span>${escapeHtml(x.label||"")}</span><h3>${escapeHtml(x.title||"")}</h3></article>`).join("");}catch(e){console.warn("Invalid website cards JSON",e);}};
  renderCards("programmeCards",s.programme_cards,"programme");renderCards("lifeTiles",s.life_tiles,"life");
  // Form labels are editable while preserving the input elements and their names.
  const labelMap={admission_name_label:"admissionNameLabel",admission_class_label:"admissionClassLabel",admission_guardian_label:"admissionGuardianLabel",admission_email_label:"admissionEmailLabel",admission_phone_label:"admissionPhoneLabel",admission_message_label:"admissionMessageLabel"};
  Object.entries(labelMap).forEach(([key,id])=>{const el=$("#"+id);if(el&&s[key]){const input=el.querySelector("input,textarea");el.textContent=s[key];if(input)el.appendChild(input);}});
  const {data:news}=await db.from("announcements").select("id,title,body,category,created_at").eq("published",true).order("created_at",{ascending:false}).limit(3);
  const newsBox=$("#newsCards");if(news?.length)newsBox.innerHTML=news.map(n=>`<article class="info-card"><span class="eyebrow">${escapeHtml(n.category||"SCHOOL NEWS")}</span><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml((n.body||"").slice(0,180))}</p><small>${new Date(n.created_at).toLocaleDateString()}</small></article>`).join("");
  const {data:events}=await db.from("school_events").select("id,title,description,starts_at,location").eq("published",true).gte("starts_at",new Date().toISOString()).order("starts_at").limit(3);
  if(events?.length)newsBox.insertAdjacentHTML("beforeend",events.map(e=>`<article class="info-card event-card"><span class="eyebrow">UPCOMING EVENT · ${new Date(e.starts_at).toLocaleDateString()}</span><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.description||e.location||"")}</p></article>`).join(""));
  $("#admissionForm").addEventListener("submit",async ev=>{ev.preventDefault();const form=ev.currentTarget,data=Object.fromEntries(new FormData(form));if(s.admissions_open==="false"){$("#admissionFeedback").textContent="Admissions are currently closed. Please contact the school.";return;}const {error}=await db.from("admissions").insert({...data,status:"pending"});$("#admissionFeedback").textContent=error?`Could not submit: ${error.message}`:"Application enquiry submitted. The admissions team will contact you.";if(!error)form.reset();});
  $("#portalLogin").addEventListener("submit",async ev=>{ev.preventDefault();const f=new FormData(ev.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});$("#portalFeedback").textContent=error?error.message:"Signed in. Your portal dashboard is being prepared; contact the school if you need access enabled.";if(!error)setTimeout(()=>location.href="admin.html",900);});
});
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
