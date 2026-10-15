import type { StudioConfig } from "../types";

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ New studio: copy this whole _template folder to clients/<id>/ and fill in │
// │ every value below. Full checklist: docs/NEW-CLIENT.md                     │
// └───────────────────────────────────────────────────────────────────────────┘
// clients/newmoon/studio.ts is a complete real example.

export default {
  id: "studioid", // = the folder name, lowercase, no spaces
  name: "Studio Name",
  shortName: "Studio", // shown big in the header, max ~12 letters
  tagline: { fr: "Yoga Studio", en: "Yoga Studio" },
  description: {
    fr: "Réservez votre cours au Studio Name — Quartier, Ville.",
    en: "Book your class at Studio Name — Area, City.",
  },

  contact: {
    address: "Street and number",
    area: "Area, City",
    maps: "https://maps.app.goo.gl/…", // Google Maps → Share → Copy link
    whatsapp: "https://wa.me/216XXXXXXXX", // country code + number, no + or spaces
    instagram: "https://www.instagram.com/…/",
  },
  phonePrefix: "216",
  currency: "DT",
  timezone: "Africa/Tunis",
  utcOffset: 1,

  // Leave out to keep the default New Moon palette. Names match app/globals.css.
  // colors: { plum: "#4a5d52", blush: "#e3ece6", sand: "#f3f2ee" },

  rules: { bookingCutoffHours: 8, lateCancelHours: 2, lateCancelFee: 0, autoPromote: true },
  features: { fullMoon: false },

  prices: [
    { kind: "trial", price: 40 },
    { kind: "pack", n: 10, price: 280, validity: ["month", 1] },
    { kind: "unlimited", price: 1500, validity: ["year", 1] },
  ],

  // One entry per kind of class (colour on the planning + filter chip)
  styles: {
    Hatha: { hue: "#8a9a7b", soft: "#e8ebe1", label: { fr: "Hatha", en: "Hatha" } },
  },

  rooms: [{ id: "studio", label: { fr: "Studio", en: "Studio" }, capacity: 12, cols: 6, unit: "mat" }],

  // keep "team" for classes without a named teacher
  teachers: [
    {
      id: "team",
      name: "Studio Team",
      label: { fr: "Équipe du studio", en: "Studio team" },
      tone: "#e4dbd8",
      bio: { fr: "Cours donné par l'équipe du studio.", en: "Taught by the studio's teachers." },
    },
  ],

  classes: {
    hatha: { fr: "Description du cours en une ou deux phrases.", en: "One or two sentences about the class." },
  },

  // day: 0 = dimanche, 1 = lundi … 6 = samedi
  timetable: [{ day: 1, time: "19:00", title: "Hatha yoga", style: "Hatha", level: "All Levels", teacher: "team", room: "studio", minutes: 60, desc: "hatha" }],

  inventory: [{ id: "studio-mats", room: "studio", name: "Yoga mats", label: { fr: "Tapis de yoga", en: "Yoga mats" }, total: 12, minimum: 12 }],

  // Any app text can be replaced here (keys are in lib/i18n.tsx)
  text: {
    fr: { "profile.policy4": "Le studio ouvre 15 minutes avant le cours. Tapis fournis." },
    en: { "profile.policy4": "Doors open 15 minutes before class. Mats provided." },
  },
} satisfies StudioConfig;
