import Link from "next/link";
import { Container, PageHeader } from "@/components/brand";
import { Mascot } from "@/components/Mascot";

export default function NotFound() {
  return (
    <Container className="py-10">
      <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
        <Mascot size="lg" />
        <div>
          <PageHeader title="We couldn't find that page">
            <p>The link may be old or mistyped. Try a search instead.</p>
          </PageHeader>
          <Link href="/search" className="tbg-btn tbg-btn-primary">
            Search jobs
          </Link>
        </div>
      </div>
    </Container>
  );
}
