import { AGE_BANDS, AGE_BAND_LABELS, AVATARS, DAILY_LIMIT_OPTIONS, type AgeBand } from "@/lib/constants";

export function ChildFields({
  idPrefix,
  nickname = "",
  avatar = "cat",
  ageBand,
  dailyLimit = null,
  showLimit = true,
}: {
  idPrefix: string;
  nickname?: string;
  avatar?: string;
  ageBand?: AgeBand;
  dailyLimit?: number | null;
  showLimit?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor={`${idPrefix}-nickname`}>Nickname</label>
        <input
          className="field"
          id={`${idPrefix}-nickname`}
          name="nickname"
          defaultValue={nickname}
          maxLength={20}
          required
          autoComplete="off"
        />
        <p className="hint mt-1">A nickname is enough. Please don&apos;t use a full name.</p>
      </div>
      <fieldset>
        <legend className="label">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AVATARS).map(([key, emoji]) => (
            <label key={key} className="cursor-pointer">
              <input type="radio" name="avatar" value={key} defaultChecked={key === avatar} className="peer sr-only" />
              <span
                className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-tone-deep bg-paper text-2xl peer-checked:border-ink peer-checked:bg-sun peer-focus-visible:outline peer-focus-visible:outline-3"
                aria-label={key}
              >
                {emoji}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${idPrefix}-age`}>Age range</label>
          <select className="field" id={`${idPrefix}-age`} name="age_band" defaultValue={ageBand ?? ""} required>
            <option value="" disabled>Choose…</option>
            {AGE_BANDS.map((b) => (
              <option key={b} value={b}>{AGE_BAND_LABELS[b]}</option>
            ))}
          </select>
        </div>
        {showLimit ? (
          <div>
            <label className="label" htmlFor={`${idPrefix}-limit`}>Daily reading limit</label>
            <select className="field" id={`${idPrefix}-limit`} name="daily_limit_minutes" defaultValue={dailyLimit ?? ""}>
              {DAILY_LIMIT_OPTIONS.map((m) => (
                <option key={String(m)} value={m ?? ""}>{m ? `${m} minutes` : "No limit"}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
