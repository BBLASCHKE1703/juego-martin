"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "../game.module.css";

/* ==== helpers de red ==== */
async function getState(code){
  try {
    const res = await fetch(`/api/game/${code}`, { cache:"no-store" });
    const text = await res.text();
    if (res.status === 404) return { __gone: true };
    let json = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      return { __error: { status: res.status, message: (json && (json.error || json.message)) || text || "Error desconocido" } };
    }
    return json;
  } catch (err) {
    return { __error: { status: 0, message: String(err?.message || err) } };
  }
}
async function patchGame(code, body){
  const res = await fetch(`/api/game/${code}`, {
    method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(await res.text());
}
async function postTx(body){
  const res = await fetch("/api/tx", {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(await res.text());
}
async function patchPlayerAlive(id, alive){
  const res = await fetch(`/api/player/${id}`, {
    method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ alive })
  });
  if(!res.ok) throw new Error(await res.text());
}

/* ==== Swap endpoints ==== */
async function swapRequest(code, fromId, toId){
  const r = await fetch(`/api/game/${code}/swap/request`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ fromId, toId })
  });
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}
async function swapConfirm(code, requestId){
  const r = await fetch(`/api/game/${code}/swap/confirm`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ requestId })
  });
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}
async function swapCancel(code, requestId){
  const r = await fetch(`/api/game/${code}/swap/cancel`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ requestId })
  });
  const t = await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);
}

/* ==== componente ==== */
export default function GamePage(){
  const { code } = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState("");
  const [giveOpen, setGiveOpen] = useState(false);
  const [giveTo, setGiveTo] = useState("");
  const [giveAmt, setGiveAmt] = useState(1);

  // Modales host-only
  const [killOpen, setKillOpen] = useState(false);
  const [killWho, setKillWho] = useState("");
  const [reviveOpen, setReviveOpen] = useState(false);
  const [reviveWho, setReviveWho] = useState("");

  // Intercambiar
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapWith, setSwapWith] = useState("");
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [pendingSwap, setPendingSwap] = useState(null);

  const myId   = useMemo(()=> (typeof window!=="undefined" ? localStorage.getItem("myPlayerId") || "" : ""), []);
  const myName = useMemo(()=> (typeof window!=="undefined" ? localStorage.getItem("myName") || "" : ""), []);
  const isHost = useMemo(()=> (typeof window!=="undefined" ? !!localStorage.getItem("isHost") : false), []);

  const seenSwapIds = useRef(new Set());

  const refresh = async ()=>{
    if(!code) return;
    const st = await getState(code);

    if (st.__gone) {
      setData(null);
      setNotice("La partida ha finalizado.");
      if (typeof window !== "undefined" && !localStorage.getItem("isHost")) {
        setTimeout(()=> router.push("/"), 1200);
      }
      return;
    }

    if (st.__error) {
      setData(null);
      setNotice(`⚠️ Error del servidor (${st.__error.status}): ${st.__error.message}`);
      return;
    }

    setData(st);

    if (st.game?.status === "Finalizado") {
      const winName = st.ranking?.[0]?.name || "alguien";
      setNotice(`La partida ha finalizado. Ganador(a): ${winName}.`);
      if (typeof window !== "undefined" && !localStorage.getItem("isHost")) {
        setTimeout(()=> router.push("/"), 6500);
      }
    } else {
      setNotice("");
    }

    // reattach si se perdió myPlayerId
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("myPlayerId") || "";
      const storedName = localStorage.getItem("myName") || "";
      if (!storedId && storedName && st.players) {
        const matches = st.players.filter(p=>p.name===storedName);
        if (matches.length === 1) {
          localStorage.setItem("myPlayerId", matches[0].id);
          window.location.reload();
        }
      }
    }
  };

  useEffect(()=>{
    if(!code) return;
    refresh();
    const t = setInterval(refresh,1500);
    return ()=> clearInterval(t);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Defaults y selector del host
  useEffect(()=>{
    if (!data || !data.ranking) return;
    const me = myId && data.ranking.find(p=>p.id===myId);
    if (isHost) {
      if (!target && data.ranking[0]) setTarget(data.ranking[0].id);
    } else {
      if (me) setTarget(me.id);
    }
    if (!giveTo) {
      const other = data.ranking.find(p=>!myId || p.id!==myId);
      if (other) setGiveTo(other.id);
    }
    if (!swapWith) {
      const cand = data.ranking.find(p=>!myId || p.id!==myId);
      if (cand) setSwapWith(cand.id);
    }
    if (isHost && !killWho) {
      const cand = data.ranking.find(p=>p.alive!==false);
      if (cand) setKillWho(cand.id);
    }
  }, [data, isHost, myId, target, giveTo, swapWith, killWho]);

  // Intercambio pendiente → modal al receptor
  useEffect(()=>{
    const req = data?.game?.swapRequest;
    if (!req || req.status !== "pending") {
      setSwapConfirmOpen(false);
      setPendingSwap(null);
      return;
    }
    if (!myId || req.toId !== myId) return;
    if (seenSwapIds.current.has(req.id)) return;
    seenSwapIds.current.add(req.id);
    setPendingSwap(req);
    setSwapConfirmOpen(true);
  }, [data?.game?.swapRequest?.id, data?.game?.swapRequest?.status, myId]);

  // Revivir: mientras modal abierto, mantener un muerto válido seleccionado
  useEffect(()=>{
    if (!reviveOpen) return;
    const isStillDead = (id)=> (data?.ranking||[]).some(p=>p.id===id && p.alive===false);
    if (!reviveWho || !isStillDead(reviveWho)) {
      const d = (data?.ranking||[]).find(p=>p.alive===false);
      setReviveWho(d?.id || "");
    }
  }, [reviveOpen, data?.ranking, reviveWho]);

  /* ===== si no hay datos aún ===== */
  if (!data) {
    return (
      <main className={styles.container}>
        {notice && <div className={styles.banner}>{notice}</div>}
        <div>Cargando…</div>
      </main>
    );
  }

  const game = data.game;
  const ranking = data.ranking || [];
  const lookup = (id)=> ranking.find(p=>p.id===id);
  const isDead = (id)=> { const p = lookup(id); return p ? (p.alive === false) : false; };
  const canAct = game?.status === "EnJuego";

  const doTx = (pid, amt, reason, groupId="") =>
    postTx({ gameCode: code, playerId: pid, amount: amt, reason, groupId, sourcePlayerId: myId });

  const nameOf = (id)=> (data?.players?.find?.(p=>p.id===id)?.name)
                     || (ranking.find(p=>p.id===id)?.name)
                     || "";

  /* ===== Kill / Revive ===== */
  const killPlayer = async (pid)=>{
    const p = lookup(pid); if (!p) return;
    if (p.gp !== 0) await doTx(pid, -p.gp, "Eliminado (seteado a 0 GP)");
    await patchPlayerAlive(pid, false); await refresh();
  };
  const revivePlayer = async (pid)=>{
    const p = lookup(pid); if (!p) return;
    if (p.alive === false) {
      await patchPlayerAlive(pid, true);
      await doTx(pid, game.initialGP || 15, "Revivido (GP inicial)");
      await refresh();
    } else { alert("Ese jugador ya está vivo."); }
  };

  /* ===== Pozo: aportar / entregar / resetear ===== */
  // Cualquiera puede crear el pozo al aportar por primera vez
  const contributePot = async ()=>{
    const amt = parseInt(prompt("¿Cuánto aportar al Pozo?")||"0",10);
    if(!amt || amt<=0) return;

    let gid = data?.game?.currentPotGroup || "";
    if (!gid) {
      gid = `POT_${Date.now()}`;
      try { await patchGame(code, { currentPotGroup: gid, currentPotAmount: 0 }); }
      catch { alert("No se pudo crear el pozo, intenta de nuevo."); return; }
    }

    await doTx(target || myId, -amt, `Pozo (aporte ${amt})`, gid);
    await refresh();
  };

  const potTotal = ()=>{
    const gid = data?.game?.currentPotGroup;
    if (!gid) return 0;
    return (data.history||[])
      .filter(h=> h.groupId === gid && String(h.reason).startsWith("Pozo"))
      .reduce((s,h)=> s + (h.amount||0), 0) * -1;
  };

  const awardPot = async ()=>{
    const gid = data?.game?.currentPotGroup;
    if (!gid) return alert("No hay pozo activo.");
    const total = potTotal();
    if (total <= 0) return alert("El pozo está vacío.");
    await doTx(target, total, `Gana Pozo (${total})`, gid);
    // limpiar grupo para iniciar otro pozo (se recreará en el próximo aporte)
    await patchGame(code, { currentPotGroup: "", currentPotAmount: 0 });
    await refresh();
    alert(`Pozo entregado a ${lookup(target)?.name || target} por ${total} GP.`);
  };

  const resetPot = async ()=>{
    if (!confirm("¿Resetear pozo a 0? (no devuelve aportes anteriores)")) return;
    await patchGame(code, { currentPotGroup: "", currentPotAmount: 0 });
    await refresh();
  };

  /* ===== Acciones para TODOS (host) ===== */
  const allAdd = async ()=>{
    const v = parseInt(prompt("¿Cuántos GP sumar a TODOS?")||"0",10);
    if(!v) return;
    const gid=`ALL_ADD_${Date.now()}`;
    await Promise.all(ranking.map(p=> doTx(p.id, v, `Todos +${v}`, gid)));
  };
  const allSub = async ()=>{
    const v = parseInt(prompt("¿Cuántos GP quitar a TODOS?")||"0",10);
    if(!v) return;
    const gid=`ALL_SUB_${Date.now()}`;
    await Promise.all(ranking.map(p=> doTx(p.id, -v, `Todos -${v}`, gid)));
  };
  const allMul = async ()=>{
    const f = parseInt(prompt("¿Multiplicar GP de TODOS por?")||"1",10);
    if(!f || f===1) return;
    const gid=`ALL_MUL_${Date.now()}`;
    await Promise.all(ranking.map(p=>{
      const delta = p.gp*(f-1);
      return delta ? doTx(p.id, delta, `Todos x${f}`, gid) : Promise.resolve();
    }));
  };
  const allDiv = async ()=>{
    const d = parseInt(prompt("¿Dividir GP de TODOS por?")||"1",10);
    if(!d || d<=1) return;
    const gid=`ALL_DIV_${Date.now()}`;
    await Promise.all(ranking.map(p=>{
      const newGp = Math.floor(p.gp/d);
      const delta = newGp - p.gp;
      return delta ? doTx(p.id, delta, `Todos /${d}`, gid) : Promise.resolve();
    }));
  };

  /* ===== Intercambiar ===== */
  const requestSwapUI = async (otherId)=>{
    if (!myId) { alert("No estás identificado en este dispositivo. Vuelve a unirte desde el lobby para guardar tu jugador."); return; }
    if (otherId === myId) return alert("Elige a otra persona.");
    try {
      await swapRequest(code, myId, otherId);
      setNotice(`Solicitud de intercambio enviada a ${nameOf(otherId)}…`);
      await refresh();
    } catch (e) {
      alert(`No se pudo enviar: ${e.message}`);
    }
  };

  /* ===== Finalizar ===== */
  const finishAndPurge = async ()=>{
    if(!confirm("¿Finalizar la partida? Se anunciará el/la ganador(a) y luego se borrará para todos.")) return;
    const winner = ranking[0];
    const winnerName = winner ? winner.name : "alguien";
    await patchGame(code, { status: "Finalizado", winnerName, finalizedAt: new Date().toISOString() });
    alert(`Partida finalizada. Ganador(a): ${winnerName}. Se borrará en 8 segundos para todos…`);
    setTimeout(async ()=>{
      const res = await fetch(`/api/game/${code}/purge`, { method:"POST" });
      if(!res.ok){ alert(await res.text()); return; }
      router.push("/");
    }, 8000);
  };

  /* ===== Random ===== */
  const rollD6   = ()=> 1 + Math.floor(Math.random()*6);
  const flipCoin = ()=> Math.random()<0.5 ? "Cara" : "Sello";
  const spinWheel = ()=>{
    const alive = ranking.filter(p=>p.alive!==false);
    if (alive.length===0) return "(sin vivos)";
    const idx = Math.floor(Math.random()*alive.length);
    return alive[idx].name;
  };

  /* ===== Render ===== */
  return (
    <main className={styles.container}>
      {notice && <div className={styles.banner}>{notice}</div>}
      <h1 className={styles.title}>Partida {code}</h1>

      {data?.game?.swapRequest?.status === "pending" && (
        <div className={styles.banner}>
          Intercambio pendiente: {nameOf(data.game.swapRequest.fromId)} ⇄ {nameOf(data.game.swapRequest.toId)}
        </div>
      )}

      <div className={styles.toolbar}>
        <span className={styles.pill}>Estado: {game.status}</span>
        {game.currentPotGroup ? (
          <span className={styles.pill}>Pozo activo</span>
        ) : (<span className={styles.pill}>Sin pozo</span>)}

        {isHost ? (
          <>
            {/* Selector del host: decide a quién afectan las acciones y quién recibe el pozo */}
            <select className={styles.select} value={target} onChange={e=>setTarget(e.target.value)}>
              {ranking.map(p=> <option key={p.id} value={p.id}>{p.seat}. {p.name}{p.alive===false ? " (X)" : ""}</option>)}
            </select>
            <button className={styles.btn} onClick={()=>patchGame(code, { status:"EnJuego" })}>Iniciar</button>
            <button className={`${styles.btn} ${styles.btnWarn}`} onClick={finishAndPurge}>Finalizar</button>
          </>
        ) : (
          <span className={styles.pill}>Yo: {myName || "(sin nombre)"} {lookup(myId)?.alive===false?"(X)":""}</span>
        )}
        <button className={styles.btn} onClick={refresh}>↻</button>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Ranking</h3>
          <ul className={styles.list}>
            {ranking.map((p,i)=>(
              <li key={p.id} className={styles.listItem} title={p.alive===false ? "Eliminado" : "Vivo"}>
                <span>#{i+1} — {p.seat}. {p.name}{p.alive===false && <span className={styles.badgeDead}>X</span>}</span>
                <b>{p.gp} GP</b>
              </li>
            ))}
          </ul>

          {/* Acciones individuales */}
          <div className={styles.btnsGrid}>
            <button className={styles.btn} disabled={!canAct || isDead(target)} onClick={()=>{
              const v = parseInt(prompt("¿Cuántos GP sumar?")||"0",10);
              if(!v) return; doTx(target, v, `+${v} GP`);
            }}>➕</button>
            <button className={`${styles.btn} ${styles.btnBad}`} disabled={!canAct || isDead(target)} onClick={()=>{
              const v = parseInt(prompt("¿Cuántos GP quitar?")||"0",10);
              if(!v) return; doTx(target, -v, `-${v} GP`);
            }}>➖</button>
            <button className={styles.btn} disabled={!canAct || isDead(target)} onClick={()=>{
              const f = parseInt(prompt("¿Multiplicar por?")||"1",10);
              if(!f || f===1) return;
              const p = lookup(target); if(!p) return;
              const delta = p.gp * (f-1); if(!delta) return;
              doTx(target, delta, `x${f} GP`);
            }}>✖</button>
            <button className={styles.btn} disabled={!canAct || isDead(target)} onClick={()=>{
              const d = parseInt(prompt("¿Dividir por?")||"1",10);
              if(!d || d<=1) return;
              const p = lookup(target); if(!p) return;
              const newGp = Math.floor(p.gp / d);
              const delta = newGp - p.gp;
              doTx(target, delta, `/${d} GP`);
            }}>➗</button>

            {/* Dar a… */}
            <button className={styles.btn} disabled={!canAct || isDead(target)} onClick={()=> setGiveOpen(true)}>🎁</button>

            {/* Intercambiar */}
            <button className={styles.btn} disabled={!canAct} onClick={()=> setSwapOpen(true)}>⇄</button>

            {/* Eliminar */}
            <button className={`${styles.btn} ${styles.btnBad}`} disabled={!isHost || !canAct} onClick={()=> setKillOpen(true)}>☠</button>

            {/* Revivir */}
            <button
              className={`${styles.btn} ${styles.btnGood}`}
              disabled={!isHost || !canAct}
              onClick={()=>{
                const dead = (data?.ranking||[]).find(p=>p.alive===false);
                setReviveWho(dead?.id || "");
                setReviveOpen(true);
              }}
            >
              ❤️‍🔥
            </button>
          </div>
        </section>

        <aside className={styles.card}>
          {/* NUEVO: Acciones para TODOS (solo host) */}
          {isHost && (
            <>
              <h3 className={styles.cardTitle}>Acciones para TODOS</h3>
              <div className={styles.btnsGrid}>
                <button className={`${styles.btn} ${styles.btnGood}`} disabled={!canAct} onClick={allAdd}>⊕</button>
                <button className={`${styles.btn} ${styles.btnBad}`} disabled={!canAct} onClick={allSub}>⊖</button>
                <button className={styles.btn} disabled={!canAct} onClick={allMul}>×</button>
                <button className={styles.btn} disabled={!canAct} onClick={allDiv}>÷</button>
              </div>
            </>
          )}

          {/* Pozo */}
          <h3 className={styles.cardTitle} style={{marginTop:12}}>Pozo</h3>
          <div className={styles.btnsGrid}>
            <button className={styles.btn} onClick={contributePot}>Aportar</button>
            <button className={styles.btn} disabled={!isHost} onClick={awardPot}>Entregar</button>
            <button className={`${styles.btn} ${styles.btnWarn}`} disabled={!isHost} onClick={resetPot}>Resetear</button>
          </div>
          <div style={{marginTop:8}}>Total Pozo: <b>{potTotal()}</b> GP</div>

          {/* Random */}
          <h3 className={styles.cardTitle} style={{marginTop:12}}>Herramientas de azar</h3>
          <div className={styles.btnsGrid}>
            <button className={styles.btn} onClick={()=> alert(`🎡 Ruleta: ${spinWheel()}`)}>🎡</button>
            <button className={styles.btn} onClick={()=> alert(`🎲 D6: ${rollD6()}`)}>🎲</button>
            <button className={styles.btn} onClick={()=> alert(`🪙 Moneda: ${flipCoin()}`)}>🪙</button>
          </div>

          {/* Historial */}
          <h3 className={styles.cardTitle} style={{marginTop:12}}>Historial</h3>
          <div className={styles.hist}>
            {data.history.map((h, idx)=>(
              <div key={idx} className={styles.histRow}>
                <span className={styles.time}>{new Date(h.createdAt).toLocaleTimeString()}</span>
                <span>{h.sourcePlayerId ? `${nameOf(h.sourcePlayerId)} · ` : ""}{h.reason}</span>
                <b className={h.amount>=0 ? styles.amtPlus : styles.amtMinus}>{h.amount>0?`+${h.amount}`:h.amount}</b>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ===== Modal Dar a… ===== */}
      {giveOpen && (
        <div className={styles.modalOverlay} onClick={()=>setGiveOpen(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Dar a…</h3>
            <div className={styles.row}>
              <div>
                <label>Destino</label>
                <select className={styles.selectInput} value={giveTo} onChange={e=>setGiveTo(e.target.value)}>
                  {ranking.filter(p=>p.id!==target && p.alive!==false).map(p=>(
                    <option key={p.id} value={p.id}>{p.seat}. {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Cantidad</label>
                <input className={styles.input} type="number" min={1} value={giveAmt} onChange={e=>setGiveAmt(parseInt(e.target.value||"0",10))} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={()=>setGiveOpen(false)}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={async ()=>{
                if (!giveTo || !giveAmt) return;
                await doTx(target, -Math.abs(giveAmt), `Transfiere ${giveAmt} → ${lookup(giveTo)?.name || giveTo}`);
                await doTx(giveTo, +Math.abs(giveAmt), `Recibe ${giveAmt} de ${lookup(target)?.name || target}`);
                setGiveOpen(false);
              }}>Dar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Eliminar ===== */}
      {isHost && killOpen && (
        <div className={styles.modalOverlay} onClick={()=>setKillOpen(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Eliminar jugador</h3>
            <div className={styles.row}>
              <div>
                <label>Jugador</label>
                <select className={styles.selectInput} value={killWho} onChange={e=>setKillWho(e.target.value)}>
                  {ranking.filter(p=>p.alive!==false).map(p=>(
                    <option key={p.id} value={p.id}>{p.seat}. {p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={()=>setKillOpen(false)}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnBad}`} onClick={async ()=>{
                if (!killWho) return;
                await killPlayer(killWho);
                setKillOpen(false);
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Revivir ===== */}
      {isHost && reviveOpen && (
        <div className={styles.modalOverlay} onClick={()=>setReviveOpen(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Revivir jugador</h3>
            <div className={styles.row}>
              <div>
                <label>Jugador</label>
                <select className={styles.selectInput} value={reviveWho} onChange={e=>setReviveWho(e.target.value)}>
                  {ranking.filter(p=>p.alive===false).map(p=>(
                    <option key={p.id} value={p.id}>{p.seat}. {p.name} (X)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btn}
                onClick={()=>{
                  setReviveOpen(false);
                  setReviveWho("");
                }}
              >
                Cancelar
              </button>
              <button className={`${styles.btn} ${styles.btnGood}`} onClick={async ()=>{
                if (!reviveWho) return;
                await revivePlayer(reviveWho);
                setReviveOpen(false);
                setReviveWho("");
              }}>Revivir</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Intercambiar (emisor) ===== */}
      {swapOpen && (
        <div className={styles.modalOverlay} onClick={()=>setSwapOpen(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Intercambiar GP</h3>
            <div className={styles.row}>
              <div>
                <label>Con</label>
                <select className={styles.selectInput} value={swapWith} onChange={e=>setSwapWith(e.target.value)}>
                  {ranking.filter(p=>p.id!==myId && p.alive!==false).map(p=>(
                    <option key={p.id} value={p.id}>{p.seat}. {p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={()=>setSwapOpen(false)}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={async ()=>{
                if (!swapWith) return;
                await requestSwapUI(swapWith);
                setSwapOpen(false);
              }}>Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal Confirmación de Intercambio (receptor) ===== */}
      {swapConfirmOpen && pendingSwap && (
        <div className={styles.modalOverlay} onClick={()=>setSwapConfirmOpen(false)}>
          <div className={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirmar intercambio</h3>
            <p>¿Seguro/a que quieres intercambiar <b>todos</b> tus GP con <b>{nameOf(pendingSwap.fromId)}</b>?</p>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={async ()=>{
                await swapCancel(code, pendingSwap.id);
                setSwapConfirmOpen(false);
                setPendingSwap(null);
              }}>Rechazar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={async ()=>{
                await swapConfirm(code, pendingSwap.id);
                setSwapConfirmOpen(false);
                setPendingSwap(null);
                await refresh();
              }}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
