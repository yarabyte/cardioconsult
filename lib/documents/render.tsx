import type { TipDoc, TipDocNode } from "./tiptap-types";

/**
 * Rendu React sûr — texte uniquement, jamais dangerouslySetInnerHTML.
 * Un `<script>` saisi devient du texte visible, non exécuté.
 */
export function StructuredDocView({ doc }: { doc: TipDoc }) {
  return (
    <div className="space-y-1.5 text-[13px] leading-snug">
      {doc.content.map((node, i) => (
        <NodeView key={i} node={node} />
      ))}
    </div>
  );
}

function NodeView({ node }: { node: TipDocNode }) {
  const text = (node.content ?? []).map((t) => t.text).join("");
  if (node.type === "heading") {
    const level = node.attrs.level;
    if (level === 1) {
      return <h1 className="mb-1 text-[15px] font-extrabold tracking-tight uppercase">{text}</h1>;
    }
    return (
      <h2 className="text-muted-foreground mt-2 text-[11px] font-extrabold tracking-[0.08em] uppercase first:mt-0">
        {text}
      </h2>
    );
  }
  return <p className="whitespace-pre-wrap">{text || "\u00a0"}</p>;
}
