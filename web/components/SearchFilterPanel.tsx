import Link from "next/link";
import type { ReactNode } from "react";
import { RATED_DOMAINS, type RatedDomain } from "@/lib/onet";
import {
  type FilterCategory, type FilterElement, type FilterOptions, MAX_CONTEXT_ROWS, MAX_RATING_ROWS, MAX_STYLE_ROWS,
  type Range, SCORE_LIMITS, type SearchFilters, type Threshold,
} from "@/lib/search-filters";
import { socGroupName } from "@/lib/soc";
import { zoneLabel, zoneSummary } from "@/lib/zones";

// Every control points at the search form by id (form attribute), so the
// panel can sit beside the results while one GET form holds all state.
export const SEARCH_FORM_ID = "search-form";
const F = SEARCH_FORM_ID;

function Section({ title, open, children }: { title: string; open: boolean; children: ReactNode }) {
  return (
    <details open={open} className="border-b border-earth py-3">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}

function CheckList({ legend, name, items, checked }: {
  legend: string;
  name: string;
  items: { value: string; label: string }[];
  checked: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-1 font-medium">{legend}</legend>
      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const id = `f-${name}-${it.value}`;
          return (
            <label key={it.value} htmlFor={id} className="flex items-start gap-2">
              <input
                id={id}
                form={F}
                type="checkbox"
                name={name}
                value={it.value}
                defaultChecked={checked.includes(it.value)}
                className="mt-1 size-4 shrink-0 accent-teal"
              />
              <span>{it.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Toggle({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  const id = `f-${name}`;
  return (
    <label htmlFor={id} className="flex items-start gap-2">
      <input id={id} form={F} type="checkbox" name={name} value="1" defaultChecked={checked} className="mt-1 size-4 shrink-0 accent-teal" />
      <span>{label}</span>
    </label>
  );
}

function NumberField({ id, name, label, value, min, max }: {
  id: string;
  name: string;
  label: string;
  value: number | null | undefined;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm">{label}</label>
      <input
        id={id}
        form={F}
        name={name}
        type="number"
        inputMode="decimal"
        step="0.1"
        min={min}
        max={max}
        defaultValue={value ?? ""}
        className="tbg-input"
      />
    </div>
  );
}

/** Element picker + minimum score, used for interest, work context and work style rows. */
function ThresholdRow({ id, name, minName, legend, elements, value, limits, anyLabel }: {
  id: string;
  name: string;
  minName: string;
  legend: string;
  elements: FilterElement[];
  value: Threshold | null | undefined;
  limits: { min: number; max: number };
  anyLabel: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">{legend}</legend>
      <label htmlFor={id} className="sr-only">{legend}: item</label>
      <select id={id} form={F} name={name} defaultValue={value?.element ?? ""} className="tbg-input">
        <option value="">{anyLabel}</option>
        {elements.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <NumberField
        id={`${id}-min`}
        name={minName}
        label={`At least (${limits.min} to ${limits.max})`}
        value={value?.min}
        min={limits.min}
        max={limits.max}
      />
    </fieldset>
  );
}

function RangeRow({ id, legend, cats, value }: { id: string; legend: string; cats: FilterCategory[]; value: Range }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">{legend}</legend>
      {(["min", "max"] as const).map((end) => (
        <div key={end}>
          <label htmlFor={`f-${id}-${end}`} className="mb-1 block text-sm">{end === "min" ? "From" : "To"}</label>
          <select id={`f-${id}-${end}`} form={F} name={`${id}_${end}`} defaultValue={value[end] ?? ""} className="tbg-input">
            <option value="">Any</option>
            {cats.map((c) => <option key={c.category} value={c.category}>{c.label}</option>)}
          </select>
        </div>
      ))}
    </fieldset>
  );
}

function RatingRowFields({ i, opts, value }: { i: number; opts: FilterOptions; value: SearchFilters["ratings"][number] | undefined }) {
  const domains = Object.keys(RATED_DOMAINS) as RatedDomain[];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium">Score {i}</legend>
      <label htmlFor={`f-r${i}`} className="sr-only">Score {i}: skill, ability, knowledge area or work activity</label>
      <select id={`f-r${i}`} form={F} name={`r${i}`} defaultValue={value ? `${value.domain}:${value.element}` : ""} className="tbg-input">
        <option value="">Choose one</option>
        {domains.map((d) => (
          <optgroup key={d} label={RATED_DOMAINS[d].label}>
            {opts.ratingElements[d].map((e) => <option key={e.id} value={`${d}:${e.id}`}>{e.name}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          id={`f-r${i}-im`}
          name={`r${i}_im`}
          label="Importance at least (1 to 5)"
          value={value?.minImportance}
          min={SCORE_LIMITS.importance.min}
          max={SCORE_LIMITS.importance.max}
        />
        <NumberField
          id={`f-r${i}-lv`}
          name={`r${i}_lv`}
          label="Level at least (0 to 7)"
          value={value?.minLevel}
          min={SCORE_LIMITS.level.min}
          max={SCORE_LIMITS.level.max}
        />
      </div>
    </fieldset>
  );
}

const rangeSet = (r: Range) => r.min !== null || r.max !== null;

/** Grouped, collapsible filters. Sections with an applied filter start open. */
export function SearchFilterPanel({ filters: f, opts, clearHref }: {
  filters: SearchFilters;
  opts: FilterOptions;
  clearHref: string;
}) {
  return (
    <aside aria-labelledby="filters-title">
      <h2 id="filters-title" className="mb-1 text-lg">Filters</h2>
      <p className="mb-2 text-sm">Every filter must match. Leave the search box empty to filter all jobs.</p>

      <Section title="Job basics" open={f.zones.length > 0 || f.groups.length > 0 || f.emerging}>
        <CheckList
          legend="Job zone (preparation needed)"
          name="zone"
          items={opts.zones.map((z) => ({ value: String(z.job_zone), label: `${zoneLabel(z)}: ${zoneSummary(z)}` }))}
          checked={f.zones.map(String)}
        />
        <CheckList
          legend="Occupation group"
          name="group"
          items={opts.groups.map((g) => ({ value: g, label: `${g}: ${socGroupName(g)}` }))}
          checked={f.groups}
        />
        <Toggle name="emerging" label="Has emerging tasks (new or changing work)" checked={f.emerging} />
      </Section>

      <Section title="Career interests" open={f.interests.length > 0 || f.interestScore !== null}>
        <CheckList
          legend="Strongest career interest"
          name="interest"
          items={opts.interests.map((i) => ({ value: i.id, label: i.name }))}
          checked={f.interests}
        />
        <ThresholdRow
          id="f-int"
          name="int"
          minName="int_min"
          legend="Interest score"
          elements={opts.interests}
          value={f.interestScore}
          limits={SCORE_LIMITS.interest}
          anyLabel="Choose an interest"
        />
      </Section>

      <Section title="Skills, abilities and knowledge" open={f.ratings.length > 0}>
        <p className="text-sm">
          Pick a skill, ability, knowledge area or work activity and set a minimum score. The first one is shown on
          each result and can be used to sort.
        </p>
        {Array.from({ length: MAX_RATING_ROWS }, (_, i) => (
          <RatingRowFields key={i} i={i + 1} opts={opts} value={f.ratings[i]} />
        ))}
      </Section>

      <Section title="Education and training" open={rangeSet(f.education) || rangeSet(f.experience) || rangeSet(f.training)}>
        <p className="text-sm">Uses the answer most workers in the job gave.</p>
        <RangeRow id="edu" legend="Required education" cats={opts.education} value={f.education} />
        <RangeRow id="exp" legend="Related work experience" cats={opts.experience} value={f.experience} />
        <RangeRow id="ojt" legend="On-the-job training" cats={opts.training} value={f.training} />
      </Section>

      <Section title="Work context and work styles" open={f.workContext.length > 0 || f.workStyles.length > 0}>
        {Array.from({ length: MAX_CONTEXT_ROWS }, (_, i) => (
          <ThresholdRow
            key={`wc${i}`}
            id={`f-wc${i + 1}`}
            name={`wc${i + 1}`}
            minName={`wc${i + 1}_min`}
            legend={`Work context ${i + 1}`}
            elements={opts.workContext}
            value={f.workContext[i]}
            limits={SCORE_LIMITS.context}
            anyLabel="Choose a work condition"
          />
        ))}
        {Array.from({ length: MAX_STYLE_ROWS }, (_, i) => (
          <ThresholdRow
            key={`ws${i}`}
            id={`f-ws${i + 1}`}
            name={`ws${i + 1}`}
            minName={`ws${i + 1}_min`}
            legend={`Work style ${i + 1}`}
            elements={opts.workStyles}
            value={f.workStyles[i]}
            limits={SCORE_LIMITS.style}
            anyLabel="Choose a work style"
          />
        ))}
      </Section>

      <Section title="Technology" open={f.tech !== "" || f.hot || f.inDemand}>
        <div>
          <label htmlFor="f-tech" className="mb-1 block font-medium">Technology name contains</label>
          <input
            id="f-tech"
            form={F}
            name="tech"
            type="text"
            maxLength={100}
            autoComplete="off"
            defaultValue={f.tech}
            placeholder="Excel, Python, AutoCAD"
            className="tbg-input"
          />
        </div>
        <Toggle name="hot" label="Hot technology (often in job postings)" checked={f.hot} />
        <Toggle name="demand" label="In-demand technology" checked={f.inDemand} />
      </Section>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" form={F} className="tbg-btn tbg-btn-primary">Apply filters</button>
        <Link href={clearHref}>Clear filters</Link>
      </div>
    </aside>
  );
}
