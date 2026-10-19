export const GOALS = [
  { value: "habit", label: "Build a steady habit", description: "Short, regular sessions that fit a busy week." },
  { value: "strength", label: "Get stronger", description: "Strength work for upper and lower body." },
  { value: "fitness", label: "Improve fitness and stamina", description: "More cardio and full-body circuits." },
  { value: "mobility", label: "Move better, feel less stiff", description: "Stretching, core and posture work." },
];

export const LEVELS = [
  { value: "beginner", label: "Beginner", description: "New to training, or returning after a long break." },
  { value: "intermediate", label: "Intermediate", description: "I train now and then and know the basics." },
  { value: "advanced", label: "Advanced", description: "I train regularly and want a challenge." },
];

export const EQUIPMENT = [
  { value: "none", label: "No equipment", description: "Bodyweight only. Nothing to buy or carry." },
  { value: "basic", label: "Basic kit", description: "Dumbbells, a kettlebell, bands or a jump rope." },
  { value: "full", label: "Full gym", description: "Machines, barbells and racks." },
];

export const PLACES = [
  { value: "gym", label: "Campus or local gym", description: "Any exercise that matches your equipment." },
  { value: "residence", label: "Residence room", description: "Quiet exercises only, with no jumping." },
  { value: "home", label: "At home", description: "Bodyweight and basic-kit exercises." },
];

export const MUSCLE_GROUPS = {
  legs: "Legs", glutes: "Glutes", chest: "Chest", back: "Back", shoulders: "Shoulders",
  arms: "Arms", core: "Core", cardio: "Cardio", mobility: "Mobility",
};

export const DIFFICULTY = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
export const EQUIPMENT_TIER = { none: "No equipment", basic: "Basic kit", full: "Full gym" };

export const EFFORT = [
  { value: 1, label: "Very easy" },
  { value: 2, label: "Easy" },
  { value: 3, label: "About right" },
  { value: 4, label: "Hard" },
  { value: 5, label: "Very hard" },
];

export const TEMPLATES = [
  { id: "full_body", title: "Full body", description: "A bit of everything: legs, push, pull and core." },
  { id: "upper", title: "Upper body", description: "Chest, back, shoulders and arms." },
  { id: "lower", title: "Lower body", description: "Legs and glutes with some core." },
  { id: "cardio", title: "Cardio intervals", description: "Short bursts to raise your heart rate." },
  { id: "core", title: "Core and stability", description: "Core, glutes and posture." },
  { id: "mobility", title: "Mobility flow", description: "Gentle stretches to move better." },
];

export const REPORT_REASONS = [
  "Spam or fake account",
  "Harassment or bullying",
  "Inappropriate content",
  "Impersonation",
  "Something else",
];

export const labelFor = (list, value) => list.find((o) => o.value === value)?.label || value;
