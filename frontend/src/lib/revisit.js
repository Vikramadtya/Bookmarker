// "Remind me to look at this again" presets, shared by every place a link is saved.
const atMorning = (date) => {
  date.setHours(9, 0, 0, 0);
  return date;
};
const inDays = (n) => atMorning(new Date(Date.now() + n * 86_400_000));

export const REVISIT_PRESETS = [
  { id: "tomorrow", label: "Tomorrow", at: () => inDays(1) },
  {
    id: "weekend",
    label: "This weekend",
    at: () => {
      const d = new Date();
      const untilSaturday = (6 - d.getDay() + 7) % 7 || 7;
      return inDays(untilSaturday);
    },
  },
  { id: "week", label: "Next week", at: () => inDays(7) },
  { id: "month", label: "In a month", at: () => inDays(30) },
];

export const revisitISO = (presetId) =>
  REVISIT_PRESETS.find((p) => p.id === presetId)
    ?.at()
    .toISOString();

export const formatRevisit = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
