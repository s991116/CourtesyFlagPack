import { jsPDF } from "jspdf";
import fontDataUri from "../assets/fonts/SourceSansPro-Regular.ttf?inline";

/** Family name passed to jsPDF. The file keeps Adobe's reserved name. */
export const labelFontFamily = "SourceSans";

const labelFontFile = "SourceSansPro-Regular.ttf";
const labelFontBase64 = fontDataUri.slice(fontDataUri.indexOf(",") + 1);

/**
 * Embeds Source Sans Pro and selects it.
 * jsPDF's built-in Helvetica is a standard font with no font program, which
 * a print RIP rejects. WinAnsi keeps the label text as ordinary PDF strings
 * and stores the TrueType file in the document.
 */
export function registerLabelFont(doc: jsPDF): void {
  doc.addFileToVFS(labelFontFile, labelFontBase64);
  doc.addFont(labelFontFile, labelFontFamily, "normal", undefined, "WinAnsiEncoding");
  doc.setFont(labelFontFamily, "normal");
}
