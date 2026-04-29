export const colors = {
  primary: "#91A6EB",
  background: "#fcfcfc",
  text: "#111111",
  muted: "#6B7280",
  border: "#E5E7EB",
  card: "#fcfcfc",
} as const;

export const boardColumns = [
  { id: "applied", title: "Applied", accent: "bg-sky-100 text-sky-700" },
  { id: "shortlisted", title: "Shortlisted", accent: "bg-violet-100 text-violet-700" },
  { id: "interview_offered", title: "Interview offered", accent: "bg-amber-100 text-amber-700" },
  { id: "interview_booked", title: "Interview booked", accent: "bg-orange-100 text-orange-700" },
  { id: "offered", title: "Offered", accent: "bg-emerald-100 text-emerald-700" },
  { id: "started", title: "Started", accent: "bg-teal-100 text-teal-700" },
  { id: "rejected", title: "Rejected", accent: "bg-rose-100 text-rose-700" },
] as const;
