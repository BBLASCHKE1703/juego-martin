"use client";
import { useState } from "react";
import styles from "./home.module.css"; // o el que uses para la portada
import { useRouter } from "next/navigation";

async function postJSON(url, data){
  const res = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });
  const text = await res.text();
  if(!res.ok) throw new Error(text);
  return JSON.parse(text);
}

export default function Home() {
  const router = useRouter();

  // Crear partida
  const [hostName, setHostName] = useState("");

  // Unirse
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const createGame = async ()=>{
    if(!hostName.trim()) return alert("Ingresa tu nombre (host).");
    const { code, hostId } = await postJSON("/api/game", { name: "Partida", hostName });
    // Storage del host
    localStorage.setItem("isHost", "1");
    localStorage.setItem("myPlayerId", hostId);
    localStorage.setItem("myName", hostName);
    // Ir al tablero
    router.push(`/game/${code}`);
  };

  const joinGame = async ()=>{
    if(!joinCode.trim() || !joinName.trim()) return alert("Completa código y tu nombre.");
    const { playerId } = await postJSON("/api/game/join", { code: joinCode.trim().toUpperCase(), name: joinName.trim() });
    // Storage del jugador
    localStorage.removeItem("isHost");
    localStorage.setItem("myPlayerId", playerId);
    localStorage.setItem("myName", joinName.trim());
    router.push(`/game/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <main style={{maxWidth:720, margin:"30px auto", padding:"0 16px"}}>
      <h1>Juego de Martín — Lobby</h1>

      <section style={{border:"1px solid #23284a", borderRadius:12, padding:16, marginBottom:16}}>
        <h3>Crear partida (Host)</h3>
        <div style={{display:"grid", gridTemplateColumns:"1fr auto", gap:8}}>
          <input
            placeholder="Tu nombre (Host)"
            value={hostName}
            onChange={e=>setHostName(e.target.value)}
            style={{padding:10, borderRadius:10, border:"1px solid #23284a", background:"#0e1222", color:"#fff"}}
          />
          <button onClick={createGame} style={{borderRadius:10, padding:"10px 14px"}}>Crear</button>
        </div>
        <p style={{opacity:.7, marginTop:8}}>La partida inicia con <b>15 GP</b> por jugador. (Fijo)</p>
      </section>

      <section style={{border:"1px solid #23284a", borderRadius:12, padding:16}}>
        <h3>Unirse a una partida</h3>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8}}>
          <input
            placeholder="Código (ej. ABC123)"
            value={joinCode}
            onChange={e=>setJoinCode(e.target.value)}
            style={{padding:10, borderRadius:10, border:"1px solid #23284a", background:"#0e1222", color:"#fff"}}
          />
          <input
            placeholder="Tu nombre"
            value={joinName}
            onChange={e=>setJoinName(e.target.value)}
            style={{padding:10, borderRadius:10, border:"1px solid #23284a", background:"#0e1222", color:"#fff"}}
          />
          <button onClick={joinGame} style={{borderRadius:10, padding:"10px 14px"}}>Unirse</button>
        </div>
      </section>
    </main>
  );
}
