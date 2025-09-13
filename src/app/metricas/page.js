'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './metricas.module.css'

export default function PaginaMetricas() {
  const [tareas, setTareas] = useState([])
  const [username, setUsername] = useState('')
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('username')
    if (!user) {
      router.push('/')
      return
    }
    setUsername(user)
    const tareasGuardadas = JSON.parse(localStorage.getItem(`tareas-${user}`) || '[]')
    setTareas(tareasGuardadas)
  }, [])

  const tareasCompletadas = tareas.filter(t => t.completada)
  const porcentajeCompletadas = tareas.length === 0 ? 0 : Math.round((tareasCompletadas.length / tareas.length) * 100)

  const obtenerDuracion = (tarea) => {
    if (tarea.todoElDia) return 24
    const duracion = parseFloat(tarea.duracion)
    return isNaN(duracion) ? 0 : duracion
  }

  const promedioDuracion = tareas.length === 0
    ? 0
    : (
        tareas
          .map(obtenerDuracion)
          .reduce((a, b) => a + b, 0) / tareas.length
      ).toFixed(2)

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h1 className={styles.title}>Métricas de {username}</h1>

        <div className={styles.metricBox}>
          <p><strong>Total de tareas:</strong> {tareas.length}</p>
          <p><strong>Tareas completadas:</strong> {tareasCompletadas.length}</p>
          <p><strong>Porcentaje completadas:</strong> {porcentajeCompletadas}%</p>
          <p><strong>Promedio duración (hrs):</strong> {promedioDuracion}</p>
        </div>

        <h2 className={styles.subtitle}>Detalle de tareas</h2>
        <ul className={styles.taskList}>
          {tareas.map((tarea, index) => (
            <li key={index} className={styles.taskItem}>
              <span className={styles.bold}>{tarea.titulo}</span>
              {tarea.categoria && <span> | {tarea.categoria}</span>}
              <span> | ⏱ {obtenerDuracion(tarea)} hrs</span>
              <span> | {tarea.completada ? 'Completada' : 'Pendiente'}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => router.push('/')} className={styles.button}>
          Volver a la página principal
        </button>
      </div>
    </div>
  )
}
