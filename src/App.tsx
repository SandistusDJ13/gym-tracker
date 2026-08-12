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
      <svg viewBox="0 0 1000 560" aria-hidden="true">
        <defs><marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0l10 5-10 5z" className="visual-arrow-fill" /></marker></defs>
        <path d="M500 38v450" className="visual-divider" />
        <text x="48" y="55" className="visual-label">START</text><text x="548" y="55" className="visual-label">KONEC</text>
        <ExercisePose visual={template.visual} x={35} end={false} />
        <ExercisePose visual={template.visual} x={535} end />
        <path d="M445 275h110" className="visual-arrow" markerEnd={`url(#${markerId})`} />
        <text x="500" y="530" textAnchor="middle" className="visual-caption">{template.name} · {template.category.toUpperCase()}</text>
      </svg>
    </div>
  )
}

function ExercisePose({ visual, x, end }: { visual: ExerciseVisual; x: number; end: boolean }) {
  const standing = ['fly', 'pushdown', 'abduction', 'calf', 'squat', 'treadmill', 'elliptical'].includes(visual)
  const lying = ['lying-curl', 'hinge', 'crunch'].includes(visual)
  const cardio = visual === 'bike' || visual === 'treadmill' || visual === 'elliptical'
  const torso = lying ? 'M155 255L285 285' : standing ? 'M205 165L205 315' : 'M190 170L190 315'
  let arms = standing ? 'M205 205L150 255M205 205L260 255' : 'M190 210L135 260M190 210L245 260'
  let legs = standing ? 'M205 315L155 430M205 315L255 430' : 'M190 315L145 405M190 315L285 405'

  if (visual === 'press') arms = end ? 'M190 215L345 215M190 225L345 225' : 'M190 215L265 235M190 225L265 205'
  if (visual === 'fly') arms = end ? 'M205 205L330 245M205 205L330 255' : 'M205 205L105 145M205 205L305 145'
  if (visual === 'pulldown' || visual === 'pullover') arms = end ? 'M190 210L125 250M190 210L255 250' : 'M190 210L120 92M190 210L260 92'
  if (visual === 'row') arms = end ? 'M190 215L145 245M190 225L145 245' : 'M190 215L340 240M190 225L340 240'
  if (visual === 'overhead') arms = end ? 'M190 210L145 82M190 210L235 82' : 'M190 210L135 175M190 210L245 175'
  if (visual === 'lateral') arms = end ? 'M190 215L80 160M190 215L300 160' : 'M190 215L145 305M190 215L235 305'
  if (visual === 'curl') arms = end ? 'M190 220L130 165M190 220L250 165' : 'M190 220L130 305M190 220L250 305'
  if (visual === 'pushdown') arms = end ? 'M205 205L180 330M205 205L230 330' : 'M205 205L165 250M205 205L245 250'
  if (visual === 'dip') arms = end ? 'M190 210L130 300M190 210L250 300' : 'M190 210L145 250M190 210L235 250'
  if (visual === 'leg-extension') legs = end ? 'M190 315L205 355L350 355' : 'M190 315L275 335L275 430'
  if (visual === 'leg-curl') legs = end ? 'M190 315L275 345L225 430' : 'M190 315L275 345L360 365'
  if (visual === 'lying-curl') legs = end ? 'M285 285L345 300L315 205' : 'M285 285L350 300L405 305'
  if (visual === 'leg-press') legs = end ? 'M190 315L265 330L365 195' : 'M190 315L275 340L320 245'
  if (visual === 'abduction') legs = end ? 'M205 315L105 420M205 315L305 420' : 'M205 315L180 425M205 315L230 425'
  if (visual === 'calf') legs = end ? 'M205 315L180 400L285 385M205 315L230 400L335 385' : 'M205 315L180 400L285 420M205 315L230 400L335 420'
  if (visual === 'squat') legs = end ? 'M205 315L160 430M205 315L250 430' : 'M205 315L135 355L165 430M205 315L275 355L245 430'
  if (visual === 'hinge') legs = 'M285 285L350 350M285 285L245 410'
  if (visual === 'crunch') arms = end ? 'M175 250L120 285M175 250L230 285' : 'M155 255L105 195M155 255L205 195'
  if (visual === 'rotation') arms = end ? 'M190 215L95 235M190 225L95 245' : 'M190 215L285 235M190 225L285 245'
  if (visual === 'bike') { arms = 'M190 210L290 245M190 220L290 245'; legs = end ? 'M190 315L270 350L235 430M190 315L125 370L175 420' : 'M190 315L250 395L320 370M190 315L135 345L175 420' }
  if (visual === 'treadmill') { arms = 'M205 210L155 275M205 210L255 275'; legs = end ? 'M205 315L140 430M205 315L300 405' : 'M205 315L165 430M205 315L260 430' }
  if (visual === 'elliptical') { arms = end ? 'M205 210L130 105M205 210L280 320' : 'M205 210L130 320M205 210L280 105'; legs = end ? 'M205 315L135 430M205 315L315 405' : 'M205 315L125 405M205 315L305 430' }

  return (
    <g transform={`translate(${x} 20)`}>
      <g className="visual-machine">
        {!cardio && <><path d="M45 445H405" /><path d="M105 120V445M370 120V445" /></>}
        {['press', 'fly', 'overhead', 'lateral', 'curl', 'leg-extension', 'leg-curl', 'rotation'].includes(visual) && <><path d="M125 340H285M150 340V445M260 340V445" /><path d="M130 135V340" /></>}
        {['pulldown', 'pullover'].includes(visual) && <path d="M95 95H380M120 95V445M355 95V445M120 115H355" />}
        {visual === 'row' && <path d="M355 115V445M335 130H375M355 130L320 245M120 340H270" />}
        {visual === 'pushdown' && <path d="M340 95V445M320 110H360M340 110L240 250" />}
        {visual === 'dip' && <path d="M105 285H300M130 285V445M275 285V445" />}
        {visual === 'leg-press' && <path d="M105 405L225 250M275 340L370 125M340 105L405 170" />}
        {visual === 'lying-curl' && <path d="M90 305H330M120 305V445M300 305V445M350 250V445" />}
        {visual === 'hinge' && <path d="M95 335L205 275M205 275L275 340M110 335V445M260 340V445" />}
        {visual === 'abduction' && <path d="M100 335H300M135 335V445M275 335V445" />}
        {visual === 'calf' && <path d="M105 405H350M125 405V445M330 405V445" />}
        {visual === 'crunch' && <path d="M75 345L305 290M95 340V445M285 295V445" />}
        {visual === 'squat' && <path d="M80 80V445M330 80V445M60 445H350M90 150H320" />}
        {visual === 'treadmill' && <path d="M70 420H360L405 445H90Z M330 420V255H390" />}
        {visual === 'bike' && <><circle cx="225" cy="395" r="48" /><path d="M225 395L175 315H285L225 395M175 315L145 245M285 315L320 270" /></>}
        {visual === 'elliptical' && <path d="M75 425H360M135 405L295 370M135 405L95 190M295 370L330 130" />}
      </g>
      <g className="visual-person"><circle cx={lying ? 135 : standing ? 205 : 190} cy={lying ? 235 : 125} r="30" className="visual-head" /><path d={torso} /><path d={arms} /><path d={legs} /></g>
      <circle cx={end ? 330 : 115} cy={end ? 250 : 245} r="8" className="visual-joint" />
    </g>
  )
}

function ExerciseCard({ template, exercise, previous, update }: { template: ExerciseTemplate; exercise: WorkoutExercise; previous?: WorkoutExercise; update: (change: (exercise: WorkoutExercise) => WorkoutExercise) => void }) {
  return (
    <article className={`exercise-card ${template.kind === 'cardio' ? 'cardio-card' : ''}`}>
      {template.image ? <img className="exercise-image" src={template.image} alt={`Start, směr pohybu a konec cviku ${template.name}`} /> : <ExerciseDiagram template={template} />}
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
