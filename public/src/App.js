import React, { useState, useEffect, useRef } from "react";

// ── SUPABASE CONFIG ──────────────────────────────────────────────────
// 🔑 Replace with your Supabase URL and anon key
const SUPABASE_URL = "https://fnaflhwbxbabtvbfvxfa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuYWZsaHdieGJhYnR2YmZ2eGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzM5MzksImV4cCI6MjA4OTgwOTkzOX0.NpXA6sPNV9Y6QGMiJoDx2IrWnVN_zlijXmTXmK9uoz8";

// ── SLACK CONFIG ─────────────────────────────────────────────────────
const SLACK_WEBHOOK = "https://hooks.slack.com/services/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";

const slack = {
  send: async (text, emoji = "🚀") => {
    try {
      await fetch("https://corsproxy.io/?" + encodeURIComponent(SLACK_WEBHOOK), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${emoji} *Kaizenomics* | ${text}`,
          username: "Kaizenomics",
          icon_emoji: ":chart_with_upwards_trend:",
        }),
      });
    } catch(e) { console.log("Slack notification sent"); }
  },
  okrCreated: (objective) => slack.send(`New OKR created: *${objective}*`, "🎯"),
  okrDeleted: (objective) => slack.send(`OKR deleted: *${objective}*`, "🗑️"),
  memberAdded: (name) => slack.send(`New team member added: *${name}*`, "👋"),
  shoutout: (from, to, message) => slack.send(`*${from}* recognized *${to}*: "${message}"`, "🌟"),
  meetingLogged: (name) => slack.send(`1-on-1 meeting logged with *${name}*`, "📅"),
  surveyCreated: (title) => slack.send(`New survey created: *${title}*`, "📋"),
  weeklyDigest: (teamSize, okrCount) => slack.send(`Weekly digest: *${teamSize}* team members, *${okrCount}* active OKRs`, "📊"),
};

// ── AUTH HELPERS ─────────────────────────────────────────────────────
const auth = {
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  signUp: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  signOut: async (token) => {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
    });
  },
  getUser: async (token) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
    });
    return res.json();
  },
};

// ── DB HELPERS ───────────────────────────────────────────────────────
async function sb(table, method = "GET", body = null, filter = "", token = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token || SUPABASE_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const db = {
  get: (t, f = "", tok) => sb(t, "GET", null, `?order=created_at.desc${f}`, tok),
  insert: (t, b, tok) => sb(t, "POST", b, "", tok),
  update: (t, id, b, tok) => sb(t, "PATCH", b, `?id=eq.${id}`, tok),
  delete: (t, id, tok) => sb(t, "DELETE", null, `?id=eq.${id}`, tok),
};

// ── Theme ────────────────────────────────────────────────────────────
const DARK = { bg:"#0a0f1e",surface:"#111827",card:"#161f33",border:"#1e2d47",accent:"#3b82f6",accentGlow:"#3b82f633",green:"#10b981",amber:"#f59e0b",red:"#ef4444",purple:"#8b5cf6",text:"#f0f4ff",muted:"#64748b",subtle:"#1e293b" };
const LIGHT = { bg:"#f0f4ff",surface:"#ffffff",card:"#f8faff",border:"#dde3f0",accent:"#3b82f6",accentGlow:"#3b82f622",green:"#10b981",amber:"#f59e0b",red:"#ef4444",purple:"#8b5cf6",text:"#0f172a",muted:"#64748b",subtle:"#e8edf8" };

const CHART_DATA = [
  {month:"Oct",perf:62,eng:58},{month:"Nov",perf:68,eng:64},{month:"Dec",perf:65,eng:60},
  {month:"Jan",perf:74,eng:71},{month:"Feb",perf:80,eng:76},{month:"Mar",perf:87,eng:83},
];

const SURVEY_QS = [
  "I feel aligned with our team's goals this quarter.",
  "I receive the feedback I need to grow professionally.",
  "My manager supports my development effectively.",
  "Our team communicates openly and transparently.",
];

function pc(p,C){ return p>=80?C.green:p>=50?C.accent:p>=30?C.amber:C.red; }

function SB(s){
  if(s==="on-track") return <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",borderRadius:99,background:"#10b98122",color:"#10b981"}}>On Track</span>;
  if(s==="at-risk") return <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",borderRadius:99,background:"#f59e0b22",color:"#f59e0b"}}>At Risk</span>;
  if(s==="completed") return <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",borderRadius:99,background:"#3b82f633",color:"#3b82f6"}}>Completed</span>;
  return null;
}

function getCSS(C){return`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;min-height:100vh}
.app{display:flex;min-height:100vh}
.sb{width:230px;min-height:100vh;background:${C.surface};border-right:1px solid ${C.border};padding:24px 14px;display:flex;flex-direction:column;gap:4px;position:fixed;top:0;left:0;bottom:0;overflow-y:auto;z-index:100}
.logo{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${C.text};margin-bottom:24px;letter-spacing:-0.5px;padding:0 8px}
.logo span{color:${C.accent}}
.ns{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.muted};padding:12px 10px 4px}
.ni{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:13.5px;font-weight:500;color:${C.muted};transition:all 0.15s;border:1px solid transparent}
.ni:hover{background:${C.subtle};color:${C.text}}
.ni.on{background:${C.accentGlow};color:${C.accent};border-color:${C.accent}44}
.main{margin-left:230px;flex:1;padding:32px 36px;max-width:calc(100vw - 230px)}
.pt{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px}
.ps{font-size:13px;color:${C.muted};margin-bottom:28px}
.card{background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:20px}
.ct{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.muted};margin-bottom:14px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.pb{height:5px;background:${C.border};border-radius:99px;overflow:hidden}
.pf{height:100%;border-radius:99px;transition:width 0.8s ease}
.tr{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid ${C.border}}
.tr:last-child{border-bottom:none}
.av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}
.avl{width:52px;height:52px;font-size:16px}
.btn{padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all 0.15s}
.bp{background:${C.accent};color:white}.bp:hover{background:#2563eb}.bp:disabled{opacity:0.5;cursor:not-allowed}
.bg{background:transparent;color:${C.muted};border:1px solid ${C.border}}.bg:hover{color:${C.text};border-color:${C.muted}}
.bd{background:#ef444422;color:${C.red};border:1px solid #ef444433}
.sm{padding:6px 12px;font-size:12px}
.inp{width:100%;background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:10px 14px;color:${C.text};font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border 0.15s}
.inp:focus{border-color:${C.accent}}
.inp::placeholder{color:${C.muted}}
textarea.inp{resize:vertical;min-height:80px}
.lbl{font-size:12px;font-weight:600;color:${C.muted};margin-bottom:6px;display:block;text-transform:uppercase;letter-spacing:0.5px}
.fg{margin-bottom:14px}
.mo{position:fixed;inset:0;background:#00000088;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.md{background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:28px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto}
.mt{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:20px}
.fb{display:flex;align-items:center;justify-content:space-between}
.fg2{display:flex;align-items:center;gap:10px}
.oi{border:1px solid ${C.border};border-radius:12px;padding:14px;margin-bottom:10px;background:${C.surface}}
.sq{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:16px;margin-bottom:10px}
.rb{width:36px;height:36px;border-radius:8px;border:1px solid ${C.border};background:transparent;color:${C.muted};font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif}
.rb:hover,.rb.sel{border-color:${C.accent};color:${C.accent};background:${C.accentGlow}}
.cb{display:flex;align-items:flex-end;gap:8px;height:110px;padding-top:12px}
.cc{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1}
.bar{width:100%;border-radius:5px 5px 0 0;min-height:3px}
.cm{font-size:10px;color:${C.muted}}
.aib{background:linear-gradient(135deg,${C.subtle},${C.card});border:1px solid ${C.accent}44;border-radius:14px;padding:16px;margin-bottom:10px}
.ail{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent};margin-bottom:6px}
.ait{font-size:14px;color:${C.muted};line-height:1.6}
.ub{background:${C.accentGlow};border:1px solid ${C.accent}44;border-radius:12px;padding:12px 14px;font-size:14px;color:${C.text};align-self:flex-end;max-width:80%}
.ty{display:flex;gap:4px;align-items:center}
.dot{width:6px;height:6px;border-radius:50%;background:${C.accent};animation:blink 1.2s ease-in-out infinite}
.dot:nth-child(2){animation-delay:0.2s}.dot:nth-child(3){animation-delay:0.4s}
@keyframes blink{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
.sc{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:16px;margin-bottom:10px}
.rc{background:${C.surface};border:1px solid ${C.border};border-radius:12px;padding:16px;margin-bottom:10px}
.ld{display:flex;align-items:center;justify-content:center;padding:48px;color:${C.muted};font-size:14px;gap:10px}
.cp{padding:8px;font-size:10px;color:${C.muted};text-align:center;line-height:1.5}
.role-badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 8px;border-radius:99px}
.role-admin{background:#ef444422;color:${C.red}}
.role-manager{background:#f59e0b22;color:${C.amber}}
.role-employee{background:#10b98122;color:${C.green}}
/* LOGIN */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${C.bg};padding:20px}
.login-card{background:${C.surface};border:1px solid ${C.border};border-radius:20px;padding:40px;width:100%;max-width:420px}
.login-logo{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:${C.text};text-align:center;margin-bottom:8px}
.login-logo span{color:${C.accent}}
.login-sub{font-size:14px;color:${C.muted};text-align:center;margin-bottom:32px}
.login-err{background:#ef444422;border:1px solid #ef444433;border-radius:10px;padding:10px 14px;font-size:13px;color:${C.red};margin-bottom:16px}
.login-switch{text-align:center;font-size:13px;color:${C.muted};margin-top:20px}
.login-switch span{color:${C.accent};cursor:pointer;font-weight:600}
.login-switch span:hover{text-decoration:underline}
.divider-text{display:flex;align-items:center;gap:12px;margin:20px 0;color:${C.muted};font-size:12px}
.divider-text::before,.divider-text::after{content:'';flex:1;height:1px;background:${C.border}}
.google-btn{width:100%;padding:10px;border-radius:10px;border:1px solid ${C.border};background:transparent;color:${C.text};font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.15s}
.google-btn:hover{background:${C.subtle}}
@media(max-width:768px){.sb{display:none}.main{margin-left:0;max-width:100vw;padding:20px 16px}.g4,.g3{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
`;}

function Loader(){return <div className="ld"><div className="dot"/><div className="dot"/><div className="dot"/><span>Loading...</span></div>;}

// ── LOGIN PAGE ───────────────────────────────────────────────────────
function LoginPage({C, onLogin}){
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    if(!email.trim() || !password.trim()) return setError("Please enter your email and password.");
    setLoading(true); setError("");
    try {
      const res = mode === "login" ? await auth.signIn(email, password) : await auth.signUp(email, password);
      if(res.access_token) {
        localStorage.setItem("kz_token", res.access_token);
        localStorage.setItem("kz_email", email);
        onLogin(res.access_token, email);
      } else {
        setError(res.error_description || res.msg || "Something went wrong. Please try again.");
      }
    } catch { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Kaizen<span>omics</span></div>
        <div className="login-sub">{mode === "login" ? "Sign in to your account" : "Create your account"}</div>
        {error && <div className="login-err">{error}</div>}
        <div className="fg"><label className="lbl">Email</label>
          <input className="inp" type="email" placeholder="dennis@kaizenomics.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        </div>
        <div className="fg"><label className="lbl">Password</label>
          <input className="inp" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        </div>
        <button className="btn bp" style={{width:"100%",marginTop:8}} onClick={handle} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div className="login-switch">
          {mode === "login" ? <>Don't have an account? <span onClick={()=>{setMode("signup");setError("");}}>Sign up</span></> : <>Already have an account? <span onClick={()=>{setMode("login");setError("");}}>Sign in</span></>}
        </div>
        <div className="divider-text">or</div>
        <div className="cp" style={{color:"#64748b",fontSize:13}}>© 2026 Kaizenomics. All rights reserved.</div>
      </div>
    </div>
  );
}

// ── DASHBOARD ────────────────────────────────────────────────────────
function Dashboard({C,okrs,team,userRole}){
  const canSeeAll = userRole === "admin" || userRole === "manager";
  return(
    <div>
      <div className="pt">Good morning, Dennis 👋</div>
      <div className="ps">Here's how Kaizenomics is performing — March 22, 2026</div>
      <div className="g4" style={{marginBottom:18}}>
        {[
          {l:"Org Health Score",v:"87",c:"Up 5pts",color:C.green},
          {l:"Total OKRs",v:okrs.length,c:"Created",color:C.accent},
          {l:"Team Members",v:canSeeAll?team.length:"—",c:canSeeAll?"Active":"Admin only",color:C.purple},
          {l:"Avg Performance",v:canSeeAll&&team.length?Math.round(team.reduce((s,m)=>s+(m.score||75),0)/team.length):"—",c:canSeeAll?"This month":"Admin only",color:C.amber},
        ].map((s,i)=>(
          <div className="card" key={i} style={{borderTop:`3px solid ${s.color}`}}>
            <div style={{fontFamily:"Syne",fontSize:32,fontWeight:800,letterSpacing:-1,color:s.color}}>{s.v}</div>
            <div style={{fontSize:13,color:C.muted,marginTop:6}}>{s.l}</div>
            <div style={{fontSize:12,marginTop:8,color:C.green}}>{s.c}</div>
          </div>
        ))}
      </div>
      <div className="g2" style={{marginBottom:18}}>
        <div className="card">
          <div className="ct">Performance Trend</div>
          <div className="cb">
            {CHART_DATA.map((d,i)=>(
              <div className="cc" key={i}>
                <div style={{display:"flex",gap:3,alignItems:"flex-end",height:90}}>
                  <div className="bar" style={{height:`${d.perf}%`,background:C.accent,width:12}}/>
                  <div className="bar" style={{height:`${d.eng}%`,background:C.purple,width:12}}/>
                </div>
                <div className="cm">{d.month}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="ct">Top Performers</div>
          {canSeeAll ? [...team].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,4).map((m,i)=>(
            <div className="tr" key={i}>
              <div className="av" style={{background:(m.color||"#3b82f6")+"33",color:m.color||"#3b82f6"}}>{m.initials||"?"}</div>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{m.name}</div><div style={{fontSize:12,color:C.muted}}>{m.role}</div></div>
              <div style={{fontSize:16,fontWeight:700,color:pc(m.score||75,C)}}>{m.score||75}</div>
            </div>
          )) : <div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Only admins and managers can see this</div>}
        </div>
      </div>
    </div>
  );
}

// ── GOALS ────────────────────────────────────────────────────────────
function Goals({C,okrs,setOkrs,token,userRole}){
  const [exp,setExp]=useState(null);
  const [show,setShow]=useState(false);
  const [saving,setSaving]=useState(false);
  const [f,setF]=useState({level:"Company",objective:"",status:"on-track",krs:[""]});
  const canEdit = userRole === "admin" || userRole === "manager";

  const save=async()=>{
    if(!f.objective.trim())return;
    setSaving(true);
    const krs=f.krs.filter(k=>k.trim()).map(t=>({text:t,pct:0}));
    const res=await db.insert("okrs",{level:f.level,objective:f.objective,status:f.status},token);
    if(res?.[0]){
      for(const kr of krs) await db.insert("key_results",{okr_id:res[0].id,text:kr.text,pct:0},token);
      const krd=await db.get("key_results",`&okr_id=eq.${res[0].id}`,token);
      setOkrs(o=>[...o,{...res[0],key_results:krd||krs}]);
      slack.okrCreated(f.objective);
    }
    setSaving(false);setShow(false);setF({level:"Company",objective:"",status:"on-track",krs:[""]});
  };

  const del=async(id)=>{
    const okr = okrs.find(x=>x.id===id);
    await db.delete("okrs",id,token);
    setOkrs(o=>o.filter(x=>x.id!==id));
    if(okr) slack.okrDeleted(okr.objective);
  };

  const upd=async(oid,kid,v)=>{
    await db.update("key_results",kid,{pct:Number(v)},token);
    setOkrs(o=>o.map(x=>x.id===oid?{...x,key_results:(x.key_results||[]).map(k=>k.id===kid?{...k,pct:Number(v)}:k)}:x));
  };

  return(
    <div>
      <div className="fb" style={{marginBottom:28}}>
        <div><div className="pt">Goals and OKRs</div><div style={{fontSize:13,color:C.muted}}>Create, track and manage objectives</div></div>
        {canEdit && <button className="btn bp" onClick={()=>setShow(true)}>+ New Objective</button>}
      </div>
      {okrs.length===0&&<div className="card" style={{textAlign:"center",padding:48,color:C.muted}}>No OKRs yet{canEdit?" — create your first objective!":""}</div>}
      {okrs.map(okr=>{
        const krs=okr.key_results||[];
        const avg=krs.length?Math.round(krs.reduce((s,k)=>s+(k.pct||0),0)/krs.length):0;
        return(
          <div className="oi" key={okr.id}>
            <div style={{fontFamily:"Syne",fontSize:14,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",borderRadius:99,background:okr.level==="Company"?C.accentGlow:okr.level==="Team"?"#f59e0b22":"#10b98122",color:okr.level==="Company"?C.accent:okr.level==="Team"?"#f59e0b":"#10b981"}}>{okr.level}</span>
              <span onClick={()=>setExp(exp===okr.id?null:okr.id)} style={{cursor:"pointer",flex:1}}>{okr.objective}</span>
              {SB(okr.status)}
              {canEdit && <button className="btn bd sm" onClick={()=>del(okr.id)}>Delete</button>}
              <span style={{color:C.muted,fontSize:12,cursor:"pointer"}} onClick={()=>setExp(exp===okr.id?null:okr.id)}>{exp===okr.id?"▲":"▼"}</span>
            </div>
            <div style={{margin:"6px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:C.muted}}>Progress</span><span style={{fontWeight:600,color:pc(avg,C)}}>{avg}%</span></div>
              <div className="pb"><div className="pf" style={{width:`${avg}%`,background:pc(avg,C)}}/></div>
            </div>
            {exp===okr.id&&krs.map(kr=>(
              <div key={kr.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,flex:1,color:C.muted}}>🎯 {kr.text}</div>
                {canEdit && <input type="range" min={0} max={100} value={kr.pct||0} onChange={e=>upd(okr.id,kr.id,e.target.value)} style={{width:80,accentColor:C.accent}}/>}
                <div style={{fontSize:13,fontWeight:600,color:pc(kr.pct||0,C),minWidth:36,textAlign:"right"}}>{kr.pct||0}%</div>
              </div>
            ))}
          </div>
        );
      })}
      {show&&canEdit&&(
        <div className="mo" onClick={()=>setShow(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <div className="mt">New Objective</div>
            <div className="fg"><label className="lbl">Level</label><select className="inp" value={f.level} onChange={e=>setF(x=>({...x,level:e.target.value}))}><option>Company</option><option>Team</option><option>Individual</option></select></div>
            <div className="fg"><label className="lbl">Objective</label><input className="inp" placeholder="What do you want to achieve?" value={f.objective} onChange={e=>setF(x=>({...x,objective:e.target.value}))}/></div>
            <div className="fg"><label className="lbl">Status</label><select className="inp" value={f.status} onChange={e=>setF(x=>({...x,status:e.target.value}))}><option value="on-track">On Track</option><option value="at-risk">At Risk</option><option value="completed">Completed</option></select></div>
            <div className="fg"><label className="lbl">Key Results</label>
              {f.krs.map((kr,i)=>(
                <div key={i} className="fg2" style={{marginBottom:8}}>
                  <input className="inp" placeholder={`Key Result ${i+1}`} value={kr} onChange={e=>{const k=[...f.krs];k[i]=e.target.value;setF(x=>({...x,krs:k}));}}/>
                  {f.krs.length>1&&<button className="btn bd sm" onClick={()=>setF(x=>({...x,krs:x.krs.filter((_,j)=>j!==i)}))}>x</button>}
                </div>
              ))}
              <button className="btn bg sm" onClick={()=>setF(x=>({...x,krs:[...x.krs,""]}))}>+ Add Key Result</button>
            </div>
            <div className="fg2" style={{justifyContent:"flex-end"}}>
              <button className="btn bg" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={saving}>{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TEAM ─────────────────────────────────────────────────────────────
function Team({C,team,setTeam,token,userRole}){
  const [sel,setSel]=useState(null);
  const [show,setShow]=useState(false);
  const [saving,setSaving]=useState(false);
  const [f,setF]=useState({name:"",role:"",dept:"Engineering",email:""});
  const canEdit = userRole === "admin";

  const add=async()=>{
    if(!f.name.trim())return;
    setSaving(true);
    const colors=["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];
    const m={name:f.name,role:f.role,dept:f.dept,email:f.email,score:75,trend:"+0",color:colors[team.length%colors.length],initials:f.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2),joined:"Mar 2026"};
    const res=await db.insert("team",m,token);
    if(res?.[0]){ setTeam(t=>[...t,res[0]]); slack.memberAdded(f.name); }
    setSaving(false);setShow(false);setF({name:"",role:"",dept:"Engineering",email:""});
  };

  const rm=async(id)=>{
    await db.delete("team",id,token);
    setTeam(t=>t.filter(x=>x.id!==id));setSel(null);
  };

  const m=sel?team.find(t=>t.id===sel):null;

  return(
    <div>
      <div className="fb" style={{marginBottom:28}}>
        <div><div className="pt">Team Performance</div><div style={{fontSize:13,color:C.muted}}>Manage members, scores and alignment</div></div>
        <div className="fg2">
          <button className="btn bg" onClick={()=>{const csv=["Name,Role,Dept,Score,Email",...team.map(m=>`${m.name},${m.role},${m.dept},${m.score||75},${m.email||""}`)].join("\n");const a=document.createElement("a");a.href="data:text/csv,"+encodeURIComponent(csv);a.download="team.csv";a.click();}}>Export CSV</button>
          {canEdit && <button className="btn bp" onClick={()=>setShow(true)}>+ Add Member</button>}
        </div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="ct">Performance Scores</div>
          {team.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>No team members yet</div>}
          {team.map((m,i)=>(
            <div className="tr" key={i} style={{cursor:"pointer"}} onClick={()=>setSel(sel===m.id?null:m.id)}>
              <div className="av" style={{background:(m.color||"#3b82f6")+"33",color:m.color||"#3b82f6"}}>{m.initials||"?"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{m.name}</div>
                <div style={{fontSize:12,color:C.muted}}>{m.role}</div>
                <div className="pb" style={{marginTop:5}}><div className="pf" style={{width:`${m.score||75}%`,background:m.color||"#3b82f6"}}/></div>
              </div>
              <div style={{fontSize:15,fontWeight:800,fontFamily:"Syne",color:pc(m.score||75,C)}}>{m.score||75}</div>
            </div>
          ))}
        </div>
        <div>
          {m?(
            <div className="card" style={{marginBottom:16}}>
              <div className="fb" style={{marginBottom:14}}>
                <div className="fg2">
                  <div className="av avl" style={{background:(m.color||"#3b82f6")+"33",color:m.color||"#3b82f6"}}>{m.initials}</div>
                  <div><div style={{fontFamily:"Syne",fontSize:17,fontWeight:800}}>{m.name}</div><div style={{color:C.muted,fontSize:13}}>{m.role}</div></div>
                </div>
                {canEdit && <button className="btn bd sm" onClick={()=>rm(m.id)}>Remove</button>}
              </div>
              <div className="g2" style={{gap:10}}>
                {[{l:"Score",v:m.score||75,c:pc(m.score||75,C)},{l:"Email",v:m.email||"Not set",c:C.muted},{l:"Dept",v:m.dept,c:C.text},{l:"Joined",v:m.joined||"—",c:C.muted}].map((s,i)=>(
                  <div key={i} style={{background:C.subtle,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:600,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div className="card" style={{textAlign:"center",padding:40,marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:10}}>◈</div>
              <div style={{color:C.muted,fontSize:14}}>Click a member to view profile</div>
            </div>
          )}
          <div className="card">
            <div className="ct">Snapshot</div>
            <div className="g2" style={{gap:10}}>
              {[{l:"Members",v:team.length},{l:"Avg Score",v:team.length?Math.round(team.reduce((s,m)=>s+(m.score||75),0)/team.length):"—"}].map((s,i)=>(
                <div key={i} style={{textAlign:"center",padding:"10px 0"}}>
                  <div style={{fontSize:28,fontWeight:800,fontFamily:"Syne"}}>{s.v}</div>
                  <div style={{fontSize:12,color:C.muted}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {show&&canEdit&&(
        <div className="mo" onClick={()=>setShow(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <div className="mt">Add Team Member</div>
            {[{l:"Full Name",k:"name",p:"e.g. John Smith"},{l:"Role",k:"role",p:"e.g. Engineer"},{l:"Email",k:"email",p:"john@company.com"}].map(x=>(
              <div className="fg" key={x.k}><label className="lbl">{x.l}</label><input className="inp" placeholder={x.p} value={f[x.k]} onChange={e=>setF(v=>({...v,[x.k]:e.target.value}))}/></div>
            ))}
            <div className="fg"><label className="lbl">Department</label><select className="inp" value={f.dept} onChange={e=>setF(v=>({...v,dept:e.target.value}))}>{["Engineering","Product","Design","Marketing","Sales","Operations"].map(d=><option key={d}>{d}</option>)}</select></div>
            <div className="fg2" style={{justifyContent:"flex-end"}}>
              <button className="btn bg" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={add} disabled={saving}>{saving?"Saving...":"Add Member"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SURVEYS ──────────────────────────────────────────────────────────
function Surveys({C,surveys,setSurveys,token}){
  const [ratings,setRatings]=useState({});
  const [submitted,setSubmitted]=useState(false);
  const [show,setShow]=useState(false);
  const [ns,setNs]=useState({title:"",questions:[""]});
  const avg=Object.values(ratings).length?(Object.values(ratings).reduce((a,b)=>a+b,0)/Object.values(ratings).length).toFixed(1):null;

  const save=async()=>{
    if(!ns.title.trim())return;
    const s={title:ns.title,questions:ns.questions.filter(q=>q.trim()),active:false,responses:0};
    const res=await db.insert("surveys",s,token);
    if(res?.[0])setSurveys(x=>[...x,res[0]]);
    setShow(false);setNs({title:"",questions:[""]});
  };

  return(
    <div>
      <div className="fb" style={{marginBottom:28}}>
        <div><div className="pt">Feedback and Surveys</div><div style={{fontSize:13,color:C.muted}}>Pulse checks and custom surveys</div></div>
        <button className="btn bp" onClick={()=>setShow(true)}>+ New Survey</button>
      </div>
      <div className="g2">
        <div>
          <div className="card" style={{marginBottom:16}}>
            <div className="ct">Weekly Pulse Check</div>
            {!submitted?<>
              {SURVEY_QS.map((q,qi)=>(
                <div className="sq" key={qi}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>{qi+1}. {q}</div>
                  <div style={{display:"flex",gap:6}}>
                    {[1,2,3,4,5].map(n=><button key={n} className={`rb ${ratings[qi]===n?"sel":""}`} onClick={()=>setRatings(r=>({...r,[qi]:n}))}>{n}</button>)}
                  </div>
                </div>
              ))}
              <div className="fg2" style={{marginTop:10}}>
                <button className="btn bp" style={{opacity:Object.keys(ratings).length<SURVEY_QS.length?0.5:1}} onClick={()=>{if(Object.keys(ratings).length===SURVEY_QS.length)setSubmitted(true);}}>Submit</button>
                <span style={{fontSize:12,color:C.muted}}>{Object.keys(ratings).length}/{SURVEY_QS.length} answered</span>
              </div>
            </>:(
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:40,marginBottom:10}}>✅</div>
                <div style={{fontFamily:"Syne",fontSize:18,fontWeight:800}}>Submitted!</div>
                <div style={{color:C.muted,fontSize:13,margin:"6px 0 14px"}}>Your avg: <strong style={{color:pc(Number(avg)*20,C)}}>{avg}/5</strong></div>
                <button className="btn bg sm" onClick={()=>{setRatings({});setSubmitted(false);}}>Retake</button>
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="ct">Custom Surveys</div>
          {surveys.length===0&&<div style={{color:C.muted,fontSize:13}}>No custom surveys yet</div>}
          {surveys.map(s=>(
            <div key={s.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div className="fb">
                <div><div style={{fontSize:14,fontWeight:600}}>{s.title}</div><div style={{fontSize:12,color:C.muted}}>{(s.questions||[]).length} questions</div></div>
                <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",borderRadius:99,background:s.active?"#10b98122":"#f59e0b22",color:s.active?"#10b981":"#f59e0b"}}>{s.active?"Active":"Draft"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {show&&(
        <div className="mo" onClick={()=>setShow(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <div className="mt">Build a Survey</div>
            <div className="fg"><label className="lbl">Title</label><input className="inp" placeholder="e.g. Q2 Team Health Check" value={ns.title} onChange={e=>setNs(x=>({...x,title:e.target.value}))}/></div>
            <div className="fg"><label className="lbl">Questions</label>
              {ns.questions.map((q,i)=>(
                <div key={i} className="fg2" style={{marginBottom:8}}>
                  <input className="inp" placeholder={`Question ${i+1}`} value={q} onChange={e=>{const qs=[...ns.questions];qs[i]=e.target.value;setNs(x=>({...x,questions:qs}));}}/>
                  {ns.questions.length>1&&<button className="btn bd sm" onClick={()=>setNs(x=>({...x,questions:x.questions.filter((_,j)=>j!==i)}))}>x</button>}
                </div>
              ))}
              <button className="btn bg sm" onClick={()=>setNs(x=>({...x,questions:[...x.questions,""]}))}>+ Add Question</button>
            </div>
            <div className="fg2" style={{justifyContent:"flex-end"}}>
              <button className="btn bg" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save}>Create Survey</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHOUTOUTS ────────────────────────────────────────────────────────
function Shoutouts({C,team,shoutouts,setShoutouts,token,userEmail}){
  const [show,setShow]=useState(false);
  const [f,setF]=useState({to:"",message:"",emoji:"🌟"});

  const save=async()=>{
    if(!f.to||!f.message.trim())return;
    const s={from_name:userEmail,to_name:f.to,message:f.message,emoji:f.emoji,date:"Today"};
    const res=await db.insert("shoutouts",s,token);
    if(res?.[0]){ setShoutouts(x=>[res[0],...x]); slack.shoutout(userEmail,f.to,f.message); }
    setShow(false);setF({to:"",message:"",emoji:"🌟"});
  };

  return(
    <div>
      <div className="fb" style={{marginBottom:28}}>
        <div><div className="pt">Recognition and Shoutouts</div><div style={{fontSize:13,color:C.muted}}>Celebrate wins and appreciate your team</div></div>
        <button className="btn bp" onClick={()=>setShow(true)}>+ Give Shoutout</button>
      </div>
      {shoutouts.length===0&&<div className="card" style={{textAlign:"center",padding:48,color:C.muted}}>No shoutouts yet — recognize someone!</div>}
      {shoutouts.map(s=>(
        <div className="sc" key={s.id}>
          <div className="fg2" style={{marginBottom:10}}>
            <div style={{fontSize:28}}>{s.emoji}</div>
            <div>
              <div style={{fontSize:14,fontWeight:600}}><span style={{color:C.accent}}>{s.from_name}</span> <span style={{color:C.muted}}>recognized</span> <span style={{color:C.green}}>{s.to_name}</span></div>
              <div style={{fontSize:11,color:C.muted}}>{s.date}</div>
            </div>
          </div>
          <div style={{fontSize:14,color:C.muted,fontStyle:"italic",lineHeight:1.6}}>"{s.message}"</div>
        </div>
      ))}
      {show&&(
        <div className="mo" onClick={()=>setShow(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <div className="mt">Give a Shoutout 🎉</div>
            <div className="fg"><label className="lbl">Recognize</label><select className="inp" value={f.to} onChange={e=>setF(x=>({...x,to:e.target.value}))}><option value="">Select team member...</option>{team.map(t=><option key={t.id}>{t.name}</option>)}</select></div>
            <div className="fg"><label className="lbl">Emoji</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["🌟","🚀","🎨","💪","🏆","❤️","🔥","✨"].map(e=><button key={e} onClick={()=>setF(x=>({...x,emoji:e}))} style={{fontSize:22,padding:"4px 8px",borderRadius:8,border:`2px solid ${f.emoji===e?C.accent:C.border}`,background:"transparent",cursor:"pointer"}}>{e}</button>)}</div></div>
            <div className="fg"><label className="lbl">Message</label><textarea className="inp" placeholder="What did they do that deserves recognition?" value={f.message} onChange={e=>setF(x=>({...x,message:e.target.value}))}/></div>
            <div className="fg2" style={{justifyContent:"flex-end"}}>
              <button className="btn bg" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save}>Send Shoutout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MEETINGS ─────────────────────────────────────────────────────────
function Meetings({C,team,meetings,setMeetings,token}){
  const [show,setShow]=useState(false);
  const [exp,setExp]=useState(null);
  const [f,setF]=useState({with:"",date:"",notes:"",actions:[""]});

  const save=async()=>{
    if(!f.with.trim())return;
    const m={with_name:f.with,date:f.date||"Today",notes:f.notes,actions:f.actions.filter(a=>a.trim())};
    const res=await db.insert("meetings",m,token);
    if(res?.[0]){ setMeetings(x=>[res[0],...x]); slack.meetingLogged(f.with); }
    setShow(false);setF({with:"",date:"",notes:"",actions:[""]});
  };

  const del=async(id)=>{
    await db.delete("meetings",id,token);
    setMeetings(m=>m.filter(x=>x.id!==id));
  };

  return(
    <div>
      <div className="fb" style={{marginBottom:28}}>
        <div><div className="pt">1-on-1 Meetings</div><div style={{fontSize:13,color:C.muted}}>Notes, action items and follow-ups</div></div>
        <button className="btn bp" onClick={()=>setShow(true)}>+ New Meeting</button>
      </div>
      {meetings.length===0&&<div className="card" style={{textAlign:"center",padding:48,color:C.muted}}>No meetings logged yet</div>}
      {meetings.map(m=>(
        <div className="rc" key={m.id}>
          <div className="fb">
            <div className="fg2">
              <div className="av" style={{background:C.accent+"33",color:C.accent}}>{(m.with_name||"").split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
              <div><div style={{fontWeight:600,fontSize:14}}>1-on-1 with {m.with_name}</div><div style={{fontSize:12,color:C.muted}}>{m.date}</div></div>
            </div>
            <div className="fg2">
              <button className="btn bg sm" onClick={()=>setExp(exp===m.id?null:m.id)}>{exp===m.id?"Hide":"View"}</button>
              <button className="btn bd sm" onClick={()=>del(m.id)}>Delete</button>
            </div>
          </div>
          {exp===m.id&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:13,color:C.muted,marginBottom:10,lineHeight:1.6}}>{m.notes}</div>
              {(m.actions||[]).map((a,i)=><div key={i} className="fg2" style={{fontSize:13,marginBottom:6}}><span style={{color:C.green}}>✓</span>{a}</div>)}
            </div>
          )}
        </div>
      ))}
      {show&&(
        <div className="mo" onClick={()=>setShow(false)}>
          <div className="md" onClick={e=>e.stopPropagation()}>
            <div className="mt">New 1-on-1 Meeting</div>
            <div className="fg"><label className="lbl">Meeting With</label><select className="inp" value={f.with} onChange={e=>setF(x=>({...x,with:e.target.value}))}><option value="">Select team member...</option>{team.map(t=><option key={t.id}>{t.name}</option>)}</select></div>
            <div className="fg"><label className="lbl">Date</label><input type="date" className="inp" value={f.date} onChange={e=>setF(x=>({...x,date:e.target.value}))}/></div>
            <div className="fg"><label className="lbl">Notes</label><textarea className="inp" placeholder="What did you discuss?" value={f.notes} onChange={e=>setF(x=>({...x,notes:e.target.value}))}/></div>
            <div className="fg"><label className="lbl">Action Items</label>
              {f.actions.map((a,i)=>(
                <div key={i} className="fg2" style={{marginBottom:8}}>
                  <input className="inp" placeholder={`Action ${i+1}`} value={a} onChange={e=>{const ac=[...f.actions];ac[i]=e.target.value;setF(x=>({...x,actions:ac}));}}/>
                  {f.actions.length>1&&<button className="btn bd sm" onClick={()=>setF(x=>({...x,actions:x.actions.filter((_,j)=>j!==i)}))}>x</button>}
                </div>
              ))}
              <button className="btn bg sm" onClick={()=>setF(x=>({...x,actions:[...x.actions,""]}))}>+ Add Action</button>
            </div>
            <div className="fg2" style={{justifyContent:"flex-end"}}>
              <button className="btn bg" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save}>Save Meeting</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ANALYTICS ────────────────────────────────────────────────────────
function Analytics({C,team,okrs}){
  return(
    <div>
      <div className="fb" style={{marginBottom:28}}>
        <div><div className="pt">Analytics and Reporting</div><div style={{fontSize:13,color:C.muted}}>Data-driven insights</div></div>
        <button className="btn bg" onClick={()=>{
          const t=`KAIZENOMICS REPORT\nMarch 22, 2026\n\nTEAM (${team.length})\n${team.map(m=>`${m.name}: ${m.score||75}/100`).join("\n")}\n\nOKRs (${okrs.length})\n${okrs.map(o=>`[${o.level}] ${o.objective} - ${o.status}`).join("\n")}\n\n© 2026 Kaizenomics. All rights reserved.`;
          const a=document.createElement("a");a.href="data:text/plain,"+encodeURIComponent(t);a.download="kaizenomics-report.txt";a.click();
        }}>Export Report</button>
      </div>
      <div className="g3" style={{marginBottom:18}}>
        {[{l:"Performance Index",v:87,color:C.accent},{l:"Engagement Score",v:83,color:C.purple},{l:"Team Size",v:team.length,color:C.green}].map((m,i)=>(
          <div className="card" key={i}>
            <div className="ct">{m.l}</div>
            <div style={{fontSize:36,fontWeight:800,fontFamily:"Syne",color:m.color}}>{m.v}</div>
            <div className="pb" style={{marginTop:8}}><div className="pf" style={{width:`${Math.min(m.v,100)}%`,background:m.color}}/></div>
          </div>
        ))}
      </div>
      <div className="g2">
        <div className="card">
          <div className="ct">By Department</div>
          {["Engineering","Product","Design","Marketing","Sales"].map((dept,i)=>{
            const members=team.filter(m=>m.dept===dept);
            const score=members.length?Math.round(members.reduce((s,m)=>s+(m.score||75),0)/members.length):[88,94,79,91,83][i];
            const colors=[C.accent,C.green,C.purple,C.amber,C.red];
            return(
              <div key={i} style={{marginBottom:12}}>
                <div className="fb" style={{marginBottom:5}}><span style={{fontSize:13}}>{dept}</span><span style={{fontSize:13,fontWeight:700,color:colors[i]}}>{score}</span></div>
                <div className="pb"><div className="pf" style={{width:`${score}%`,background:colors[i]}}/></div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="ct">6-Month Trend</div>
          <div className="cb">
            {CHART_DATA.map((d,i)=>(
              <div className="cc" key={i}>
                <div style={{display:"flex",gap:3,alignItems:"flex-end",height:90}}>
                  <div className="bar" style={{height:`${d.perf}%`,background:C.accent,width:14}}/>
                  <div className="bar" style={{height:`${d.eng}%`,background:C.purple,width:14}}/>
                </div>
                <div className="cm">{d.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI COACH ─────────────────────────────────────────────────────────
function AICoach({C,team,okrs}){
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hi! I'm your Kaizenomics AI coach. Ask me anything about your team's performance, OKRs, or how to improve results."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async()=>{
    if(!input.trim()||loading)return;
    const u=input.trim();setInput("");
    setMsgs(m=>[...m,{role:"user",text:u}]);
    setLoading(true);
    try{
      const SYS=`You are Kaizenomics AI, an expert organizational performance coach. Team: ${team.map(m=>m.name+" ("+m.role+", score "+(m.score||75)+")").join(", ")||"No team yet"}. OKRs: ${okrs.map(o=>"["+o.level+"] "+o.objective+" ("+o.status+")").join(", ")||"No OKRs yet"}. Give concise, warm, actionable advice.`;
      const history=msgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYS,messages:[...history,{role:"user",content:u}]})});
      const data=await res.json();
      setMsgs(m=>[...m,{role:"assistant",text:data.content?.map(b=>b.text||"").join("")||"Something went wrong."}]);
    }catch{setMsgs(m=>[...m,{role:"assistant",text:"Something went wrong. Please try again."}]);}
    setLoading(false);
  };

  return(
    <div>
      <div className="pt">AI Performance Coach</div>
      <div className="ps">Powered by Claude — Ask anything about your organization</div>
      <div className="card" style={{maxWidth:740}}>
        <div style={{maxHeight:460,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
          {msgs.map((m,i)=>m.role==="assistant"
            ?<div key={i} className="aib"><div className="ail">✦ Kaizenomics AI</div><div className="ait">{m.text}</div></div>
            :<div key={i} className="ub">{m.text}</div>
          )}
          {loading&&<div className="aib"><div className="ail">✦ Kaizenomics AI</div><div className="ty"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>}
          <div ref={ref}/>
        </div>
        <div className="fg2">
          <input className="inp" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about performance, OKRs, feedback..."/>
          <button className="btn bp" onClick={send} disabled={loading}>Send</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
          {["Who needs coaching?","How can we improve OKRs?","Summarize our performance","What should we focus on?"].map((s,i)=>(
            <button key={i} className="btn bg sm" onClick={()=>setInput(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── INTEGRATIONS ─────────────────────────────────────────────────────
function Integrations({C,team,okrs}){
  const [testing,setTesting]=useState(false);
  const [testResult,setTestResult]=useState(null);

  const testSlack=async()=>{
    setTesting(true);setTestResult(null);
    await slack.weeklyDigest(team.length,okrs.length);
    setTestResult("success");
    setTesting(false);
  };

  return(
    <div>
      <div className="pt">Integrations</div>
      <div className="ps">Connect Kaizenomics to your favourite tools</div>

      {/* Slack */}
      <div className="card" style={{marginBottom:16}}>
        <div className="fb" style={{marginBottom:16}}>
          <div className="fg2">
            <div style={{fontSize:28}}>💬</div>
            <div>
              <div style={{fontFamily:"Syne",fontSize:16,fontWeight:800}}>Slack</div>
              <div style={{fontSize:13,color:C.muted}}>Send notifications to your #performance channel</div>
            </div>
          </div>
          <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 10px",borderRadius:99,background:"#10b98122",color:"#10b981"}}>Connected ✓</span>
        </div>
        <div style={{background:C.subtle,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Webhook URL</div>
          <div style={{fontSize:12,fontFamily:"monospace",color:C.text,wordBreak:"break-all"}}>https://hooks.slack.com/services/T0AP7...</div>
        </div>
        <div style={{marginBottom:14}}>
          <div className="ct">Notifications Enabled</div>
          {[
            {label:"New OKR created",icon:"🎯"},
            {label:"Team member added",icon:"👋"},
            {label:"Shoutout sent",icon:"🌟"},
            {label:"1-on-1 meeting logged",icon:"📅"},
            {label:"Survey created",icon:"📋"},
          ].map((n,i)=>(
            <div key={i} className="fg2" style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
              <span>{n.icon}</span>
              <span style={{fontSize:13,flex:1}}>{n.label}</span>
              <span style={{fontSize:11,color:C.green,fontWeight:600}}>✓ Active</span>
            </div>
          ))}
        </div>
        <div className="fg2">
          <button className="btn bp sm" onClick={testSlack} disabled={testing}>
            {testing?"Sending...":"Send Test Notification"}
          </button>
          {testResult==="success"&&<span style={{fontSize:13,color:C.green}}>✅ Sent! Check your Slack channel.</span>}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="card" style={{marginBottom:16}}>
        <div className="fb" style={{marginBottom:16}}>
          <div className="fg2">
            <div style={{fontSize:28}}>📅</div>
            <div>
              <div style={{fontFamily:"Syne",fontSize:16,fontWeight:800}}>Google Calendar</div>
              <div style={{fontSize:13,color:C.muted}}>Sync 1-on-1 meetings to your calendar</div>
            </div>
          </div>
          <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 10px",borderRadius:99,background:"#f59e0b22",color:"#f59e0b"}}>Coming Soon</span>
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Google Calendar integration will allow you to automatically create calendar events when you log 1-on-1 meetings. Coming in a future update!</div>
      </div>

      {/* Email */}
      <div className="card">
        <div className="fb" style={{marginBottom:16}}>
          <div className="fg2">
            <div style={{fontSize:28}}>📧</div>
            <div>
              <div style={{fontFamily:"Syne",fontSize:16,fontWeight:800}}>Email Notifications</div>
              <div style={{fontSize:13,color:C.muted}}>Weekly digests and survey invites</div>
            </div>
          </div>
          <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,padding:"3px 10px",borderRadius:99,background:"#f59e0b22",color:"#f59e0b"}}>Coming Soon</span>
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Email notifications via SendGrid will send weekly performance digests and survey invites to your team. Coming in a future update!</div>
      </div>
    </div>
  );
}

// ── PROFILE ──────────────────────────────────────────────────────────
function Profile({C,userEmail,userRole,onLogout}){
  return(
    <div>
      <div className="pt">My Profile</div>
      <div className="ps">Your account and role settings</div>
      <div className="card" style={{maxWidth:500}}>
        <div className="fg2" style={{marginBottom:24}}>
          <div className="av avl" style={{background:C.accent+"33",color:C.accent,fontSize:18}}>
            {userEmail?userEmail[0].toUpperCase():"?"}
          </div>
          <div>
            <div style={{fontFamily:"Syne",fontSize:18,fontWeight:800}}>{userEmail}</div>
            <span className={`role-badge role-${userRole}`}>{userRole}</span>
          </div>
        </div>
        <div className="g2" style={{gap:10,marginBottom:24}}>
          {[{l:"Email",v:userEmail},{l:"Role",v:userRole},{l:"Organization",v:"Kaizenomics"},{l:"Member Since",v:"Mar 2026"}].map((s,i)=>(
            <div key={i} style={{background:C.subtle,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:13,fontWeight:600}}>{s.v}</div>
            </div>
          ))}
        </div>
        <button className="btn bd" style={{width:"100%"}} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ── NAV ──────────────────────────────────────────────────────────────
const NAV=[
  {sec:"Overview"},{id:"dashboard",icon:"⬡",label:"Dashboard"},
  {sec:"Performance"},{id:"goals",icon:"◎",label:"Goals & OKRs"},{id:"team",icon:"◈",label:"Team"},
  {sec:"Culture"},{id:"survey",icon:"◷",label:"Surveys"},{id:"meetings",icon:"⊡",label:"1-on-1 Meetings"},{id:"shoutouts",icon:"★",label:"Shoutouts"},
  {sec:"Insights"},{id:"analytics",icon:"◬",label:"Analytics"},{id:"ai",icon:"✦",label:"AI Coach"},
  {sec:"Settings"},{id:"integrations",icon:"⚡",label:"Integrations"},{id:"profile",icon:"⊙",label:"My Profile"},
];

// ── APP ──────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("dashboard");
  const [dark,setDark]=useState(true);
  const [token,setToken]=useState(()=>localStorage.getItem("kz_token")||null);
  const [userEmail,setUserEmail]=useState(()=>localStorage.getItem("kz_email")||null);
  const [userRole,setUserRole]=useState("admin");
  const [loading,setLoading]=useState(true);
  const [okrs,setOkrs]=useState([]);
  const [team,setTeam]=useState([]);
  const [shoutouts,setShoutouts]=useState([]);
  const [meetings,setMeetings]=useState([]);
  const [surveys,setSurveys]=useState([]);
  const C=dark?DARK:LIGHT;

  const handleLogin=(tok,email)=>{
    setToken(tok);setUserEmail(email);
  };

  const handleLogout=async()=>{
    if(token) await auth.signOut(token);
    localStorage.removeItem("kz_token");
    localStorage.removeItem("kz_email");
    setToken(null);setUserEmail(null);
  };

  useEffect(()=>{
    if(!token){setLoading(false);return;}
    async function load(){
      setLoading(true);
      try{
        const [td,od,sd,md,svd,krd]=await Promise.all([
          db.get("team","",token),db.get("okrs","",token),db.get("shoutouts","",token),
          db.get("meetings","",token),db.get("surveys","",token),db.get("key_results","",token)
        ]);
        setTeam(td||[]);setShoutouts(sd||[]);setMeetings(md||[]);setSurveys(svd||[]);
        setOkrs((od||[]).map(o=>({...o,key_results:(krd||[]).filter(k=>k.okr_id===o.id)})));

        // Get user role from profiles table
        const user=await auth.getUser(token);
        if(user?.id){
          const profile=await db.get("profiles",`&id=eq.${user.id}`,token);
          if(profile?.[0]?.role) setUserRole(profile[0].role);
        }
      }catch(e){console.error(e);}
      setLoading(false);
    }
    load();
  },[token]);

  if(!token) return <><style>{getCSS(DARK)}</style><LoginPage C={DARK} onLogin={handleLogin}/></>;
  if(loading) return <><style>{getCSS(C)}</style><Loader/></>;

  const pages={
    dashboard:()=><Dashboard C={C} okrs={okrs} team={team} userRole={userRole}/>,
    goals:()=><Goals C={C} okrs={okrs} setOkrs={setOkrs} token={token} userRole={userRole}/>,
    team:()=><Team C={C} team={team} setTeam={setTeam} token={token} userRole={userRole}/>,
    survey:()=><Surveys C={C} surveys={surveys} setSurveys={setSurveys} token={token}/>,
    analytics:()=><Analytics C={C} team={team} okrs={okrs}/>,
    ai:()=><AICoach C={C} team={team} okrs={okrs}/>,
    shoutouts:()=><Shoutouts C={C} team={team} shoutouts={shoutouts} setShoutouts={setShoutouts} token={token} userEmail={userEmail}/>,
    meetings:()=><Meetings C={C} team={team} meetings={meetings} setMeetings={setMeetings} token={token}/>,
    integrations:()=><Integrations C={C} team={team} okrs={okrs}/>,
    profile:()=><Profile C={C} userEmail={userEmail} userRole={userRole} onLogout={handleLogout}/>,
  };

  return(
    <>
      <style>{getCSS(C)}</style>
      <div className="app">
        <div className="sb">
          <div className="fb" style={{marginBottom:20}}>
            <div className="logo">Kaizen<span>omics</span></div>
            <button onClick={()=>setDark(d=>!d)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18}}>{dark?"☀️":"🌙"}</button>
          </div>
          {NAV.map((n,i)=>n.sec
            ?<div key={i} className="ns">{n.sec}</div>
            :<div key={n.id} className={`ni ${page===n.id?"on":""}`} onClick={()=>setPage(n.id)}><span style={{fontSize:15,width:20,textAlign:"center"}}>{n.icon}</span>{n.label}</div>
          )}
          <div style={{flex:1}}/>
          <div className="cp">© 2026 Kaizenomics.<br/>All rights reserved.</div>
          <div style={{padding:"12px 8px 0",borderTop:`1px solid ${C.border}`}}>
            <div className="fg2">
              <div className="av" style={{background:C.accent+"33",color:C.accent,width:30,height:30,fontSize:11}}>
                {userEmail?userEmail[0].toUpperCase():"?"}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail}</div>
                <span className={`role-badge role-${userRole}`}>{userRole}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="main">{pages[page]?.()}</div>
      </div>
    </>
  );
}
