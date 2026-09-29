"use client";

import { formatPhp } from "@/components/projects/format-money";
import {
  particularLineAmount,
  particularPurposeSections,
  sumParticularAmounts,
  type ParticularLineItem,
} from "@/lib/voucher-particulars";

interface PurposeParticularsViewProps {
  purpose: string | null | undefined;
  items: ParticularLineItem[];
  /** Single-purpose text after any display cleanup (department tags, etc.). */
  displayPurpose?: string;
}

function LineRow({
  item,
  index,
}: {
  item: ParticularLineItem;
  index: number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-bg p-2.5 text-xs text-text">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[10px] font-bold text-primary">
        {index + 1}
      </span>
      <span className="flex-1 font-medium leading-relaxed pt-0.5">
        {item.description}
        {item.unitOfMeasure?.trim() ? (
          <span className="ml-1.5 font-normal text-text-secondary">
            ({item.unitOfMeasure.trim()})
          </span>
        ) : null}
      </span>
      {item.quantity ? (
        <span className="shrink-0 font-mono text-[11px] text-text-secondary pt-0.5">
          {item.quantity}
          {item.unitOfMeasure?.trim()
            ? ` ${item.unitOfMeasure.trim()}`
            : ""}
          {item.unitCost ? ` × ${formatPhp(item.unitCost)}` : ""}
        </span>
      ) : item.unitCost ? (
        <span className="shrink-0 font-mono text-[11px] text-text-secondary pt-0.5">
          {formatPhp(item.unitCost)}
        </span>
      ) : null}
      {particularLineAmount(item) > 0 ? (
        <span className="shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
          {formatPhp(particularLineAmount(item))}
        </span>
      ) : null}
    </div>
  );
}

export function PurposeParticularsView({
  purpose,
  items,
  displayPurpose,
}: PurposeParticularsViewProps) {
  const { sections, isMulti } = particularPurposeSections(items, purpose);
  const singlePurpose = (displayPurpose ?? purpose ?? "").trim();

  if (items.length === 0 && !singlePurpose) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg/50 p-4 text-center">
        <p className="text-xs italic text-text-secondary">
          No purpose or particulars recorded.
        </p>
      </div>
    );
  }

  if (!isMulti) {
    return (
      <div className="space-y-3">
        {singlePurpose ? (
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">
              Purpose
            </span>
            <div className="rounded-xl border border-border/70 bg-bg p-3.5 text-xs text-text leading-relaxed font-medium whitespace-pre-wrap">
              {singlePurpose}
            </div>
          </div>
        ) : null}
        {items.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">
              Particulars
            </span>
            {items.map((item, idx) => (
              <LineRow key={`${item.description}-${idx}`} item={item} index={idx} />
            ))}
            <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-text-secondary">
              <span>Overall total</span>
              <span className="font-mono font-bold text-text">
                {formatPhp(sumParticularAmounts(items))}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const lineStarts = sections.reduce<number[]>((starts, section, index) => {
    const previous = index === 0 ? 0 : starts[index - 1] + sections[index - 1].lines.length;
    starts.push(previous);
    return starts;
  }, []);

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.purpose} className="space-y-2">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 tracking-wider">
              Purpose
            </span>
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3 text-xs text-text leading-relaxed font-medium whitespace-pre-wrap">
              {section.purpose}
            </div>
          </div>
          {section.lines.map((item, lineIndex) => {
            const index = lineStarts[sectionIndex] + lineIndex;
            return (
              <LineRow
                key={`${section.purpose}-${index}`}
                item={item}
                index={index}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-text-secondary">
        <span>Overall total</span>
        <span className="font-mono font-bold text-text">
          {formatPhp(sumParticularAmounts(items))}
        </span>
      </div>
    </div>
  );
}
