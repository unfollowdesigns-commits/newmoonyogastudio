import type { StudioConfig } from "../types";

// New Moon Yoga Studio — Les Jardins de Carthage, Tunis.
// Source: the studio's posters, price list and rules (October 2026).
// After editing: `npm run client:sql newmoon` regenerates database.sql.

export default {
  id: "newmoon",
  name: "New Moon Yoga Studio",
  shortName: "New Moon",
  tagline: { fr: "Yoga Studio", en: "Yoga Studio" },
  description: {
    fr: "Réservez votre cours de yoga au New Moon Yoga Studio — Les Jardins de Carthage.",
    en: "Book your yoga class at New Moon Yoga Studio — Les Jardins de Carthage.",
  },

  contact: {
    address: "5 Rue Kart Hadsht",
    area: "Les Jardins de Carthage, Tunis",
    maps: "https://maps.app.goo.gl/9tss2c4gsd8VYbKh7",
    whatsapp: "https://wa.me/21656775096",
    instagram: "https://www.instagram.com/new_moon_yoga_studio/",
  },
  phonePrefix: "216",
  currency: "DT",
  timezone: "Africa/Tunis",
  utcOffset: 1,

  rules: { bookingCutoffHours: 8, lateCancelHours: 2, lateCancelFee: 0, autoPromote: true },
  features: { fullMoon: true },

  prices: [
    { kind: "trial", price: 40 },
    { kind: "pack", n: 5, price: 150, validity: ["days", 20] },
    { kind: "pack", n: 10, price: 280, validity: ["month", 1] },
    { kind: "pack", n: 15, price: 360, validity: ["months", 2] },
    { kind: "pack", n: 20, price: 440, validity: ["months", 3] },
    { kind: "pack", n: 30, price: 670, validity: ["months", 4] },
    { kind: "pack", n: 50, price: 990, validity: ["months", 6] },
    { kind: "unlimited", price: 1540, validity: ["year", 1] },
  ],

  styles: {
    "Women's yoga": { hue: "#a0667a", soft: "#f3e3e6", label: { fr: "Yoga féminin", en: "Women's yoga" } },
    "Anti-stress": { hue: "#7d8a9a", soft: "#e6e9ee", label: { fr: "Anti-stress", en: "Anti-stress" } },
    "Back care": { hue: "#8a9a7b", soft: "#e8ebe1", label: { fr: "Dos & colonne", en: "Back care" } },
    "Beginner+": { hue: "#b98366", soft: "#f3e6dc", label: { fr: "Débutant +", en: "Beginner+" } },
    Restorative: { hue: "#9a8d74", soft: "#efeadf", label: { fr: "Restoratif", en: "Restorative" } },
    Aerial: { hue: "#8f7aa0", soft: "#ebe5f0", label: { fr: "Yoga aérien", en: "Aerial" } },
  },

  rooms: [
    { id: "studio", label: { fr: "Studio principal", en: "Main Studio" }, capacity: 10, cols: 5, unit: "mat" },
    { id: "aerial", label: { fr: "Studio aérien", en: "Aerial Studio" }, capacity: 4, cols: 4, unit: "hammock" },
  ],

  // Only Rania Sam is named on the posters; the other classes show the studio team.
  teachers: [
    {
      id: "rania",
      name: "Rania Sam",
      tone: "#ead3c6",
      bio: {
        fr: "Professeure certifiée en yoga féminin. Elle guide le cycle équilibre hormonal.",
        en: "Professeure certifiée en yoga féminin. Guides the hormonal balance series.",
      },
    },
    {
      id: "team",
      name: "New Moon Team",
      label: { fr: "Équipe New Moon", en: "New Moon Team" },
      tone: "#e4dbd8",
      bio: { fr: "Cours donné par l'équipe de professeurs du New Moon Yoga Studio.", en: "Taught by the New Moon Yoga Studio teaching team." },
    },
  ],

  classes: {
    hormonal: {
      fr: "Une pratique au féminin pour l'équilibre des hormones, le soulagement des symptômes de la périménopause et de la ménopause, la régulation du cycle et des douleurs menstruelles — guérir le féminin sacré.",
      en: "A women's practice to balance hormones, ease the symptoms of perimenopause and menopause, regulate the cycle and soothe menstrual pain — healing the sacred feminine.",
    },
    stress: {
      fr: "Mouvements lents guidés par le souffle et relaxation profonde pour relâcher les tensions et apaiser le mental après la journée.",
      en: "Slow breath-led movement and deep relaxation to release tension and quiet the mind after the day.",
    },
    dos: {
      fr: "Mobilité douce et renforcement pour soulager les douleurs de dos et améliorer la posture.",
      en: "Gentle mobility and strengthening to relieve back pain and improve posture.",
    },
    debutant: {
      fr: "Apprenez les bases pas à pas — postures, alignement et respiration — puis allez un peu plus loin chaque semaine.",
      en: "Learn the foundations step by step — postures, alignment and breathing — then go a little further each week.",
    },
    colonne: {
      fr: "Une pratique dédiée à une colonne saine et souple : étirements, torsions et gainage.",
      en: "A practice dedicated to a healthy, supple spine: lengthening, twists and core support.",
    },
    restoratif: {
      fr: "Postures entièrement soutenues, tenues plusieurs minutes, pour calmer le système nerveux et retrouver de l'énergie.",
      en: "Fully supported postures held for several minutes to calm the nervous system and restore energy.",
    },
    air: {
      fr: "Yoga aérien dans un hamac suspendu — décompressez la colonne, gagnez en force et osez les inversions en toute sécurité.",
      en: "Aerial yoga in a suspended hammock — decompress the spine, build strength and play with inversions safely.",
    },
  },

  // Lundi–vendredi 19h30 (1h30) · mer/jeu/ven 8h30 yoga thérapeutique (2h) · sam 9h & dim 10h yoga air (1h)
  timetable: [
    { day: 1, time: "19:30", title: "Yoga anti stress", style: "Anti-stress", level: "All Levels", teacher: "team", room: "studio", minutes: 90, desc: "stress" },
    { day: 2, time: "19:30", title: "Yoga pour le dos", style: "Back care", level: "All Levels", teacher: "team", room: "studio", minutes: 90, desc: "dos" },
    { day: 3, time: "08:30", title: "Yoga pour l'équilibre hormonal", style: "Women's yoga", level: "All Levels", teacher: "rania", room: "studio", minutes: 120, desc: "hormonal" },
    { day: 3, time: "19:30", title: "Yoga débutant +", style: "Beginner+", level: "Beginner", teacher: "team", room: "studio", minutes: 90, desc: "debutant" },
    { day: 4, time: "08:30", title: "Yoga pour l'équilibre hormonal", style: "Women's yoga", level: "All Levels", teacher: "rania", room: "studio", minutes: 120, desc: "hormonal" },
    { day: 4, time: "19:30", title: "Yoga santé colonne vertébrale", style: "Back care", level: "All Levels", teacher: "team", room: "studio", minutes: 90, desc: "colonne" },
    { day: 5, time: "08:30", title: "Yoga pour l'équilibre hormonal", style: "Women's yoga", level: "All Levels", teacher: "rania", room: "studio", minutes: 120, desc: "hormonal" },
    { day: 5, time: "19:30", title: "Yoga restoratif", style: "Restorative", level: "All Levels", teacher: "team", room: "studio", minutes: 90, desc: "restoratif" },
    { day: 6, time: "09:00", title: "Yoga air", style: "Aerial", level: "All Levels", teacher: "team", room: "aerial", minutes: 60, desc: "air" },
    { day: 0, time: "10:00", title: "Yoga air", style: "Aerial", level: "All Levels", teacher: "team", room: "aerial", minutes: 60, desc: "air" },
  ],

  inventory: [
    { id: "studio-mats", room: "studio", name: "Yoga mats", label: { fr: "Tapis de yoga", en: "Yoga mats" }, total: 12, minimum: 10 },
    { id: "studio-blocks", room: "studio", name: "Cork blocks", label: { fr: "Briques en liège", en: "Cork blocks" }, total: 20, minimum: 20 },
    { id: "studio-straps", room: "studio", name: "Straps", label: { fr: "Sangles", en: "Straps" }, total: 10, minimum: 10 },
    { id: "studio-bolsters", room: "studio", name: "Bolsters", label: { fr: "Bolsters", en: "Bolsters" }, total: 10, minimum: 10 },
    { id: "studio-blankets", room: "studio", name: "Blankets", label: { fr: "Couvertures", en: "Blankets" }, total: 12, minimum: 10 },
    { id: "studio-bowls", room: "studio", name: "Singing bowls", label: { fr: "Bols chantants", en: "Singing bowls" }, total: 3, minimum: 2 },
    { id: "aerial-hammocks", room: "aerial", name: "Aerial hammocks", label: { fr: "Hamacs aériens", en: "Aerial hammocks" }, total: 4, minimum: 4 },
    {
      id: "aerial-rigging",
      room: "aerial",
      name: "Rigging sets (carabiners, daisy chains)",
      label: { fr: "Kits d'accroche (mousquetons, chaînes)", en: "Rigging sets (carabiners, daisy chains)" },
      total: 4,
      minimum: 4,
    },
    { id: "aerial-crash", room: "aerial", name: "Crash mats", label: { fr: "Tapis de réception", en: "Crash mats" }, total: 4, minimum: 4 },
  ],

  text: {
    fr: {
      "profile.policy4": "Le studio ouvre 15 minutes avant le cours. Tapis, briques et bolsters sont fournis.",
      "moon.body": "Une fois par mois, un rendez-vous spécial au rythme de la lune. Places limitées — annulation au moins 24 h avant.",
      "auth.consent":
        "J'accepte que New Moon Yoga Studio conserve mes coordonnées pour gérer mes réservations et me contacter par WhatsApp. Je peux demander leur suppression à tout moment (loi n° 2004-63).",
    },
    en: {
      "profile.policy4": "Doors open 15 minutes before class. Mats, blocks and bolsters are provided.",
      "moon.body": "Once a month, a special gathering in rhythm with the moon. Limited spots — cancel at least 24h before.",
      "auth.consent":
        "I agree that New Moon Yoga Studio keeps my contact details to manage my bookings and contact me on WhatsApp. I can ask for them to be deleted at any time (Law no. 2004-63).",
    },
  },
} satisfies StudioConfig;
