import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Container, Divider, Highlight, PageHeader, PixelLabel, ScorePins, SectionHeading, ShadowBox,
} from "@/components/brand";

export const metadata: Metadata = { title: "Style guide", robots: { index: false } };

// Contrast pairs from ref/BRANDGUIDE.md section 3 that the app uses.
const CONTRAST = [
  { pair: "Earth Brown on white", ratio: "8.8:1", use: "Body text", fg: "text-earth", bg: "bg-white" },
  { pair: "Earth Brown on Sunshine Yellow", ratio: "7.1:1", use: "Primary button, selected row", fg: "text-earth", bg: "bg-sun" },
  { pair: "Earth Brown on Sky Blue", ratio: "5.0:1", use: "Header band", fg: "text-earth", bg: "bg-sky" },
  { pair: "White on Earth Brown", ratio: "8.8:1", use: "Footer, widget header", fg: "text-white", bg: "bg-earth" },
  { pair: "Sunshine Yellow on Earth Brown", ratio: "7.1:1", use: "Tagline, link hover on brown", fg: "text-sun", bg: "bg-earth" },
  { pair: "Leaf Green on Earth Brown", ratio: "4.0:1", use: "Tagline only, bold 24px+", fg: "text-leaf tbg-tagline", bg: "bg-earth" },
  { pair: "White on Deep Purple", ratio: "11.5:1", use: "Second compare series label", fg: "text-white", bg: "bg-purple" },
] as const;

const SWATCHES = [
  ["White", "bg-white"], ["Earth Brown", "bg-earth"], ["Sky Blue", "bg-sky"],
  ["Sunshine Yellow", "bg-sun"], ["Leaf Green", "bg-leaf"], ["Tech Teal", "bg-teal"],
  ["Chip Green", "bg-chip"], ["Deep Purple", "bg-purple"],
] as const;

/** Dev-only catalogue of the brand primitives. Returns 404 in production. */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Container className="py-10">
      <PageHeader title="Style guide">
        <p>Brand primitives from web/DESIGN.md. Development only.</p>
      </PageHeader>

      <div className="flex flex-col gap-12">
        <section aria-labelledby="sg-colors">
          <SectionHeading id="sg-colors">Colors</SectionHeading>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SWATCHES.map(([name, bg]) => (
              <li key={name} className="flex items-center gap-3">
                <span className={`h-10 w-10 shrink-0 border-2 border-earth ${bg}`} aria-hidden="true" />
                {name}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sg-type">
          <SectionHeading id="sg-type">Type</SectionHeading>
          <p className="text-4xl font-extrabold leading-tight">Heading 3.052rem</p>
          <p className="text-3xl font-extrabold leading-tight">Heading 2.441rem</p>
          <p className="text-2xl font-bold leading-tight">Heading 1.953rem</p>
          <p className="text-xl font-bold leading-tight">Heading 1.563rem</p>
          <p className="text-lg font-bold">Heading 1.25rem</p>
          <p className="tbg-prose">
            Body 1rem, 1.5 leading. A <a href="#sg-type">link looks like this</a>, and a key word can
            get the <Highlight>highlighter underline</Highlight>.
          </p>
          <p className="text-sm">Small 0.8rem for meta lines.</p>
        </section>

        <section aria-labelledby="sg-buttons">
          <SectionHeading id="sg-buttons">Buttons and inputs</SectionHeading>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="tbg-btn tbg-btn-primary">Compare 3 jobs</button>
            <button type="button" className="tbg-btn tbg-btn-secondary">Clear filters</button>
            <button type="button" className="tbg-btn tbg-btn-secondary" disabled>Download CSV</button>
          </div>
          <div className="mt-6 max-w-md">
            <label htmlFor="sg-input" className="mb-1 block font-medium">Job title</label>
            <input id="sg-input" className="tbg-input" placeholder="e.g. electrician" />
          </div>
        </section>

        <section aria-labelledby="sg-motifs">
          <SectionHeading id="sg-motifs">Motifs</SectionHeading>
          <p className="mb-2 font-medium">Section divider</p>
          <Divider />
          <p className="mb-4 mt-8 font-medium">Offset shadow box (once per page)</p>
          <ShadowBox className="max-w-md">
            <p className="font-bold">What kind of work are you curious about?</p>
          </ShadowBox>
          <p className="mb-2 mt-10 font-medium">Pixel labels</p>
          <div className="flex flex-wrap gap-3">
            <PixelLabel text="NEW" />
            <PixelLabel text="ZONE 3" />
            <PixelLabel text="1/5" />
          </div>
        </section>

        <section aria-labelledby="sg-pins">
          <SectionHeading id="sg-pins">Score pins</SectionHeading>
          <p className="mb-1 font-medium">Active listening</p>
          <ScorePins scale="importance" value={4.12} />
          <ScorePins scale="level" value={4.38} />
          <p className="mb-1 mt-4 font-medium">Edge cases: minimum and maximum</p>
          <ScorePins scale="importance" value={1} />
          <ScorePins scale="level" value={7} />
        </section>

        <section aria-labelledby="sg-contrast">
          <SectionHeading id="sg-contrast">Contrast (brand guide section 3)</SectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-earth">
                  <th scope="col" className="py-2 pr-4">Sample</th>
                  <th scope="col" className="py-2 pr-4">Pair</th>
                  <th scope="col" className="py-2 pr-4">Ratio</th>
                  <th scope="col" className="py-2">Use</th>
                </tr>
              </thead>
              <tbody>
                {CONTRAST.map((c) => (
                  <tr key={c.pair} className="border-b border-earth">
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-control px-3 py-1 font-bold ${c.fg} ${c.bg}`}>Aa</span>
                    </td>
                    <td className="py-2 pr-4">{c.pair}</td>
                    <td className="py-2 pr-4">{c.ratio}</td>
                    <td className="py-2">{c.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Container>
  );
}
