/* Wood Law Offices — shared script. Demo: bookings are stored in this browser only. */
(function(){
  const $ = s => document.querySelector(s);

  // Copy buttons (phone numbers)
  document.querySelectorAll(".copybtn").forEach(b=>b.addEventListener("click",()=>{
    const v=b.dataset.copy;
    try{ navigator.clipboard.writeText(v).then(()=>{b.textContent="Copied";setTimeout(()=>b.textContent="Copy",1500)},()=>{}); }catch(e){}
  }));

  // Booking + staff docket live on consultation.html only
  if(!$("#bookForm")) return;

  const TIMES=["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00"];
  const pad=n=>String(n).padStart(2,"0");
  const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const fmtTime=t=>{const [h,m]=t.split(":").map(Number);return ((h+11)%12+1)+":"+pad(m)+(h<12?" am":" pm");};
  const fmtDate=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});};
  const slotId=(o,d,t)=>o+"_"+d+"_"+t.replace(":","");
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const todayStr=ymd(new Date());

  // Next 15 business days
  const days=[]; { const d=new Date(); while(days.length<15){ d.setDate(d.getDate()+1); if(d.getDay()!==0&&d.getDay()!==6) days.push(new Date(d)); } }

  const KEY="woodlaw-demo-v1";
  const state={office:"Parsons",date:ymd(days[0]),time:null,taken:new Set(),mine:[],all:[],isStaff:false};

  function seed(){
    const d=i=>ymd(days[Math.min(i,days.length-1)]);
    const now=new Date().toISOString();
    return [
      {uid:"example",id:"ex1",name:"Example: Dana Whitfield",phone:"(731) 555-0142",email:"dana@example.com",office:"Parsons",date:d(0),time:"10:00",matter:"Wills, Trusts & Probate",mode:"In person",notes:"Updating a will after a move to Decatur County.",status:"pending",createdAt:now},
      {uid:"example",id:"ex2",name:"Example: Marcus Hale",phone:"(731) 555-0178",email:"",office:"Lexington",date:d(1),time:"14:00",matter:"Real Estate",mode:"In person",notes:"Closing on farmland outside Lexington.",status:"confirmed",createdAt:now},
      {uid:"example",id:"ex3",name:"Example: Tonya Briggs",phone:"(731) 555-0119",email:"tbriggs@example.com",office:"Lexington",date:d(2),time:"09:30",matter:"Social Security Disability",mode:"Phone call",notes:"",status:"pending",createdAt:now},
      {uid:"example",id:"ex4",name:"Example: Ray Odom",phone:"(731) 555-0163",email:"",office:"Parsons",date:d(3),time:"15:00",matter:"Family Law",mode:"In person",notes:"Parenting plan question.",status:"confirmed",createdAt:now}
    ];
  }
  function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)); if(v&&Array.isArray(v.all)) return v.all; }catch(e){} return seed(); }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify({all:state.all})); }catch(e){} }
  function sync(){
    state.taken=new Set(state.all.filter(r=>r.status!=="declined").map(r=>slotId(r.office,r.date,r.time)));
    state.mine=state.all.filter(r=>r.uid==="local");
  }

  // ----- booking form -----
  function renderDays(){
    $("#days").innerHTML=days.map(d=>{
      const s=ymd(d);
      return `<button type="button" data-d="${s}" aria-pressed="${s===state.date}"><small>${d.toLocaleDateString(undefined,{weekday:"short"})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString(undefined,{month:"short"})}</small></button>`;
    }).join("");
  }
  function renderTimes(){
    $("#times").innerHTML=TIMES.map(t=>{
      const taken=state.taken.has(slotId(state.office,state.date,t));
      if(taken&&state.time===t) state.time=null;
      return `<button type="button" data-t="${t}" aria-pressed="${t===state.time}" ${taken?`disabled aria-label="${fmtTime(t)} unavailable"`:""}>${fmtTime(t)}</button>`;
    }).join("");
    renderSummary();
  }
  function renderSummary(){
    $("#sumOffice").textContent=state.office;
    $("#sumMatter").textContent=$("#matter").value;
    $("#sumMode").textContent=document.querySelector("input[name=mode]:checked").value;
    $("#sumTitle").textContent=state.time?fmtDate(state.date)+" · "+fmtTime(state.time):"Choose a time";
  }
  function renderMine(){
    const list=state.mine.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    $("#myWrap").hidden=!list.length;
    $("#myList").innerHTML=list.map(r=>`<div class="item"><span>${fmtDate(r.date)} · ${fmtTime(r.time)} · ${esc(r.office)}</span><span class="pill ${r.status}">${r.status}</span></div>`).join("");
  }
  function msg(text,kind){ const m=$("#formMsg"); m.hidden=false; m.className="notice"+(kind?" "+kind:""); m.textContent=text; }

  $("#days").addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return; state.date=b.dataset.d; state.time=null; renderDays(); renderTimes();});
  $("#times").addEventListener("click",e=>{const b=e.target.closest("button"); if(!b||b.disabled) return; state.time=b.dataset.t; renderTimes();});
  document.querySelectorAll("input[name=office]").forEach(r=>r.addEventListener("change",()=>{state.office=r.value; state.time=null; renderTimes();}));
  document.querySelectorAll("input[name=mode]").forEach(r=>r.addEventListener("change",renderSummary));
  $("#matter").addEventListener("change",renderSummary);

  // Preselect office from a link like consultation.html?office=Lexington
  try{ const o=new URLSearchParams(location.search).get("office"); if(o==="Lexington"||o==="Parsons"){ state.office=o; document.querySelector(`input[name=office][value=${o}]`).checked=true; } }catch(e){}

  $("#bookForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("#fname").value.trim(), phone=$("#fphone").value.trim(), email=$("#femail").value.trim();
    if(!state.time){ msg("Choose an available time before sending your request.","bad"); return; }
    if(!name||!phone){ msg("Add your name and a phone number so the office can contact you.","bad"); return; }
    const sid=slotId(state.office,state.date,state.time);
    if(state.taken.has(sid)){ msg("That time is no longer available. Please choose another.","bad"); state.time=null; renderTimes(); return; }
    const req={uid:"local",id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,phone,email,
      office:state.office,date:state.date,time:state.time,matter:$("#matter").value,
      mode:document.querySelector("input[name=mode]:checked").value,notes:$("#fnotes").value.trim(),
      status:"pending",createdAt:new Date().toISOString()};
    state.all.push(req); sync(); save();
    msg(`Request received for ${fmtDate(req.date)} at ${fmtTime(req.time)}, ${req.office} office. The office will contact you to confirm. (Demo: saved in this browser only.)`,"ok");
    state.time=null; $("#fnotes").value=""; renderTimes(); renderMine(); renderStaff();
  });

  // ----- staff docket -----
  function renderStaff(){
    if(!state.isStaff) return;
    const fo=$("#fOffice").value, fs=$("#fStatus").value;
    const rows=state.all.filter(r=>(!fo||r.office===fo)&&(!fs||r.status===fs)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    $("#kPending").textContent=state.all.filter(r=>r.status==="pending").length;
    $("#kConfirmed").textContent=state.all.filter(r=>r.status==="confirmed"&&r.date>=todayStr).length;
    $("#kPar").textContent=state.all.filter(r=>r.office==="Parsons"&&r.status!=="declined").length;
    $("#kLex").textContent=state.all.filter(r=>r.office==="Lexington"&&r.status!=="declined").length;
    const btn=(r,act,cls,label)=>`<button class="btn btn-sm ${cls}" data-act="${act}" data-id="${esc(r.id)}">${label}</button>`;
    $("#docket").innerHTML=rows.length?rows.map(r=>`<tr>
      <td class="when">${fmtDate(r.date)}<div class="sub">${fmtTime(r.time)} · ${esc(r.mode)}</div></td>
      <td>${esc(r.office)}</td>
      <td><b>${esc(r.name)}</b><div class="sub copyable">${esc(r.phone)}</div><div class="sub">${esc(r.email)}</div></td>
      <td>${esc(r.matter)}${r.notes?`<div class="sub">${esc(r.notes)}</div>`:""}</td>
      <td><span class="pill ${r.status}">${r.status}</span></td>
      <td><div class="acts">
        ${r.status==="pending"?btn(r,"confirmed","ok","Confirm")+btn(r,"declined","no","Decline"):""}
        ${r.status==="confirmed"?btn(r,"completed","done","Mark completed")+btn(r,"declined","no","Cancel"):""}
      </div></td></tr>`).join(""):`<tr><td colspan="6" class="empty">No appointment requests yet. New requests from the form above appear here.</td></tr>`;
  }
  $("#fOffice").addEventListener("change",renderStaff);
  $("#fStatus").addEventListener("change",renderStaff);
  $("#docket").addEventListener("click",e=>{
    const b=e.target.closest("button[data-act]"); if(!b) return;
    const row=state.all.find(r=>r.id===b.dataset.id); if(!row) return;
    row.status=b.dataset.act; row.reviewedAt=new Date().toISOString();
    sync(); save(); renderStaff(); renderMine(); renderTimes();
  });

  function setStaff(on){
    state.isStaff=on;
    $("#gate").hidden=on; $("#docketWrap").hidden=!on;
    try{ on?sessionStorage.setItem(KEY+"-staff","1"):sessionStorage.removeItem(KEY+"-staff"); }catch(e){}
    if(on) renderStaff();
  }
  $("#gate").addEventListener("submit",e=>{
    e.preventDefault();
    const ok=$("#pass").value.trim()==="wood1982";
    $("#gateMsg").hidden=ok; if(ok){ $("#pass").value=""; setStaff(true); }
  });
  $("#signOut").addEventListener("click",()=>setStaff(false));
  $("#resetDemo").addEventListener("click",()=>{ state.all=seed(); sync(); save(); renderStaff(); renderMine(); renderTimes(); });

  state.all=load(); sync();
  let signedIn=false; try{ signedIn=sessionStorage.getItem(KEY+"-staff")==="1"; }catch(e){}
  setStaff(signedIn);
  renderDays(); renderTimes(); renderMine();
})();
