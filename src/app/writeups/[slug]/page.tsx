import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShareButtons } from "@/components/share-buttons";
import { toWhatsApp } from "@/lib/whatsapp";
import { listWriteups } from "@/lib/writeups";

export const dynamic = "force-dynamic";

export default async function WriteupPage({ params }: PageProps<"/writeups/[slug]">) {
  const { slug } = await params;
  const writeup = listWriteups().find((w) => w.slug === slug);
  if (!writeup) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/writeups" className="text-xs font-semibold text-lime hover:underline">
        ← All write-ups
      </Link>
      <div className="mt-3 mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="display text-[13px] tracking-[0.16em] text-lime">
          Gameweek {writeup.gw} · {writeup.kind}
        </p>
        <ShareButtons text={toWhatsApp(writeup.markdown)} />
      </div>
      <article className="rounded-md border border-line bg-panel px-4 py-5 md:px-8 md:py-7">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <p className="display mb-1 text-sm tracking-[0.16em] text-soft">{children}</p>,
            h2: ({ children }) => <h2 className="display mt-7 mb-2 text-2xl first:mt-0 md:text-3xl">{children}</h2>,
            p: ({ children }) => <p className="mb-3 leading-relaxed text-ink/90">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-lime">{children}</strong>,
            table: ({ children }) => (
              <div className="-mx-4 my-3 overflow-x-auto px-4">
                <table className="w-full min-w-[22rem] text-sm tabular-nums">{children}</table>
              </div>
            ),
            th: ({ children }) => <th className="display border-b border-line py-2 text-right text-xs text-soft first:text-left [&:nth-child(2)]:text-left">{children}</th>,
            td: ({ children }) => <td className="border-b border-line py-2 text-right first:text-left [&:nth-child(2)]:text-left">{children}</td>,
          }}
        >
          {writeup.markdown}
        </Markdown>
      </article>
    </div>
  );
}
