/**
 * Paint opacity on a clip path is not part of the picture.
 * svg2pdf otherwise leaves that opacity on and fades the flag.
 */
export function stripClipPaintOpacity(svgText: string): string {
  return svgText.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/gi, (clip) =>
    clip.replace(/\s(?:fill-opacity|opacity|stroke-opacity)="[^"]*"/g, ""),
  );
}

/** Draw the 4×3 file across the finished flag, including the mirrored hem. */
export function stretchFlagArtwork(svgText: string): string {
  return svgText.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\spreserveAspectRatio="[^"]*"/g, "");
    return `<svg${cleaned} preserveAspectRatio="none">`;
  });
}

export type SvgViewBox = { x: number; y: number; width: number; height: number };

export function svgViewBox(svgText: string): SvgViewBox | null {
  const match = /<svg\b[^>]*\bviewBox="([^"]+)"/i.exec(svgText);
  if (!match) return null;
  const [x, y, width, height] = match[1].trim().split(/[\s,]+/).map(Number);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/**
 * Gradients, live opacity, masks and embedded images become RGB shadings
 * or soft masks in svg2pdf. Those flags are painted as one CMYK JPEG instead.
 * Opacity that only sits on a clip path is not part of the picture.
 */
export function flagNeedsRaster(svgText: string): boolean {
  const withoutClip = svgText.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/gi, "");
  return /<(?:linear|radial)Gradient\b|<mask\b|<filter\b|<image\b|<pattern\b/i.test(svgText)
    || /(?:fill-opacity|stroke-opacity|stop-opacity|(?:^|[\s/"'])opacity)=/i.test(withoutClip);
}

/**
 * Keep only `clip` of the picture, and flip it inside the viewBox first.
 * The clip is in viewBox units. The flip runs inside that clip.
 */
export function clipAndFlipSvg(
  svgText: string,
  clip: SvgViewBox,
  transform: string,
): string {
  const open = /<svg\b[^>]*>/i.exec(svgText);
  const close = svgText.lastIndexOf("</svg>");
  if (!open || close < 0) return svgText;
  const start = open.index + open[0].length;
  const rect = `x="${n(clip.x)}" y="${n(clip.y)}" width="${n(clip.width)}" height="${n(clip.height)}"`;
  const flip = transform ? `<g transform="${transform}">` : "";
  const flipClose = transform ? "</g>" : "";
  return `${svgText.slice(0, start)}<defs><clipPath id="print-hem"><rect ${rect}/></clipPath></defs><g clip-path="url(#print-hem)">${flip}${svgText.slice(start, close)}${flipClose}</g></svg>`;
}

function n(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

const maxUseExpansions = 5000;

/**
 * svg2pdf paints each reference as a PDF form and clips it to a box that
 * ignores rotation and the size of nested references. That cuts the shifted
 * United States stars and the turned Saba point. Copy the referenced shapes
 * into the tree so they are drawn with ordinary transforms.
 */
export function inlineSvgUses(svgText: string): string {
  if (!/<use\b/i.test(svgText)) return svgText;
  const nodes = parseNodes(svgText);
  const svg = nodes.find((node) => node.type === "element" && node.name.toLowerCase() === "svg");
  if (!svg || svg.type !== "element" || !findUse(svg)) return svgText;

  for (let step = 0; step < maxUseExpansions; step += 1) {
    const found = findUse(svg);
    if (!found) return serialize(nodes);
    const use = found.parent.children[found.index];
    if (use.type !== "element") break;
    const id = useTargetId(use);
    const source = id ? findById(svg, id) : null;
    if (!id || !source) {
      throw new Error(`The flag artwork references a missing part (${id ?? "unknown"}).`);
    }
    if (contains(source, use)) {
      found.parent.children.splice(found.index, 1);
      continue;
    }
    found.parent.children[found.index] = expandUse(use, source);
  }
  throw new Error("Could not expand the flag artwork.");
}

type XmlAttr = { name: string; value: string };
type XmlElement = { type: "element"; name: string; attrs: XmlAttr[]; children: XmlNode[] };
type XmlNode =
  | XmlElement
  | { type: "text"; value: string }
  | { type: "raw"; value: string };

function expandUse(use: XmlElement, source: XmlElement): XmlElement {
  const clone = cloneElement(source);
  stripIds(clone);
  const attrs = use.attrs
    .filter((item) => !["href", "xlink:href", "x", "y", "width", "height"].includes(item.name))
    .map((item) => ({ ...item }));
  const x = attr(use, "x");
  const y = attr(use, "y");
  if (!isZeroLength(x) || !isZeroLength(y)) {
    const translate = `translate(${(x ?? "0").trim()},${(y ?? "0").trim()})`;
    const transform = attrs.find((item) => item.name === "transform");
    if (transform) transform.value = `${transform.value} ${translate}`;
    else attrs.push({ name: "transform", value: translate });
  }
  return { type: "element", name: "g", attrs, children: [clone] };
}

function isZeroLength(value: string | undefined): boolean {
  if (value === undefined) return true;
  const parsed = Number(value.trim());
  return parsed === 0;
}

function useTargetId(use: XmlElement): string | null {
  const href = attr(use, "href") ?? attr(use, "xlink:href");
  if (!href) return null;
  const hash = href.lastIndexOf("#");
  if (hash < 0) return null;
  const id = href.slice(hash + 1).trim();
  return id || null;
}

function attr(element: XmlElement, name: string): string | undefined {
  return element.attrs.find((item) => item.name === name)?.value;
}

function findUse(element: XmlElement): { parent: XmlElement; index: number } | null {
  for (let index = 0; index < element.children.length; index += 1) {
    const child = element.children[index];
    if (child.type !== "element") continue;
    if (child.name.toLowerCase() === "use") return { parent: element, index };
    const nested = findUse(child);
    if (nested) return nested;
  }
  return null;
}

function findById(element: XmlElement, id: string): XmlElement | null {
  if (attr(element, "id") === id) return element;
  for (const child of element.children) {
    if (child.type !== "element") continue;
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

function contains(ancestor: XmlElement, target: XmlNode): boolean {
  for (const child of ancestor.children) {
    if (child === target) return true;
    if (child.type === "element" && contains(child, target)) return true;
  }
  return false;
}

function cloneElement(element: XmlElement): XmlElement {
  return {
    type: "element",
    name: element.name,
    attrs: element.attrs.map((item) => ({ ...item })),
    children: element.children.map((child) => (child.type === "element" ? cloneElement(child) : { ...child })),
  };
}

function stripIds(element: XmlElement): void {
  element.attrs = element.attrs.filter((item) => item.name !== "id");
  for (const child of element.children) {
    if (child.type === "element") stripIds(child);
  }
}

function parseNodes(source: string): XmlNode[] {
  const nodes: XmlNode[] = [];
  let index = 0;
  while (index < source.length) {
    const parsed = parseNode(source, index);
    nodes.push(parsed.node);
    index = parsed.next;
  }
  return nodes;
}

function parseNode(source: string, index: number): { node: XmlNode; next: number } {
  if (source.startsWith("<!--", index)) {
    const end = source.indexOf("-->", index + 4);
    if (end < 0) fail(source, index, "Unclosed SVG comment");
    return { node: { type: "raw", value: source.slice(index, end + 3) }, next: end + 3 };
  }
  if (source.startsWith("<?", index)) {
    const end = source.indexOf("?>", index + 2);
    if (end < 0) fail(source, index, "Unclosed SVG declaration");
    return { node: { type: "raw", value: source.slice(index, end + 2) }, next: end + 2 };
  }
  if (source.startsWith("<", index)) return parseElement(source, index);
  const next = source.indexOf("<", index);
  const end = next < 0 ? source.length : next;
  return { node: { type: "text", value: source.slice(index, end) }, next: end };
}

function parseElement(source: string, start: number): { node: XmlElement; next: number } {
  let index = start + 1;
  const nameEnd = index + source.slice(index).search(/[\s/>]/);
  if (nameEnd < index) fail(source, start, "Unclosed SVG tag");
  const name = source.slice(index, nameEnd);
  if (!name || name.startsWith("/")) fail(source, start, "Unexpected closing tag");
  const opened = parseAttributes(source, nameEnd);
  if (opened.selfClosing) {
    return { node: { type: "element", name, attrs: opened.attrs, children: [] }, next: opened.next };
  }
  const children: XmlNode[] = [];
  index = opened.next;
  while (index < source.length) {
    if (source.startsWith("</", index)) {
      const closed = parseClose(source, index);
      if (closed.name !== name) fail(source, index, `Expected </${name}>`);
      return { node: { type: "element", name, attrs: opened.attrs, children }, next: closed.next };
    }
    const child = parseNode(source, index);
    children.push(child.node);
    index = child.next;
  }
  fail(source, start, `Unclosed <${name}>`);
}

function parseAttributes(
  source: string,
  start: number,
): { attrs: XmlAttr[]; next: number; selfClosing: boolean } {
  const attrs: XmlAttr[] = [];
  let index = start;
  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (source.startsWith("/>", index)) return { attrs, next: index + 2, selfClosing: true };
    if (source[index] === ">") return { attrs, next: index + 1, selfClosing: false };
    const nameStart = index;
    while (index < source.length && !/[\s=/>]/.test(source[index])) index += 1;
    const name = source.slice(nameStart, index);
    if (!name) fail(source, index, "Expected an attribute");
    index = skipWhitespace(source, index);
    if (source[index] !== "=") {
      attrs.push({ name, value: "" });
      continue;
    }
    index = skipWhitespace(source, index + 1);
    const quote = source[index];
    if (quote !== '"' && quote !== "'") fail(source, index, `Expected a value for ${name}`);
    const end = source.indexOf(quote, index + 1);
    if (end < 0) fail(source, index, `Unclosed attribute ${name}`);
    attrs.push({ name, value: source.slice(index + 1, end) });
    index = end + 1;
  }
  fail(source, start, "Unclosed SVG tag");
}

function parseClose(source: string, start: number): { name: string; next: number } {
  let index = start + 2;
  const nameEnd = index + source.slice(index).search(/[\s>]/);
  if (nameEnd < index) fail(source, start, "Unclosed closing tag");
  const name = source.slice(index, nameEnd);
  index = skipWhitespace(source, nameEnd);
  if (source[index] !== ">") fail(source, start, "Unclosed closing tag");
  return { name, next: index + 1 };
}

function skipWhitespace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
}

function fail(source: string, index: number, message: string): never {
  const snippet = source.slice(Math.max(0, index - 24), index + 48).replace(/\s+/g, " ");
  throw new Error(`${message} near "${snippet}"`);
}

function serialize(nodes: XmlNode[]): string {
  return nodes.map(serializeNode).join("");
}

function serializeNode(node: XmlNode): string {
  if (node.type !== "element") return node.value;
  const attrs = node.attrs.map((item) => ` ${item.name}="${escapeAttr(item.value)}"`).join("");
  if (node.children.length === 0) return `<${node.name}${attrs}/>`;
  return `<${node.name}${attrs}>${node.children.map(serializeNode).join("")}</${node.name}>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
