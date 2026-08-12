import { useEffect, useMemo, useState } from 'react'

type ExerciseKind = 'strength' | 'cardio'
type ExerciseCategory = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio'
type ExerciseVisual = 'press' | 'fly' | 'pulldown' | 'row' | 'pullover' | 'leg-press' | 'leg-extension' | 'leg-curl' | 'lying-curl' | 'hinge' | 'overhead' | 'lateral' | 'curl' | 'pushdown' | 'dip' | 'abduction' | 'calf' | 'crunch' | 'rotation' | 'squat' | 'treadmill' | 'bike' | 'elliptical'

type ExerciseTemplate = {
  id: string
  name: string
  kind: ExerciseKind
  category: ExerciseCategory
  visual: ExerciseVisual
  image?: string
  instructions: string[]
  defaultSets?: number
  defaultReps?: number
  defaultMinutes?: number
  movement: { start: string; move: string; end: string }
}

type WorkoutSet = { reps: number; weight: string; complete: boolean }

type WorkoutExercise = {
  exerciseId: string
  sets: WorkoutSet[]
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
type LegacyWorkoutExercise = Omit<WorkoutExercise, 'sets'> & { weight?: string; sets: Array<Omit<WorkoutSet, 'weight'> & { weight?: string }> }
type LegacyWorkout = Omit<Workout, 'exercises'> & { exercises: LegacyWorkoutExercise[] }
type LegacyStore = { active: LegacyWorkout | null; history: LegacyWorkout[] }
type Tab = 'today' | 'history' | 'sources'

const STORAGE_KEY = 'gym-store-v1'

const strength = (id: string, name: string, category: ExerciseCategory, visual: ExerciseVisual, instructions: string[], start: string, move: string, end: string, image?: string): ExerciseTemplate => ({
  id, name, category, visual, kind: 'strength', image, instructions, defaultSets: 3, defaultReps: 10, movement: { start, move, end },
})

const duration = (id: string, name: string, visual: ExerciseVisual, instructions: string[], start: string, move: string, end: string, minutes: number): ExerciseTemplate => ({
  id, name, category: 'Cardio', visual, kind: 'cardio', instructions, defaultMinutes: minutes, movement: { start, move, end },
})

const templates: ExerciseTemplate[] = [
  strength('leg-press', 'LEG PRESS', 'Legs', 'leg-press', ['Chodidla na šířku ramen', 'Kolena ve směru chodidel', 'Kontrolovaně dolů'], 'Záda na opěrce, chodidla na desce.', 'Tlač desku plynule od těla.', 'Nohy téměř natažené, kolena měkká.', '/assets/leg-press.svg'),
  strength('chest-press', 'CHEST PRESS', 'Chest', 'press', ['Lopatky lehce dozadu', 'Hrudník nahoře', 'Ramena drž vzadu'], 'Záda na opěrce, madla u hrudníku.', 'Tlač madla rovně vpřed.', 'Paže téměř natažené, ramena vzadu.', '/assets/chest-press.svg'),
  strength('lat-pulldown', 'LAT PULLDOWN', 'Back', 'pulldown', ['Stáhni lopatky', 'Trup drž téměř svisle', 'Pohyb kontroluj'], 'Sedni si, ruce nahoře na tyči.', 'Táhni tyč k horní části hrudníku.', 'Lokty dole, hrudník nahoře.', '/assets/lat-pulldown.svg'),
  strength('cable-row', 'SEATED CABLE ROW', 'Back', 'row', ['Rovná záda', 'Táhni lokty dozadu', 'Nehoupej trupem'], 'Sedni rovně, ruce natažené k madlu.', 'Táhni madlo k břichu.', 'Lokty vzadu, lopatky k sobě.', '/assets/cable-row.svg'),
  strength('leg-curl', 'SEATED LEG CURL', 'Legs', 'leg-curl', ['Tělo drž na opěrce', 'Pohyb bez švihu', 'Krátce podrž dole'], 'Sedni pevně, nohy téměř natažené.', 'Pokrč kolena a stáhni válec dolů.', 'Paty pod sedákem, tělo na opěrce.', '/assets/leg-curl.svg'),
  duration('treadmill', 'TREADMILL WALK', 'treadmill', ['Pohodlné až svižné tempo', 'Dívej se vpřed', 'Drž přirozený krok'], 'Postav se doprostřed pásu.', 'Kráčej plynule v rytmu pásu.', 'Tělo vzpřímené, krok jistý.', 10),
  strength('leg-extension', 'LEG EXTENSION', 'Legs', 'leg-extension', ['Kolena v ose stroje', 'Záda na opěrce', 'Nešvihej váhou'], 'Sedni, válec nad kotníky.', 'Narovnej kolena a zvedni válec.', 'Nohy nahoře téměř rovné.'),
  strength('lying-leg-curl', 'LYING LEG CURL', 'Legs', 'lying-curl', ['Boky drž na lavici', 'Pohyb kontroluj', 'Paty táhni k hýždím'], 'Lehni si, válec nad patami.', 'Pokrč kolena proti odporu.', 'Paty nahoře, boky stále dole.'),
  strength('pec-fly', 'PEC FLY', 'Chest', 'fly', ['Lokty lehce pokrčené', 'Hrudník nahoře', 'Ramena drž dole'], 'Sedni, paže rozevřené do stran.', 'Spoj madla obloukem před hrudníkem.', 'Dlaně před tělem, hrudník pevný.'),
  strength('incline-chest-press', 'INCLINE CHEST PRESS', 'Chest', 'press', ['Lopatky u opěrky', 'Lokty pod madly', 'Neprohýbej bedra'], 'Sedni šikmo, madla u horní části hrudníku.', 'Vytlač madla šikmo vzhůru.', 'Paže téměř rovné nad hrudníkem.'),
  strength('cable-crossover', 'CABLE CROSSOVER', 'Chest', 'fly', ['Stoj stabilně', 'Lokty měkké', 'Ramena netahej vzhůru'], 'Stůj mezi kladkami, paže roztažené.', 'Veď madla obloukem před tělo.', 'Ruce spolu před hrudníkem.'),
  strength('machine-pullover', 'MACHINE PULLOVER', 'Back', 'pullover', ['Hrudník u opěrky', 'Lokty na podložkách', 'Netlač hlavou vpřed'], 'Sedni, paže nahoře na páce.', 'Táhni páku obloukem dolů.', 'Lokty u boků, záda stažená.'),
  strength('lower-back-machine', 'LOWER BACK MACHINE', 'Back', 'hinge', ['Břicho zpevni', 'Hlava v prodloužení páteře', 'Nepřehýbej se vzad'], 'Sedni lehce předkloněný proti opěrce.', 'Tlač trupem opěrku dozadu.', 'Trup vzpřímený, bedra pevná.'),
  strength('hyperextension', 'HYPEREXTENSION', 'Back', 'hinge', ['Boky na opěrce', 'Záda neutrálně', 'Pohyb z kyčlí'], 'Trup spusť mírně dolů.', 'Zvedej trup pohybem v kyčlích.', 'Tělo v jedné přímce.'),
  strength('shoulder-press', 'SHOULDER PRESS', 'Shoulders', 'overhead', ['Záda na opěrce', 'Lokty pod madly', 'Ramena drž dole'], 'Sedni, madla vedle ramen.', 'Tlač madla svisle vzhůru.', 'Paže téměř rovné nad hlavou.'),
  strength('lateral-raise-machine', 'LATERAL RAISE MACHINE', 'Shoulders', 'lateral', ['Lokty opři o podložky', 'Trup bez houpání', 'Ramena nezvedej k uším'], 'Sedni, paže podél těla.', 'Zvedej lokty do stran.', 'Lokty přibližně ve výši ramen.'),
  strength('biceps-curl-machine', 'BICEPS CURL MACHINE', 'Arms', 'curl', ['Paže na opěrce', 'Zápěstí rovně', 'Ramena se nehýbou'], 'Sedni, paže téměř natažené.', 'Pokrč lokty a přitáhni madla.', 'Předloktí nahoře, lokty na opěrce.'),
  strength('triceps-extension-machine', 'TRICEPS EXTENSION', 'Arms', 'pushdown', ['Lokty drž na místě', 'Zápěstí rovně', 'Pohyb bez švihu'], 'Sedni, lokty pokrčené na opěrce.', 'Narovnej lokty proti odporu.', 'Paže téměř rovné.'),
  strength('cable-pushdown', 'CABLE PUSHDOWN', 'Arms', 'pushdown', ['Lokty u boků', 'Trup vzpřímený', 'Hýbou se jen předloktí'], 'Stůj u kladky, lokty pokrčené.', 'Stlač tyč nebo lano dolů.', 'Paže dole téměř rovné.'),
  strength('assisted-dips', 'ASSISTED DIPS', 'Arms', 'dip', ['Ramena drž dole', 'Lokty směřují vzad', 'Trup stabilní'], 'Opři ruce, lokty pokrčené.', 'Tlač madla dolů a zvedej tělo.', 'Paže téměř rovné, ramena nízko.'),
  strength('hip-abduction', 'HIP ABDUCTION', 'Legs', 'abduction', ['Záda na opěrce', 'Chodidla klidně', 'Nohy otevírej symetricky'], 'Sedni, kolena u sebe na podložkách.', 'Rozevírej kolena proti odporu.', 'Kolena od sebe, pánev klidná.'),
  strength('hip-adduction', 'HIP ADDUCTION', 'Legs', 'abduction', ['Záda na opěrce', 'Pánev drž klidně', 'Nohy zavírej plynule'], 'Sedni, kolena široce od sebe.', 'Přitahuj kolena k sobě.', 'Kolena u sebe, trup stabilní.'),
  strength('standing-hip-abduction', 'STANDING HIP ABDUCTION', 'Legs', 'abduction', ['Stojná noha měkká', 'Trup drž rovně', 'Špička směřuje vpřed'], 'Stůj bokem, pracovní noha u těla.', 'Unož nohu plynule do strany.', 'Noha stranou, pánev bez náklonu.'),
  strength('seated-calf-raise', 'SEATED CALF RAISE', 'Legs', 'calf', ['Špičky na hraně', 'Kolena pod podložkou', 'Pohyb v plném rozsahu'], 'Sedni, paty spuštěné dolů.', 'Zvedni paty přes špičky.', 'Paty nahoře, lýtka stažená.'),
  strength('abs-machine', 'ABS MACHINE', 'Core', 'crunch', ['Bedra drž u opěrky', 'Nevytahuj hlavou', 'Vydechni při stažení'], 'Sedni vzpřímeně pod opěrkami.', 'Stáhni hrudník směrem k pánvi.', 'Trup skrčený, břicho pevné.'),
  strength('torso-rotation', 'TORSO ROTATION', 'Core', 'rotation', ['Pánev drž pevně', 'Otáčej hrudník', 'Pohyb kontroluj'], 'Sedni rovně, trup natočený na stranu.', 'Otáčej trup proti odporu.', 'Hrudník otočený na druhou stranu.'),
  strength('decline-crunch', 'DECLINE BENCH CRUNCH', 'Core', 'crunch', ['Bedra drž na lavici', 'Bradu lehce zasuň', 'Netahej za hlavu'], 'Lehni si na šikmou lavici.', 'Zvedni lopatky směrem ke kolenům.', 'Břicho stažené, bedra na lavici.'),
  duration('stationary-bike', 'STATIONARY BIKE', 'bike', ['Sedlo ve výši kyčlí', 'Kolena sledují chodidla', 'Šlapej plynule'], 'Sedni, chodidla dej do pedálů.', 'Šlapej plynule v celém kruhu.', 'Trup klidný, rytmus rovnoměrný.', 10),
  duration('elliptical', 'ELLIPTICAL', 'elliptical', ['Celé chodidlo na pedálu', 'Trup vzpřímený', 'Ruce a nohy v rytmu'], 'Postav se na pedály a chyť madla.', 'Veď pedály a madla plynule.', 'Pohyb bez nárazů, tělo uprostřed.', 10),
  strength('smith-squat', 'SMITH MACHINE SQUAT', 'Legs', 'squat', ['Chodidla lehce vpředu', 'Kolena ve směru špiček', 'Záda neutrálně'], 'Stůj pod osou, chodidla na šířku ramen.', 'Klesni boky dolů a dozadu.', 'Postav se, kolena nezamykej.'),
]

const defaultWorkoutIds = ['leg-press', 'chest-press', 'lat-pulldown', 'cable-row', 'leg-curl', 'treadmill']

const todayKey = () => {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const makeExercise = (template: ExerciseTemplate, sets = template.defaultSets, reps = template.defaultReps, minutes = template.defaultMinutes): WorkoutExercise => ({
  exerciseId: template.id,
  sets: template.kind === 'strength' ? Array.from({ length: sets ?? 3 }, () => ({ reps: reps ?? 10, weight: '', complete: false })) : [],
  note: '',
  minutes: template.kind === 'cardio' ? minutes ?? 10 : undefined,
  cardioComplete: template.kind === 'cardio' ? false : undefined,
})

const makeDefaultWorkout = (): Workout => ({ id: newId(), date: todayKey(), exercises: defaultWorkoutIds.map((id) => makeExercise(templates.find((template) => template.id === id)!)) })

const normalizeExercise = (exercise: LegacyWorkoutExercise): WorkoutExercise => {
  const { weight: legacyWeight = '', sets, ...rest } = exercise
  return { ...rest, sets: sets.map((set) => ({ ...set, weight: String(set.weight ?? legacyWeight) })) }
}

const normalizeWorkout = (workout: LegacyWorkout): Workout => ({ ...workout, exercises: workout.exercises.map(normalizeExercise) })

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as LegacyStore
      const parsed: Store = { active: stored.active ? normalizeWorkout(stored.active) : null, history: stored.history.map(normalizeWorkout) }
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

function ExerciseDiagram({ template }: { template: ExerciseTemplate }) {
  const markerId = `arrow-${template.id}`
  return (
    <div className="exercise-visual" role="img" aria-label={`Ilustrace startovní a konečné polohy cviku ${template.name}`}>
      <svg viewBox="0 0 1000 580" aria-hidden="true">
        <defs><marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0l10 5-10 5z" className="visual-arrow-fill" /></marker></defs>
        <rect x="18" y="18" width="452" height="500" rx="28" className="visual-panel" /><rect x="530" y="18" width="452" height="500" rx="28" className="visual-panel" />
        <text x="52" y="64" className="visual-label">START</text><text x="564" y="64" className="visual-label">KONEC</text>
        <circle cx="425" cy="54" r="19" className="visual-step" /><text x="425" y="61" textAnchor="middle" className="visual-step-text">1</text>
        <circle cx="937" cy="54" r="19" className="visual-step visual-step-end" /><text x="937" y="61" textAnchor="middle" className="visual-step-text visual-step-text-end">2</text>
        <ExercisePose template={template} x={38} end={false} />
        <ExercisePose template={template} x={550} end />
        <path d="M458 270h84" className="visual-arrow-halo" /><path d="M458 270h84" className="visual-arrow" markerEnd={`url(#${markerId})`} />
        <text x="500" y="558" textAnchor="middle" className="visual-caption">{template.name} · {template.category.toUpperCase()}</text>
      </svg>
    </div>
  )
}

type VisualPoint = [number, number]
type VisualPose = { head: VisualPoint; shoulder: VisualPoint; hip: VisualPoint; arms: [VisualPoint[], VisualPoint[]]; legs: [VisualPoint[], VisualPoint[]]; active: 'arms' | 'legs' | 'torso' }

const points = (items: VisualPoint[]) => items.map((item) => item.join(',')).join(' ')

function poseFor(template: ExerciseTemplate, end: boolean): VisualPose {
  const seated: VisualPose = { head: [185, 125], shoulder: [185, 182], hip: [185, 310], arms: [[[185, 190], [145, 245], [125, 300]], [[185, 190], [225, 245], [245, 300]]], legs: [[[185, 310], [135, 375], [115, 445]], [[185, 310], [275, 350], [310, 430]]], active: 'arms' }
  const standing: VisualPose = { head: [205, 105], shoulder: [205, 165], hip: [205, 310], arms: [[[205, 175], [155, 235], [135, 300]], [[205, 175], [255, 235], [275, 300]]], legs: [[[205, 310], [165, 375], [145, 445]], [[205, 310], [245, 375], [265, 445]]], active: 'arms' }
  const lying: VisualPose = { head: [95, 260], shoulder: [150, 278], hip: [285, 310], arms: [[[150, 280], [195, 325], [245, 330]], [[150, 275], [205, 260], [255, 265]]], legs: [[[285, 310], [345, 325], [405, 330]], [[285, 315], [345, 340], [400, 350]]], active: 'legs' }
  const standingPose = ['pushdown', 'squat', 'treadmill', 'elliptical'].includes(template.visual) || template.id === 'cable-crossover' || template.id === 'standing-hip-abduction'
  const lyingPose = template.visual === 'lying-curl' || template.id === 'hyperextension' || template.id === 'decline-crunch'
  let pose = standingPose ? standing : lyingPose ? lying : seated
  pose = { ...pose, arms: [[...pose.arms[0]], [...pose.arms[1]]], legs: [[...pose.legs[0]], [...pose.legs[1]]] }

  if (template.visual === 'press') {
    const incline = template.id === 'incline-chest-press'
    pose.arms = end ? [[[185, 190], [270, incline ? 145 : 200], [355, incline ? 120 : 210]], [[185, 205], [270, incline ? 165 : 225], [355, incline ? 145 : 230]]] : [[[185, 190], [235, 205], [270, incline ? 170 : 215]], [[185, 205], [235, 225], [270, incline ? 190 : 235]]]
  }
  if (template.visual === 'fly') {
    const cable = template.id === 'cable-crossover'
    pose = cable ? pose : seated
    pose.arms = end ? [[[pose.shoulder[0], pose.shoulder[1]], [275, 205], [330, 245]], [[pose.shoulder[0], pose.shoulder[1] + 12], [275, 235], [330, 250]]] : [[[pose.shoulder[0], pose.shoulder[1]], [110, 165], [60, 210]], [[pose.shoulder[0], pose.shoulder[1] + 12], [300, 165], [350, 210]]]
  }
  if (template.visual === 'pulldown') pose.arms = end ? [[[185, 185], [130, 230], [115, 275]], [[185, 185], [240, 230], [255, 275]]] : [[[185, 185], [135, 115], [105, 70]], [[185, 185], [235, 115], [265, 70]]]
  if (template.visual === 'pullover') pose.arms = end ? [[[185, 185], [230, 245], [260, 320]], [[185, 195], [245, 250], [280, 320]]] : [[[185, 185], [245, 115], [285, 80]], [[185, 195], [260, 125], [300, 90]]]
  if (template.visual === 'row') pose.arms = end ? [[[185, 190], [145, 225], [130, 255]], [[185, 205], [150, 240], [130, 255]]] : [[[185, 190], [270, 220], [345, 245]], [[185, 205], [270, 235], [345, 245]]]
  if (template.visual === 'overhead') pose.arms = end ? [[[185, 185], [150, 110], [140, 55]], [[185, 185], [220, 110], [230, 55]]] : [[[185, 185], [140, 165], [120, 185]], [[185, 185], [230, 165], [250, 185]]]
  if (template.visual === 'lateral') pose.arms = end ? [[[185, 185], [105, 165], [40, 165]], [[185, 185], [265, 165], [330, 165]]] : [[[185, 185], [155, 260], [145, 320]], [[185, 185], [215, 260], [225, 320]]]
  if (template.visual === 'curl') pose.arms = end ? [[[185, 190], [135, 245], [155, 155]], [[185, 200], [235, 245], [215, 155]]] : [[[185, 190], [135, 250], [115, 330]], [[185, 200], [235, 250], [255, 330]]]
  if (template.visual === 'pushdown') pose.arms = end ? [[[205, 175], [175, 245], [170, 335]], [[205, 175], [235, 245], [240, 335]]] : [[[205, 175], [165, 215], [185, 260]], [[205, 175], [245, 215], [225, 260]]]
  if (template.visual === 'dip') { pose.shoulder = [185, end ? 160 : 220]; pose.head = [185, end ? 100 : 160]; pose.hip = [185, end ? 285 : 345]; pose.arms = [[[185, pose.shoulder[1]], [135, 250], [125, 310]], [[185, pose.shoulder[1]], [235, 250], [245, 310]]] }
  if (template.visual === 'leg-extension') { pose.active = 'legs'; pose.legs = end ? [[[185, 310], [250, 350], [365, 350]], [[185, 320], [255, 365], [370, 365]]] : [[[185, 310], [270, 340], [270, 440]], [[185, 320], [285, 355], [285, 445]]] }
  if (template.visual === 'leg-curl') { pose.active = 'legs'; pose.legs = end ? [[[185, 310], [270, 345], [225, 440]], [[185, 320], [285, 360], [240, 448]]] : [[[185, 310], [270, 345], [370, 360]], [[185, 320], [285, 360], [380, 375]]] }
  if (template.visual === 'lying-curl') pose.legs = end ? [[[285, 310], [350, 320], [330, 215]], [[285, 320], [365, 335], [345, 225]]] : lying.legs
  if (template.visual === 'leg-press') { pose = { ...seated, head: [120, 285], shoulder: [160, 315], hip: [230, 360], active: 'legs', arms: [[[160, 320], [205, 350], [225, 375]], [[160, 310], [205, 330], [225, 350]]], legs: end ? [[[230, 360], [285, 350], [370, 205]], [[230, 370], [300, 365], [385, 220]]] : [[[230, 360], [300, 365], [335, 280]], [[230, 370], [315, 380], [350, 295]]] } }
  if (template.visual === 'abduction') {
    pose.active = 'legs'
    const closed: [VisualPoint[], VisualPoint[]] = [[[pose.hip[0], pose.hip[1]], [185, 375], [180, 445]], [[pose.hip[0], pose.hip[1]], [225, 375], [230, 445]]]
    const open: [VisualPoint[], VisualPoint[]] = [[[pose.hip[0], pose.hip[1]], [105, 365], [70, 435]], [[pose.hip[0], pose.hip[1]], [305, 365], [340, 435]]]
    pose.legs = template.id === 'hip-adduction' ? (end ? closed : open) : (end ? open : closed)
  }
  if (template.visual === 'calf') { pose.active = 'legs'; pose.legs = end ? [[[205, 310], [175, 385], [290, 405]], [[205, 310], [235, 385], [350, 405]]] : [[[205, 310], [175, 385], [290, 430]], [[205, 310], [235, 385], [350, 430]]] }
  if (template.visual === 'squat') { pose.active = 'legs'; if (!end) pose = standing; else { pose.head = [205, 185]; pose.shoulder = [205, 245]; pose.hip = [205, 350]; pose.legs = [[[205, 350], [135, 365], [145, 445]], [[205, 350], [275, 365], [265, 445]]] } }
  if (template.visual === 'hinge') {
    pose.active = 'torso'
    if (template.id === 'lower-back-machine') { pose = { ...pose, head: end ? [185, 120] : [245, 205], shoulder: end ? [185, 180] : [225, 255], hip: [185, 310], active: 'torso' } }
    else { pose.head = end ? [105, 250] : [145, 320]; pose.shoulder = end ? [155, 275] : [200, 340]; pose.hip = [285, 310] }
    pose.arms = [[[pose.shoulder[0], pose.shoulder[1]], [225, 340], [250, 360]], [[pose.shoulder[0], pose.shoulder[1] + 8], [235, 350], [260, 370]]]
  }
  if (template.visual === 'crunch') {
    pose.active = 'torso'
    if (template.id === 'abs-machine') { pose = { ...pose, head: end ? [235, 210] : [185, 120], shoulder: end ? [215, 260] : [185, 180], hip: [185, 310], active: 'torso' } }
    else { pose.head = end ? [155, 290] : [95, 250]; pose.shoulder = end ? [205, 315] : [150, 278]; pose.hip = [285, 310] }
  }
  if (template.visual === 'rotation') pose.arms = end ? [[[185, 190], [115, 215], [80, 240]], [[185, 205], [115, 230], [80, 250]]] : [[[185, 190], [255, 215], [330, 240]], [[185, 205], [255, 230], [330, 250]]]
  if (template.visual === 'bike') { pose.active = 'legs'; pose.arms = [[[185, 185], [255, 210], [300, 250]], [[185, 200], [260, 225], [300, 250]]]; pose.legs = end ? [[[185, 310], [275, 345], [240, 430]], [[185, 310], [125, 375], [175, 420]]] : [[[185, 310], [245, 390], [315, 370]], [[185, 310], [135, 350], [175, 420]]] }
  if (template.visual === 'treadmill') { pose.active = 'legs'; pose.legs = end ? [[[205, 310], [145, 380], [105, 445]], [[205, 310], [285, 365], [335, 420]]] : [[[205, 310], [165, 380], [145, 445]], [[205, 310], [245, 380], [265, 445]]] }
  if (template.visual === 'elliptical') { pose.active = 'legs'; pose.arms = end ? [[[205, 175], [145, 115], [115, 75]], [[205, 175], [255, 255], [285, 330]]] : [[[205, 175], [145, 255], [115, 330]], [[205, 175], [255, 115], [285, 75]]]; pose.legs = end ? [[[205, 310], [145, 380], [95, 440]], [[205, 310], [285, 365], [345, 410]]] : [[[205, 310], [135, 365], [75, 410]], [[205, 310], [275, 380], [325, 440]]] }
  return pose
}

function ExercisePose({ template, x, end }: { template: ExerciseTemplate; x: number; end: boolean }) {
  const pose = poseFor(template, end)
  const visual = template.visual
  const cardio = visual === 'bike' || visual === 'treadmill' || visual === 'elliptical'
  return (
    <g transform={`translate(${x} 20)`}>
      <g className="visual-machine-new">
        {!cardio && <path d="M35 455H405" />}
        {(['press', 'overhead', 'lateral', 'curl', 'leg-extension', 'leg-curl', 'rotation'].includes(visual) || (visual === 'fly' && template.id !== 'cable-crossover')) && <><path d="M110 325H285M135 325V455M265 325V455" /><rect x="105" y="115" width="38" height="215" rx="16" className="visual-pad" /></>}
        {template.id === 'cable-crossover' && <><path d="M55 70V455M355 70V455M35 455H375M55 95H355" /><path d="M55 105L125 200M355 105L285 200" /><circle cx="125" cy="200" r="9" className="visual-handle" /><circle cx="285" cy="200" r="9" className="visual-handle" /></>}
        {['pulldown', 'pullover'].includes(visual) && <><path d="M75 80H385M95 80V455M365 80V455" /><rect x="125" y="330" width="150" height="28" rx="14" className="visual-pad" /><path d="M105 76H275" /></>}
        {visual === 'row' && <><path d="M355 95V455M335 105H375M355 105L335 245" /><rect x="115" y="325" width="155" height="28" rx="14" className="visual-pad" /><circle cx="335" cy="245" r="9" className="visual-handle" /></>}
        {visual === 'pushdown' && <><path d="M345 75V455M325 88H365M345 88L260 230" /><circle cx="260" cy="230" r="10" className="visual-handle" /></>}
        {visual === 'dip' && <><path d="M90 300H310M110 300V455M290 300V455" /><rect x="100" y="285" width="50" height="22" rx="11" className="visual-pad" /><rect x="250" y="285" width="50" height="22" rx="11" className="visual-pad" /></>}
        {visual === 'leg-press' && <><path d="M80 420L230 265M260 365L370 120" /><rect x="78" y="385" width="155" height="38" rx="15" transform="rotate(-46 78 385)" className="visual-pad" /><rect x="335" y="92" width="72" height="105" rx="10" transform="rotate(39 335 92)" className="visual-plate" /></>}
        {visual === 'lying-curl' && <><rect x="75" y="292" width="270" height="34" rx="16" className="visual-pad" /><path d="M100 325V455M315 325V455M365 250V455" /><circle cx="378" cy="315" r="19" className="visual-roller" /></>}
        {visual === 'hinge' && (template.id === 'lower-back-machine' ? <><rect x="105" y="325" width="185" height="30" rx="15" className="visual-pad" /><rect x="105" y="120" width="38" height="210" rx="16" className="visual-pad" /><path d="M130 355V455M270 355V455" /><circle cx="250" cy="235" r="22" className="visual-roller" /></> : <><path d="M75 360L205 285M205 285L295 350M95 350V455M280 350V455" /><rect x="155" y="285" width="85" height="28" rx="14" transform="rotate(-28 155 285)" className="visual-pad" /></>)}
        {visual === 'abduction' && (template.id === 'standing-hip-abduction' ? <><path d="M340 75V455M320 88H360M340 88L275 305" /><circle cx="275" cy="305" r="13" className="visual-roller" /><path d="M80 455H380" /></> : <><rect x="105" y="325" width="200" height="30" rx="15" className="visual-pad" /><path d="M130 355V455M280 355V455" /><circle cx="145" cy="365" r="18" className="visual-roller" /><circle cx="265" cy="365" r="18" className="visual-roller" /></>)}
        {visual === 'calf' && <><path d="M85 430H360M110 430V455M340 430V455" /><rect x="120" y="290" width="170" height="28" rx="14" className="visual-pad" /></>}
        {visual === 'crunch' && (template.id === 'abs-machine' ? <><rect x="105" y="325" width="190" height="30" rx="15" className="visual-pad" /><rect x="105" y="120" width="38" height="210" rx="16" className="visual-pad" /><path d="M130 355V455M275 355V455" /><circle cx="225" cy="210" r="24" className="visual-roller" /></> : <><rect x="65" y="325" width="270" height="34" rx="16" transform="rotate(-12 65 325)" className="visual-pad" /><path d="M90 355V455M310 310V455" /></>)}
        {visual === 'squat' && <><path d="M65 60V455M345 60V455M45 455H365M75 145H335" /><circle cx="85" cy="145" r="20" className="visual-weight" /><circle cx="325" cy="145" r="20" className="visual-weight" /></>}
        {visual === 'treadmill' && <><path d="M45 420H350L405 455H75Z M330 420V245H395" /><path d="M345 270H395" /></>}
        {visual === 'bike' && <><circle cx="225" cy="395" r="55" /><path d="M225 395L165 305H290L225 395M165 305L130 230M290 305L330 255" /><circle cx="225" cy="395" r="8" className="visual-handle" /></>}
        {visual === 'elliptical' && <><path d="M45 430H375M120 415L305 375M120 415L80 175M305 375L345 105" /><ellipse cx="110" cy="420" rx="55" ry="13" className="visual-pedal" /><ellipse cx="310" cy="390" rx="55" ry="13" className="visual-pedal" /></>}
      </g>
      <g className="visual-human-new">
        <polyline points={points([pose.shoulder, pose.hip])} className={pose.active === 'torso' ? 'visual-active-body' : 'visual-torso-new'} />
        {pose.arms.map((arm, index) => <polyline key={`arm-${index}`} points={points(arm)} className={pose.active === 'arms' ? 'visual-active-limb' : 'visual-limb-new'} />)}
        {pose.legs.map((leg, index) => <polyline key={`leg-${index}`} points={points(leg)} className={pose.active === 'legs' ? 'visual-active-limb' : 'visual-limb-new'} />)}
        <circle cx={pose.head[0]} cy={pose.head[1]} r="28" className="visual-head-new" />
        <circle cx={pose.shoulder[0]} cy={pose.shoulder[1]} r="9" className="visual-joint-new" /><circle cx={pose.hip[0]} cy={pose.hip[1]} r="9" className="visual-joint-new" />
      </g>
    </g>
  )
}

function ExerciseCard({ template, exercise, previous, update }: { template: ExerciseTemplate; exercise: WorkoutExercise; previous?: WorkoutExercise; update: (change: (exercise: WorkoutExercise) => WorkoutExercise) => void }) {
  return (
    <article className={`exercise-card ${template.kind === 'cardio' ? 'cardio-card' : ''}`}>
      <ExerciseDiagram template={template} />
      <div className="movement-guide">
        <p><strong>Start:</strong> {template.movement.start}</p>
        <p><strong>Pohyb:</strong> {template.movement.move}</p>
        <p><strong>Konec:</strong> {template.movement.end}</p>
      </div>
      <div className="card-content">
        <p className="exercise-number">{template.kind === 'strength' ? `SILOVÝ CVIK · ${template.category.toUpperCase()}` : 'CARDIO'}</p>
        <h2>{template.name}</h2>
        <ul className="instructions">{template.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>

        {previous && template.kind === 'strength' && (
          <p className="previous"><span>MINULE</span> {previous.sets.map((set) => `${set.weight || '—'} kg × ${set.reps}`).join(' / ')}</p>
        )}

        {template.kind === 'strength' ? (
          <>
            <div className="field-label">SÉRIE</div>
            <div className="sets-header"><span></span><span>VÁHA</span><span>OPAKOVÁNÍ</span></div>
            <div className="sets">
              {exercise.sets.map((set, setIndex) => (
                <div className={`set-row ${set.complete ? 'done' : ''}`} key={setIndex}>
                  <button className="set-check" aria-label={`${set.complete ? 'Zrušit dokončení' : 'Dokončit'} série ${setIndex + 1}`} onClick={() => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, complete: !item.complete } : item) }))}>
                    <span className="check">{set.complete ? '✓' : setIndex + 1}</span>
                  </button>
                  <label className="set-value"><input aria-label={`Váha série ${setIndex + 1}`} inputMode="decimal" type="number" min="0" step="0.5" placeholder="—" value={set.weight} onChange={(event) => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, weight: event.target.value } : item) }))} /><span>kg</span></label>
                  <label className="set-value"><input aria-label={`Opakování série ${setIndex + 1}`} inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, reps: Math.max(0, Number(event.target.value) || 0) } : item) }))} /><span>×</span></label>
                </div>
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
                  <span>{exercise.sets.length ? exercise.sets.map((set) => `${set.weight || '—'} kg × ${set.reps}`).join(' / ') : `${exercise.minutes} minut`}</span>
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
      <p>Ilustrace cviků jsou vlastní jednoduché SVG náhledy vytvořené přímo pro aplikaci GYM.</p>
    </section>
  )
}

function NewWorkoutModal({ close, start }: { close: () => void; start: (exercises: WorkoutExercise[]) => void }) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(templates.map((template) => [template.id, false])))
  const [settings, setSettings] = useState<Record<string, { sets: number; reps: number; minutes: number }>>(() => Object.fromEntries(templates.map((template) => [template.id, { sets: template.defaultSets ?? 3, reps: template.defaultReps ?? 10, minutes: template.defaultMinutes ?? 10 }])))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'All'>('All')
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])
  const filteredTemplates = useMemo(() => templates.filter((template) => {
    const matchesCategory = category === 'All' || template.category === category
    const matchesSearch = template.name.toLocaleLowerCase('cs').includes(search.trim().toLocaleLowerCase('cs'))
    return matchesCategory && matchesSearch
  }), [category, search])

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
        <div className="library-tools">
          <label className="exercise-search"><span>⌕</span><input type="search" placeholder="Hledat cvik…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="category-filters" aria-label="Kategorie cviků">
            {(['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'] as const).map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item === 'All' ? 'Vše' : item}</button>)}
          </div>
          <p className="library-count">{filteredTemplates.length} cviků</p>
        </div>
        <div className="exercise-picker">
          {filteredTemplates.map((template) => (
            <div className={`picker-item ${selected[template.id] ? 'selected' : ''}`} key={template.id}>
              <button className="picker-toggle" onClick={() => setSelected((current) => ({ ...current, [template.id]: !current[template.id] }))}>
                <span className="picker-check">{selected[template.id] ? '✓' : ''}</span><span><strong>{template.name}</strong><small>{template.category} · {template.kind === 'strength' ? 'opakování' : 'minuty'}</small></span>
              </button>
              {selected[template.id] && (
                <div className="picker-settings">
                  {template.kind === 'strength' ? <><NumberField label="Série" value={settings[template.id].sets} setValue={(sets) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], sets } }))} /><NumberField label="Opakování" value={settings[template.id].reps} setValue={(reps) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], reps } }))} /></> : <NumberField label="Minuty" value={settings[template.id].minutes} setValue={(minutes) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], minutes } }))} />}
                </div>
              )}
            </div>
          ))}
          {!filteredTemplates.length && <p className="picker-empty">Žádný cvik neodpovídá filtru.</p>}
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
