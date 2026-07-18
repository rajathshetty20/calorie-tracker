import { isoDaysAgo, type Exercise, type Meal, type Settings, type TimeEntry, type Water, type Weight } from "./types";

// Sample dataset for logged-out demo mode: 90 days of realistic entries,
// generated from a fixed seed so every visit sees the same data (dates
// slide with the current day). Nothing here ever touches the database.

const DAYS = 90;
const DEMO_USER = "demo";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MealTemplate = { name: string; carbs_g: number; protein_g: number; fat_g: number };

const BREAKFASTS: MealTemplate[] = [
  { name: "Oats with whey", carbs_g: 54, protein_g: 32, fat_g: 9 },
  { name: "Masala omelette & toast", carbs_g: 28, protein_g: 22, fat_g: 18 },
  { name: "Greek yogurt & berries", carbs_g: 24, protein_g: 17, fat_g: 4 },
];
const LUNCHES: MealTemplate[] = [
  { name: "Chicken rice bowl", carbs_g: 72, protein_g: 42, fat_g: 14 },
  { name: "Dal, roti & sabzi", carbs_g: 64, protein_g: 22, fat_g: 12 },
  { name: "Paneer wrap", carbs_g: 48, protein_g: 26, fat_g: 20 },
];
const DINNERS: MealTemplate[] = [
  { name: "Grilled fish & veggies", carbs_g: 18, protein_g: 38, fat_g: 13 },
  { name: "Egg curry & rice", carbs_g: 58, protein_g: 24, fat_g: 16 },
  { name: "Chicken salad", carbs_g: 15, protein_g: 35, fat_g: 12 },
];
const SNACKS: MealTemplate[] = [
  { name: "Protein shake", carbs_g: 8, protein_g: 25, fat_g: 2 },
  { name: "Peanut butter toast", carbs_g: 26, protein_g: 9, fat_g: 12 },
  { name: "Fruit & nuts", carbs_g: 30, protein_g: 5, fat_g: 10 },
];

// Push / pull / legs rotation; weights creep up over the 90 days.
const WORKOUTS: { name: string; base: number }[][] = [
  [
    { name: "Bench press", base: 52.5 },
    { name: "Overhead press", base: 30 },
    { name: "Incline dumbbell press", base: 22.5 },
  ],
  [
    { name: "Lat pulldown", base: 55 },
    { name: "Barbell row", base: 45 },
    { name: "Bicep curls", base: 12.5 },
  ],
  [
    { name: "Squat", base: 70 },
    { name: "Romanian deadlift", base: 60 },
    { name: "Leg press", base: 120 },
  ],
];

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function demoData() {
  const rnd = mulberry32(20260718);
  const meals: Meal[] = [];
  const water: Water[] = [];
  const weights: Weight[] = [];
  const exercises: Exercise[] = [];
  const timeEntries: TimeEntry[] = [];

  let workout = 0;
  for (let i = 0; i < DAYS; i++) {
    const daysAgo = DAYS - 1 - i;
    const date = isoDaysAgo(daysAgo);
    const isToday = daysAgo === 0;
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const at = (time: string) => `${date}T${time}:00`;

    const addMeal = (t: MealTemplate, time: string) =>
      meals.push({
        id: `demo-meal-${date}-${time}`,
        user_id: DEMO_USER,
        eaten_on: date,
        name: t.name,
        carbs_g: t.carbs_g,
        protein_g: t.protein_g,
        fat_g: t.fat_g,
        created_at: at(time),
      });
    addMeal(pick(rnd, BREAKFASTS), "08:30");
    addMeal(pick(rnd, LUNCHES), "13:00");
    if (rnd() < 0.55) addMeal(pick(rnd, SNACKS), "17:00");
    // Today's dinner is "not logged yet" so the hero shows calories left.
    if (!isToday) addMeal(pick(rnd, DINNERS), "20:30");

    water.push({
      id: `demo-water-${date}`,
      user_id: DEMO_USER,
      drank_on: date,
      ml: (isToday ? 4 : 3 + Math.floor(rnd() * 4)) * 500,
      created_at: at("21:00"),
    });

    if (isToday || rnd() < 0.75) {
      weights.push({
        id: `demo-weight-${date}`,
        user_id: DEMO_USER,
        measured_on: date,
        weight_kg: Math.round((74.2 - i * 0.02 + (rnd() - 0.5) * 0.6) * 10) / 10,
        created_at: at("07:45"),
      });
    }

    const trains = isToday || ([1, 3, 5].includes(weekday) && rnd() > 0.15);
    if (trains) {
      const plan = WORKOUTS[workout % WORKOUTS.length];
      workout++;
      for (const ex of plan) {
        const kg = Math.round((ex.base + i * 0.07) / 2.5) * 2.5;
        const nSets = 3 + (rnd() < 0.5 ? 1 : 0);
        exercises.push({
          id: `demo-ex-${date}-${ex.name}`,
          user_id: DEMO_USER,
          performed_on: date,
          name: ex.name,
          sets: Array.from({ length: nSets }, () => ({
            weight_kg: kg,
            reps: 8 + Math.floor(rnd() * 4),
          })),
          created_at: at("18:30"),
        });
      }
      timeEntries.push({
        id: `demo-time-${date}-gym`,
        user_id: DEMO_USER,
        spent_on: date,
        category: "gym",
        minutes: 60 + Math.floor(rnd() * 7) * 5,
        created_at: at("19:45"),
      });
    }
    timeEntries.push({
      id: `demo-time-${date}-sleep`,
      user_id: DEMO_USER,
      spent_on: date,
      category: "sleep",
      minutes: 390 + Math.floor(rnd() * 7) * 15,
      created_at: at("07:30"),
    });
    if (weekday >= 1 && weekday <= 5) {
      timeEntries.push({
        id: `demo-time-${date}-work`,
        user_id: DEMO_USER,
        spent_on: date,
        category: "work",
        minutes: 420 + Math.floor(rnd() * 9) * 15,
        created_at: at("18:00"),
      });
    }
    if (rnd() < 0.4) {
      timeEntries.push({
        id: `demo-time-${date}-reading`,
        user_id: DEMO_USER,
        spent_on: date,
        category: "reading",
        minutes: 30 + Math.floor(rnd() * 4) * 15,
        created_at: at("22:00"),
      });
    }
  }

  const settings: Settings = {
    user_id: DEMO_USER,
    target_calories: 2000,
    carbs_pct: 40,
    protein_pct: 30,
    fat_pct: 30,
    bottle_ml: 500,
    updated_at: isoDaysAgo(0),
  };

  return { meals, water, weights, exercises, timeEntries, settings };
}
