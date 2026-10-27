import type { Metadata } from "next";
import { Container, PageHeader, PixelLabel, ScorePins, SectionHeading } from "@/components/brand";

export const metadata: Metadata = { title: "Help" };

export default function HelpPage() {
  return (
    <Container className="py-10">
      <PageHeader title="How to read this site">
        <p>
          Every job here comes from O*NET, a free database of U.S. occupations kept by the
          Department of Labor. Here is what the main terms mean.
        </p>
      </PageHeader>

      <div className="tbg-prose flex flex-col gap-10">
        <section aria-labelledby="help-zones">
          <SectionHeading id="help-zones">Job zones</SectionHeading>
          <p className="mb-3">
            A job zone tells you how much preparation a job needs: education, training and
            experience. Zones run from little preparation to extensive preparation.
          </p>
          <p>
            <PixelLabel text="ZONE 3" /> means medium preparation: usually some training or an
            associate&rsquo;s degree.
          </p>
        </section>

        <section aria-labelledby="help-scores">
          <SectionHeading id="help-scores">Scores</SectionHeading>
          <p className="mb-4">
            O*NET rates each skill, ability and knowledge area for <strong>importance</strong> (1 to
            5, how much it matters in the job) and <strong>level</strong> (0 to 7, how much of it the
            job needs). Each score shows as a row of pins with the number at the end.
          </p>
          <ScorePins scale="importance" value={4.1} />
          <ScorePins scale="level" value={4.4} />
        </section>

        <section aria-labelledby="help-interests">
          <SectionHeading id="help-interests">Career interests</SectionHeading>
          <p>
            O*NET groups work into 6 interest types: Realistic, Investigative, Artistic, Social,
            Enterprising and Conventional. A job&rsquo;s top 3 types make up its interest code.
          </p>
        </section>
      </div>
    </Container>
  );
}
