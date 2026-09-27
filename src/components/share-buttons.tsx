"use client";

import { useState } from "react";

/** "Send to WhatsApp" opens WhatsApp with the text filled in; pick the group and send. */
export function ShareButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="display rounded-[3px] bg-lime px-4 py-2.5 text-base text-pitch hover:brightness-110"
      >
        Send to WhatsApp
      </a>
      <button
        type="button"
        onClick={copy}
        className="display rounded-[3px] border border-line px-4 py-2.5 text-base text-ink hover:border-soft"
      >
        {copied ? "Copied" : "Copy text"}
      </button>
    </div>
  );
}
