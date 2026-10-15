import { faqSchema } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

/** Visible Q&A plus matching FAQPage schema, so search and AI answers quote the same text users see. */
export function Faq({ items, schema = true }: { items: readonly (readonly [string, string])[]; schema?: boolean }) {
  return (
    <div className="space-y-3">
      {schema && <JsonLd data={faqSchema(items)} />}
      {items.map(([q, a]) => (
        <details key={q} className="group rounded-md border border-line p-4 open:bg-surface">
          <summary className="cursor-pointer list-none font-medium text-fg">
            <h3 className="inline">{q}</h3><span className="float-right text-muted transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
