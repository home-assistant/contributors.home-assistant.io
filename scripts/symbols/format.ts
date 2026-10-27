// Formats signatures for the cards on code symbols: on one line when it
// fits, otherwise one parameter per line, and a parameter that is still too
// long breaks inside its last brackets, one level deeper, until it fits or
// cannot break anymore. Python the way Ruff does it (extract.py has the
// same for the code of core), TypeScript the way Prettier does it with the
// settings of the frontend.

// The card is narrow: lines of about this many characters fit.
export const LINE_LENGTH = 60;

export type Language = "python" | "typescript";

type Pairs = Record<string, string>;

interface Style {
  step: string;
  pairs: Pairs;
  itemEnd: (opening: string, isLast: boolean) => string;
}

const STYLES: Record<Language, Style> = {
  // Ruff: four spaces, and a comma after every item, the last one too.
  python: { step: "    ", pairs: { "(": ")", "[": "]", "{": "}" }, itemEnd: () => "," },
  // Prettier with `trailingComma: "es5"`: two spaces, no comma after the
  // last parameter or type argument, and a `;` after every member of an
  // object type.
  typescript: {
    step: "  ",
    pairs: { "(": ")", "[": "]", "{": "}", "<": ">" },
    itemEnd: (opening, isLast) => (opening === "{" ? ";" : isLast ? "" : ","),
  },
};

// The brackets in the text, without the `>` of an arrow, `=>`.
function bracketAt(text: string, index: number, pairs: Pairs) {
  const character = text[index];
  if (character === ">" && text[index - 1] === "=") {
    return undefined;
  }
  if (pairs[character]) {
    return "open";
  }
  return Object.values(pairs).includes(character) ? "close" : undefined;
}

// Splits text at the separators that are not inside brackets: commas, and
// in an object type, semicolons.
function splitTopLevel(text: string, pairs: Pairs, separators: string[]) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let index = 0; index < text.length; index += 1) {
    const bracket = bracketAt(text, index, pairs);
    depth += bracket === "open" ? 1 : bracket === "close" ? -1 : 0;
    if (depth === 0 && separators.includes(text[index])) {
      parts.push(current.trim());
      current = "";
    } else {
      current += text[index];
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

// Where the last pair of brackets at the top level opens and closes.
function lastBrackets(text: string, pairs: Pairs) {
  let depth = 0;
  let opened: number | undefined;
  let found: [number, number] | undefined;
  for (let index = 0; index < text.length; index += 1) {
    const bracket = bracketAt(text, index, pairs);
    if (bracket === "open") {
      if (depth === 0) {
        opened = index;
      }
      depth += 1;
    } else if (bracket === "close") {
      depth -= 1;
      if (depth === 0 && opened !== undefined) {
        found = [opened, index];
      }
    }
  }
  return found;
}

// The lines of one part, like a parameter, at an indent, followed by
// `suffix`.
export function formatPart(text: string, indent: string, suffix: string, language: Language): string[] {
  const style = STYLES[language];
  const line = `${indent}${text}${suffix}`;
  const brackets = lastBrackets(text, style.pairs);
  if (line.length <= LINE_LENGTH || !brackets) {
    return [line];
  }

  const [opened, closed] = brackets;
  const opening = text[opened];
  const head = text.slice(0, opened + 1);
  const inner = text.slice(opened + 1, closed).trim();
  const tail = text.slice(closed);
  const deeper = indent + style.step;
  if (!inner) {
    return [line];
  }

  // An object type always puts its members on lines of their own.
  let body: string[];
  if (opening !== "{" && `${deeper}${inner}`.length <= LINE_LENGTH) {
    body = [`${deeper}${inner}`];
  } else {
    const items = splitTopLevel(inner, style.pairs, opening === "{" ? [";", ","] : [","]);
    body = items.flatMap((item, index) => formatPart(item, deeper, style.itemEnd(opening, index === items.length - 1), language));
  }

  return [`${indent}${head.trimEnd()}`, ...body, `${indent}${tail}${suffix}`];
}

// `head(parameters)tail` on one line, or one parameter per line.
export function formatCall(head: string, parts: string[], tail: string, language: Language) {
  const line = `${head}(${parts.join(", ")})${tail}`;
  if (line.length <= LINE_LENGTH) {
    return line;
  }

  // No parameters to put on lines of their own: break the return type.
  if (parts.length === 0) {
    return formatPart(line, "", "", language).join("\n");
  }

  const { step, itemEnd } = STYLES[language];
  const lines = parts.flatMap((part, index) => formatPart(part, step, itemEnd("(", index === parts.length - 1), language));
  // A long return type breaks too, like `) -> Callable[...]:`.
  return [`${head}(`, ...lines, ...formatPart(`)${tail}`, "", "", language)].join("\n");
}
