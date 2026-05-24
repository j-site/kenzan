import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://hbesdstvljalmijwxfoo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZXNkc3R2bGphbG1pand4Zm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDcwMTMsImV4cCI6MjA5NTE4MzAxM30.ZslgBuIjH-M4Uq6sPrCMxLyQAW4MZ61moSQe5pxfIp8";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calcDist(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const f1 = lat1 * Math.PI / 180, f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function fmtDist(m) { return m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`; }
function etaMin(m) { return Math.max(5, Math.round(m / 400)); }
function genId() { return "ORD-" + Math.floor(1000 + Math.random() * 9000); }

async function aiSearch(query, materials) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 200,
        messages: [{ role: "user", content: `資材リストから「${query}」に関連するIDを最大3つ選んでJSONのみ返してください: {"ids":[数字]}\n資材: ${JSON.stringify(materials.map(m=>({id:m.id,name:m.name,tags:m.tags})))}` }]
      })
    });
    const d = await res.json();
    const t = d.content?.map(b=>b.text||"").join("") || "{}";
    return JSON.parse(t.replace(/```json|```/g,"").trim()).ids || [];
  } catch { return []; }
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{display:none}
.app{font-family:'Noto Sans JP',sans-serif;background:#0a0c10;min-height:100vh;color:#e8e4dc;max-width:430px;margin:0 auto}
.mono{font-family:'Barlow Condensed',monospace;letter-spacing:.05em}
.btn{border:none;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px}
.btn-p{background:#f5a623;color:#0a0c10;padding:14px 20px;font-size:17px;width:100%}
.btn-p:hover{background:#ffc04a;transform:translateY(-1px)}
.btn-p:disabled{opacity:.35;cursor:not-allowed;transform:none}
.btn-g{background:transparent;color:#e8e4dc;border:1px solid #2a3040;padding:10px 16px;font-size:14px}
.btn-g:hover{border-color:#f5a623;color:#f5a623}
.btn-sm{padding:8px 14px;font-size:13px}
.card{background:#141820;border:1px solid #1e2530;padding:16px;margin-bottom:8px;transition:all .15s;cursor:pointer}
.card:hover{border-color:#f5a62366}
.card.sel{border-color:#f5a623;background:#1a2030}
.card.chosen{border-color:#4cff91;background:#0d1f17}
.tag{display:inline-flex;align-items:center;padding:3px 9px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-family:'Barlow Condensed',sans-serif}
.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4cff91}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 #4cff9166}50%{opacity:.7;box-shadow:0 0 0 5px transparent}}
.pulse{animation:pulse 1.8s infinite}
.nav-tab{flex:1;padding:13px 0 11px;background:transparent;border:none;border-top:2px solid transparent;color:#445;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .15s}
.nav-tab.active{color:#f5a623;border-top-color:#f5a623}
.divider{height:1px;background:#1e2530;margin:14px 0}
.bg-green{background:#0d2e1a;color:#4cff91}
.bg-orange{background:#2e1d0a;color:#f5a623}
.bg-red{background:#2e0d0d;color:#ff5555}
.bg-blue{background:#0a1e3a;color:#4a9fff}
.prog-track{height:4px;background:#1e2530;border-radius:2px}
.prog-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,#f5a623,#ff6b35);transition:width .6s ease}
.inp{background:#141820;border:1px solid #2a3040;color:#e8e4dc;padding:12px 14px;font-family:'Noto Sans JP',sans-serif;font-size:14px;width:100%;outline:none;transition:border .15s}
.inp:focus{border-color:#f5a623}
.inp::placeholder{color:#445}
.qty-btn{width:44px;height:44px;background:#1e2530;border:1px solid #2a3040;color:#e8e4dc;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s}
.qty-btn:hover{background:#f5a623;color:#0a0c10;border-color:#f5a623}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.su{animation:slideUp .25s ease}
@keyframes scaleIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.si{animation:scaleIn .3s cubic-bezier(.34,1.56,.64,1)}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .8s linear infinite;display:inline-block}
.notif{position:fixed;top:70px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:398px;background:#1a2030;border:1px solid #4cff9144;padding:12px 16px;z-index:100;display:flex;align-items:center;gap:12px}
@keyframes fd{from{transform:translateX(-50%) translateY(-16px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
.notif{animation:fd .3s ease}
.skel{background:linear-gradient(90deg,#141820 25%,#1e2530 50%,#141820 75%);background-size:200% 100%;animation:skel 1.4s infinite}
@keyframes skel{0%{background-position:200% 0}100%{background-position:-200% 0}}
`;

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("order");
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [chosenSupplier, setChosenSupplier] = useState(null);
  const [ordered, setOrdered] = useState(false);
  const [newOrderId, setNewOrderId] = useState(null);

  // DB data
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingMat, setLoadingMat] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // GPS
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Notif
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");
  const [banner, setBanner] = useState(null);

  // Search
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const trackRef = useRef(null);

  // ── LOAD MATERIALS ────────────────────────────────────────────────────────
  useEffect(() => {
    sb.from("materials").select("*").order("id").then(({ data }) => {
      if (data) setMaterials(data);
      setLoadingMat(false);
    });
  }, []);

  // ── LOAD & SUBSCRIBE ORDERS ───────────────────────────────────────────────
  const loadOrders = useCallback(() => {
    setLoadingOrders(true);
    sb.from("orders").select("*").order("placed_at", { ascending: false }).then(({ data }) => {
      if (data) setOrders(data);
      setLoadingOrders(false);
    });
  }, []);

  useEffect(() => {
    loadOrders();
    // Realtime subscription
    const channel = sb.channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();
    return () => sb.removeChannel(channel);
  }, [loadOrders]);

  // ── LOAD SUPPLIERS + GPS ──────────────────────────────────────────────────
  const loadSuppliers = useCallback((gpsPos) => {
    sb.from("suppliers").select("*").then(({ data }) => {
      if (!data) return;
      const enriched = data.map(s => {
        if (gpsPos) {
          const d = calcDist(gpsPos.lat, gpsPos.lng, s.lat, s.lng);
          return { ...s, distM: d, distFmt: fmtDist(d), eta: etaMin(d) };
        }
        return { ...s, distFmt: "—", eta: 20 };
      });
      setSuppliers(gpsPos ? enriched.sort((a,b) => a.distM - b.distM) : enriched);
    });
  }, []);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps(g);
        setGpsLoading(false);
        loadSuppliers(g);
        showBanner("📍 GPS取得完了", "現在地を基準に仕入れ先を並び替えました");
      },
      () => { setGpsLoading(false); loadSuppliers(null); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadSuppliers]);

  useEffect(() => { requestGps(); }, []);

  // ── REALTIME TRACKING SIMULATION ─────────────────────────────────────────
  useEffect(() => {
    trackRef.current = setInterval(async () => {
      const active = orders.filter(o => o.status === "配送中");
      for (const o of active) {
        const newProg = Math.min(100, o.progress + Math.random() * 4);
        const done = newProg >= 100;
        await sb.from("orders").update({
          progress: Math.round(newProg),
          status: done ? "完了" : "配送中",
          eta_min: done ? 0 : Math.max(0, Math.round((100 - newProg) / 10))
        }).eq("id", o.id);
        if (done) showBanner("✅ 配送完了！", `${o.material_name} が現場に到着しました`);
      }
    }, 4000);
    return () => clearInterval(trackRef.current);
  }, [orders]);

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const showBanner = useCallback((title, body) => {
    setBanner({ title, body });
    setTimeout(() => setBanner(null), 4000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch {}
    }
  }, []);

  const requestNotif = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
    if (p === "granted") showBanner("🔔 通知を許可しました", "配送情報をリアルタイムでお届けします");
  }, [showBanner]);

  // ── AI SEARCH ────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (q) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchRes(null); return; }
    setSearchLoading(true);
    const ids = await aiSearch(q, materials);
    if (ids.length > 0) {
      setSearchRes(materials.filter(m => ids.includes(m.id)));
    } else {
      setSearchRes(materials.filter(m => m.name.includes(q) || (m.tags||[]).some(t => t.includes(q))));
    }
    setSearchLoading(false);
  }, [materials]);

  // ── PLACE ORDER ───────────────────────────────────────────────────────────
  const placeOrder = useCallback(async () => {
    const id = genId();
    const rec = {
      id, material_name: selected.name, qty, unit: selected.unit,
      status: "配送中", progress: 0,
      supplier_id: chosenSupplier.id, supplier_name: chosenSupplier.name,
      site_lat: gps?.lat || null, site_lng: gps?.lng || null,
      note: note || null, eta_min: chosenSupplier.eta || 20,
    };
    const { error } = await sb.from("orders").insert(rec);
    if (!error) {
      setNewOrderId(id);
      setOrdered(true);
      showBanner("⚡ 注文確定！", `${selected.name} × ${qty}${selected.unit} — ${chosenSupplier.name}が受注`);
    }
  }, [selected, qty, chosenSupplier, gps, note, showBanner]);

  const reset = () => {
    setSelected(null); setQty(1); setNote(""); setStep(1);
    setChosenSupplier(null); setOrdered(false); setNewOrderId(null);
    setShowSearch(false); setSearchQ(""); setSearchRes(null);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Notification Banner */}
        {banner && (
          <div className="notif">
            <div style={{fontSize:20}}>🔔</div>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>{banner.title}</div>
              <div style={{fontSize:12,color:"#888",marginTop:2}}>{banner.body}</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{background:"#0a0c10",borderBottom:"1px solid #1e2530",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
          <div>
            <div style={{fontSize:10,letterSpacing:".2em",color:"#f5a623",fontWeight:700,textTransform:"uppercase",fontFamily:"'Barlow Condensed',sans-serif"}}>⚡ 建設資材即納</div>
            <div style={{fontSize:24,fontWeight:900,letterSpacing:".04em",fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>KENZAN</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-g btn-sm" onClick={requestGps}>
              {gpsLoading ? <span className="spin">⟳</span> : gps ? <span style={{color:"#4cff91"}}>📍</span> : "📍"}
              <span style={{fontSize:11}}>{gpsLoading?"取得中":gps?"GPS済":"GPS"}</span>
            </button>
            {notifPerm !== "granted" && (
              <button className="btn btn-g btn-sm" onClick={requestNotif}>🔔</button>
            )}
          </div>
        </div>

        {/* GPS bar */}
        {gps && (
          <div style={{background:"#0f1318",borderBottom:"1px solid #1e2530",padding:"7px 16px",display:"flex",alignItems:"center",gap:8,fontSize:12}}>
            <span className="pulse"/>
            <span style={{color:"#888"}}>現在地:</span>
            <span style={{fontWeight:500}}>{gps.lat.toFixed(4)}°N, {gps.lng.toFixed(4)}°E</span>
            <span style={{color:"#f5a623",marginLeft:"auto"}}>{suppliers.filter(s=>s.is_open).length}店舗が対応可</span>
          </div>
        )}

        <div style={{padding:"16px 16px 90px"}}>

          {/* ── ORDER ─────────────────────────────────────────────────── */}
          {view === "order" && (
            <div className="su">
              {step === 1 && (
                <>
                  {/* Frequent */}
                  {orders.length > 0 && (
                    <div style={{marginBottom:20}}>
                      <div style={{fontSize:11,color:"#f5a623",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>よく注文する資材</div>
                      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                        {[...new Map(orders.map(o=>[o.material_name,o])).values()].slice(0,4).map((o,i)=>{
                          const mat = materials.find(m=>m.name===o.material_name);
                          return (
                            <button key={i} className="btn btn-g" style={{flexShrink:0,padding:"8px 14px",flexDirection:"column",gap:2}}
                              onClick={()=>{ if(mat){setSelected(mat);setQty(o.qty);setStep(2);} }}>
                              <span style={{fontSize:20}}>{mat?.icon||"📦"}</span>
                              <span style={{whiteSpace:"nowrap",fontSize:12}}>{o.material_name}</span>
                              <span style={{color:"#888",fontSize:11}}>前回: {o.qty}{o.unit}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="divider"/>

                  {/* AI Search */}
                  <div style={{marginBottom:16,position:"relative"}}>
                    <input className="inp" placeholder="🤖 AI検索: 例「型枠に使う板」「電気の配管」"
                      value={searchQ}
                      onChange={e=>{setShowSearch(true);handleSearch(e.target.value);}}
                      onFocus={()=>setShowSearch(true)}/>
                    {searchLoading && <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#f5a623"}}><span className="spin">⟳</span></span>}
                  </div>

                  {showSearch && searchRes !== null && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:8}}>AI検索結果 ({searchRes.length}件)</div>
                      {searchRes.length===0 && <div style={{color:"#555",fontSize:13,padding:12}}>該当なし</div>}
                      {searchRes.map(m=>(
                        <div key={m.id} className="card" style={{display:"flex",alignItems:"center",gap:12}}
                          onClick={()=>{setSelected(m);setStep(2);setShowSearch(false);setSearchQ("");setSearchRes(null);}}>
                          <span style={{fontSize:24}}>{m.icon}</span>
                          <div><div style={{fontWeight:700}}>{m.name}</div><div style={{fontSize:12,color:"#666"}}>{m.category}</div></div>
                          <span style={{marginLeft:"auto",color:"#555",fontSize:18}}>›</span>
                        </div>
                      ))}
                      <button className="btn btn-g btn-sm" style={{width:"100%",marginTop:8}} onClick={()=>{setShowSearch(false);setSearchQ("");setSearchRes(null);}}>✕ クリア</button>
                    </div>
                  )}

                  {!showSearch && (
                    <>
                      <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>全資材</div>
                      {loadingMat ? (
                        [1,2,3,4].map(i=>(
                          <div key={i} className="skel" style={{height:68,marginBottom:8,borderRadius:0}}/>
                        ))
                      ) : materials.map(m=>(
                        <div key={m.id} className="card" style={{display:"flex",alignItems:"center",gap:14}}
                          onClick={()=>{setSelected(m);setStep(2);}}>
                          <div style={{fontSize:26,width:40,textAlign:"center"}}>{m.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:15}}>{m.name}</div>
                            <div style={{fontSize:12,color:"#666",marginTop:2}}>{m.category}</div>
                          </div>
                          <div style={{color:"#333",fontSize:18}}>›</div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {step === 2 && selected && (
                <div className="su">
                  <button className="btn btn-g btn-sm" style={{marginBottom:16,width:"auto"}} onClick={()=>setStep(1)}>← 戻る</button>
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:".1em"}}>選択中</div>
                    <div style={{fontSize:26,fontWeight:800,marginTop:4,fontFamily:"'Barlow Condensed',sans-serif"}}>{selected.icon} {selected.name}</div>
                  </div>
                  <div style={{background:"#141820",border:"1px solid #1e2530",padding:20,marginBottom:12}}>
                    <div style={{fontSize:12,color:"#888",marginBottom:14,textTransform:"uppercase",letterSpacing:".08em"}}>数量</div>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <button className="qty-btn" onClick={()=>setQty(Math.max(1,qty-1))}>−</button>
                      <div style={{flex:1,textAlign:"center"}}>
                        <span style={{fontSize:52,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",color:"#f5a623"}}>{qty}</span>
                        <span style={{fontSize:16,color:"#888",marginLeft:8}}>{selected.unit}</span>
                      </div>
                      <button className="qty-btn" onClick={()=>setQty(qty+1)}>＋</button>
                    </div>
                    <div className="divider"/>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                      {[5,10,20,50].map(n=>(
                        <button key={n} className="btn btn-g btn-sm" onClick={()=>setQty(n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"#141820",border:"1px solid #1e2530",padding:14,marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:22}}>📍</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:"#888",marginBottom:2}}>納品先（現在地）</div>
                      {gps ? (
                        <div style={{fontSize:13,fontWeight:700}}>{gps.lat.toFixed(4)}°N, {gps.lng.toFixed(4)}°E <span style={{color:"#4cff91",fontSize:11}}>GPS済</span></div>
                      ) : (
                        <div style={{fontSize:13,color:"#666"}}>GPS未取得</div>
                      )}
                    </div>
                    <button className="btn btn-g btn-sm" onClick={requestGps}>{gpsLoading?<span className="spin">⟳</span>:"更新"}</button>
                  </div>
                  <textarea className="inp" placeholder="備考: 例「3F資材置き場へ」「担当: 田中」" rows={2} value={note} onChange={e=>setNote(e.target.value)} style={{resize:"none",marginBottom:16}}/>
                  <button className="btn btn-p" onClick={()=>setStep(3)}>仕入れ先を検索 →</button>
                </div>
              )}

              {step === 3 && selected && (
                <div className="su">
                  <button className="btn btn-g btn-sm" style={{marginBottom:16,width:"auto"}} onClick={()=>setStep(2)}>← 戻る</button>
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:11,color:"#f5a623",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em"}}>仕入れ先マッチング</div>
                    <div style={{fontSize:20,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif"}}>{selected.name} × {qty}{selected.unit}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:13,color:"#666"}}>
                    <span className="pulse"/> {gps?"現在地から":"周辺"} {suppliers.length} 件を検索中
                  </div>
                  {suppliers.map(s=>(
                    <div key={s.id} className={`card ${chosenSupplier?.id===s.id?"chosen":""}`}
                      onClick={()=>s.is_open&&setChosenSupplier(s)} style={{opacity:s.is_open?1:.5}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15}}>{s.name}</div>
                          <div style={{fontSize:12,color:"#666",marginTop:3}}>📍 {s.distFmt}　☎ {s.phone}　★ {s.rating}</div>
                        </div>
                        <span className={`tag ${s.is_open?"bg-green":"bg-red"}`}>{s.is_open?"対応可":"休業中"}</span>
                      </div>
                      {s.is_open && (
                        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                          <span style={{fontSize:34,fontWeight:900,color:"#f5a623",fontFamily:"'Barlow Condensed',sans-serif"}}>⚡ {s.eta}分</span>
                          <span style={{fontSize:13,color:"#888"}}>で到着予定</span>
                        </div>
                      )}
                      {chosenSupplier?.id===s.id && <div style={{marginTop:8,fontSize:12,color:"#4cff91",fontWeight:700}}>✓ 選択中</div>}
                    </div>
                  ))}
                  <button className="btn btn-p" style={{marginTop:8}} disabled={!chosenSupplier} onClick={()=>setStep(4)}>この仕入れ先で注文する →</button>
                </div>
              )}

              {step === 4 && selected && chosenSupplier && (
                <div className="su">
                  {!ordered ? (
                    <>
                      <button className="btn btn-g btn-sm" style={{marginBottom:16,width:"auto"}} onClick={()=>setStep(3)}>← 戻る</button>
                      <div style={{marginBottom:20}}>
                        <div style={{fontSize:11,color:"#f5a623",textTransform:"uppercase",letterSpacing:".1em"}}>注文確認</div>
                        <div style={{fontSize:22,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif"}}>内容を確認してください</div>
                      </div>
                      {[
                        ["資材", `${selected.icon} ${selected.name}`],
                        ["数量", `${qty} ${selected.unit}`],
                        ["仕入れ先", chosenSupplier.name],
                        ["到着予定", `⚡ 約${chosenSupplier.eta}分後`],
                        ["納品先GPS", gps ? `${gps.lat.toFixed(4)}°N, ${gps.lng.toFixed(4)}°E` : "未取得"],
                        note && ["備考", note],
                      ].filter(Boolean).map(([l,v])=>(
                        <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #1a2030"}}>
                          <span style={{color:"#666",fontSize:13}}>{l}</span>
                          <span style={{fontWeight:700,fontSize:14,maxWidth:"60%",textAlign:"right"}}>{v}</span>
                        </div>
                      ))}
                      <div style={{background:"#0f1318",border:"1px solid #1e2530",padding:12,marginTop:16,marginBottom:20,fontSize:12,color:"#666"}}>
                        🔔 注文後、配送状況をリアルタイム追跡できます
                      </div>
                      <button className="btn btn-p" onClick={placeOrder}>注文を確定する ✓</button>
                    </>
                  ) : (
                    <div className="si" style={{textAlign:"center",paddingTop:30}}>
                      <div style={{fontSize:80,marginBottom:8}}>✅</div>
                      <div style={{fontSize:36,fontWeight:900,color:"#4cff91",fontFamily:"'Barlow Condensed',sans-serif"}}>注文完了！</div>
                      <div style={{fontSize:15,color:"#888",marginTop:8,marginBottom:24}}>約{chosenSupplier.eta}分で現場に届きます</div>
                      <div style={{background:"#0d2e1a",border:"1px solid #4cff9133",padding:20,marginBottom:20}}>
                        <div style={{fontSize:12,color:"#888",marginBottom:4}}>注文番号（Supabaseに保存済）</div>
                        <div style={{fontSize:30,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em",color:"#4cff91"}}>{newOrderId}</div>
                      </div>
                      <button className="btn btn-p" style={{marginBottom:10}} onClick={()=>{setView("track");reset();}}>📍 配送状況を追跡 →</button>
                      <button className="btn btn-g" style={{width:"100%"}} onClick={reset}>別の資材を注文する</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TRACKING ──────────────────────────────────────────────── */}
          {view === "track" && (
            <div className="su">
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:"#f5a623",textTransform:"uppercase",letterSpacing:".1em"}}>リアルタイム追跡</div>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif"}}>注文一覧</div>
              </div>
              <div style={{fontSize:12,color:"#666",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
                <span className="pulse"/> Supabaseからリアルタイム同期中
              </div>
              {loadingOrders ? (
                [1,2].map(i=><div key={i} className="skel" style={{height:120,marginBottom:8}}/>)
              ) : orders.length === 0 ? (
                <div style={{color:"#555",padding:20,textAlign:"center"}}>注文がありません</div>
              ) : orders.map(o=>(
                <div key={o.id} className="card" style={{cursor:"default"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,color:"#888",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em"}}>{o.id}</span>
                    <span className={`tag ${o.status==="完了"?"bg-green":o.status==="配送中"?"bg-orange":"bg-blue"}`}>{o.status}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{o.material_name} × {o.qty}{o.unit}</div>
                  <div style={{fontSize:12,color:"#666",marginBottom:12}}>🏭 {o.supplier_name}</div>
                  <div className="prog-track" style={{marginBottom:8}}>
                    <div className="prog-bar" style={{width:`${o.progress}%`,background:o.status==="完了"?"linear-gradient(90deg,#4cff91,#00cc66)":undefined}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#555"}}>
                    <span>受注</span><span>積込</span><span>配送中</span>
                    <span style={{color:o.status==="完了"?"#4cff91":"#888"}}>到着</span>
                  </div>
                  {o.status==="配送中" && <div style={{marginTop:10,fontSize:22,fontWeight:900,color:"#f5a623",fontFamily:"'Barlow Condensed',sans-serif"}}>⚡ あと約{o.eta_min}分</div>}
                  {o.status==="完了" && <div style={{marginTop:10,fontSize:14,color:"#4cff91",fontWeight:700}}>✓ 現場到着済み</div>}
                  {o.note && <div style={{marginTop:8,fontSize:12,color:"#888",background:"#0f1318",padding:"6px 10px"}}>📝 {o.note}</div>}
                  {o.site_lat && <div style={{marginTop:6,fontSize:11,color:"#555"}}>📍 {o.site_lat?.toFixed(4)}°N, {o.site_lng?.toFixed(4)}°E</div>}
                </div>
              ))}
            </div>
          )}

          {/* ── SUPPLIER ──────────────────────────────────────────────── */}
          {view === "supplier" && (
            <div className="su">
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:"#f5a623",textTransform:"uppercase",letterSpacing:".1em"}}>仕入れ先ダッシュボード</div>
                <div style={{fontSize:22,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif"}}>東京建材センター</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                  <span className="pulse"/><span style={{fontSize:12,color:"#888"}}>営業中 09:00〜18:00</span>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                {[
                  {label:"本日の注文",value:`${orders.length}件`,color:"#f5a623"},
                  {label:"配送完了",value:`${orders.filter(o=>o.status==="完了").length}件`,color:"#4cff91"},
                  {label:"配送中",value:`${orders.filter(o=>o.status==="配送中").length}件`,color:"#4a9fff"},
                  {label:"受注待ち",value:`${orders.filter(o=>o.status==="受注待ち").length}件`,color:"#e8e4dc"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#141820",border:"1px solid #1e2530",padding:16}}>
                    <div style={{fontSize:11,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>{s.label}</div>
                    <div style={{fontSize:28,fontWeight:900,color:s.color,fontFamily:"'Barlow Condensed',sans-serif"}}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:"#888",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>受注待ち・配送中</div>
              {orders.filter(o=>o.status!=="完了").length===0 && <div style={{color:"#555",padding:16,textAlign:"center",fontSize:13}}>現在対応中の注文はありません</div>}
              {orders.filter(o=>o.status!=="完了").map(o=>(
                <div key={o.id} className="card" style={{cursor:"default"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:12,color:"#888",fontFamily:"'Barlow Condensed',sans-serif"}}>{o.id}</span>
                    <span className={`tag ${o.status==="配送中"?"bg-orange":"bg-blue"}`}>{o.status}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{o.material_name} × {o.qty}{o.unit}</div>
                  {o.site_lat && <div style={{fontSize:12,color:"#666",marginBottom:10}}>📍 {o.site_lat?.toFixed(4)}°N, {o.site_lng?.toFixed(4)}°E</div>}
                  {o.status==="受注待ち" && (
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn btn-p btn-sm" style={{flex:1}} onClick={async()=>{
                        await sb.from("orders").update({status:"配送中"}).eq("id",o.id);
                        showBanner("🚚 配送開始", `${o.material_name} の配送を開始しました`);
                      }}>配送開始</button>
                      <button className="btn btn-g btn-sm" onClick={async()=>{
                        await sb.from("orders").update({status:"キャンセル"}).eq("id",o.id);
                      }}>辞退</button>
                    </div>
                  )}
                  {o.status==="配送中" && (
                    <div>
                      <div className="prog-track" style={{marginBottom:6}}>
                        <div className="prog-bar" style={{width:`${o.progress}%`}}/>
                      </div>
                      <div style={{fontSize:13,color:"#f5a623",fontWeight:700}}>⚡ あと約{o.eta_min}分</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────────── */}
          {view === "settings" && (
            <div className="su">
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:"#f5a623",textTransform:"uppercase",letterSpacing:".1em"}}>設定</div>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif"}}>設定 & 情報</div>
              </div>
              {[
                {title:"GPS・位置情報", children:(
                  <>
                    <div style={{fontSize:14,color:gps?"#4cff91":"#888",marginBottom:12}}>{gps?`✅ 取得済 (${gps.lat.toFixed(4)}°N)`:"❌ 未取得"}</div>
                    <button className="btn btn-g" style={{width:"100%"}} onClick={requestGps}>{gpsLoading?<><span className="spin">⟳</span> 取得中…</>:"📍 現在地を再取得"}</button>
                  </>
                )},
                {title:"プッシュ通知", children:(
                  <>
                    <div style={{fontSize:14,color:notifPerm==="granted"?"#4cff91":"#888",marginBottom:12}}>{notifPerm==="granted"?"✅ 許可済":"❌ 未許可"}</div>
                    {notifPerm!=="granted" ? (
                      <button className="btn btn-g" style={{width:"100%"}} onClick={requestNotif}>🔔 通知を許可する</button>
                    ) : (
                      <button className="btn btn-g" style={{width:"100%"}} onClick={()=>showBanner("🔔 テスト","通知は正常に動作しています！")}>テスト通知を送る</button>
                    )}
                  </>
                )},
                {title:"データベース (Supabase)", children:(
                  <div style={{fontSize:13,color:"#888"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span className="pulse" style={{background:"#4cff91"}}/>
                      <span style={{color:"#4cff91",fontWeight:700}}>接続済み</span>
                    </div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:"#555",wordBreak:"break-all"}}>{SUPABASE_URL}</div>
                    <div style={{marginTop:8}}>注文数: {orders.length}件 | 資材数: {materials.length}件 | 仕入れ先: {suppliers.length}件</div>
                  </div>
                )},
                {title:"AIアシスタント (Claude API)", children:(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#0d2e1a",border:"1px solid #4cff9133"}}>
                    <span className="pulse"/>
                    <span style={{fontSize:13,color:"#4cff91",fontWeight:600}}>自然言語検索: 有効</span>
                  </div>
                )},
              ].map(s=>(
                <div key={s.title} style={{background:"#141820",border:"1px solid #1e2530",padding:16,marginBottom:12}}>
                  <div style={{fontSize:11,color:"#f5a623",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:14}}>{s.title}</div>
                  {s.children}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#0a0c10",borderTop:"1px solid #1e2530",display:"flex",zIndex:20}}>
          {[
            {id:"order",label:"注文",icon:"🛒"},
            {id:"track",label:"追跡",icon:"📍",badge:orders.filter(o=>o.status==="配送中").length},
            {id:"supplier",label:"仕入先",icon:"🏭",badge:orders.filter(o=>o.status==="受注待ち").length},
            {id:"settings",label:"設定",icon:"⚙️"},
          ].map(t=>(
            <button key={t.id} className={`nav-tab ${view===t.id?"active":""}`}
              onClick={()=>{setView(t.id);reset();}} style={{position:"relative"}}>
              <div style={{fontSize:18,marginBottom:2}}>{t.icon}</div>
              {t.badge>0 && (
                <span style={{position:"absolute",top:8,right:"50%",transform:"translateX(8px)",background:"#f5a623",color:"#0a0c10",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.badge}</span>
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}