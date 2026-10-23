import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "./Faq";
import { JsonLd } from "./JsonLd";
import { btn, card, Kicker, PageHero } from "./ui";
import { ALTERNATIVES, CHECKED, type Alternative } from "@/lib/alternatives";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

const get = (slug: string) => ALTERNATIVES.find((a) => a.slug === slug)!;

export const alternativeMeta = (slug: string): Metadata => {
  const a = get(slug);
  return pageMeta({ path: `/${a.slug}/`, title: a.title, social: a.social, description: a.description });
};

/** One "<Competitor> alternative" landing page: comparison, honest trade-offs, switching steps and FAQ. */
export function AlternativePage({ slug }: { slug: string }) {
  const a: Alternative = get(slug);
  const path = `/${a.slug}/`;
  return (
    <>
      <JsonLd data={breadcrumbSchema(`${a.vs} alternative`, path)} />
      <PageHero kicker={`${a.vs} alternative · ${a.kind}`} title={`The free ${a.vs}`} accent="alternative.">
        {a.lead}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={a.href} className={btn("primary", "lg")}>{a.cta}</Link>
          <a href="https://github.com/LovekeshAnand/Kelados" className={btn("secondary", "lg")}>View the source</a>
        </div>
      </PageHero>

      <div className="mx-auto max-w-5xl space-y-16 px-5 py-14 md:px-8">
        <section>
          <h2 className="display text-4xl md:text-5xl">Kelados vs {a.vs}</h2>
          <div className={`${card} mt-6 overflow-x-auto`}>
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b border-line">
                <tr><th className="p-4 font-normal text-muted" /><th className="label p-4 text-accent">Kelados</th><th className="label p-4 font-normal text-muted">{a.vs}</th></tr>
              </thead>
              <tbody>
                {a.rows.map(([k, us, them]) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <th scope="row" className="p-4 font-normal text-muted">{k}</th><td className="p-4 text-fg">{us}</td><td className="p-4 text-muted">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-subtle">
            {a.vs} details from its <a href={a.pricing} rel="nofollow noopener" className="underline">pricing page</a>, checked {CHECKED}. Plans change; check there for current terms.
          </p>
        </section>

        <section>
          <Kicker>Why people switch</Kicker>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {a.why.map(([title, body]) => (
              <div key={title} className="border-t border-accent/40 pt-5">
                <h3 className="display text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h2 className="display text-3xl">When {a.vs} is the better pick</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            {a.theyWin.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="display text-4xl">Switch from {a.vs} in two minutes</h2>
          <div className="mt-6 grid gap-10 md:grid-cols-3">
            {a.switchSteps.map(([title, body], i) => (
              <div key={title} className="border-t border-accent/40 pt-6">
                <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display mt-3 text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
          <Link href={a.href} className={`${btn("primary", "lg")} mt-8`}>{a.cta}</Link>
        </section>

        <section>
          <h2 className="display text-4xl">Questions</h2>
          <div className="mt-6"><Faq items={a.faq} /></div>
        </section>

        <p className="text-sm text-muted">
          More comparisons:{" "}
          {ALTERNATIVES.filter((o) => o.slug !== a.slug).map((o) => (
            <Link key={o.slug} href={`/${o.slug}/`} className="mr-4 text-accent hover:underline">{o.vs} alternative</Link>
          ))}
          <Link href="/compare/" className="text-accent hover:underline">All comparisons</Link>
        </p>
      </div>
    </>
  );
}
