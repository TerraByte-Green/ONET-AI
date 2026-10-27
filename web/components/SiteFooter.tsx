// TODO before launch: confirm the credit wording against O*NET's license page (web/DESIGN.md).
const ONET_CREDIT =
  "Data: O*NET 31.0 Database, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA).";

export function SiteFooter() {
  return (
    <footer className="tbg-on-brown bg-earth text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 md:px-8">
        <p className="tbg-tagline">
          <span className="text-sky">Tech</span>{" "}
          <span className="text-sun">for People. Solutions for the</span>{" "}
          <span className="text-leaf">Planet.</span>
        </p>
        <p className="tbg-prose">{ONET_CREDIT}</p>
        <p>
          TerraByte Green Career Explorer is a project of{" "}
          <a href="https://www.terrabyte.green">
            TerraByte Green
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
