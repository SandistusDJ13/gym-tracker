import { useEffect, useMemo, useState } from 'react'

type ExerciseKind = 'strength' | 'cardio'

type ExerciseTemplate = {
  id: string
  name: string
  kind: ExerciseKind
  image?: string
  instructions: string[]
  defaultSets?: number
  defaultReps?: number
  defaultMinutes?: number
}

type WorkoutSet = { reps: number; complete: boolean }

type WorkoutExercise = {
  exerciseId: string
  sets: WorkoutSet[]
  weight: string
  note: string
  minutes?: number
  cardioComplete?: boolean
}

type Workout = {
  id: string
  date: string
  completedAt?: string
  exercises: WorkoutExercise[]
}

type Store = { active: Workout | null; history: Workout[] }
type Tab = 'today' | 'history' | 'sources'

const STORAGE_KEY = 'gym-store-v1'

const templates: ExerciseTemplate[] = [
  {
    id: 'leg-press', name: 'LEG PRESS', kind: 'strength', image: '/assets/leg-press.png', defaultSets: 3, defaultReps: 10,
    instructions: ['Chodidla na šířku ramen', 'Kolena ve směru chodidel', 'Kontrolovaně dolů', 'Nahoře kolena agresivně nepropínat'],
  },
  {
    id: 'chest-press', name: 'CHEST PRESS', kind: 'strength', image: '/assets/chest-press.svg', defaultSets: 3, defaultReps: 10,
    instructions: ['Lopatky lehce dozadu', 'Hrudník nahoře', 'Kontrolovaný pohyb', 'Ramena nedávat dopředu'],
  },
  {
    id: 'lat-pulldown', name: 'LAT PULLDOWN', kind: 'strength', image: '/assets/lat-pulldown.svg', defaultSets: 3, defaultReps: 10,
    instructions: ['Stáhnout lopatky', 'Tyč k horní části hrudníku', 'Výrazně nezaklánět trup', 'Kontrolovaně zpět nahoru'],
  },
  {
    id: 'cable-row', name: 'SEATED CABLE ROW', kind: 'strength', image: '/assets/cable-row.svg', defaultSets: 3, defaultReps: 10,
    instructions: ['Rovná záda', 'Táhnout lokty dozadu', 'Lopatky k sobě', 'Nehoupat trupem'],
  },
  {
    id: 'leg-curl', name: 'SEATED / LYING LEG CURL', kind: 'strength', image: '/assets/leg-curl.svg', defaultSets: 3, defaultReps: 10,
    instructions: ['Kontrolovaný pohyb', 'Tělo držet na opěrce', 'V kontrakci krátce podržet'],
  },
  {
    id: 'treadmill', name: 'TREADMILL WALK', kind: 'cardio', defaultMinutes: 10,
    instructions: ['Pohodlné až svižné tempo', 'Krátké cardio na závěr workoutu'],
  },
]

const sources = [
  { exercise: 'Leg Press', title: 'Leg-press-1-1024x670.png', url: 'https://commons.wikimedia.org/wiki/File:Leg-press-1-1024x670.png' },
  { exercise: 'Chest Press', title: 'Incline chest press 1.svg', url: 'https://commons.wikimedia.org/wiki/File:Incline_chest_press_1.svg' },
]

const todayKey = () => {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const makeExercise = (template: ExerciseTemplate, sets = template.defaultSets, reps = template.defaultReps, minutes = template.defaultMinutes): WorkoutExercise => ({
  exerciseId: template.id,
  sets: template.kind === 'strength' ? Array.from({ length: sets ?? 3 }, () => ({ reps: reps ?? 10, complete: false })) : [],
  weight: '',
  note: '',
  minutes: template.kind === 'cardio' ? minutes ?? 10 : undefined,
  cardioComplete: template.kind === 'cardio' ? false : undefined,
})

const makeDefaultWorkout = (): Workout => ({ id: newId(), date: todayKey(), exercises: templates.map((template) => makeExercise(template)) })

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Store
      if (!parsed.active && !parsed.history.some((item) => item.date === todayKey())) parsed.active = makeDefaultWorkout()
      return parsed
    }
  } catch {
    // A clean store is safer than blocking the workout when stored data is invalid.
  }
  return { active: makeDefaultWorkout(), history: [] }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [tab, setTab] = useState<Tab>('today')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), [store])

  const completedSets = store.active?.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.complete).length, 0) ?? 0
  const totalSets = store.active?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0

  const updateExercise = (index: number, change: (exercise: WorkoutExercise) => WorkoutExercise) => {
    setStore((current) => {
      if (!current.active) return current
      const exercises = current.active.exercises.map((exercise, exerciseIndex) => exerciseIndex === index ? change(exercise) : exercise)
      return { ...current, active: { ...current.active, exercises } }
    })
  }

  const lastResult = (exerciseId: string) => {
    for (const workout of store.history) {
      const result = workout.exercises.find((exercise) => exercise.exerciseId === exerciseId)
      if (result) return result
    }
    return undefined
  }

  const finishWorkout = () => {
    if (!store.active) return
    const allDone = store.active.exercises.every((exercise) => exercise.sets.length ? exercise.sets.every((set) => set.complete) : exercise.cardioComplete)
    if (!allDone && !window.confirm('Některé série ještě nejsou hotové. Přesto trénink dokončit?')) return
    const completed = { ...store.active, completedAt: new Date().toISOString() }
    setStore((current) => ({ active: null, history: [completed, ...current.history] }))
    setTab('history')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startWorkout = (exercises: WorkoutExercise[]) => {
    if (store.active && !window.confirm('Nový workout nahradí právě rozepsaný. Pokračovat?')) return
    setStore((current) => ({ ...current, active: { id: newId(), date: todayKey(), exercises } }))
    setShowNew(false)
    setTab('today')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#top" onClick={() => setTab('today')} aria-label="GYM – dnešní trénink">
          <span className="brand-mark">G</span><span>GYM</span>
        </a>
        <button className="new-workout" onClick={() => setShowNew(true)}>＋ Nový workout</button>
      </header>

      <nav className="tabs" aria-label="Hlavní navigace">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Dnes</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Historie</button>
      </nav>

      <main id="top">
        {tab === 'today' && (
          <TodayView
            workout={store.active}
            completedSets={completedSets}
            totalSets={totalSets}
            updateExercise={updateExercise}
            lastResult={lastResult}
            finishWorkout={finishWorkout}
            openNew={() => setShowNew(true)}
          />
        )}
        {tab === 'history' && <HistoryView history={store.history} />}
        {tab === 'sources' && <SourcesView />}
      </main>

      <footer><button className="text-button" onClick={() => setTab('sources')}>Zdroje obrázků</button></footer>
      {showNew && <NewWorkoutModal close={() => setShowNew(false)} start={startWorkout} />}
    </div>
  )
}

type TodayProps = {
  workout: Workout | null
  completedSets: number
  totalSets: number
  updateExercise: (index: number, change: (exercise: WorkoutExercise) => WorkoutExercise) => void
  lastResult: (exerciseId: string) => WorkoutExercise | undefined
  finishWorkout: () => void
  openNew: () => void
}

function TodayView({ workout, completedSets, totalSets, updateExercise, lastResult, finishWorkout, openNew }: TodayProps) {
  if (!workout) return (
    <section className="empty-state">
      <span className="success-icon">✓</span>
      <p className="eyebrow">DNEŠNÍ TRÉNINK</p>
      <h1>Hotovo.</h1>
      <p>Trénink je uložený v historii.</p>
      <button className="primary" onClick={openNew}>＋ Nový workout</button>
    </section>
  )

  return (
    <>
      <section className="workout-heading">
        <div>
          <p className="eyebrow">DNEŠNÍ TRÉNINK</p>
          <h1>{formatDate(workout.date)}</h1>
        </div>
        <div className="progress-value"><strong>{completedSets}</strong> / {totalSets}<span>sérií</span></div>
      </section>
      <div className="progress-track"><span style={{ width: `${totalSets ? completedSets / totalSets * 100 : 0}%` }} /></div>

      <section className="exercise-list">
        {workout.exercises.map((exercise, index) => {
          const template = templates.find((item) => item.id === exercise.exerciseId)!
          return <ExerciseCard key={`${exercise.exerciseId}-${index}`} template={template} exercise={exercise} previous={lastResult(exercise.exerciseId)} update={(change) => updateExercise(index, change)} />
        })}
      </section>

      <button className="finish-button" onClick={finishWorkout}>DOKONČIT TRÉNINK <span>→</span></button>
    </>
  )
}

function ExerciseCard({ template, exercise, previous, update }: { template: ExerciseTemplate; exercise: WorkoutExercise; previous?: WorkoutExercise; update: (change: (exercise: WorkoutExercise) => WorkoutExercise) => void }) {
  const changeWeight = (difference: number) => update((current) => {
    const value = Math.max(0, (Number.parseFloat(current.weight) || 0) + difference)
    return { ...current, weight: String(value) }
  })

  return (
    <article className={`exercise-card ${template.kind === 'cardio' ? 'cardio-card' : ''}`}>
      {template.image ? <img className="exercise-image" src={template.image} alt={`Ukázka provedení cviku ${template.name}`} /> : <div className="cardio-visual" aria-hidden="true"><span>↗</span><div /></div>}
      <div className="card-content">
        <p className="exercise-number">{template.kind === 'strength' ? 'SILOVÝ CVIK' : 'CARDIO'}</p>
        <h2>{template.name}</h2>
        <ul className="instructions">{template.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>

        {previous && template.kind === 'strength' && (
          <p className="previous"><span>MINULE</span> {previous.weight ? `${previous.weight} kg × ` : ''}{previous.sets.map((set) => set.reps).join(' / ')}</p>
        )}

        {template.kind === 'strength' ? (
          <>
            <div className="field-label">VÁHA</div>
            <div className="weight-control">
              <button onClick={() => changeWeight(-2.5)} aria-label="Snížit váhu o 2,5 kilogramu">−</button>
              <label><input inputMode="decimal" type="number" min="0" step="0.5" placeholder="—" value={exercise.weight} onChange={(event) => update((current) => ({ ...current, weight: event.target.value }))} /><span>kg</span></label>
              <button onClick={() => changeWeight(2.5)} aria-label="Zvýšit váhu o 2,5 kilogramu">＋</button>
            </div>
            <div className="field-label">SÉRIE</div>
            <div className="sets">
              {exercise.sets.map((set, setIndex) => (
                <button key={setIndex} className={set.complete ? 'done' : ''} onClick={() => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, complete: !item.complete } : item) }))}>
                  <span className="check">{set.complete ? '✓' : setIndex + 1}</span><span>{set.reps} opakování</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button className={`cardio-complete ${exercise.cardioComplete ? 'done' : ''}`} onClick={() => update((current) => ({ ...current, cardioComplete: !current.cardioComplete }))}>
            <span className="check">{exercise.cardioComplete ? '✓' : '○'}</span><strong>{exercise.minutes} minut</strong><span>{exercise.cardioComplete ? 'Hotovo' : 'Označit jako hotové'}</span>
          </button>
        )}

        <label className="note-field"><span>POZNÁMKA</span><textarea rows={2} placeholder="Přidej poznámku…" value={exercise.note} onChange={(event) => update((current) => ({ ...current, note: event.target.value }))} /></label>
      </div>
    </article>
  )
}

function HistoryView({ history }: { history: Workout[] }) {
  return (
    <section className="history-view">
      <p className="eyebrow">HISTORIE</p>
      <h1>Hotové tréninky</h1>
      {!history.length && <div className="history-empty">Zatím tu žádný dokončený trénink není.</div>}
      {history.map((workout) => (
        <details className="history-item" key={workout.id}>
          <summary>
            <span><strong>{formatDate(workout.date)}</strong><small>{workout.exercises.length} cviků · Workout dokončen</small></span><span className="summary-arrow">⌄</span>
          </summary>
          <div className="history-results">
            {workout.exercises.map((exercise, index) => {
              const template = templates.find((item) => item.id === exercise.exerciseId)
              return (
                <div className="history-result" key={`${exercise.exerciseId}-${index}`}>
                  <strong>{template?.name ?? exercise.exerciseId}</strong>
                  <span>{exercise.sets.length ? `${exercise.sets.length} série · ${exercise.sets.map((set) => set.reps).join(' / ')} opak. · ${exercise.weight || '—'} kg` : `${exercise.minutes} minut`}</span>
                  {exercise.note && <em>„{exercise.note}“</em>}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </section>
  )
}

function SourcesView() {
  return (
    <section className="sources-view">
      <p className="eyebrow">O APLIKACI</p>
      <h1>Zdroje obrázků</h1>
      <p>Stažené ilustrace jsou uloženy přímo v aplikaci. Jejich autorem je Everkinetic, licence CC BY-SA 3.0. U ostatních cviků je dočasný vlastní schematický náhled.</p>
      <ul>{sources.map((source) => <li key={source.exercise}><strong>{source.exercise}</strong><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul>
      <a className="license-link" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">Creative Commons BY-SA 3.0 ↗</a>
    </section>
  )
}

function NewWorkoutModal({ close, start }: { close: () => void; start: (exercises: WorkoutExercise[]) => void }) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(templates.map((template) => [template.id, false])))
  const [settings, setSettings] = useState<Record<string, { sets: number; reps: number; minutes: number }>>(() => Object.fromEntries(templates.map((template) => [template.id, { sets: template.defaultSets ?? 3, reps: template.defaultReps ?? 10, minutes: template.defaultMinutes ?? 10 }])))
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  const create = () => {
    const exercises = templates.filter((template) => selected[template.id]).map((template) => {
      const config = settings[template.id]
      return makeExercise(template, config.sets, config.reps, config.minutes)
    })
    if (exercises.length) start(exercises)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title">
        <div className="modal-handle" />
        <header><div><p className="eyebrow">NOVÝ WORKOUT</p><h2 id="new-title">Vyber cviky</h2></div><button className="close" onClick={close} aria-label="Zavřít">×</button></header>
        <div className="exercise-picker">
          {templates.map((template) => (
            <div className={`picker-item ${selected[template.id] ? 'selected' : ''}`} key={template.id}>
              <button className="picker-toggle" onClick={() => setSelected((current) => ({ ...current, [template.id]: !current[template.id] }))}>
                <span className="picker-check">{selected[template.id] ? '✓' : ''}</span><span><strong>{template.name}</strong><small>{template.kind === 'strength' ? 'Silový cvik' : 'Cardio'}</small></span>
              </button>
              {selected[template.id] && (
                <div className="picker-settings">
                  {template.kind === 'strength' ? <><NumberField label="Série" value={settings[template.id].sets} setValue={(sets) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], sets } }))} /><NumberField label="Opakování" value={settings[template.id].reps} setValue={(reps) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], reps } }))} /></> : <NumberField label="Minuty" value={settings[template.id].minutes} setValue={(minutes) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], minutes } }))} />}
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="primary modal-start" disabled={!selectedCount} onClick={create}>ZAČÍT WORKOUT · {selectedCount}</button>
      </section>
    </div>
  )
}

function NumberField({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><input type="number" inputMode="numeric" min="1" max="99" value={value} onChange={(event) => setValue(Math.max(1, Number(event.target.value) || 1))} /></label>
}

export default App
