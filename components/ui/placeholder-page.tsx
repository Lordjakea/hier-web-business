import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  bullets,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-semibold text-hier-text">Ready for the next wiring pass</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-hier-muted">
            This screen is intentionally styled and structured already, so functionality can be added once the main visual system feels right in the browser.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {bullets.map((item) => (
              <div key={item} className="rounded-[24px] border border-hier-border bg-hier-panel p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-xl bg-white p-2 text-hier-primary shadow-sm">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-hier-ink">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-[32px] border border-hier-border bg-gradient-to-br from-hier-soft to-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Design system</p>
          <h3 className="mt-3 text-2xl font-semibold text-hier-text">Consistent with the new board UI</h3>
          <p className="mt-4 text-sm leading-7 text-hier-muted">
            Keep the same rounded panels, restrained shadows, pale background layers, and Hier primary accents across every business screen.
          </p>
        </aside>
      </div>
    </div>
  );
}
