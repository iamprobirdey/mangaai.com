import { AGE_BANDS, AGE_BAND_LABELS, DIRECTION_LABELS, GENRES } from "@/lib/constants";
import type { Series } from "@/lib/content";

export function SeriesFields({ series }: { series?: Partial<Series> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input className="field" id="title" name="title" defaultValue={series?.title} required maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="slug">Web address (slug)</label>
          <input className="field" id="slug" name="slug" defaultValue={series?.slug} placeholder="made from the title if empty" maxLength={80} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="synopsis">Synopsis</label>
        <textarea className="field min-h-28" id="synopsis" name="synopsis" defaultValue={series?.synopsis} maxLength={2000} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="age_band">Age range (required)</label>
          <select className="field" id="age_band" name="age_band" defaultValue={series?.age_band ?? ""} required>
            <option value="" disabled>Choose…</option>
            {AGE_BANDS.map((b) => (
              <option key={b} value={b}>{AGE_BAND_LABELS[b]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="reading_direction">Reading direction</label>
          <select className="field" id="reading_direction" name="reading_direction" defaultValue={series?.reading_direction ?? "ltr"}>
            {Object.entries(DIRECTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Genres</legend>
        <div className="flex flex-wrap gap-3">
          {GENRES.map((g) => (
            <label key={g} className="flex items-center gap-2">
              <input type="checkbox" name="genres" value={g} defaultChecked={series?.genres?.includes(g)} className="h-5 w-5 accent-ink" />
              {g}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="is_ai_generated" defaultChecked={series?.is_ai_generated ?? true} className="h-5 w-5 accent-ink" />
        Made with AI (shows a disclosure on the series page)
      </label>
    </div>
  );
}
