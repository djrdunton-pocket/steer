import React, { useState, useMemo, useEffect } from "react";

function useIsMobile(bp = 760) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const on = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [bp]);
  return m;
}

/* ============================================================
   STEER — Portfolio prioritisation, phasing & budget allocation
   Clean institutional demo. Self-contained, in-memory state.
   ============================================================ */

const C = {
  ink: "#0F172A",
  slate: "#475569",
  mute: "#94A3B8",
  line: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  accent: "#0F766E",       // teal-700, primary
  accentSoft: "#CCFBF1",
  green: "#15803D",
  amber: "#B45309",
  red: "#B91C1C",
  greenSoft: "#DCFCE7",
  amberSoft: "#FEF3C7",
  redSoft: "#FEE2E2",
};

const WORKSTREAMS = {
  "Research":             "#0F766E",
  "Education Technology": "#1D4ED8",
  "Student Experience":   "#7C3AED",
  "Staff Experience":     "#BE185D",
  "Infrastructure":       "#475569",
};

const STATUS = {
  "not-started": { label: "Not started", c: C.mute,  bg: C.bg },
  "in-progress": { label: "In progress", c: C.green, bg: C.greenSoft },
  "at-risk":     { label: "At risk",     c: C.red,   bg: C.redSoft },
  "complete":    { label: "Complete",    c: C.slate, bg: C.line },
};

const YEARS = ["2026/27", "2027/28", "2028/29", "2029/30", "2030/31"];

const SEED = [
  { id:1,  name:"Identity & Access Management (SSO)", ws:"Infrastructure",      owner:"D. Patel",   si:4, tc:4, en:5, ef:3, cost:1.8, status:"in-progress" },
  { id:2,  name:"Network Infrastructure Modernisation", ws:"Infrastructure",    owner:"D. Patel",   si:5, tc:4, en:5, ef:5, cost:4.2, status:"in-progress" },
  { id:3,  name:"Cybersecurity Uplift Programme", ws:"Infrastructure",          owner:"S. Owen",    si:4, tc:5, en:2, ef:3, cost:2.2, status:"at-risk" },
  { id:4,  name:"Student Portal & Mobile App", ws:"Student Experience",         owner:"L. Reid",    si:5, tc:3, en:3, ef:3, cost:2.5, status:"not-started" },
  { id:5,  name:"Virtual Learning Environment Refresh", ws:"Education Technology", owner:"M. Cole", si:4, tc:3, en:2, ef:4, cost:3.0, status:"not-started" },
  { id:6,  name:"Research Computing Cluster Upgrade", ws:"Research",            owner:"A. Frost",   si:4, tc:3, en:3, ef:4, cost:3.5, status:"not-started" },
  { id:7,  name:"Cloud Migration Programme", ws:"Infrastructure",               owner:"D. Patel",   si:3, tc:3, en:4, ef:4, cost:2.8, status:"not-started" },
  { id:8,  name:"Data & Analytics Platform", ws:"Infrastructure",               owner:"R. Singh",   si:4, tc:2, en:4, ef:3, cost:2.0, status:"not-started" },
  { id:9,  name:"Staff HR & Finance Platform", ws:"Staff Experience",           owner:"J. Hart",    si:3, tc:2, en:2, ef:5, cost:3.2, status:"not-started" },
  { id:10, name:"Timetabling System Replacement", ws:"Student Experience",      owner:"L. Reid",    si:3, tc:3, en:2, ef:2, cost:1.5, status:"not-started" },
  { id:11, name:"Student Recruitment CRM", ws:"Student Experience",             owner:"K. Adeyemi", si:3, tc:2, en:2, ef:2, cost:1.8, status:"not-started" },
  { id:12, name:"Infosys Managed Service Transition", ws:"Infrastructure",      owner:"S. Owen",    si:2, tc:3, en:3, ef:2, cost:1.5, status:"in-progress" },
];

const fmt = (m) => "£" + m.toFixed(1) + "m";
const value = (i) => i.si + i.tc + i.en;             // 3–15
const priority = (i) => value(i) / i.ef;              // WSJF-style: value per unit effort
const duration = (i) => (i.ef >= 5 ? 3 : i.ef >= 3 ? 2 : 1);

export default function Steer() {
  const [stage, setStage] = useState("landing"); // landing | login | app
  const isMobile = useIsMobile();
  const [items, setItems] = useState(SEED);
  const [view, setView] = useState("portfolio");
  const [envelope, setEnvelope] = useState(30);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  // ranked by priority
  const ranked = useMemo(
    () => [...items].sort((a, b) => priority(b) - priority(a)),
    [items]
  );

  // cumulative cost → above/below the funding line
  const withCumulative = useMemo(() => {
    let cum = 0;
    return ranked.map((i) => {
      cum += i.cost;
      return { ...i, cum, funded: cum <= envelope };
    });
  }, [ranked, envelope]);

  // auto-phasing across years, respecting annual envelope
  const phased = useMemo(() => {
    const annual = envelope / YEARS.length;
    const spend = Array(YEARS.length).fill(0);
    return withCumulative.map((i) => {
      if (!i.funded) return { ...i, startYear: null };
      let y = 0;
      if (i.status === "in-progress" || i.status === "at-risk") y = 0;
      else { while (y < YEARS.length - 1 && spend[y] + i.cost > annual) y++; }
      spend[y] += i.cost;
      return { ...i, startYear: y };
    });
  }, [withCumulative, envelope]);

  const allocated = items.reduce((s, i) => s + i.cost, 0);
  const fundedTotal = withCumulative.filter(i => i.funded).reduce((s,i)=>s+i.cost,0);

  const update = (id, patch) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id) => setItems((p) => p.filter((i) => i.id !== id));
  const add = (it) =>
    setItems((p) => [...p, { ...it, id: Math.max(0, ...p.map(x=>x.id)) + 1 }]);

  if (stage === "landing") return <Landing onEnter={() => setStage("login")} />;
  if (stage === "login")   return <Login onAuth={() => setStage("app")} onBack={() => setStage("landing")} />;

  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      * { box-sizing:border-box; }
      .mono { font-family:'IBM Plex Mono', monospace; font-variant-numeric:tabular-nums; }
      .tab:hover { color:${C.ink} !important; }
      .tabs::-webkit-scrollbar { display:none; }
      .tabs { scrollbar-width:none; -ms-overflow-style:none; }
      .row:hover { background:${C.bg}; }
      button { font-family:inherit; cursor:pointer; }
      input, select { font-family:inherit; }
      ::-webkit-scrollbar { height:8px; width:8px; }
      ::-webkit-scrollbar-thumb { background:${C.line}; border-radius:4px; }
      .print-area { display:none; }
      @media (max-width:760px) { .m-grid { grid-template-columns:1fr !important; } }
      @media print {
        .app-screen { display:none !important; }
        .print-area { display:block !important; }
        @page { margin:14mm; }
      }
    `}</style>
    <div className="app-screen" style={{ fontFamily:"'IBM Plex Sans', sans-serif", background:C.bg, color:C.ink, minHeight:"100vh" }}>

      {/* HEADER */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.line}`, padding: isMobile?"12px 16px":"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10, gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
            <Compass />
            <span style={{ fontSize:21, fontWeight:700, letterSpacing:"-0.02em" }}>Steer</span>
          </div>
          {!isMobile && <>
            <span style={{ color:C.line }}>|</span>
            <span style={{ fontSize:13, color:C.slate, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"flex", alignItems:"center", gap:6 }}>
              Digital Foundations Portfolio
              <span style={{ fontSize:11, color:C.mute, background:C.bg, border:`1px solid ${C.line}`, borderRadius:5, padding:"1px 6px" }}>Workspace ▾</span>
            </span>
          </>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div className="tabs" style={{ display:"flex", gap:4, overflowX:"auto", maxWidth: isMobile?"62vw":"none" }}>
            {[["portfolio","Portfolio"],["roadmap","Roadmap"],["onepage","Summary"],["budget", isMobile?"Budget":"Budget & Trade-offs"],["method","Method"]].map(([k,l]) => (
              <button key={k} className="tab" onClick={()=>setView(k)}
                style={{ border:"none", borderBottom: view===k?`2px solid ${C.accent}`:"2px solid transparent",
                  background:"transparent", color: view===k?C.ink:C.slate,
                  padding:"8px 6px", margin:"0 4px", fontSize:13, fontWeight: view===k?600:500,
                  transition:"color .15s", whiteSpace:"nowrap", borderRadius:0 }}>
                {l}
              </button>
            ))}
          </div>
          {!isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:8, borderLeft:`1px solid ${C.line}` }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:C.accentSoft, color:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>DD</div>
              <button onClick={()=>setStage("landing")} title="Sign out" style={{ border:"none", background:"transparent", color:C.mute, fontSize:12 }}>Sign out</button>
            </div>
          )}
        </div>
      </div>

      {/* ENVELOPE BAR */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.line}`, padding:"14px 28px", display:"flex", alignItems:"center", gap:32, flexWrap:"wrap" }}>
        <Metric label="Total budget" value={fmt(envelope)} sub="5-year programme" accent />
        <Metric label="Initiatives" value={items.length} sub={`${items.filter(i=>i.status==="in-progress"||i.status==="at-risk").length} in flight`} />
        <Metric label="Funded within budget" value={fmt(fundedTotal)} sub={`${Math.round(fundedTotal/envelope*100)}% committed`} />
        <Metric label="Total demand" value={fmt(allocated)} sub={allocated>envelope ? fmt(allocated-envelope)+" over" : "within budget"} warn={allocated>envelope} />
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontSize:11, color:C.mute, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Adjust budget · £{envelope}m
          </div>
          <input type="range" min={18} max={32} step={0.5} value={envelope}
            onChange={(e)=>setEnvelope(parseFloat(e.target.value))}
            style={{ width:"100%", accentColor:C.accent }} />
        </div>
      </div>

      <div style={{ padding: isMobile?"16px" : "24px 28px", maxWidth:1280, margin:"0 auto" }}>
        {view==="portfolio" && <Portfolio items={withCumulative} update={update} remove={remove} setEditing={setEditing} setAdding={setAdding} />}
        {view==="roadmap"   && <Roadmap items={phased} />}
        {view==="onepage"   && <OnePage items={phased} envelope={envelope} allocated={allocated} fundedTotal={fundedTotal} isMobile={isMobile} onPrint={()=>window.print()} />}
        {view==="budget"    && <Budget items={withCumulative} envelope={envelope} />}
        {view==="method"    && <Method />}
      </div>

      {(editing || adding) &&
        <Editor
          item={editing}
          onClose={()=>{ setEditing(null); setAdding(false); }}
          onSave={(it)=>{ if (editing) update(editing.id, it); else add(it); setEditing(null); setAdding(false); }}
        />}
    </div>

    {/* PRINT-ONLY: Summary + Roadmap */}
    <div className="print-area" style={{ fontFamily:"'IBM Plex Sans', sans-serif", color:C.ink, padding:"0 4mm" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`2px solid ${C.ink}`, paddingBottom:10, marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Compass />
          <span style={{ fontSize:20, fontWeight:700 }}>Steer</span>
          <span style={{ color:C.line }}>|</span>
          <span style={{ fontSize:13, color:C.slate }}>Digital Foundations Portfolio</span>
        </div>
        <span style={{ fontSize:11, color:C.mute }}>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</span>
      </div>
      <OnePage items={phased} envelope={envelope} allocated={allocated} fundedTotal={fundedTotal} isMobile={false} print />
      <div style={{ height:24 }} />
      <Roadmap items={phased} print />
      <div style={{ marginTop:20, paddingTop:10, borderTop:`1px solid ${C.line}`, fontSize:10, color:C.mute }}>
        Generated by Steer · Prioritisation based on value (strategic impact + time-criticality + enablement) ÷ effort. See Method for detail.
      </div>
    </div>
    </>
  );
}

/* ---------- Portfolio table ---------- */
function Portfolio({ items, update, remove, setEditing, setAdding }) {
  return (
    <div>
      <SectionHead title="Portfolio" desc="Every initiative scored on value (strategic impact, time-criticality, enablement) against effort, then ranked by value-for-effort. The funding line follows.">
        <button onClick={()=>setAdding(true)}
          style={{ border:"none", background:C.accent, color:C.white, padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:600 }}>
          + Add initiative
        </button>
      </SectionHead>

      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:920 }}>
            <thead>
              <tr style={{ background:C.bg, textAlign:"left", color:C.slate }}>
                <Th>#</Th><Th>Initiative</Th><Th>Workstream</Th>
                <Th tip="Strategic impact (1–5): how directly it advances University priorities">Impact</Th>
                <Th tip="Time-criticality (1-5): cost of delaying, e.g. regulatory, operational or reputational">Time-crit.</Th>
                <Th tip="Enablement (1–5): how much it unblocks or accelerates other initiatives">Enables</Th>
                <Th tip="Effort / complexity (1–5): delivery difficulty">Effort</Th>
                <Th tip="Value ÷ Effort. Higher means better return for the work">Priority</Th>
                <Th>Cost</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.id} className="row" style={{ borderTop:`1px solid ${C.line}`, opacity: i.funded?1:0.5 }}>
                  <Td><span className="mono" style={{ color:C.mute }}>{idx+1}</span></Td>
                  <Td><span style={{ fontWeight:600 }}>{i.name}</span><div style={{ fontSize:11, color:C.mute }}>{i.owner}</div></Td>
                  <Td><Pill color={WORKSTREAMS[i.ws]}>{i.ws}</Pill></Td>
                  <ScoreCell v={i.si} onChange={(v)=>update(i.id,{si:v})} />
                  <ScoreCell v={i.tc} onChange={(v)=>update(i.id,{tc:v})} />
                  <ScoreCell v={i.en} onChange={(v)=>update(i.id,{ef:i.ef, en:v})} />
                  <ScoreCell v={i.ef} onChange={(v)=>update(i.id,{ef:v})} />
                  <Td><span className="mono" style={{ fontWeight:600, color:C.accent }}>{priority(i).toFixed(1)}</span></Td>
                  <Td><span className="mono">{fmt(i.cost)}</span></Td>
                  <Td>
                    <select value={i.status} onChange={(e)=>update(i.id,{status:e.target.value})}
                      style={{ border:`1px solid ${C.line}`, borderRadius:6, padding:"4px 6px", fontSize:12, color:STATUS[i.status].c, background:STATUS[i.status].bg, fontWeight:500 }}>
                      {Object.entries(STATUS).map(([k,v])=><option key={k} value={k} style={{color:C.ink, background:C.white}}>{v.label}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <button onClick={()=>setEditing(i)} style={iconBtn}>✎</button>
                    <button onClick={()=>remove(i.id)} style={{...iconBtn, color:C.red}}>✕</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize:12, color:C.mute, marginTop:10 }}>
        Dimmed rows fall below the funding line at the current budget. Tap any score to change it and the ranking, roadmap and budget update live.
      </p>
    </div>
  );
}

/* ---------- Roadmap ---------- */
function Roadmap({ items, print }) {
  const funded = items.filter(i => i.startYear !== null);
  const annualSpend = YEARS.map((_, y) =>
    funded.filter(i => i.startYear === y).reduce((s,i)=>s+i.cost,0)
  );
  return (
    <div>
      <SectionHead title="Investment Roadmap" desc="Prioritised initiatives phased across the five-year programme, sequenced so enablers land first and annual spend stays within the budget." />
      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, padding:"20px 24px", overflowX:"auto" }}>
        <div style={{ minWidth:760 }}>
          {/* year header */}
          <div style={{ display:"grid", gridTemplateColumns:"260px repeat(5,1fr)", gap:8, paddingBottom:10, borderBottom:`1px solid ${C.line}`, marginBottom:12 }}>
            <div style={{ fontSize:11, color:C.mute, textTransform:"uppercase", letterSpacing:"0.06em" }}>Initiative</div>
            {YEARS.map(y=><div key={y} style={{ fontSize:12, fontWeight:600, textAlign:"center", color:C.slate }}>{y}</div>)}
          </div>
          {funded.map((i) => (
            <div key={i.id} style={{ display:"grid", gridTemplateColumns:"260px repeat(5,1fr)", gap:8, alignItems:"center", marginBottom:8 }}>
              <div style={{ fontSize:12.5, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                <span style={{ display:"inline-block", width:7, height:7, borderRadius:2, background:WORKSTREAMS[i.ws], marginRight:7 }} />
                {i.name}
              </div>
              {YEARS.map((_, y) => {
                const active = y >= i.startYear && y < i.startYear + duration(i);
                const isStart = y === i.startYear;
                return (
                  <div key={y} style={{ height:30, borderRadius:6, position:"relative",
                    background: active ? WORKSTREAMS[i.ws] : "transparent",
                    opacity: active ? (i.status==="at-risk"?0.55:0.9) : 1,
                    border: active ? "none" : `1px dashed ${C.line}` }}>
                    {isStart && <span className="mono" style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:11, fontWeight:600 }}>{fmt(i.cost)}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {/* annual spend */}
          <div style={{ display:"grid", gridTemplateColumns:"260px repeat(5,1fr)", gap:8, marginTop:14, paddingTop:12, borderTop:`2px solid ${C.ink}` }}>
            <div style={{ fontSize:12, fontWeight:700 }}>Annual investment</div>
            {annualSpend.map((s,y)=>(
              <div key={y} className="mono" style={{ textAlign:"center", fontSize:13, fontWeight:600, color:C.accent }}>{fmt(s)}</div>
            ))}
          </div>
        </div>
      </div>
      <Legend />
    </div>
  );
}

/* ---------- Portfolio on a Page ---------- */
function OnePage({ items, envelope, allocated, fundedTotal, isMobile, onPrint, print }) {
  const funded = items.filter(i=>i.startYear!==null);
  const atRisk = items.filter(i=>i.status==="at-risk").length;
  const inFlight = items.filter(i=>i.status==="in-progress"||i.status==="at-risk").length;
  const wsBudget = Object.keys(WORKSTREAMS).map(ws => ({
    ws, total: funded.filter(i=>i.ws===ws).reduce((s,i)=>s+i.cost,0)
  })).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  const maxWs = Math.max(...wsBudget.map(x=>x.total), 1);

  return (
    <div>
      <SectionHead title="Portfolio Summary" desc="The board-ready overview: priority, phasing, status and budget in a single view.">
        {!print && onPrint && (
          <button onClick={onPrint}
            style={{ border:`1px solid ${C.line}`, background:C.white, color:C.ink, padding:"9px 15px", borderRadius:8, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:7 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2v7M5 6l3 3 3-3M3 13h10" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Download PDF
          </button>
        )}
      </SectionHead>
      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, padding:24 }}>
        {/* headline metrics */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16, marginBottom:24 }}>
          <BigStat label="Total budget" value={fmt(envelope)} />
          <BigStat label="Funded" value={fmt(fundedTotal)} sub={`${Math.round(fundedTotal/envelope*100)}% of budget`} c={C.accent} />
          <BigStat label="In flight" value={inFlight} />
          <BigStat label="At risk" value={atRisk} c={atRisk?C.red:C.ink} />
          <BigStat label="Below line" value={items.filter(i=>i.startYear===null).length} sub="unfunded" c={C.mute} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1.5fr 1fr", gap:28 }}>
          {/* prioritised list */}
          <div>
            <Sub>Prioritised initiatives</Sub>
            {funded.map((i,idx)=>(
              <div key={i.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.line}` }}>
                <span className="mono" style={{ color:C.mute, fontSize:12, width:18 }}>{idx+1}</span>
                <span style={{ width:8, height:8, borderRadius:2, background:WORKSTREAMS[i.ws], flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:500, flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{i.name}</span>
                <span style={{ width:7, height:7, borderRadius:"50%", background:STATUS[i.status].c, flexShrink:0 }} title={STATUS[i.status].label} />
                <span className="mono" style={{ fontSize:12, color:C.slate, width:48, textAlign:"right" }}>{fmt(i.cost)}</span>
                <span style={{ fontSize:11, color:C.mute, width:54, textAlign:"right" }}>{YEARS[i.startYear].split("/")[0]}</span>
              </div>
            ))}
          </div>
          {/* workstream budget */}
          <div>
            <Sub>Investment by workstream</Sub>
            {wsBudget.map(({ws,total})=>(
              <div key={ws} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                  <span style={{ fontWeight:500 }}>{ws}</span>
                  <span className="mono" style={{ color:C.slate }}>{fmt(total)}</span>
                </div>
                <div style={{ height:8, background:C.bg, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${total/maxWs*100}%`, background:WORKSTREAMS[ws], borderRadius:4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Budget & Trade-offs ---------- */
function Budget({ items, envelope }) {
  return (
    <div>
      <SectionHead title="Budget & Trade-offs" desc="Initiatives ranked by priority, accumulating cost against the budget. Everything below the line is unfunded at this level. Move the budget slider to see what changes." />
      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, overflow:"hidden" }}>
        {items.map((i, idx) => {
          const crossed = idx>0 && items[idx-1].funded && !i.funded;
          return (
            <div key={i.id}>
              {crossed && (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 18px", background:C.redSoft, borderTop:`2px solid ${C.red}`, borderBottom:`2px solid ${C.red}` }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.06em" }}>Funding line · {fmt(envelope)}</span>
                  <span style={{ fontSize:12, color:C.red }}>initiatives below are unfunded at this budget</span>
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", borderTop: idx?`1px solid ${C.line}`:"none", opacity:i.funded?1:0.55 }}>
                <span className="mono" style={{ color:C.mute, fontSize:12, width:20 }}>{idx+1}</span>
                <span style={{ width:8, height:8, borderRadius:2, background:WORKSTREAMS[i.ws], flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:500, flex:1 }}>{i.name}</span>
                <Pill color={i.funded?C.accent:C.mute}>{i.funded?"Funded":"Below line"}</Pill>
                <span className="mono" style={{ fontSize:12, color:C.slate, width:50, textAlign:"right" }}>{fmt(i.cost)}</span>
                <span className="mono" style={{ fontSize:12, color:i.funded?C.ink:C.mute, width:62, textAlign:"right" }}>{fmt(i.cum)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:24, marginTop:12, fontSize:12, color:C.mute }}>
        <span><strong style={{color:C.slate}}>Cost</strong> = individual initiative</span>
        <span><strong style={{color:C.slate}}>Running total</strong> = cumulative against the {fmt(envelope)} budget</span>
      </div>
    </div>
  );
}

/* ---------- Method / scoring explainer ---------- */
function Method() {
  const dims = [
    ["Strategic impact", "How directly the initiative advances the organisation's strategic priorities.", "1 = peripheral · 5 = mission-critical"],
    ["Time-criticality", "The cost of delaying: regulatory deadlines, operational risk, reputational exposure or a closing window of opportunity.", "1 = no urgency · 5 = hard deadline / rising risk"],
    ["Enablement", "How much the initiative unblocks, accelerates or de-risks other work in the portfolio.", "1 = stands alone · 5 = unlocks many others"],
    ["Effort / complexity", "Delivery difficulty: scale, technical risk, change impact and dependency on scarce resource.", "1 = straightforward · 5 = highly complex"],
  ];
  return (
    <div>
      <SectionHead title="Method" desc="How initiatives are prioritised. The model is deliberately simple, transparent and grounded in a recognised framework, so decisions are defensible to an executive board rather than driven by who argues hardest." />

      <div className="m-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <Card title="Value: why we'd do it">
          <p style={cardP}>Each initiative is scored 1–5 on three value dimensions. They sum to a value score between 3 and 15.</p>
          {dims.slice(0,3).map(([t,d,s])=><DimRow key={t} t={t} d={d} s={s} />)}
        </Card>
        <Card title="Effort: what it takes">
          <p style={cardP}>A single 1–5 measure of delivery difficulty, used as the denominator so that quick, high-value wins rise to the top.</p>
          {dims.slice(3).map(([t,d,s])=><DimRow key={t} t={t} d={d} s={s} />)}
        </Card>
      </div>

      <div style={{ background:C.ink, color:C.white, borderRadius:12, padding:"24px 26px", marginBottom:20 }}>
        <div style={{ fontSize:12, color:C.accentSoft, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>The priority score</div>
        <div className="mono" style={{ fontSize:22, fontWeight:600, marginBottom:14 }}>
          Priority &nbsp;=&nbsp; <span style={{ color:"#5EEAD4" }}>(Impact + Time-criticality + Enablement)</span> &nbsp;÷&nbsp; <span style={{ color:"#FCA5A5" }}>Effort</span>
        </div>
        <p style={{ fontSize:13.5, color:"#CBD5E1", lineHeight:1.7, margin:0, maxWidth:760 }}>
          This is the logic behind <strong style={{color:C.white}}>Weighted Shortest Job First (WSJF)</strong>, a prioritisation model from scaled Agile that's widely used in large transformation programmes. It favours initiatives that deliver the most value for the least effort, which is exactly what you want when funding is finite. A high-impact, highly-enabling, low-effort initiative ranks above a costly initiative of similar value.
        </p>
      </div>

      <div className="m-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="The funding line">
          <p style={cardP}>Initiatives are ranked by priority, then their costs accumulate. Wherever the running total crosses the budget, a funding line is drawn. Everything below it is unfunded at that level, making trade-offs explicit and adjustable.</p>
        </Card>
        <Card title="Phasing across years">
          <p style={cardP}>Funded initiatives are sequenced into the five-year roadmap highest-priority first, with in-flight work in year one, while keeping each year's committed spend within an even share of the budget. Enablers naturally land early because they score high.</p>
        </Card>
      </div>

      <p style={{ fontSize:12, color:C.mute, marginTop:18, lineHeight:1.6 }}>
        The scoring is intentionally lightweight so it can be applied consistently and quickly across a large portfolio. Weightings can be tuned per organisation, for example giving time-criticality more influence in a heavily regulated environment.
      </p>
    </div>
  );
}
const cardP = { fontSize:13, color:C.slate, lineHeight:1.65, margin:"0 0 14px" };
function Card({ title, children }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, padding:"20px 22px" }}>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}
function DimRow({ t, d, s }) {
  return (
    <div style={{ paddingTop:12, marginTop:12, borderTop:`1px solid ${C.line}` }}>
      <div style={{ fontSize:13, fontWeight:600, color:C.ink, marginBottom:3 }}>{t}</div>
      <div style={{ fontSize:12.5, color:C.slate, lineHeight:1.55, marginBottom:5 }}>{d}</div>
      <div className="mono" style={{ fontSize:11, color:C.accent }}>{s}</div>
    </div>
  );
}

/* ---------- Editor modal ---------- */
function Editor({ item, onSave, onClose }) {
  const [f, setF] = useState(item || { name:"", ws:"Infrastructure", owner:"", si:3, tc:3, en:3, ef:3, cost:1.0, status:"not-started" });
  const set = (k,v)=>setF(p=>({...p,[k]:v}));
  const dims = [["si","Strategic impact","How directly it advances strategic priorities"],["tc","Time-criticality","Cost of delay: regulatory, operational, reputational"],["en","Enablement","How much it unblocks or accelerates other work"],["ef","Effort / complexity","Delivery difficulty"]];
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:14, padding:28, width:480, maxWidth:"100%", maxHeight:"90vh", overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 18px", fontSize:18 }}>{item?"Edit initiative":"Add initiative"}</h3>
        <Field label="Name"><input value={f.name} onChange={e=>set("name",e.target.value)} style={inp} placeholder="e.g. Library systems consolidation" /></Field>
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Workstream" flex>
            <select value={f.ws} onChange={e=>set("ws",e.target.value)} style={inp}>
              {Object.keys(WORKSTREAMS).map(w=><option key={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="Owner" flex><input value={f.owner} onChange={e=>set("owner",e.target.value)} style={inp} placeholder="Lead" /></Field>
        </div>
        {dims.map(([k,l,tip])=>(
          <div key={k} style={{ margin:"14px 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:500 }}>{l}</span>
              <span className="mono" style={{ fontSize:13, color:C.accent, fontWeight:600 }}>{f[k]}</span>
            </div>
            <div style={{ fontSize:11, color:C.mute, marginBottom:6 }}>{tip}</div>
            <input type="range" min={1} max={5} value={f[k]} onChange={e=>set(k,parseInt(e.target.value))} style={{ width:"100%", accentColor:C.accent }} />
          </div>
        ))}
        <Field label="Cost (£m)"><input type="number" step={0.1} min={0} value={f.cost} onChange={e=>set("cost",parseFloat(e.target.value)||0)} style={inp} /></Field>
        <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ border:`1px solid ${C.line}`, background:C.white, color:C.slate, padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:500 }}>Cancel</button>
          <button onClick={()=>f.name&&onSave(f)} style={{ border:"none", background:C.accent, color:C.white, padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Landing page ---------- */
function Landing({ onEnter }) {
  const features = [
    ["Score what matters", "Rank every initiative on strategic impact, time-criticality and enablement against the effort to deliver. A transparent, defensible model, not a black box."],
    ["See the funding line", "Set your budget and watch initiatives fall above or below the line as priorities and costs shift. Trade-offs become a conversation, not an argument."],
    ["Phase the roadmap", "Turn an approved budget into a sequenced, multi-year investment roadmap that keeps annual spend in check and lands enablers first."],
    ["Report in one page", "Generate a board-ready summary and PDF in seconds, so leadership always knows what's funded, what's at risk and why."],
  ];
  const steps = [
    ["01", "Capture demand", "Bring every competing initiative into one place, each with an owner and a cost."],
    ["02", "Prioritise on evidence", "Score on value and effort. The portfolio ranks itself by return, not by who shouts loudest."],
    ["03", "Decide and phase", "Set the budget, draw the funding line, and phase the funded work across the years."],
    ["04", "Report and adjust", "Share the one-page summary with leadership and re-plan as evidence and priorities change."],
  ];
  return (
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", color:C.ink, background:C.white }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        .ld-mono { font-family:'IBM Plex Mono', monospace; }
        .ld-cta:hover { background:#0b5e57 !important; }
        .ld-ghost:hover { background:${C.bg} !important; }
        .ld-feat { transition:transform .15s, box-shadow .15s; }
        .ld-feat:hover { transform:translateY(-3px); box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .ld-grid2 { grid-template-columns:1fr 1fr; }
        .ld-grid4 { grid-template-columns:repeat(4,1fr); }
        @media (max-width:820px){ .ld-grid2,.ld-grid4{ grid-template-columns:1fr !important; } .ld-hero-h{ font-size:38px !important; } .ld-nav-links{ display:none !important; } }
      `}</style>

      {/* nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 28px", maxWidth:1180, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <Compass /><span style={{ fontSize:21, fontWeight:700, letterSpacing:"-0.02em" }}>Steer</span>
        </div>
        <div className="ld-nav-links" style={{ display:"flex", alignItems:"center", gap:28, fontSize:13.5, color:C.slate }}>
          <span style={{ cursor:"pointer" }}>How it works</span>
          <span style={{ cursor:"pointer" }}>Features</span>
          <span style={{ cursor:"pointer" }}>Pricing</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onEnter} className="ld-ghost" style={{ border:`1px solid ${C.line}`, background:C.white, color:C.ink, padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:600 }}>Sign in</button>
          <button onClick={onEnter} className="ld-cta" style={{ border:"none", background:C.accent, color:C.white, padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600 }}>Try the demo</button>
        </div>
      </div>

      {/* hero */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"64px 28px 56px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.accentSoft, color:C.accent, padding:"6px 14px", borderRadius:20, fontSize:12.5, fontWeight:600, marginBottom:26 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.accent }} /> Portfolio prioritisation for complex change
        </div>
        <h1 className="ld-hero-h" style={{ fontSize:56, fontWeight:700, letterSpacing:"-0.03em", lineHeight:1.08, margin:"0 auto 22px", maxWidth:820 }}>
          Turn competing priorities into a portfolio your board can sign off.
        </h1>
        <p style={{ fontSize:18, color:C.slate, lineHeight:1.6, maxWidth:620, margin:"0 auto 32px" }}>
          Steer helps delivery and transformation leaders prioritise initiatives on evidence, allocate a fixed budget with confidence, and phase a multi-year roadmap, all in one place.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={onEnter} className="ld-cta" style={{ border:"none", background:C.accent, color:C.white, padding:"13px 26px", borderRadius:10, fontSize:15, fontWeight:600 }}>Try the live demo</button>
          <button onClick={onEnter} className="ld-ghost" style={{ border:`1px solid ${C.line}`, background:C.white, color:C.ink, padding:"13px 26px", borderRadius:10, fontSize:15, fontWeight:600 }}>See how it works</button>
        </div>
        <p style={{ fontSize:12.5, color:C.mute, marginTop:18 }}>No setup required · Works for any portfolio · Built for boards</p>
      </div>

      {/* trust strip */}
      <div style={{ borderTop:`1px solid ${C.line}`, borderBottom:`1px solid ${C.line}`, background:C.bg }}>
        <div style={{ maxWidth:1180, margin:"0 auto", padding:"22px 28px", display:"flex", gap:36, justifyContent:"center", flexWrap:"wrap", fontSize:13, color:C.slate }}>
          <span>Used across <strong style={{color:C.ink}}>financial services</strong></span>
          <span><strong style={{color:C.ink}}>healthcare</strong></span>
          <span><strong style={{color:C.ink}}>higher education</strong></span>
          <span><strong style={{color:C.ink}}>government</strong></span>
          <span>and <strong style={{color:C.ink}}>large enterprise</strong></span>
        </div>
      </div>

      {/* features */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"64px 28px 32px" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <h2 style={{ fontSize:32, fontWeight:700, letterSpacing:"-0.02em", margin:"0 0 12px" }}>Everything you need to steer a portfolio</h2>
          <p style={{ fontSize:16, color:C.slate, maxWidth:560, margin:"0 auto" }}>From scattered, competing demands to a clear, funded, defensible plan.</p>
        </div>
        <div className="ld-grid2" style={{ display:"grid", gap:20 }}>
          {features.map(([t,d],i)=>(
            <div key={i} className="ld-feat" style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:14, padding:"26px 26px" }}>
              <div style={{ width:38, height:38, borderRadius:9, background:C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
                <span className="ld-mono" style={{ color:C.accent, fontWeight:600, fontSize:15 }}>{i+1}</span>
              </div>
              <h3 style={{ fontSize:17, fontWeight:700, margin:"0 0 8px" }}>{t}</h3>
              <p style={{ fontSize:14, color:C.slate, lineHeight:1.6, margin:0 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* how it works */}
      <div style={{ background:C.ink, color:C.white, marginTop:48 }}>
        <div style={{ maxWidth:1180, margin:"0 auto", padding:"64px 28px" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <h2 style={{ fontSize:32, fontWeight:700, letterSpacing:"-0.02em", margin:"0 0 12px" }}>How it works</h2>
            <p style={{ fontSize:16, color:"#94A3B8", maxWidth:560, margin:"0 auto" }}>Four steps from competing demands to a board-ready plan.</p>
          </div>
          <div className="ld-grid4" style={{ display:"grid", gap:20 }}>
            {steps.map(([n,t,d])=>(
              <div key={n} style={{ borderTop:`2px solid ${C.accent}`, paddingTop:18 }}>
                <div className="ld-mono" style={{ fontSize:13, color:C.accent, fontWeight:600, marginBottom:10 }}>{n}</div>
                <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 8px" }}>{t}</h3>
                <p style={{ fontSize:13.5, color:"#94A3B8", lineHeight:1.6, margin:0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"72px 28px", textAlign:"center" }}>
        <h2 style={{ fontSize:34, fontWeight:700, letterSpacing:"-0.02em", margin:"0 0 16px" }}>Stop arguing over priorities. Start steering.</h2>
        <p style={{ fontSize:17, color:C.slate, maxWidth:540, margin:"0 auto 30px" }}>See your whole portfolio prioritised, funded and phased in minutes.</p>
        <button onClick={onEnter} className="ld-cta" style={{ border:"none", background:C.accent, color:C.white, padding:"14px 32px", borderRadius:10, fontSize:16, fontWeight:600 }}>Try the live demo</button>
      </div>

      {/* footer */}
      <div style={{ borderTop:`1px solid ${C.line}`, background:C.bg }}>
        <div style={{ maxWidth:1180, margin:"0 auto", padding:"26px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, fontSize:13, color:C.mute }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Compass /><span style={{ fontWeight:700, color:C.ink }}>Steer</span>
          </div>
          <span>© {new Date().getFullYear()} Steer. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Login gate ---------- */
function Login({ onAuth, onBack }) {
  const [email, setEmail] = useState("hello@danieldunton.com");
  const [pw, setPw] = useState("demo1234");
  const [busy, setBusy] = useState(false);
  const go = () => { if (busy) return; setBusy(true); setTimeout(() => onAuth(), 500); };
  return (
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", minHeight:"100vh", display:"flex", background:C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        .li-in:focus { outline:none; border-color:${C.accent} !important; box-shadow:0 0 0 3px ${C.accentSoft}; }
        .li-btn:hover { background:#0b5e57 !important; }
        .li-sso:hover { background:${C.bg} !important; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:760px) { .li-brand { display:none !important; } }
      `}</style>

      {/* left brand panel (hidden on small) */}
      <div className="li-brand" style={{ flex:1, background:C.ink, color:C.white, padding:"56px 52px", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-80, top:-80, width:320, height:320, borderRadius:"50%", border:`1px solid #1e293b` }} />
        <div style={{ position:"absolute", right:-30, top:-30, width:220, height:220, borderRadius:"50%", border:`1px solid #1e293b` }} />
        <div onClick={onBack} style={{ display:"flex", alignItems:"center", gap:10, position:"relative", cursor:"pointer" }}>
          <svg width="30" height="30" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="11" stroke={C.accent} strokeWidth="2"/>
            <path d="M13 5 L16 13 L13 21 L10 13 Z" fill={C.accent}/>
            <circle cx="13" cy="13" r="1.6" fill={C.white}/>
          </svg>
          <span style={{ fontSize:24, fontWeight:700, letterSpacing:"-0.02em" }}>Steer</span>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:30, fontWeight:700, lineHeight:1.25, letterSpacing:"-0.02em", maxWidth:420 }}>
            Turn competing priorities into a portfolio your board can sign off.
          </div>
          <p style={{ fontSize:14, color:"#94A3B8", marginTop:16, maxWidth:400, lineHeight:1.6 }}>
            Evidence-based prioritisation, phasing and budget allocation for complex transformation programmes.
          </p>
        </div>
        <div style={{ fontSize:12, color:"#64748B", position:"relative" }}>
          Enterprise SSO · SOC 2 aligned · UK data residency
        </div>
      </div>

      {/* right form */}
      <div style={{ width:440, maxWidth:"100%", background:C.white, padding:"56px 44px", display:"flex", flexDirection:"column", justifyContent:"center", borderLeft:`1px solid ${C.line}` }}>
        <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px" }}>Sign in</h1>
        <p style={{ fontSize:13, color:C.slate, margin:"0 0 28px" }}>Access your portfolio workspace</p>

        <button className="li-sso" onClick={go}
          style={{ width:"100%", border:`1px solid ${C.line}`, background:C.white, color:C.ink, padding:"11px", borderRadius:9, fontSize:13.5, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:9, marginBottom:18 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6v6c0 5 3.5 8.5 9 10 5.5-1.5 9-5 9-10V6l-9-4z" stroke={C.accent} strokeWidth="1.8" strokeLinejoin="round"/></svg>
          Continue with SSO
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:12, margin:"4px 0 18px", color:C.mute, fontSize:11 }}>
          <div style={{ flex:1, height:1, background:C.line }} /> OR <div style={{ flex:1, height:1, background:C.line }} />
        </div>

        <label style={{ fontSize:12, fontWeight:500, color:C.slate, display:"block", marginBottom:5 }}>Work email</label>
        <input className="li-in" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
          style={{ width:"100%", border:`1px solid ${C.line}`, borderRadius:9, padding:"11px 12px", fontSize:13.5, marginBottom:14, transition:"all .15s" }} />

        <label style={{ fontSize:12, fontWeight:500, color:C.slate, display:"block", marginBottom:5 }}>Password</label>
        <input className="li-in" type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
          style={{ width:"100%", border:`1px solid ${C.line}`, borderRadius:9, padding:"11px 12px", fontSize:13.5, marginBottom:8, transition:"all .15s" }} />

        <div style={{ textAlign:"right", marginBottom:18 }}>
          <span style={{ fontSize:12, color:C.accent, cursor:"pointer" }}>Forgot password?</span>
        </div>

        <button className="li-btn" onClick={go} disabled={busy}
          style={{ width:"100%", border:"none", background:C.accent, color:C.white, padding:"12px", borderRadius:9, fontSize:14, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:9, transition:"all .15s" }}>
          {busy && <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .6s linear infinite" }} />}
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ fontSize:11, color:C.mute, textAlign:"center", marginTop:24, lineHeight:1.6 }}>
          Protected by enterprise-grade authentication.<br/>Sessions are encrypted end-to-end.
        </p>
      </div>
    </div>
  );
}

/* ---------- small components ---------- */
const Compass = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="13" r="11" stroke={C.accent} strokeWidth="2"/>
    <path d="M13 5 L16 13 L13 21 L10 13 Z" fill={C.accent}/>
    <circle cx="13" cy="13" r="1.6" fill={C.white}/>
  </svg>
);

function Metric({ label, value, sub, accent, warn }) {
  return (
    <div>
      <div style={{ fontSize:11, color:C.mute, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div className="mono" style={{ fontSize:20, fontWeight:600, color: warn?C.red:accent?C.accent:C.ink, lineHeight:1.2 }}>{value}</div>
      <div style={{ fontSize:11, color: warn?C.red:C.mute }}>{sub}</div>
    </div>
  );
}
function BigStat({ label, value, sub, c=C.ink }) {
  return (
    <div style={{ borderLeft:`3px solid ${C.line}`, paddingLeft:12 }}>
      <div style={{ fontSize:11, color:C.mute, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div className="mono" style={{ fontSize:26, fontWeight:600, color:c, lineHeight:1.15 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.mute }}>{sub}</div>}
    </div>
  );
}
function SectionHead({ title, desc, children }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, marginBottom:18, flexWrap:"wrap" }}>
      <div>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:"-0.01em" }}>{title}</h2>
        {desc && <p style={{ margin:"6px 0 0", fontSize:13, color:C.slate, maxWidth:680, lineHeight:1.55 }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}
const Sub = ({children}) => <div style={{ fontSize:12, fontWeight:600, color:C.slate, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>{children}</div>;
const Th = ({children,tip}) => <th title={tip} style={{ padding:"11px 12px", fontWeight:600, fontSize:11.5, textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap", cursor: tip?"help":"default", borderBottom: tip?`1px dotted ${C.mute}`:"none" }}>{children}</th>;
const Td = ({children}) => <td style={{ padding:"10px 12px", verticalAlign:"middle" }}>{children}</td>;
function ScoreCell({ v, onChange }) {
  return (
    <td style={{ padding:"10px 12px" }}>
      <select value={v} onChange={e=>onChange(parseInt(e.target.value))} className="mono"
        style={{ border:`1px solid ${C.line}`, borderRadius:6, padding:"3px 4px", fontSize:13, width:42, textAlign:"center", background:C.white }}>
        {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
      </select>
    </td>
  );
}
const Pill = ({children,color}) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:500, color:color, background:color+"18", padding:"3px 9px", borderRadius:20, whiteSpace:"nowrap" }}>
    <span style={{ width:6, height:6, borderRadius:"50%", background:color }} />{children}
  </span>
);
function Legend() {
  return (
    <div style={{ display:"flex", gap:16, marginTop:12, flexWrap:"wrap" }}>
      {Object.entries(WORKSTREAMS).map(([w,c])=>(
        <span key={w} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}>
          <span style={{ width:10, height:10, borderRadius:3, background:c }} />{w}
        </span>
      ))}
    </div>
  );
}
function Field({ label, children, flex }) {
  return (
    <div style={{ marginBottom:12, flex: flex?1:"none" }}>
      <label style={{ fontSize:12, fontWeight:500, color:C.slate, display:"block", marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}
const inp = { width:"100%", border:`1px solid ${C.line}`, borderRadius:8, padding:"9px 11px", fontSize:13, color:C.ink, background:C.white };
const iconBtn = { border:"none", background:"transparent", color:C.mute, fontSize:14, padding:"4px 6px", borderRadius:6 };
