// Everything that changes from one studio to the next lives in clients/<id>/studio.ts.
// The app code (components/, lib/) never names a studio directly.

export type Lang = "fr" | "en";
export type Text = { fr: string; en: string };
export type Level = "All Levels" | "Beginner" | "Intermediate" | "Advanced";

export interface StudioConfig {
  /** short id, also the folder name: "newmoon" */
  id: string;
  name: string; // "New Moon Yoga Studio"
  shortName: string; // "New Moon" (wordmark, home-screen icon)
  tagline: Text; // under the wordmark
  description: Text; // Google / link previews

  contact: {
    address: string;
    area: string;
    maps: string;
    whatsapp: string; // https://wa.me/216XXXXXXXX
    instagram?: string;
  };
  /** country calling code for phone numbers, without + */
  phonePrefix: string;
  currency: string;
  /** IANA timezone; studioDate() assumes a fixed offset, see utcOffset */
  timezone: string;
  utcOffset: number;

  /** optional colour overrides, same names as app/globals.css (--color-<name>) */
  colors?: Partial<Record<"sand" | "linen" | "stone" | "stone-deep" | "mauve" | "plum" | "blush" | "clay" | "clay-soft" | "ink" | "muted" | "rose" | "rose-soft", string>>;

  rules: { bookingCutoffHours: number; lateCancelHours: number; lateCancelFee: number; autoPromote: boolean };
  features: { fullMoon: boolean };

  prices: { kind: "trial" | "pack" | "unlimited"; n?: number; price: number; validity?: ["days" | "month" | "months" | "year", number] }[];

  /** class families: colour + label. The key is stored in the database. */
  styles: Record<string, { hue: string; soft: string; label: Text }>;
  rooms: { id: string; label: Text; capacity: number; cols: number; unit: "mat" | "hammock" }[];
  /** "team" is the generic teacher for classes without a named teacher */
  teachers: { id: string; name: string; label?: Text; tone: string; bio: Text }[];
  /** class descriptions, referenced by timetable[].desc */
  classes: Record<string, Text>;
  /** weekday: 0 = Sunday … 6 = Saturday */
  timetable: { day: number; time: string; title: string; style: string; level: Level; teacher: string; room: string; minutes: number; desc: string }[];
  inventory: { id: string; room: string; name: string; label: Text; total: number; minimum: number }[];

  /** override or add any app text, e.g. a studio-specific rule */
  text?: Partial<Record<Lang, Record<string, string>>>;
}
