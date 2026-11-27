import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { format } from "date-fns";

// Pacifico, fetched from Google Fonts' own CDN — OFL-licensed, freely
// redistributable — and checked into public/fonts/ since a serverless
// function can't reach out to fetch it at request time. This is the one
// piece of real cursive on the certificate; everything else uses pdf-lib's
// built-in Helvetica, which needs no embedding at all. (Dancing Script's
// current variable-font build fails to parse in pdf-lib's bundled
// fontkit — a static-weight script font like this one doesn't hit that.)
const SIGNATURE_FONT_PATH = path.join(
  process.cwd(),
  "public/fonts/pacifico-signature.ttf",
);
const LOGO_PATH = path.join(process.cwd(), "public/tier1-logo-transparent.png");

const PAGE_WIDTH = 792; // 11in landscape letter at 72dpi
const PAGE_HEIGHT = 612; // 8.5in
// A warm cream/off-white, not pure white — matches the "creme off white"
// background asked for.
const BACKGROUND = rgb(0.973, 0.957, 0.914);
const INK = rgb(0.16, 0.13, 0.08);
const ACCENT = rgb(0.59, 0.33, 0.16); // a copper-ish brown, print-safe (no CSS vars here)

function centerX(width: number, textWidth: number) {
  return (width - textWidth) / 2;
}

export async function generateF90Certificate(params: {
  agentName: string;
  completionDate: Date;
  issuedAP: number;
  signatureName: string | null;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: BACKGROUND,
  });
  // A simple double-line border, inset from the edge, reads as a diploma
  // border without needing a separate decorative asset.
  const inset = 24;
  page.drawRectangle({
    x: inset,
    y: inset,
    width: PAGE_WIDTH - inset * 2,
    height: PAGE_HEIGHT - inset * 2,
    borderColor: ACCENT,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: inset + 10,
    y: inset + 10,
    width: PAGE_WIDTH - (inset + 10) * 2,
    height: PAGE_HEIGHT - (inset + 10) * 2,
    borderColor: ACCENT,
    borderWidth: 0.75,
  });

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const scriptBytes = fs.readFileSync(SIGNATURE_FONT_PATH);
  const scriptFont = await pdfDoc.embedFont(scriptBytes);

  const logoBytes = fs.readFileSync(LOGO_PATH);
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoWidth = 220;
  const logoHeight = logoWidth * (logoImage.height / logoImage.width);
  page.drawImage(logoImage, {
    x: centerX(PAGE_WIDTH, logoWidth),
    y: PAGE_HEIGHT - 95,
    width: logoWidth,
    height: logoHeight,
  });

  let y = PAGE_HEIGHT - 150;

  function line(
    text: string,
    size: number,
    font = helvetica,
    color = INK,
    gap = 0,
  ) {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX(PAGE_WIDTH, width),
      y,
      size,
      font,
      color,
    });
    y -= size + gap;
  }

  line("TIER 1 FINANCIAL F90 UNIVERSITY", 15, helveticaBold, ACCENT, 6);
  line("Certificate of Graduation", 26, helveticaBold, INK, 26);
  line("This certifies that", 13, helveticaOblique, INK, 24);
  line(params.agentName, 36, scriptFont, ACCENT, 16);
  line(
    "has successfully completed the Tier 1 Financial First 90 Days program,",
    12,
    helvetica,
    INK,
    4,
  );
  line(
    `issuing $${Math.round(params.issuedAP).toLocaleString()} in Annual Premium within their first 90 days.`,
    12,
    helvetica,
    INK,
    26,
  );
  line(format(params.completionDate, "MMMM d, yyyy"), 13, helvetica, INK, 0);

  // Signature line, bottom-right — a short cursive name (or the agency's
  // own name, if no owner name has been set) above a plain "Agency Owner"
  // caption, same layout a printed diploma uses.
  const sigY = 110;
  const sigText = params.signatureName?.trim() || "Tier 1 Financial";
  const sigSize = 26;
  const lineWidth = 220;
  const sigWidth = scriptFont.widthOfTextAtSize(sigText, sigSize);
  const lineX = PAGE_WIDTH - inset - 230;
  page.drawText(sigText, {
    x: lineX + centerX(lineWidth, sigWidth),
    y: sigY,
    size: sigSize,
    font: scriptFont,
    color: INK,
  });
  page.drawLine({
    start: { x: lineX, y: sigY - 6 },
    end: { x: lineX + lineWidth, y: sigY - 6 },
    thickness: 0.75,
    color: INK,
  });
  const captionWidth = helveticaOblique.widthOfTextAtSize("Agency Owner", 10);
  page.drawText("Agency Owner", {
    x: lineX + centerX(lineWidth, captionWidth),
    y: sigY - 20,
    size: 10,
    font: helveticaOblique,
    color: INK,
  });

  return pdfDoc.save();
}
