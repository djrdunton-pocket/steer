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
  "Student Systems":      "#0891B2",
  "Education Technology": "#1D4ED8",
  "Student Experience":   "#7C3AED",
  "Research":             "#0F766E",
  "Data":                 "#C2410C",
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
  { id:1,  name:"Student Records System Replacement", ws:"Student Systems",       owner:"L. Reid",    si:5, tc:4, en:4, ef:5, cost:5.5, status:"not-started" },
  { id:2,  name:"Online Admissions & Enrolment", ws:"Student Systems",            owner:"K. Adeyemi", si:4, tc:5, en:3, ef:3, cost:2.5, status:"not-started", due:1, dep:1 },
  { id:3,  name:"Virtual Learning Environment Upgrade", ws:"Education Technology", owner:"M. Cole",    si:4, tc:3, en:3, ef:3, cost:2.8, status:"not-started" },
  { id:4,  name:"Research Computing Platform", ws:"Research",                     owner:"A. Frost",   si:4, tc:3, en:4, ef:4, cost:3.2, status:"not-started" },
  { id:5,  name:"Research Data Management", ws:"Research",                        owner:"A. Frost",   si:3, tc:4, en:3, ef:2, cost:1.2, status:"not-started", due:0 },
  { id:6,  name:"HR & Finance System Replacement", ws:"Staff Experience",         owner:"J. Hart",    si:3, tc:2, en:3, ef:5, cost:4.5, status:"not-started" },
  { id:7,  name:"Identity & Access Management", ws:"Infrastructure",              owner:"D. Patel",   si:4, tc:4, en:5, ef:3, cost:1.8, status:"in-progress", due:1 },
  { id:8,  name:"Student App & Digital Campus", ws:"Student Experience",          owner:"L. Reid",    si:4, tc:3, en:3, ef:3, cost:2.0, status:"not-started", dep:7 },
  { id:9,  name:"Timetabling Modernisation", ws:"Student Experience",            owner:"S. Khan",    si:3, tc:3, en:2, ef:2, cost:1.2, status:"not-started" },
  { id:10, name:"Network & Wifi Upgrade", ws:"Infrastructure",                    owner:"D. Patel",   si:4, tc:4, en:5, ef:4, cost:2.8, status:"in-progress" },
  { id:11, name:"Data Warehouse & Analytics Platform", ws:"Data",                 owner:"R. Singh",   si:4, tc:2, en:4, ef:3, cost:1.8, status:"not-started" },
  { id:12, name:"Cyber Security Uplift", ws:"Infrastructure",                     owner:"S. Owen",    si:4, tc:5, en:2, ef:3, cost:1.8, status:"at-risk", due:0 },
  { id:13, name:"Managed Service Transition (Infosys)", ws:"Infrastructure",       owner:"S. Owen",    si:2, tc:3, en:3, ef:2, cost:1.2, status:"in-progress" },
  { id:14, name:"Student Success & Learning Analytics", ws:"Student Experience",   owner:"P. Nadeem",  si:5, tc:3, en:4, ef:3, cost:1.6, status:"not-started", dep:11 },
  { id:15, name:"AI & Automation Foundations", ws:"Data",                          owner:"T. Walsh",   si:4, tc:2, en:4, ef:3, cost:1.4, status:"not-started", dep:11 },
];

const fmt = (m) => "£" + m.toFixed(1) + "m";
const value = (i) => i.si + i.tc + i.en;             // 3–15
const priority = (i) => value(i) / i.ef;              // WSJF-style: value per unit effort
const duration = (i) => (i.ef >= 5 ? 3 : i.ef >= 3 ? 2 : 1);
const urgent = (i) => i.due != null || i.tc >= 4;   // time-critical, or has a target date

export default function Steer() {
  const [stage, setStage] = useState("intro"); // intro | app
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

  if (stage === "intro") return <Intro onEnter={() => setStage("app")} />;

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
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div className="tabs" style={{ display:"flex", gap:4, overflowX:"auto", maxWidth: isMobile?"62vw":"none" }}>
            {[["portfolio","Portfolio"],["budget", isMobile?"Budget":"Budget & Trade-offs"],["roadmap","Roadmap"],["onepage","Summary"],["method","Method"],["process","Process"]].map(([k,l]) => (
              <button key={k} className="tab" onClick={()=>setView(k)}
                style={{ border:"none", borderBottom: view===k?`2px solid ${C.accent}`:"2px solid transparent",
                  background:"transparent", color: view===k?C.ink:C.slate,
                  padding:"8px 6px", margin:"0 4px", fontSize:13, fontWeight: view===k?600:500,
                  transition:"color .15s", whiteSpace:"nowrap", borderRadius:0 }}>
                {l}
              </button>
            ))}
          </div>
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
        {view==="process"   && <Process setView={setView} />}
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
  const byId = Object.fromEntries(items.map(x => [x.id, x]));
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
                  <Td>
                    <span style={{ fontWeight:600 }}>{i.name}</span>
                    <div style={{ fontSize:11, color:C.mute }}>{i.owner}</div>
                    {i.dep && byId[i.dep] && (() => {
                      const broken = i.funded && !byId[i.dep].funded;
                      return <div style={{ fontSize:10.5, marginTop:2, fontWeight: broken?600:400, color: broken?C.red:C.mute }}>
                        {broken ? "⚠ depends on " : "depends on "}{byId[i.dep].name}{broken ? " (unfunded)" : ""}
                      </div>;
                    })()}
                  </Td>
                  <Td><Pill color={WORKSTREAMS[i.ws]}>{i.ws}</Pill></Td>
                  <ScoreCell v={i.si} onChange={(v)=>update(i.id,{si:v})} />
                  <ScoreCell v={i.tc} onChange={(v)=>update(i.id,{tc:v})} />
                  <ScoreCell v={i.en} onChange={(v)=>update(i.id,{en:v})} />
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
        Dimmed rows fall below the funding line at the current budget. A red <span style={{ color:C.red }}>⚠ depends on</span> flag means a funded initiative relies on one that is not funded, a dependency to resolve before it can go ahead. Tap any score to change it and the ranking, roadmap and budget update live.
      </p>
    </div>
  );
}

/* ---------- Roadmap ---------- */
function Roadmap({ items, print }) {
  const funded = items.filter(i => i.startYear !== null);
  // spread each initiative's cost evenly across the years its bar actually spans on the chart
  const span = (i) => Math.min(i.startYear + duration(i), YEARS.length) - i.startYear;
  const perYear = (i) => i.cost / span(i);
  const annualSpend = YEARS.map((_, y) =>
    funded.filter(i => y >= i.startYear && y < i.startYear + duration(i)).reduce((s,i)=>s+perYear(i),0)
  );
  // delivery risk: at-risk status, or funded but blocked by an unfunded dependency
  const byId = Object.fromEntries(items.map(x => [x.id, x]));
  const atRisk = (i) => i.status === "at-risk" || (i.dep && byId[i.dep] && !byId[i.dep].funded);
  return (
    <div>
      <SectionHead title="Investment Roadmap" desc="An indicative phasing, not fixed delivery dates: funded work is sequenced by priority, in-flight work sits in year one, and each year stays within budget. Time-critical work is shaded, and any target date shows as a marker on its row." />
      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, padding:"20px 24px", overflowX:"auto" }}>
        <div style={{ minWidth:760 }}>
          {/* year header */}
          <div style={{ display:"grid", gridTemplateColumns:"260px repeat(5,1fr)", gap:8, paddingBottom:10, borderBottom:`1px solid ${C.line}`, marginBottom:12 }}>
            <div style={{ fontSize:11, color:C.mute, textTransform:"uppercase", letterSpacing:"0.06em" }}>Initiative</div>
            {YEARS.map(y=><div key={y} style={{ fontSize:12, fontWeight:600, textAlign:"center", color:C.slate }}>{y}</div>)}
          </div>
          {funded.map((i) => (
            <div key={i.id} style={{ display:"grid", gridTemplateColumns:"260px repeat(5,1fr)", gap:8, alignItems:"center", marginBottom:8 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  <span style={{ display:"inline-block", width:7, height:7, borderRadius:2, background:WORKSTREAMS[i.ws], marginRight:7 }} />
                  {i.name}
                </div>
                <div style={{ fontSize:10.5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:C.mute }}>
                  {i.owner}{atRisk(i) && <span style={{ color:C.amber, fontWeight:600 }}> · ⚠ at risk</span>}
                </div>
              </div>
              {YEARS.map((_, y) => {
                const active = y >= i.startYear && y < i.startYear + duration(i);
                const isStart = y === i.startYear;
                const isEnd = y === i.startYear + duration(i) - 1;
                const nextActive = active && (y + 1) < i.startYear + duration(i);
                return (
                  <div key={y} style={{ height:30, position:"relative" }}>
                    {active && <div style={{ position:"absolute", top:0, bottom:0, left:0, right: nextActive ? -8 : 0,
                      background: WORKSTREAMS[i.ws],
                      opacity: i.status==="at-risk"?0.55:0.9,
                      borderTopLeftRadius: isStart?6:0, borderBottomLeftRadius: isStart?6:0,
                      borderTopRightRadius: isEnd?6:0, borderBottomRightRadius: isEnd?6:0,
                      backgroundImage: urgent(i) ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.30) 0, rgba(255,255,255,0.30) 3px, transparent 3px, transparent 7px)" : "none" }} />}
                    {active && <span className="mono" style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:11, fontWeight:600, zIndex:1 }}>{fmt(perYear(i))}</span>}
                    {y === i.due && <>
                      <span style={{ position:"absolute", top:-5, bottom:-5, right:-1, borderRight:`2px solid ${C.amber}`, zIndex:2 }} />
                      <span style={{ position:"absolute", top:-10, right:-6, fontSize:10, lineHeight:1, color:C.amber, zIndex:2 }}>◆</span>
                    </>}
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
      <p style={{ fontSize:11.5, color:C.mute, marginTop:10 }}>
        Diagonal shading marks time-critical work. The amber <span style={{ color:C.amber }}>◆</span> marks a target date; where a bar runs past it, the schedule is at risk of missing that date at the current budget. A <span style={{ color:C.amber }}>⚠ at risk</span> flag marks delivery risk, work that is at risk or blocked by an unfunded dependency, surfaced to resolve rather than buried.
      </p>
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
  const th = { fontSize:11, fontWeight:700, color:C.mute, textTransform:"uppercase", letterSpacing:"0.06em" };
  return (
    <div>
      <SectionHead title="Budget & Trade-offs" desc="Initiatives ranked by priority, accumulating cost against the budget. Everything below the line is unfunded at this level. Move the budget slider to see what changes." />
      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 18px", borderBottom:`1px solid ${C.line}`, background:C.bg }}>
          <span style={{ width:20 }} />
          <span style={{ width:8 }} />
          <span style={{ flex:1, ...th }}>Initiative</span>
          <span style={{ width:92, ...th }}>Status</span>
          <span style={{ width:50, textAlign:"right", ...th }}>Cost</span>
          <span style={{ width:62, textAlign:"right", ...th }}>Running total</span>
        </div>
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
                <span style={{ width:92, flexShrink:0 }}><Pill color={i.funded?C.accent:C.mute}>{i.funded?"Funded":"Below line"}</Pill></span>
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
      <SectionHead title="Method" desc="How initiatives are prioritised. The model is deliberately simple and transparent, built on a proven principle and tuned to fit the portfolio, so decisions are defensible to a board rather than driven by who argues hardest." />

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
          The principle is value for effort, the logic behind <strong style={{color:C.white}}>Weighted Shortest Job First (WSJF)</strong> from scaled Agile, proven in large transformation programmes. But the model, its funding line and phasing, and the tool around them, are built rather than taken off the shelf, so the framework fits the portfolio and can be tuned to each organisation rather than the other way round. A high-impact, highly-enabling, low-effort initiative ranks above a costly initiative of similar value.
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
/* ---------- Process / governance ---------- */
function Process({ setView }) {
  const setup = [
    ["Engage and define", "Bring every initiative into one place, each with an owner and a cost, captured one to one so people are honest about what matters.", "Add initiatives →", "portfolio"],
    ["Prioritise together", "Score each initiative on value versus effort in the open, so the basis is shared and applied consistently.", "Score now →", "portfolio"],
    ["Fund and phase",    "Set the budget, agree the funding line and sequence the funded work across the years.", "Open budget →", "budget"],
    ["Govern and adapt",  "Run a regular cadence that keeps the portfolio current as priorities and evidence change.", "View roadmap →", "roadmap"],
  ];
  const cadence = [
    ["Monthly",   "Track delivery status, surface risks and catch slippage early."],
    ["Quarterly", "Re-score new demand and re-baseline the portfolio against priorities."],
    ["Annually",  "Reset the budget and refresh the strategy the portfolio serves."],
  ];
  return (
    <div>
      <SectionHead title="Process" desc="How Steer is run: a one-off set-up to stand the portfolio up, then a steady governance cadence that keeps it honest. Scoring is done with stakeholders, while ExCo owns the trade-offs." />

      <Sub>Setting up the portfolio</Sub>
      <div className="m-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {setup.map(([t,d,link,target], idx)=>(
          <div key={t} style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, padding:"20px 22px", display:"flex", flexDirection:"column" }}>
            <div className="mono" style={{ width:30, height:30, borderRadius:"50%", background:C.accentSoft, color:C.accent, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>{idx+1}</div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>{t}</div>
            <p style={{ fontSize:13, color:C.slate, lineHeight:1.6, margin:"0 0 16px", flex:1 }}>{d}</p>
            <button onClick={()=>setView(target)} className="tab" style={processLink}>{link}</button>
          </div>
        ))}
      </div>

      <Sub>Ongoing governance cadence</Sub>
      <div className="m-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
        {cadence.map(([t,d])=>(
          <Card key={t} title={t}><p style={{ ...cardP, margin:0 }}>{d}</p></Card>
        ))}
      </div>

      <div style={{ background:C.white, border:`1px solid ${C.line}`, borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
        <p style={{ fontSize:13, color:C.slate, lineHeight:1.6, margin:0 }}>New demand and changing priorities feed back into scoring each quarter.</p>
      </div>

      <p style={{ fontSize:12, color:C.mute, lineHeight:1.6, margin:0 }}>Scored with stakeholders, owned by ExCo, facilitated by the portfolio lead.</p>
    </div>
  );
}
const processLink = { border:"none", background:"transparent", color:C.accent, padding:0, fontSize:13, fontWeight:600, textAlign:"left", alignSelf:"flex-start" };

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
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Cost (£m)" flex><input type="number" step={0.1} min={0} value={f.cost} onChange={e=>set("cost",parseFloat(e.target.value)||0)} style={inp} /></Field>
          <Field label="Target year (optional)" flex>
            <select value={f.due ?? ""} onChange={e=>set("due", e.target.value===""?null:parseInt(e.target.value))} style={inp}>
              <option value="">None</option>
              {YEARS.map((y,idx)=><option key={y} value={idx}>{y}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ border:`1px solid ${C.line}`, background:C.white, color:C.slate, padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:500 }}>Cancel</button>
          <button onClick={()=>f.name&&onSave(f)} style={{ border:"none", background:C.accent, color:C.white, padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600 }}>Save</button>
        </div>
      </div>
    </div>
  );
}


/* ---------- Intro splash ---------- */
function Intro({ onEnter }) {
  return (
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif", color:C.ink, background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        .in-mono { font-family:'IBM Plex Mono', monospace; }
        .in-cta:hover { background:#0b5e57 !important; }
      `}</style>

      <div style={{ width:560, maxWidth:"100%", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:11, marginBottom:24 }}>
          <Compass />
          <span style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em" }}>Steer</span>
        </div>

        <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.25, margin:"0 0 16px" }}>
          Prioritise initiatives on value vs. effort.
        </h1>
        <p style={{ fontSize:15, color:C.slate, lineHeight:1.65, margin:"0 auto 28px", maxWidth:460 }}>
          Score each initiative on strategic impact, time-criticality and enablement,
          weigh it against effort, then set a budget to see what's funded and how it phases across five years.
        </p>

        <div className="in-mono" style={{ display:"inline-block", background:C.white, border:`1px solid ${C.line}`, borderRadius:10, padding:"14px 20px", fontSize:14, color:C.slate, marginBottom:16 }}>
          Priority = <span style={{ color:C.accent, fontWeight:600 }}>(Impact + Time-criticality + Enablement)</span> ÷ <span style={{ color:C.red, fontWeight:600 }}>Effort</span>
        </div>

        <p style={{ fontSize:13.5, color:C.slate, lineHeight:1.6, margin:"0 auto 30px", maxWidth:420 }}>
          A transparent way to prioritise, fund and phase a portfolio of change.
        </p>

        <div>
          <button onClick={onEnter} className="in-cta"
            style={{ border:"none", background:C.accent, color:C.white, padding:"13px 32px", borderRadius:10, fontSize:15, fontWeight:600 }}>
            Enter
          </button>
        </div>
        <p style={{ fontSize:12, color:C.mute, marginTop:18 }}>Sample portfolio · figures are illustrative</p>
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
