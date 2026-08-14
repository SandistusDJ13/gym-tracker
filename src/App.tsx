import { useEffect, useMemo, useState } from 'react'

type ExerciseKind = 'strength' | 'cardio'
type ExerciseType = 'weighted_reps' | 'bodyweight_reps' | 'timed' | 'hold' | 'duration' | 'per_side'
type ExerciseCategory = 'Chest' | 'Back' | 'Legs' | 'Glutes' | 'Shoulders' | 'Arms' | 'Core' | 'Bodyweight' | 'Yoga' | 'Mobility' | 'Stretching' | 'Cardio'
type ExerciseVisual = 'press' | 'fly' | 'pulldown' | 'row' | 'pullover' | 'leg-press' | 'leg-extension' | 'leg-curl' | 'lying-curl' | 'hinge' | 'overhead' | 'lateral' | 'curl' | 'pushdown' | 'dip' | 'abduction' | 'calf' | 'crunch' | 'rotation' | 'squat' | 'treadmill' | 'bike' | 'elliptical'

type ExerciseTemplate = {
  id: string
  name: string
  kind: ExerciseKind
  exerciseType: ExerciseType
  category: ExerciseCategory
  secondaryCategory?: ExerciseCategory
  equipment?: 'machine' | 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'cardio'
  visual: ExerciseVisual
  sourceId?: string
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

type WorkoutPlanExercise = { exerciseId: string; reps: number[]; minutes?: number; note?: string }
type WorkoutTemplate = { id: string; name: string; exercises: WorkoutPlanExercise[] }
type PresetAudience = 'man' | 'woman' | 'general'
type WorkoutPreset = WorkoutTemplate & { audience: PresetAudience; focus: string; minutes: number }
type Store = { active: Workout | null; history: Workout[]; templates: WorkoutTemplate[] }
type Tab = 'today' | 'templates' | 'girl' | 'history' | 'sources'

const STORAGE_KEY = 'gym-store-v1'

const strength = (id: string, name: string, category: ExerciseCategory, visual: ExerciseVisual, instructions: string[], start: string, move: string, end: string, image?: string): ExerciseTemplate => ({
  id, name, category, visual, kind: 'strength', exerciseType: 'weighted_reps', equipment: 'machine', image, instructions, defaultSets: 3, defaultReps: 10, movement: { start, move, end },
})

const duration = (id: string, name: string, visual: ExerciseVisual, instructions: string[], start: string, move: string, end: string, minutes: number): ExerciseTemplate => ({
  id, name, category: 'Cardio', visual, kind: 'cardio', exerciseType: 'duration', equipment: 'cardio', instructions, defaultMinutes: minutes, movement: { start, move, end },
})

const bankExercise = (id: string, name: string, category: ExerciseCategory, visual: ExerciseVisual, exerciseType: ExerciseType, equipment: ExerciseTemplate['equipment'], sourceId: string, start: string, move: string, end: string, secondaryCategory?: ExerciseCategory): ExerciseTemplate => ({
  id, name, category, secondaryCategory, visual, exerciseType, equipment, sourceId, kind: 'strength',
  instructions: exerciseType === 'hold' ? ['Dýchej plynule', 'Drž bez bolesti', 'Povol ramena'] : ['Pohyb kontroluj', 'Drž pevný střed těla', 'Dýchej plynule'],
  defaultSets: exerciseType === 'hold' ? 2 : 3,
  defaultReps: exerciseType === 'timed' || exerciseType === 'hold' ? 30 : 10,
  movement: { start, move, end },
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
  strength('barbell-bench-press', 'BARBELL BENCH PRESS', 'Chest', 'press', ['Lopatky na lavici', 'Chodidla pevně na zemi', 'Zápěstí drž rovně'], 'Lehni si, osa nad hrudníkem.', 'Spusť osu k hrudníku a vytlač ji vzhůru.', 'Paže nahoře téměř rovné.'),
  strength('dumbbell-bench-press', 'DUMBBELL BENCH PRESS', 'Chest', 'press', ['Lopatky stáhni', 'Lokty pod činkami', 'Pohyb bez odrazu'], 'Lehni si, činky vedle hrudníku.', 'Vytlač činky vzhůru nad hrudník.', 'Činky nahoře, paže téměř rovné.'),
  strength('decline-bench-press', 'DECLINE BENCH PRESS', 'Chest', 'press', ['Zajisti nohy', 'Lopatky drž na lavici', 'Spouštěj osu kontrolovaně'], 'Lehni si na klesající lavici, osa u spodní části hrudníku.', 'Vytlač osu kolmo vzhůru.', 'Paže nahoře téměř rovné.'),
  strength('assisted-pull-up', 'ASSISTED PULL-UP', 'Back', 'pulldown', ['Ramena drž dole', 'Hrudník táhni k hrazdě', 'Nehoupej se'], 'Vis na hrazdě s dopomocí, paže natažené.', 'Přitáhni hrudník směrem k hrazdě.', 'Brada u hrazdy, lokty dole.'),
  strength('one-arm-dumbbell-row', 'ONE-ARM DUMBBELL ROW', 'Back', 'row', ['Záda drž rovně', 'Loket veď k boku', 'Nerotuj trupem'], 'Opři se o lavici, paže s činkou visí dolů.', 'Přitáhni činku k boku.', 'Loket nahoře za trupem.'),
  strength('barbell-squat', 'BARBELL SQUAT', 'Legs', 'squat', ['Kolena ve směru špiček', 'Hrudník drž nahoře', 'Paty na zemi'], 'Stůj s osou na zádech, chodidla na šířku ramen.', 'Klesni boky dolů a dozadu.', 'Stehna dole, trup pevný.'),
  strength('romanian-deadlift', 'ROMANIAN DEADLIFT', 'Legs', 'hinge', ['Záda neutrálně', 'Kolena lehce pokrčená', 'Osa blízko nohou'], 'Stůj s osou před stehny.', 'Posuň boky dozadu a spusť osu pod kolena.', 'Trup v předklonu, hamstringy napnuté.'),
  strength('dumbbell-lateral-raise', 'DUMBBELL LATERAL RAISE', 'Shoulders', 'lateral', ['Lokty lehce pokrčené', 'Ramena drž dole', 'Bez švihu'], 'Stůj s činkami podél těla.', 'Zvedej paže do stran.', 'Činky přibližně ve výši ramen.'),
  strength('rear-delt-fly', 'REAR DELT FLY', 'Shoulders', 'fly', ['Hrudník drž pevný', 'Lokty měkké', 'Lopatky stáhni'], 'Uchop kladky před tělem.', 'Rozevři paže do stran.', 'Lokty vzadu v úrovni ramen.'),
  strength('cable-biceps-curl', 'CABLE BICEPS CURL', 'Arms', 'curl', ['Lokty u boků', 'Zápěstí rovně', 'Trup bez houpání'], 'Stůj u spodní kladky, paže téměř rovné.', 'Pokrč lokty a přitáhni madlo.', 'Předloktí nahoře, lokty na místě.'),
  strength('overhead-triceps-extension', 'OVERHEAD TRICEPS EXTENSION', 'Arms', 'overhead', ['Lokty drž u hlavy', 'Břicho zpevni', 'Hýbou se jen předloktí'], 'Stůj zády ke kladce, lokty pokrčené nad hlavou.', 'Narovnej lokty proti odporu.', 'Paže nahoře téměř rovné.'),
  strength('plank', 'PLANK', 'Core', 'crunch', ['Lokty pod rameny', 'Tělo v jedné linii', 'Břicho pevné'], 'Klekni a opři předloktí o zem.', 'Natáhni nohy a zpevni celé tělo.', 'Drž rovnou linii od hlavy k patám.'),
  strength('hanging-leg-raise', 'HANGING LEG RAISE', 'Core', 'crunch', ['Ramena drž dole', 'Nehoupej se', 'Pánev podsazuj'], 'Vis na hrazdě, nohy volně dolů.', 'Zvedni kolena nebo nohy před tělo.', 'Stehna nahoře, břicho stažené.'),
  bankExercise('incline-dumbbell-press', 'INCLINE DUMBBELL PRESS', 'Chest', 'press', 'weighted_reps', 'dumbbell', 'Incline_Dumbbell_Press', 'Lehni si na šikmou lavici, činky u ramen.', 'Vytlač činky šikmo vzhůru.', 'Činky nad horní částí hrudníku.'),
  bankExercise('dumbbell-fly', 'DUMBBELL FLY', 'Chest', 'fly', 'weighted_reps', 'dumbbell', 'Dumbbell_Flyes', 'Lehni si, činky nad hrudníkem.', 'Rozevři paže obloukem do stran.', 'Lokty vedle hrudníku, paže měkké.'),
  bankExercise('incline-dumbbell-fly', 'INCLINE DUMBBELL FLY', 'Chest', 'fly', 'weighted_reps', 'dumbbell', 'Incline_Dumbbell_Flyes', 'Lehni si šikmo, činky nad hrudníkem.', 'Rozevři paže kontrolovaně.', 'Činky po stranách horní části hrudníku.'),
  bankExercise('dumbbell-pullover', 'DUMBBELL PULLOVER', 'Chest', 'pullover', 'weighted_reps', 'dumbbell', 'Bent-Arm_Dumbbell_Pullover', 'Lehni si, činku drž nad hrudníkem.', 'Spusť činku obloukem za hlavu.', 'Paže za hlavou, žebra pod kontrolou.', 'Back'),
  bankExercise('barbell-row', 'BARBELL ROW', 'Back', 'row', 'weighted_reps', 'barbell', 'Bent_Over_Barbell_Row', 'Stůj v předklonu, osa pod koleny.', 'Přitáhni osu k břichu.', 'Lokty za trupem, lopatky u sebe.'),
  bankExercise('conventional-deadlift', 'CONVENTIONAL DEADLIFT', 'Back', 'hinge', 'weighted_reps', 'barbell', 'Barbell_Deadlift', 'Stůj u osy, boky vzadu.', 'Zvedni osu současně nohama a boky.', 'Stůj rovně s osou u stehen.', 'Legs'),
  bankExercise('dumbbell-shoulder-press', 'DUMBBELL SHOULDER PRESS', 'Shoulders', 'overhead', 'weighted_reps', 'dumbbell', 'Dumbbell_Shoulder_Press', 'Sedni nebo stůj, činky vedle ramen.', 'Vytlač činky nad hlavu.', 'Paže nahoře téměř rovné.'),
  bankExercise('barbell-overhead-press', 'BARBELL OVERHEAD PRESS', 'Shoulders', 'overhead', 'weighted_reps', 'barbell', 'Barbell_Shoulder_Press', 'Stůj, osa na horní části hrudníku.', 'Vytlač osu svisle nad hlavu.', 'Osa nad rameny, trup pevný.'),
  bankExercise('arnold-press', 'ARNOLD PRESS', 'Shoulders', 'overhead', 'weighted_reps', 'dumbbell', 'Arnold_Dumbbell_Press', 'Sedni, činky před rameny dlaněmi k sobě.', 'Otáčej dlaně ven a vytlač činky vzhůru.', 'Paže nahoře, dlaně vpřed.'),
  bankExercise('dumbbell-front-raise', 'DUMBBELL FRONT RAISE', 'Shoulders', 'lateral', 'weighted_reps', 'dumbbell', 'Front_Dumbbell_Raise', 'Stůj, činky před stehny.', 'Zvedni paže před tělo.', 'Činky ve výši ramen.'),
  bankExercise('cable-lateral-raise', 'CABLE LATERAL RAISE', 'Shoulders', 'lateral', 'weighted_reps', 'cable', 'Cable_Seated_Lateral_Raise', 'Stůj bokem ke spodní kladce.', 'Zvedni paži do strany.', 'Ruka ve výši ramene.'),
  bankExercise('face-pull', 'FACE PULL', 'Shoulders', 'row', 'weighted_reps', 'cable', 'Face_Pull', 'Stůj proti kladce, paže natažené.', 'Táhni lano k obličeji.', 'Lokty široce, lopatky u sebe.', 'Back'),
  bankExercise('straight-arm-pulldown', 'STRAIGHT-ARM PULLDOWN', 'Back', 'pulldown', 'weighted_reps', 'cable', 'Straight-Arm_Pulldown', 'Stůj u horní kladky, paže vpřed.', 'Táhni madlo rovnými pažemi dolů.', 'Ruce u stehen, hrudník nahoře.'),
  bankExercise('single-arm-cable-row', 'SINGLE-ARM CABLE ROW', 'Back', 'row', 'per_side', 'cable', 'Seated_One-arm_Cable_Pulley_Rows', 'Stůj proti kladce s jednou rukou vpřed.', 'Přitáhni loket k boku.', 'Loket za trupem, pánev rovně.'),
  bankExercise('cable-chest-fly', 'CABLE CHEST FLY', 'Chest', 'fly', 'weighted_reps', 'cable', 'Cable_Crossover', 'Stůj mezi kladkami, paže otevřené.', 'Spoj ruce obloukem před hrudníkem.', 'Dlaně před tělem.'),
  bankExercise('low-high-cable-fly', 'LOW-TO-HIGH CABLE FLY', 'Chest', 'fly', 'weighted_reps', 'cable', 'Low_Cable_Crossover', 'Drž spodní kladky u boků.', 'Veď ruce šikmo vzhůru.', 'Ruce před horní částí hrudníku.'),
  bankExercise('hammer-curl', 'HAMMER CURL', 'Arms', 'curl', 'weighted_reps', 'dumbbell', 'Hammer_Curls', 'Stůj, dlaně směřují k tělu.', 'Pokrč lokty bez otáčení zápěstí.', 'Činky u ramen, lokty u boků.'),
  bankExercise('dumbbell-biceps-curl', 'DUMBBELL BICEPS CURL', 'Arms', 'curl', 'weighted_reps', 'dumbbell', 'Dumbbell_Bicep_Curl', 'Stůj s činkami podél těla.', 'Pokrč lokty a otoč dlaně vzhůru.', 'Činky u ramen.'),
  bankExercise('incline-dumbbell-curl', 'INCLINE DUMBBELL CURL', 'Arms', 'curl', 'weighted_reps', 'dumbbell', 'Incline_Dumbbell_Curl', 'Sedni na šikmou lavici, paže visí.', 'Pokrč lokty a zvedni činky.', 'Činky u ramen, paže na místě.'),
  bankExercise('concentration-curl', 'CONCENTRATION CURL', 'Arms', 'curl', 'per_side', 'dumbbell', 'Concentration_Curls', 'Sedni, loket opři o stehno.', 'Přitáhni činku k rameni.', 'Biceps stažený, trup klidný.'),
  bankExercise('barbell-curl', 'BARBELL CURL', 'Arms', 'curl', 'weighted_reps', 'barbell', 'Barbell_Curl', 'Stůj s osou u stehen.', 'Pokrč lokty a zvedni osu.', 'Osa u hrudníku, lokty u boků.'),
  bankExercise('ez-bar-curl', 'EZ-BAR CURL', 'Arms', 'curl', 'weighted_reps', 'barbell', 'EZ-Bar_Curl', 'Stůj s EZ osou u stehen.', 'Pokrč lokty a zvedni osu.', 'Osa u hrudníku.'),
  bankExercise('rope-hammer-curl', 'ROPE HAMMER CURL', 'Arms', 'curl', 'weighted_reps', 'cable', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Stůj u spodní kladky, drž lano.', 'Přitáhni konce lana k ramenům.', 'Lokty pokrčené, zápěstí neutrální.'),
  bankExercise('single-arm-triceps-extension', 'SINGLE-ARM OVERHEAD TRICEPS EXTENSION', 'Arms', 'overhead', 'per_side', 'dumbbell', 'Dumbbell_One-Arm_Triceps_Extension', 'Drž činku za hlavou jednou rukou.', 'Narovnej loket vzhůru.', 'Paže nad hlavou téměř rovná.'),
  bankExercise('skull-crusher', 'EZ-BAR SKULL CRUSHER', 'Arms', 'overhead', 'weighted_reps', 'barbell', 'EZ-Bar_Skullcrusher', 'Lehni si, EZ osa nad hrudníkem.', 'Pokrč lokty a spusť osu k čelu.', 'Lokty pokrčené, nadloktí svisle.'),
  bankExercise('close-grip-bench-press', 'CLOSE-GRIP BENCH PRESS', 'Arms', 'press', 'weighted_reps', 'barbell', 'Close-Grip_Barbell_Bench_Press', 'Lehni si, osu drž užším úchopem.', 'Spusť osu a vytlač ji vzhůru.', 'Paže téměř rovné, lokty u těla.', 'Chest'),
  bankExercise('goblet-squat', 'GOBLET SQUAT', 'Legs', 'squat', 'weighted_reps', 'dumbbell', 'Goblet_Squat', 'Drž činku u hrudníku.', 'Klesni boky mezi chodidla.', 'Stehna dole, hrudník nahoře.'),
  bankExercise('dumbbell-romanian-deadlift', 'DUMBBELL ROMANIAN DEADLIFT', 'Legs', 'hinge', 'weighted_reps', 'dumbbell', 'Stiff-Legged_Dumbbell_Deadlift', 'Stůj s činkami před stehny.', 'Posuň boky dozadu a spusť činky.', 'Činky pod koleny, záda rovná.'),
  bankExercise('walking-lunge', 'WALKING LUNGE', 'Legs', 'squat', 'per_side', 'dumbbell', 'Dumbbell_Lunges', 'Stůj s činkami podél těla.', 'Vykroč a klesni do výpadu.', 'Obě kolena pokrčená, trup rovně.', 'Glutes'),
  bankExercise('reverse-lunge', 'REVERSE LUNGE', 'Legs', 'squat', 'per_side', 'dumbbell', 'Dumbbell_Rear_Lunge', 'Stůj rovně s činkami.', 'Ustup jednou nohou dozadu.', 'Zadní koleno nízko, přední chodidlo pevně.', 'Glutes'),
  bankExercise('bulgarian-split-squat', 'BULGARIAN SPLIT SQUAT', 'Glutes', 'squat', 'per_side', 'dumbbell', 'Split_Squat_with_Dumbbells', 'Zadní chodidlo opři o lavici.', 'Klesni předním kolenem dolů.', 'Přední stehno téměř vodorovně.', 'Legs'),
  bankExercise('step-up', 'STEP-UP', 'Glutes', 'squat', 'per_side', 'bodyweight', 'Step-up_with_Knee_Raise', 'Postav jedno chodidlo na box.', 'Vystup přes patu nahoru.', 'Stůj na boxu, pánev rovně.', 'Legs'),
  bankExercise('barbell-hip-thrust', 'BARBELL HIP THRUST', 'Glutes', 'hinge', 'weighted_reps', 'barbell', 'Barbell_Hip_Thrust', 'Opři lopatky o lavici, osu přes boky.', 'Zvedni boky vzhůru.', 'Boky nahoře, hýždě stažené.'),
  bankExercise('glute-bridge', 'GLUTE BRIDGE', 'Glutes', 'hinge', 'bodyweight_reps', 'bodyweight', 'Butt_Lift_Bridge', 'Lehni si, chodidla pod koleny.', 'Zvedni boky vzhůru.', 'Trup a stehna v jedné linii.'),
  bankExercise('push-up', 'PUSH-UP', 'Bodyweight', 'press', 'bodyweight_reps', 'bodyweight', 'Pushups', 'Opři dlaně a špičky o zem.', 'Spusť hrudník a vytlač se zpět.', 'Tělo v jedné linii.', 'Chest'),
  bankExercise('incline-push-up', 'INCLINE PUSH-UP', 'Bodyweight', 'press', 'bodyweight_reps', 'bodyweight', 'Incline_Push-Up', 'Opři dlaně o vyvýšenou plochu.', 'Spusť hrudník k opěře.', 'Vytlač se do rovných paží.', 'Chest'),
  bankExercise('pull-up', 'PULL-UP', 'Bodyweight', 'pulldown', 'bodyweight_reps', 'bodyweight', 'Pullups', 'Vis na hrazdě, paže natažené.', 'Přitáhni hrudník k hrazdě.', 'Brada nad hrazdou.', 'Back'),
  bankExercise('bodyweight-squat', 'BODYWEIGHT SQUAT', 'Bodyweight', 'squat', 'bodyweight_reps', 'bodyweight', 'Bodyweight_Squat', 'Stůj na šířku ramen.', 'Klesni boky dolů a dozadu.', 'Stehna dole, paty na zemi.', 'Legs'),
  bankExercise('side-plank', 'SIDE PLANK', 'Bodyweight', 'crunch', 'timed', 'bodyweight', 'Side_Bridge', 'Lehni si na bok a opři loket.', 'Zvedni boky od země.', 'Tělo drž v jedné linii.', 'Core'),
  bankExercise('dead-bug', 'DEAD BUG', 'Bodyweight', 'crunch', 'per_side', 'bodyweight', 'Dead_Bug', 'Lehni si, ruce a kolena nahoře.', 'Spusť opačnou ruku a nohu.', 'Končetiny nízko, bedra na zemi.', 'Core'),
  bankExercise('bird-dog', 'BIRD DOG', 'Bodyweight', 'crunch', 'per_side', 'bodyweight', 'On-Your-Back_Quad_Stretch', 'Klekni na všechny čtyři.', 'Natáhni opačnou ruku a nohu.', 'Končetiny v ose trupu.', 'Core'),
  bankExercise('mountain-climbers', 'MOUNTAIN CLIMBERS', 'Bodyweight', 'crunch', 'timed', 'bodyweight', 'Mountain_Climbers', 'Začni ve vysokém prkně.', 'Střídej kolena směrem k hrudníku.', 'Boky zůstávají nízko.', 'Core'),
  bankExercise('superman', 'SUPERMAN', 'Bodyweight', 'hinge', 'timed', 'bodyweight', 'Superman', 'Lehni si na břicho, paže vpřed.', 'Zvedni paže a nohy od země.', 'Drž trup pevný a krk rovně.', 'Back'),
  bankExercise('crunch', 'CRUNCH', 'Core', 'crunch', 'bodyweight_reps', 'bodyweight', 'Crunches', 'Lehni si, kolena pokrčená.', 'Zvedni lopatky směrem ke kolenům.', 'Břicho stažené, bedra na zemi.'),
  bankExercise('leg-raise', 'LYING LEG RAISE', 'Core', 'crunch', 'bodyweight_reps', 'bodyweight', 'Flat_Bench_Lying_Leg_Raise', 'Lehni si s nohama nataženýma.', 'Zvedni nohy vzhůru.', 'Nohy nad boky, bedra pevná.'),
  bankExercise('pigeon-pose', 'PIGEON POSE', 'Yoga', 'squat', 'hold', 'bodyweight', 'Lying_Glute', 'Přední nohu polož pokrčenou před tělo.', 'Spusť boky a uvolni zadní nohu.', 'Drž boky rovně a dýchej.', 'Mobility'),
  bankExercise('downward-dog', 'DOWNWARD DOG', 'Yoga', 'hinge', 'hold', 'bodyweight', 'Inchworm', 'Začni na dlaních a kolenou.', 'Zvedni boky vysoko dozadu.', 'Tělo tvoří obrácené V.'),
  bankExercise('cobra-pose', 'COBRA POSE', 'Yoga', 'hinge', 'hold', 'bodyweight', 'Looking_At_Ceiling', 'Lehni si na břicho, dlaně pod rameny.', 'Zvedni hrudník jemně vzhůru.', 'Pánev zůstává na zemi.'),
  bankExercise('childs-pose', "CHILD'S POSE", 'Yoga', 'hinge', 'hold', 'bodyweight', 'Childs_Pose', 'Klekni si a sedni na paty.', 'Polož trup mezi stehna a paže vpřed.', 'Čelo na zemi, záda uvolněná.'),
  bankExercise('cat-cow', 'CAT-COW', 'Mobility', 'hinge', 'timed', 'bodyweight', 'Cat_Stretch', 'Klekni na všechny čtyři.', 'Střídej vyhrbení a prohnutí zad.', 'Pohyb veď plynule s dechem.'),
  bankExercise('warrior-one', 'WARRIOR I', 'Yoga', 'squat', 'hold', 'bodyweight', 'Split_Squats', 'Vykroč dopředu, zadní chodidlo natoč.', 'Pokrč přední koleno a zvedni paže.', 'Boky vpřed, trup vzpřímený.'),
  bankExercise('warrior-two', 'WARRIOR II', 'Yoga', 'squat', 'hold', 'bodyweight', 'Side_Leg_Raises', 'Rozkroč se a natoč přední chodidlo.', 'Pokrč přední koleno, paže do stran.', 'Pohled přes přední ruku.'),
  bankExercise('low-lunge-stretch', 'LOW LUNGE', 'Mobility', 'squat', 'hold', 'bodyweight', 'Kneeling_Hip_Flexor', 'Klekni jedním kolenem na zem.', 'Posuň pánev jemně vpřed.', 'Cítíš tah v přední straně kyčle.'),
  bankExercise('figure-four-stretch', 'FIGURE FOUR STRETCH', 'Stretching', 'crunch', 'hold', 'bodyweight', 'Lying_Glute', 'Lehni si a polož kotník přes koleno.', 'Přitáhni stehno k hrudníku.', 'Hýžď se protahuje bez bolesti.'),
  bankExercise('hip-flexor-stretch', 'HIP FLEXOR STRETCH', 'Stretching', 'squat', 'hold', 'bodyweight', 'Kneeling_Hip_Flexor', 'Klekni v dlouhém výpadu.', 'Podsad pánev a posuň ji vpřed.', 'Drž trup rovně.'),
  bankExercise('hamstring-stretch', 'HAMSTRING STRETCH', 'Stretching', 'hinge', 'hold', 'bodyweight', 'Hamstring_Stretch', 'Natáhni jednu nohu před sebe.', 'Předkloň se z kyčlí.', 'Záda rovná, zadní strana stehna se protahuje.'),
  bankExercise('thoracic-rotation', 'THORACIC ROTATION', 'Mobility', 'rotation', 'per_side', 'bodyweight', 'Torso_Rotation', 'Klekni na všechny čtyři, ruku za hlavou.', 'Otoč loket vzhůru.', 'Hrudník otevřený do strany.'),
  bankExercise('shoulder-circles', 'SHOULDER CIRCLES', 'Mobility', 'rotation', 'timed', 'bodyweight', 'Shoulder_Circles', 'Stůj vzpřímeně s pažemi volně.', 'Kruž rameny dozadu a vpřed.', 'Pohyb plynulý bez bolesti.'),
  bankExercise('hip-circles', 'HIP CIRCLES', 'Mobility', 'rotation', 'timed', 'bodyweight', 'Standing_Hip_Circles', 'Stůj s rukama v bok.', 'Kruž pánví v plném rozsahu.', 'Trup zůstává uvolněný.'),
  bankExercise('quad-stretch', 'QUAD STRETCH', 'Stretching', 'leg-curl', 'hold', 'bodyweight', 'Standing_Elevated_Quad_Stretch', 'Stůj a chyť chodidlo za tělem.', 'Přitáhni patu k hýždi.', 'Kolena u sebe, pánev podsazená.'),
  bankExercise('chest-opening-stretch', 'CHEST OPENING STRETCH', 'Stretching', 'fly', 'hold', 'bodyweight', 'Chest_And_Front_Of_Shoulder_Stretch', 'Postav se bokem ke stěně, dlaň opři.', 'Otoč trup jemně od paže.', 'Hrudník a přední rameno se protahují.'),
  bankExercise('upper-back-stretch', 'UPPER BACK STRETCH', 'Stretching', 'row', 'hold', 'bodyweight', 'Upper_Back_Stretch', 'Propleť ruce před tělem.', 'Tlač dlaně vpřed a vyhrb horní záda.', 'Lopatky se oddálí.'),
]

const imageSourceIds: Record<string, string> = {
  'leg-press': 'Leg_Press',
  'chest-press': 'Machine_Bench_Press',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'cable-row': 'Seated_Cable_Rows',
  'leg-curl': 'Seated_Leg_Curl',
  treadmill: 'Walking_Treadmill',
  'leg-extension': 'Leg_Extensions',
  'lying-leg-curl': 'Lying_Leg_Curls',
  'pec-fly': 'Butterfly',
  'incline-chest-press': 'Leverage_Incline_Chest_Press',
  'cable-crossover': 'Cable_Crossover',
  'machine-pullover': 'Straight-Arm_Pulldown',
  'lower-back-machine': 'Lower_Back_Curl',
  hyperextension: 'Hyperextensions_Back_Extensions',
  'shoulder-press': 'Machine_Shoulder_Military_Press',
  'lateral-raise-machine': 'Cable_Seated_Lateral_Raise',
  'biceps-curl-machine': 'Machine_Bicep_Curl',
  'triceps-extension-machine': 'Machine_Triceps_Extension',
  'cable-pushdown': 'Triceps_Pushdown_-_Rope_Attachment',
  'assisted-dips': 'Dip_Machine',
  'hip-abduction': 'Thigh_Abductor',
  'hip-adduction': 'Thigh_Adductor',
  'standing-hip-abduction': 'Monster_Walk',
  'seated-calf-raise': 'Seated_Calf_Raise',
  'abs-machine': 'Ab_Crunch_Machine',
  'torso-rotation': 'Torso_Rotation',
  'decline-crunch': 'Decline_Crunch',
  'stationary-bike': 'Bicycling_Stationary',
  elliptical: 'Elliptical_Trainer',
  'smith-squat': 'Smith_Machine_Squat',
  'barbell-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'dumbbell-bench-press': 'Dumbbell_Bench_Press',
  'decline-bench-press': 'Decline_Barbell_Bench_Press',
  'assisted-pull-up': 'Band_Assisted_Pull-Up',
  'one-arm-dumbbell-row': 'One-Arm_Dumbbell_Row',
  'barbell-squat': 'Barbell_Squat',
  'romanian-deadlift': 'Romanian_Deadlift',
  'dumbbell-lateral-raise': 'Side_Lateral_Raise',
  'rear-delt-fly': 'Cable_Rear_Delt_Fly',
  'cable-biceps-curl': 'Standing_Biceps_Cable_Curl',
  'overhead-triceps-extension': 'Cable_Rope_Overhead_Triceps_Extension',
  plank: 'Plank',
  'hanging-leg-raise': 'Hanging_Leg_Raise',
}

const reversedImageIds = new Set(['leg-press', 'pec-fly', 'hyperextension', 'standing-hip-abduction', 'smith-squat', 'barbell-bench-press', 'romanian-deadlift'])

for (const template of templates) {
  if (template.sourceId) imageSourceIds[template.id] = template.sourceId
}

const equipmentOverrides: Partial<Record<NonNullable<ExerciseTemplate['equipment']>, string[]>> = {
  barbell: ['barbell-bench-press', 'barbell-squat', 'romanian-deadlift'],
  dumbbell: ['dumbbell-bench-press', 'one-arm-dumbbell-row', 'dumbbell-lateral-raise'],
  cable: ['cable-row', 'cable-crossover', 'cable-pushdown', 'cable-biceps-curl', 'overhead-triceps-extension', 'rear-delt-fly'],
  bodyweight: ['plank', 'hanging-leg-raise'],
}
for (const [equipment, ids] of Object.entries(equipmentOverrides) as Array<[NonNullable<ExerciseTemplate['equipment']>, string[]]>) {
  for (const id of ids) {
    const template = templates.find((item) => item.id === id)
    if (template) template.equipment = equipment
  }
}
const plankTemplate = templates.find((item) => item.id === 'plank')
if (plankTemplate) { plankTemplate.exerciseType = 'timed'; plankTemplate.defaultReps = 30 }
const hangingRaiseTemplate = templates.find((item) => item.id === 'hanging-leg-raise')
if (hangingRaiseTemplate) hangingRaiseTemplate.exerciseType = 'bodyweight_reps'

const exerciseSourceId = (template: ExerciseTemplate) => imageSourceIds[template.id]

const defaultWorkoutIds = ['leg-press', 'chest-press', 'lat-pulldown', 'cable-row', 'leg-curl', 'treadmill']

const todayKey = () => {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const makeExercise = (template: ExerciseTemplate, sets = template.defaultSets, reps = template.defaultReps, minutes = template.defaultMinutes): WorkoutExercise => ({
  exerciseId: template.id,
  sets: template.exerciseType !== 'duration' ? Array.from({ length: sets ?? 3 }, () => ({ reps: reps ?? 10, weight: '', complete: false })) : [],
  note: '',
  minutes: template.exerciseType === 'duration' ? minutes ?? 10 : undefined,
  cardioComplete: template.exerciseType === 'duration' ? false : undefined,
})

const makeDefaultWorkout = (): Workout => ({ id: newId(), date: todayKey(), exercises: defaultWorkoutIds.map((id) => makeExercise(templates.find((template) => template.id === id)!)) })

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const safeNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback

const normalizeExercise = (value: unknown): WorkoutExercise | null => {
  const exercise = record(value)
  if (!exercise || typeof exercise.exerciseId !== 'string') return null
  const legacyWeight = typeof exercise.weight === 'string' || typeof exercise.weight === 'number' ? String(exercise.weight) : ''
  const sets = Array.isArray(exercise.sets) ? exercise.sets.flatMap((value) => {
    const set = record(value)
    if (!set) return []
    return [{ reps: safeNumber(set.reps, 10), weight: typeof set.weight === 'string' || typeof set.weight === 'number' ? String(set.weight) : legacyWeight, complete: set.complete === true }]
  }) : []
  return {
    exerciseId: exercise.exerciseId,
    sets,
    note: typeof exercise.note === 'string' ? exercise.note : '',
    minutes: typeof exercise.minutes === 'number' && Number.isFinite(exercise.minutes) ? Math.max(1, exercise.minutes) : undefined,
    cardioComplete: exercise.cardioComplete === true,
  }
}

const normalizeWorkout = (value: unknown, active = false): Workout | null => {
  const workout = record(value)
  if (!workout) return null
  const exercises = (Array.isArray(workout.exercises) ? workout.exercises : []).map(normalizeExercise).filter((item): item is WorkoutExercise => Boolean(item)).filter((item) => !active || templates.some((template) => template.id === item.exerciseId))
  return {
    id: typeof workout.id === 'string' ? workout.id : newId(),
    date: typeof workout.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(workout.date) ? workout.date : todayKey(),
    completedAt: typeof workout.completedAt === 'string' ? workout.completedAt : undefined,
    exercises,
  }
}

const normalizePlanExercise = (value: unknown): WorkoutPlanExercise | null => {
  const exercise = record(value)
  if (!exercise || typeof exercise.exerciseId !== 'string' || !templates.some((template) => template.id === exercise.exerciseId)) return null
  const reps = Array.isArray(exercise.reps) ? exercise.reps.map((item) => Math.max(1, safeNumber(item, 10))).slice(0, 99) : []
  return { exerciseId: exercise.exerciseId, reps, minutes: typeof exercise.minutes === 'number' ? Math.max(1, exercise.minutes) : undefined, note: typeof exercise.note === 'string' ? exercise.note : undefined }
}

const normalizeTemplate = (value: unknown): WorkoutTemplate | null => {
  const template = record(value)
  if (!template || typeof template.name !== 'string' || !template.name.trim()) return null
  const exercises = (Array.isArray(template.exercises) ? template.exercises : []).map(normalizePlanExercise).filter((item): item is WorkoutPlanExercise => Boolean(item))
  if (!exercises.length) return null
  return { id: typeof template.id === 'string' ? template.id : newId(), name: template.name.trim(), exercises }
}

const toPlan = (exercise: WorkoutExercise): WorkoutPlanExercise => ({ exerciseId: exercise.exerciseId, reps: exercise.sets.map((set) => Math.max(1, set.reps)), minutes: exercise.minutes, note: exercise.note || undefined })
const fromPlan = (plan: WorkoutPlanExercise): WorkoutExercise => ({ exerciseId: plan.exerciseId, sets: plan.reps.map((reps) => ({ reps, weight: '', complete: false })), note: plan.note ?? '', minutes: plan.minutes, cardioComplete: plan.minutes === undefined ? undefined : false })

const preset = (id: string, name: string, audience: PresetAudience, focus: string, minutes: number, exerciseIds: string[]): WorkoutPreset => ({
  id, name, audience, focus, minutes,
  exercises: exerciseIds.flatMap((exerciseId) => {
    const template = templates.find((item) => item.id === exerciseId)
    return template ? [toPlan(makeExercise(template))] : []
  }),
})

const workoutPresets: WorkoutPreset[] = [
  preset('preset-chest-man', 'Chest — Man', 'man', 'Hrudník a triceps', 55, ['barbell-bench-press', 'incline-dumbbell-press', 'chest-press', 'dumbbell-fly', 'cable-pushdown']),
  preset('preset-back-man', 'Back — Man', 'man', 'Záda a biceps', 55, ['lat-pulldown', 'barbell-row', 'cable-row', 'assisted-pull-up', 'barbell-curl']),
  preset('preset-shoulders-man', 'Shoulders — Man', 'man', 'Ramena', 50, ['dumbbell-shoulder-press', 'arnold-press', 'dumbbell-lateral-raise', 'rear-delt-fly', 'face-pull']),
  preset('preset-arms-man', 'Arms — Man', 'man', 'Biceps a triceps', 45, ['barbell-curl', 'hammer-curl', 'incline-dumbbell-curl', 'skull-crusher', 'cable-pushdown']),
  preset('preset-legs-man', 'Legs — Man', 'man', 'Nohy', 60, ['barbell-squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'seated-calf-raise']),
  preset('preset-upper-man', 'Upper Body — Man', 'man', 'Horní část těla', 60, ['barbell-bench-press', 'lat-pulldown', 'barbell-row', 'dumbbell-shoulder-press', 'cable-biceps-curl', 'cable-pushdown']),
  preset('preset-full-man', 'Full Body — Man', 'man', 'Celé tělo', 65, ['barbell-squat', 'barbell-bench-press', 'lat-pulldown', 'romanian-deadlift', 'dumbbell-shoulder-press', 'plank']),
  preset('preset-push-man', 'Push — Man', 'man', 'Tlakové cviky', 50, ['barbell-bench-press', 'incline-dumbbell-press', 'dumbbell-shoulder-press', 'dumbbell-lateral-raise', 'cable-pushdown']),
  preset('preset-pull-man', 'Pull — Man', 'man', 'Tahové cviky', 50, ['lat-pulldown', 'barbell-row', 'cable-row', 'face-pull', 'hammer-curl']),
  preset('preset-quick-man', 'Quick Gym — Man', 'man', 'Rychlý full body', 30, ['leg-press', 'chest-press', 'lat-pulldown', 'shoulder-press']),
  preset('preset-legs-woman', 'Legs — Woman', 'woman', 'Nohy', 55, ['leg-press', 'romanian-deadlift', 'barbell-hip-thrust', 'leg-curl', 'hip-abduction', 'seated-calf-raise']),
  preset('preset-glutes-woman', 'Glutes — Woman', 'woman', 'Hýždě', 50, ['barbell-hip-thrust', 'romanian-deadlift', 'bulgarian-split-squat', 'glute-bridge', 'hip-abduction']),
  preset('preset-full-woman', 'Full Body — Woman', 'woman', 'Celé tělo', 55, ['goblet-squat', 'dumbbell-bench-press', 'cable-row', 'barbell-hip-thrust', 'dumbbell-shoulder-press', 'dead-bug']),
  preset('preset-upper-woman', 'Upper Body — Woman', 'woman', 'Horní část těla', 45, ['chest-press', 'lat-pulldown', 'cable-row', 'arnold-press', 'face-pull']),
  preset('preset-legs-glutes-woman', 'Legs & Glutes — Woman', 'woman', 'Nohy a hýždě', 60, ['goblet-squat', 'barbell-hip-thrust', 'walking-lunge', 'leg-curl', 'hip-abduction', 'seated-calf-raise']),
  preset('preset-stretch-woman', 'Stretch — Woman', 'woman', 'Protažení celého těla', 25, ['cat-cow', 'downward-dog', 'low-lunge-stretch', 'pigeon-pose', 'figure-four-stretch', 'hamstring-stretch', 'childs-pose']),
  preset('preset-yoga-woman', 'Yoga / Mobility — Woman', 'woman', 'Mobilita a klid', 30, ['cat-cow', 'downward-dog', 'cobra-pose', 'warrior-one', 'warrior-two', 'pigeon-pose', 'childs-pose']),
  preset('preset-quick-woman', 'Quick Workout — Woman', 'woman', 'Rychlé celé tělo', 25, ['goblet-squat', 'glute-bridge', 'incline-push-up', 'cable-row', 'plank']),
  preset('preset-beginner', 'Full Body Beginner', 'general', 'Začátečníci', 45, ['leg-press', 'chest-press', 'lat-pulldown', 'glute-bridge', 'plank']),
  preset('preset-machines', 'Full Body Machines', 'general', 'Stroje', 50, ['leg-press', 'chest-press', 'lat-pulldown', 'leg-curl', 'shoulder-press', 'abs-machine']),
  preset('preset-dumbbell', 'Dumbbell Full Body', 'general', 'Jednoručky', 50, ['goblet-squat', 'dumbbell-bench-press', 'one-arm-dumbbell-row', 'dumbbell-romanian-deadlift', 'arnold-press']),
  preset('preset-bodyweight', 'Bodyweight Workout', 'general', 'Vlastní váha', 35, ['bodyweight-squat', 'push-up', 'reverse-lunge', 'glute-bridge', 'mountain-climbers', 'side-plank']),
  preset('preset-core', 'Core Workout', 'general', 'Střed těla', 30, ['plank', 'side-plank', 'dead-bug', 'bird-dog', 'crunch', 'leg-raise']),
  preset('preset-mobility', 'Mobility', 'general', 'Pohyblivost', 25, ['cat-cow', 'thoracic-rotation', 'shoulder-circles', 'hip-circles', 'low-lunge-stretch', 'hamstring-stretch']),
  preset('preset-full-stretch', 'Full Body Stretch', 'general', 'Protažení', 25, ['childs-pose', 'chest-opening-stretch', 'upper-back-stretch', 'hip-flexor-stretch', 'hamstring-stretch', 'quad-stretch']),
  preset('preset-quick', 'Quick 20–30 min', 'general', 'Rychlý workout', 25, ['goblet-squat', 'dumbbell-bench-press', 'cable-row', 'plank']),
  preset('preset-circuit', 'Circuit / Kruháč', 'general', 'Kruhový trénink', 35, ['bodyweight-squat', 'push-up', 'cable-row', 'walking-lunge', 'mountain-climbers', 'dead-bug']),
  preset('preset-together', 'Workout Together — Full Body', 'general', 'Společná stanoviště', 60, ['leg-press', 'chest-press', 'lat-pulldown', 'cable-row', 'leg-curl', 'abs-machine']),
]

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = record(JSON.parse(raw))
      if (!stored) throw new Error('Invalid store')
      const parsed: Store = {
        active: normalizeWorkout(stored.active, true),
        history: (Array.isArray(stored.history) ? stored.history : []).map((item) => normalizeWorkout(item)).filter((item): item is Workout => Boolean(item)),
        templates: (Array.isArray(stored.templates) ? stored.templates : []).map(normalizeTemplate).filter((item): item is WorkoutTemplate => Boolean(item)),
      }
      if (!parsed.active && !parsed.history.some((item) => item.date === todayKey())) parsed.active = makeDefaultWorkout()
      return parsed
    }
  } catch {
    // A clean store is safer than blocking the workout when stored data is invalid.
  }
  return { active: makeDefaultWorkout(), history: [], templates: [] }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [tab, setTab] = useState<Tab>('today')
  const [editor, setEditor] = useState<{ purpose: 'workout' } | { purpose: 'template'; template?: WorkoutTemplate } | null>(null)

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(store)), [store])

  const completedSets = store.active?.exercises.reduce((sum, exercise) => sum + (exercise.sets.length ? exercise.sets.filter((set) => set.complete).length : exercise.cardioComplete ? 1 : 0), 0) ?? 0
  const totalSets = store.active?.exercises.reduce((sum, exercise) => sum + (exercise.sets.length || 1), 0) ?? 0

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
    setStore((current) => ({ ...current, active: null, history: [completed, ...current.history] }))
    setTab('history')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startWorkout = (exercises: WorkoutExercise[]) => {
    if (store.active && !window.confirm('Nový workout nahradí právě rozepsaný. Pokračovat?')) return
    setStore((current) => ({ ...current, active: { id: newId(), date: todayKey(), exercises } }))
    setEditor(null)
    setTab('today')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveActiveTemplate = () => {
    if (!store.active?.exercises.length) return
    const name = window.prompt('Název tréninku')?.trim()
    if (!name) return
    const template: WorkoutTemplate = { id: newId(), name, exercises: store.active.exercises.map(toPlan) }
    setStore((current) => ({ ...current, templates: [...current.templates, template] }))
    setTab('templates')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveTemplate = (name: string, exercises: WorkoutExercise[], existing?: WorkoutTemplate) => {
    const template: WorkoutTemplate = { id: existing?.id ?? newId(), name: name.trim(), exercises: exercises.map(toPlan) }
    setStore((current) => ({ ...current, templates: existing ? current.templates.map((item) => item.id === existing.id ? template : item) : [...current.templates, template] }))
    setEditor(null)
    setTab('templates')
  }

  const renameTemplate = (template: WorkoutTemplate) => {
    const name = window.prompt('Nový název tréninku', template.name)?.trim()
    if (name) setStore((current) => ({ ...current, templates: current.templates.map((item) => item.id === template.id ? { ...item, name } : item) }))
  }

  const duplicateTemplate = (template: WorkoutTemplate) => setStore((current) => ({ ...current, templates: [...current.templates, { ...template, id: newId(), name: `${template.name} – kopie`, exercises: template.exercises.map((exercise) => ({ ...exercise, reps: [...exercise.reps] })) }] }))
  const deleteTemplate = (template: WorkoutTemplate) => {
    if (window.confirm(`Smazat trénink „${template.name}“?`)) setStore((current) => ({ ...current, templates: current.templates.filter((item) => item.id !== template.id) }))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#top" onClick={() => setTab('today')} aria-label="GYM – dnešní trénink">
          <span className="brand-mark">G</span><span>GYM</span>
        </a>
        <button className="new-workout" onClick={() => setEditor({ purpose: 'workout' })}>＋ Nový workout</button>
      </header>

      <nav className="tabs" aria-label="Hlavní navigace">
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Dnes</button>
        <button className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}>Tréninky</button>
        <button className={tab === 'girl' ? 'active' : ''} onClick={() => setTab('girl')}>Girl Workout</button>
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
            openNew={() => setEditor({ purpose: 'workout' })}
            saveAsTemplate={saveActiveTemplate}
          />
        )}
        {tab === 'templates' && <TemplatesView templates={store.templates} presets={workoutPresets} create={() => setEditor({ purpose: 'template' })} start={(template) => startWorkout(template.exercises.map(fromPlan))} edit={(template) => setEditor({ purpose: 'template', template })} rename={renameTemplate} duplicate={duplicateTemplate} remove={deleteTemplate} savePreset={(template) => setEditor({ purpose: 'template', template: { id: '', name: `${template.name} – vlastní`, exercises: template.exercises } })} />}
        {tab === 'girl' && <PresetsView title="Girl Workout" eyebrow="WOMAN / GENERAL FITNESS" presets={workoutPresets.filter((item) => item.audience === 'woman')} start={(template) => startWorkout(template.exercises.map(fromPlan))} save={(template) => setEditor({ purpose: 'template', template: { id: '', name: `${template.name} – vlastní`, exercises: template.exercises } })} />}
        {tab === 'history' && <HistoryView history={store.history} />}
        {tab === 'sources' && <SourcesView />}
      </main>

      <footer><button className="text-button" onClick={() => setTab('sources')}>Zdroje obrázků</button></footer>
      {editor && <NewWorkoutModal close={() => setEditor(null)} purpose={editor.purpose} initialTemplate={editor.purpose === 'template' ? editor.template : undefined} submit={(name, exercises) => editor.purpose === 'workout' ? startWorkout(exercises) : saveTemplate(name, exercises, editor.template?.id ? editor.template : undefined)} />}
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
  saveAsTemplate: () => void
}

function TodayView({ workout, completedSets, totalSets, updateExercise, lastResult, finishWorkout, openNew, saveAsTemplate }: TodayProps) {
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

      <div className="workout-actions"><button className="secondary-action" onClick={saveAsTemplate}>Uložit jako trénink</button><button className="finish-button" onClick={finishWorkout}>DOKONČIT TRÉNINK <span>→</span></button></div>
    </>
  )
}

const exerciseImagePath = (template: ExerciseTemplate, frame: 'start' | 'end') => `/assets/exercises/${template.id}-${frame}.jpg`

function ExerciseDiagram({ template }: { template: ExerciseTemplate }) {
  const reversed = reversedImageIds.has(template.id)
  const startImage = exerciseImagePath(template, reversed ? 'end' : 'start')
  const endImage = exerciseImagePath(template, reversed ? 'start' : 'end')
  return (
    <div className="exercise-visual exercise-photos" role="group" aria-label={`Startovní a konečná poloha cviku ${template.name}`}>
      <figure className="exercise-photo-frame">
        <span className="exercise-photo-label"><b>1</b> START</span>
        <img src={startImage} alt={`Výchozí poloha cviku ${template.name}`} />
      </figure>
      <span className="exercise-photo-arrow" aria-hidden="true">→</span>
      <figure className="exercise-photo-frame">
        <span className="exercise-photo-label end"><b>2</b> KONEC</span>
        <img src={endImage} alt={`Konečná poloha cviku ${template.name}`} />
      </figure>
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
  const weighted = template.exerciseType === 'weighted_reps' || (template.exerciseType === 'per_side' && template.equipment !== 'bodyweight')
  const timed = template.exerciseType === 'timed' || template.exerciseType === 'hold'
  const perSide = template.exerciseType === 'per_side'
  const typeLabel: Record<ExerciseType, string> = { weighted_reps: 'SILOVÝ CVIK', bodyweight_reps: 'VLASTNÍ VÁHA', timed: 'NA ČAS', hold: 'VÝDRŽ', duration: 'CARDIO', per_side: 'NA KAŽDOU STRANU' }
  const setUnit = timed ? 's' : perSide ? '× / strana' : '×'
  return (
    <article className={`exercise-card ${template.exerciseType === 'duration' ? 'cardio-card' : ''}`}>
      <ExerciseDiagram template={template} />
      <div className="movement-guide">
        <p><strong>Start:</strong> {template.movement.start}</p>
        <p><strong>Pohyb:</strong> {template.movement.move}</p>
        <p><strong>Konec:</strong> {template.movement.end}</p>
      </div>
      <div className="card-content">
        <p className="exercise-number">{typeLabel[template.exerciseType]} · {template.category.toUpperCase()}</p>
        <h2>{template.name}</h2>
        <ul className="instructions">{template.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>

        {previous && template.exerciseType !== 'duration' && (
          <p className="previous"><span>MINULE</span> {previous.sets.map((set) => `${weighted ? `${set.weight || '—'} kg × ` : ''}${set.reps}${timed ? ' s' : perSide ? ' / strana' : ''}`).join(' / ')}</p>
        )}

        {template.exerciseType !== 'duration' ? (
          <>
            <div className="field-label">SÉRIE</div>
            <div className={`sets-header ${weighted ? '' : 'two-columns'}`}><span></span>{weighted && <span>VÁHA</span>}<span>{timed ? 'SEKUNDY' : perSide ? 'NA STRANU' : 'OPAKOVÁNÍ'}</span></div>
            <div className="sets">
              {exercise.sets.map((set, setIndex) => (
                <div className={`set-row ${weighted ? '' : 'two-columns'} ${set.complete ? 'done' : ''}`} key={setIndex}>
                  <button className="set-check" aria-label={`${set.complete ? 'Zrušit dokončení' : 'Dokončit'} série ${setIndex + 1}`} onClick={() => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, complete: !item.complete } : item) }))}>
                    <span className="check">{set.complete ? '✓' : setIndex + 1}</span>
                  </button>
                  {weighted && <label className="set-value"><input aria-label={`Váha série ${setIndex + 1}`} inputMode="decimal" type="number" min="0" step="0.5" placeholder="—" value={set.weight} onChange={(event) => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, weight: event.target.value } : item) }))} /><span>kg</span></label>}
                  <label className="set-value"><input aria-label={`${timed ? 'Sekundy' : 'Opakování'} série ${setIndex + 1}`} inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => update((current) => ({ ...current, sets: current.sets.map((item, index) => index === setIndex ? { ...item, reps: Math.max(0, Number(event.target.value) || 0) } : item) }))} /><span>{setUnit}</span></label>
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
                  <span>{exercise.sets.length ? exercise.sets.map((set) => `${template?.exerciseType === 'weighted_reps' ? `${set.weight || '—'} kg × ` : ''}${set.reps}${template?.exerciseType === 'timed' || template?.exerciseType === 'hold' ? ' s' : template?.exerciseType === 'per_side' ? ' / strana' : ''}`).join(' / ') : `${exercise.minutes} minut`}</span>
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

function TemplatesView({ templates: items, presets, create, start, edit, rename, duplicate, remove, savePreset }: { templates: WorkoutTemplate[]; presets: WorkoutPreset[]; create: () => void; start: (template: WorkoutTemplate) => void; edit: (template: WorkoutTemplate) => void; rename: (template: WorkoutTemplate) => void; duplicate: (template: WorkoutTemplate) => void; remove: (template: WorkoutTemplate) => void; savePreset: (template: WorkoutTemplate) => void }) {
  return (
    <section className="templates-view">
      <div className="section-heading"><div><p className="eyebrow">ULOŽENÉ PLÁNY</p><h1>Moje tréninky</h1></div><button className="primary compact" onClick={create}>＋ Nový trénink</button></div>
      {!items.length && <div className="history-empty">Zatím tu není žádný vlastní trénink. Můžeš vytvořit nový nebo upravit preset.</div>}
      <div className="template-list">
        {items.map((template) => (
          <article className="template-card" key={template.id}>
            <div><h2>{template.name}</h2><p>{template.exercises.length} cviků</p></div>
            <button className="template-start" onClick={() => start(template)}>Spustit</button>
            <div className="template-tools">
              <button onClick={() => edit(template)}>Upravit</button><button onClick={() => rename(template)}>Přejmenovat</button><button onClick={() => duplicate(template)}>Duplikovat</button><button className="danger" onClick={() => remove(template)}>Smazat</button>
            </div>
          </article>
        ))}
      </div>
      <PresetsView title="Hotové workouty" eyebrow="PRESETY" presets={presets} start={start} save={savePreset} embedded />
    </section>
  )
}

function PresetsView({ title, eyebrow, presets, start, save, embedded = false }: { title: string; eyebrow: string; presets: WorkoutPreset[]; start: (template: WorkoutPreset) => void; save: (template: WorkoutPreset) => void; embedded?: boolean }) {
  const groups: Array<{ audience: PresetAudience; label: string }> = [{ audience: 'man', label: 'Man / Strength' }, { audience: 'woman', label: 'Woman / Fitness' }, { audience: 'general', label: 'General' }]
  return (
    <section className={`presets-view ${embedded ? 'embedded' : ''}`}>
      <p className="eyebrow">{eyebrow}</p><h1>{title}</h1>
      {groups.filter((group) => presets.some((item) => item.audience === group.audience)).map((group) => <div className="preset-group" key={group.audience}>
        {embedded && <h2>{group.label}</h2>}
        <div className="preset-grid">{presets.filter((item) => item.audience === group.audience).map((template) => <article className="preset-card" key={template.id}>
          <div><span>{template.focus}</span><h3>{template.name}</h3><p>{template.exercises.length} cviků · přibližně {template.minutes} min</p></div>
          <div className="preset-actions"><button className="template-start" onClick={() => start(template)}>Spustit</button><button onClick={() => save(template)}>Upravit a uložit jako vlastní</button></div>
        </article>)}</div>
      </div>)}
    </section>
  )
}

function SourcesView() {
  return (
    <section className="sources-view">
      <p className="eyebrow">O APLIKACI</p>
      <h1>Zdroje obrázků</h1>
      <p>Všechny demonstrační fotografie jsou uložené lokálně. Zdrojová sada Free Exercise DB je zveřejněná jako public domain pod licencí Unlicense.</p>
      <a className="license-link" href="https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md" target="_blank" rel="noreferrer">Licence Free Exercise DB</a>
      <ul>
        {templates.map((template) => {
          const sourceId = exerciseSourceId(template)
          const sourceBase = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${sourceId}`
          const reversed = reversedImageIds.has(template.id)
          return (
            <li key={template.id}>
              <strong>{template.name}</strong>
              <span>Autor: Free Exercise DB contributors (jednotlivý fotograf neuveden)</span>
              <span>Licence: Public Domain / Unlicense</span>
              <span className="source-links"><a href={`${sourceBase}/${reversed ? 1 : 0}.jpg`} target="_blank" rel="noreferrer">Zdroj START</a><a href={`${sourceBase}/${reversed ? 0 : 1}.jpg`} target="_blank" rel="noreferrer">Zdroj KONEC</a></span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

type PickerFilter = 'All' | 'Chest' | 'Back' | 'Legs' | 'Glutes' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Core' | 'Bodyweight' | 'Yoga' | 'Mobility' | 'Stretching' | 'Cardio'

const pickerFilters: Array<{ id: PickerFilter; label: string }> = [
  { id: 'All', label: 'Vše' },
  { id: 'Chest', label: 'Hrudník' },
  { id: 'Back', label: 'Záda' },
  { id: 'Legs', label: 'Nohy' },
  { id: 'Glutes', label: 'Hýždě' },
  { id: 'Shoulders', label: 'Ramena' },
  { id: 'Biceps', label: 'Biceps' },
  { id: 'Triceps', label: 'Triceps' },
  { id: 'Core', label: 'Core' },
  { id: 'Bodyweight', label: 'Vlastní váha' },
  { id: 'Yoga', label: 'Yoga' },
  { id: 'Mobility', label: 'Mobilita' },
  { id: 'Stretching', label: 'Protažení' },
  { id: 'Cardio', label: 'Cardio' },
]

const categoryLabels: Record<ExerciseCategory, string> = {
  Chest: 'Hrudník', Back: 'Záda', Legs: 'Nohy', Glutes: 'Hýždě', Shoulders: 'Ramena', Arms: 'Paže', Core: 'Core', Bodyweight: 'Vlastní váha', Yoga: 'Yoga', Mobility: 'Mobilita', Stretching: 'Protažení', Cardio: 'Cardio',
}

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs')
const exerciseCountWord = (count: number) => count === 1 ? 'CVIK' : count >= 2 && count <= 4 ? 'CVIKY' : 'CVIKŮ'
const isBicepsExercise = (template: ExerciseTemplate) => template.category === 'Arms' && /biceps|curl/i.test(template.name)
const matchesPickerFilter = (template: ExerciseTemplate, filter: PickerFilter) => {
  if (filter === 'All') return true
  if (filter === 'Biceps') return isBicepsExercise(template)
  if (filter === 'Triceps') return template.category === 'Arms' && !isBicepsExercise(template)
  return template.category === filter || template.secondaryCategory === filter
}

function NewWorkoutModal({ close, purpose, initialTemplate, submit }: { close: () => void; purpose: 'workout' | 'template'; initialTemplate?: WorkoutTemplate; submit: (name: string, exercises: WorkoutExercise[]) => void }) {
  const initialExercises = initialTemplate?.exercises.map(fromPlan) ?? []
  const [name, setName] = useState(initialTemplate?.name ?? '')
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialExercises.map((exercise) => exercise.exerciseId))
  const [settings, setSettings] = useState<Record<string, { sets: number; reps: number; minutes: number }>>(() => Object.fromEntries(templates.map((template) => {
    const initial = initialExercises.find((exercise) => exercise.exerciseId === template.id)
    return [template.id, { sets: initial?.sets.length || template.defaultSets || 3, reps: initial?.sets[0]?.reps || template.defaultReps || 10, minutes: initial?.minutes || template.defaultMinutes || 10 }]
  })))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<PickerFilter>('All')
  const [pickerView, setPickerView] = useState<'library' | 'selected'>(initialTemplate ? 'selected' : 'library')
  const selectedCount = selectedIds.length
  const filteredTemplates = useMemo(() => templates.filter((template) => {
    const matchesCategory = matchesPickerFilter(template, category)
    const matchesSearch = normalizeSearch(template.name).includes(normalizeSearch(search.trim()))
    return matchesCategory && matchesSearch
  }), [category, search])
  const selectedTemplates = useMemo(() => selectedIds.flatMap((id) => {
    const template = templates.find((item) => item.id === id)
    return template ? [template] : []
  }), [selectedIds])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const move = (id: string, direction: -1 | 1) => setSelectedIds((current) => {
    const index = current.indexOf(id)
    const next = index + direction
    if (index < 0 || next < 0 || next >= current.length) return current
    const result = [...current]; [result[index], result[next]] = [result[next], result[index]]
    return result
  })
  const remove = (id: string) => setSelectedIds((current) => current.filter((item) => item !== id))

  const create = () => {
    const exercises = selectedIds.flatMap((id) => {
      const template = templates.find((item) => item.id === id)
      if (!template) return []
      const config = settings[template.id]
      return [makeExercise(template, config.sets, config.reps, config.minutes)]
    })
    if (exercises.length && (purpose === 'workout' || name.trim())) submit(name.trim(), exercises)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title">
        <div className="modal-handle" />
        <header><div><p className="eyebrow">{purpose === 'template' ? 'ULOŽENÝ TRÉNINK' : 'NOVÝ WORKOUT'}</p><h2 id="new-title">{initialTemplate ? 'Upravit trénink' : 'Vyber cviky'}</h2></div><button className="close" onClick={close} aria-label="Zavřít">×</button></header>
        {purpose === 'template' && <label className="template-name"><span>Název tréninku</span><input type="text" maxLength={60} placeholder="Např. Pondělí – Full Body" value={name} onChange={(event) => setName(event.target.value)} /></label>}
        <div className="picker-view-tabs" role="tablist" aria-label="Výběr a nastavení cviků">
          <button role="tab" aria-selected={pickerView === 'library'} className={pickerView === 'library' ? 'active' : ''} onClick={() => setPickerView('library')}>Cviky</button>
          <button role="tab" aria-selected={pickerView === 'selected'} className={pickerView === 'selected' ? 'active' : ''} onClick={() => setPickerView('selected')}>Vybrané <b>{selectedCount}</b></button>
        </div>

        {pickerView === 'library' ? <>
          <div className="library-tools">
            <label className="exercise-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Hledat cvik" placeholder="Hledat cvik…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" aria-label="Vymazat hledání" onClick={() => setSearch('')}>×</button>}</label>
            <div className="category-filters" aria-label="Kategorie cviků">
              {pickerFilters.map((item) => <button key={item.id} aria-pressed={category === item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}
            </div>
            <p className="library-count">{filteredTemplates.length} {filteredTemplates.length === 1 ? 'cvik' : 'cviků'}</p>
          </div>
          <div className="exercise-picker">
            {filteredTemplates.map((template) => {
              const selectedIndex = selectedIds.indexOf(template.id)
              const selected = selectedIndex >= 0
              return <button className={`picker-card ${selected ? 'selected' : ''}`} aria-pressed={selected} aria-label={`${selected ? 'Odebrat' : 'Vybrat'} ${template.name}`} onClick={() => toggle(template.id)} key={template.id}>
                <img src={`/assets/exercises/${template.id}-start.jpg`} alt="" loading="lazy" decoding="async" />
                <span className="picker-card-copy"><strong>{template.name}</strong><small>{categoryLabels[template.category]} · {template.exerciseType === 'duration' ? 'minuty' : template.exerciseType === 'timed' || template.exerciseType === 'hold' ? 'sekundy' : template.exerciseType === 'per_side' ? 'na stranu' : 'opakování'}</small></span>
                <span className="picker-check" aria-hidden="true">{selected ? selectedIndex + 1 : ''}</span>
              </button>
            })}
            {!filteredTemplates.length && <p className="picker-empty">Žádný cvik neodpovídá hledání nebo filtru.</p>}
          </div>
        </> : <div className="selected-exercises">
          {!selectedTemplates.length && <div className="picker-empty selected-empty"><p>Nemáš vybraný žádný cvik.</p><button onClick={() => setPickerView('library')}>Vybrat cviky</button></div>}
          {selectedTemplates.map((template, index) => <article className="selected-exercise" key={template.id}>
            <div className="selected-exercise-head">
              <span className="selected-order">{index + 1}</span><img src={`/assets/exercises/${template.id}-start.jpg`} alt="" loading="lazy" decoding="async" />
              <div><strong>{template.name}</strong><small>{categoryLabels[template.category]}</small></div>
              <button className="remove-exercise" aria-label={`Odebrat ${template.name}`} onClick={() => remove(template.id)}>×</button>
            </div>
            <div className="picker-settings">
              {template.exerciseType !== 'duration' ? <><NumberField label="Série" value={settings[template.id].sets} setValue={(sets) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], sets } }))} /><NumberField label={template.exerciseType === 'timed' || template.exerciseType === 'hold' ? 'Sekundy' : template.exerciseType === 'per_side' ? 'Na stranu' : 'Opakování'} value={settings[template.id].reps} setValue={(reps) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], reps } }))} /></> : <NumberField label="Minuty" value={settings[template.id].minutes} setValue={(minutes) => setSettings((current) => ({ ...current, [template.id]: { ...current[template.id], minutes } }))} />}
              <div className="order-controls"><span>Pořadí {index + 1} z {selectedCount}</span><button aria-label={`Posunout ${template.name} nahoru`} disabled={index === 0} onClick={() => move(template.id, -1)}>↑</button><button aria-label={`Posunout ${template.name} dolů`} disabled={index === selectedCount - 1} onClick={() => move(template.id, 1)}>↓</button></div>
            </div>
          </article>)}
        </div>}

        <div className="picker-footer"><p>Vybráno: <strong>{selectedCount}</strong></p><button className="primary modal-start" disabled={!selectedCount || (purpose === 'template' && !name.trim())} onClick={create}>{purpose === 'template' ? 'ULOŽIT TRÉNINK' : `PŘIDAT ${selectedCount} ${exerciseCountWord(selectedCount)}`}</button></div>
      </section>
    </div>
  )
}

function NumberField({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><input type="number" inputMode="numeric" min="1" max="99" value={value} onChange={(event) => setValue(Math.max(1, Number(event.target.value) || 1))} /></label>
}

export default App
