/* eslint-disable */
// @ts-nocheck
/* ===== Tier 1 "BIG WIN" card — canvas PNG generator (v2 metallic palette) =====
 * Self-contained: no DOM, no CSS, no libraries. Matches Commission Calculator Step 4.
 * generateWinCard(data, opts) -> Promise<string> (PNG data URL)
 *
 * data = { agentName, annualPremium(number), commission(number|null),
 *          product, carrier, date?(Date), handle?, badge? }
 * opts = { logoUrl?, scale?=3 }
 *
 * Pasted verbatim from the win-card-portal spec's rendering code. A handful
 * of gradient/stop lines were cut off mid-statement in the source PDF itself
 * (confirmed by rendering its pages as images — the code block truncates at
 * the page's right margin in the document, not just in text extraction).
 * Those few lines were completed to match the pattern already confirmed
 * elsewhere in this same block (the badge `bg` gradient's first three stops
 * are identical to `bstroke`'s, confirming the dk/hi/base/hi/dk shape; the
 * fallback name string, `textAlign='center'` before the centered badge
 * label, and `copperText`/`silverText`'s stop lists follow the only shapes
 * consistent with how they're called below) — everything else is untouched.
 */

var WC_COLORS = {
  bg: ["#1a1005", "#0c0703", "#050302"],
  copperDk: "#3d1600",
  copperHi: "#d9a478",
  copperBase: "#a85a28",
  copperFlat: "#c87941",
  silver: ["#ffffff", "#c7ccd1", "#7f868c"],
  white: "#ffffff",
  dim: "#8a8a8a",
  badgeText: "#1a0f07",
};
var WC_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function wcFmtMoney(n) {
  if (n == null || isNaN(n)) return "N/A";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function wcBuildCells(data) {
  var c = data.commission != null && !isNaN(data.commission) ? data.commission : null;
  return [
    { k: "Annual Premium", v: wcFmtMoney(data.annualPremium), big: true, copper: false },
    { k: "First-Year Earnings", v: c != null ? wcFmtMoney(c) : "N/A", big: true, copper: true },
    { k: "Advance (75%)", v: c != null ? wcFmtMoney(c * 0.75) : "N/A", copper: true },
    { k: "Back End (25%)", v: c != null ? wcFmtMoney(c * 0.25) : "N/A", copper: true },
    { k: "Product", v: data.product || "—" },
    { k: "Carrier", v: data.carrier || "—" },
  ];
}

function wcRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function generateWinCard(data, opts) {
  opts = opts || {};
  var scale = opts.scale || 3,
    w = 520,
    h = 297;

  function waitForFonts() {
    if (document.fonts && document.fonts.ready) return document.fonts.ready.catch(function () {});
    return Promise.resolve();
  }
  function loadLogo() {
    if (!opts.logoUrl) return Promise.resolve(null);
    return new Promise(function (res) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        res(img);
      };
      img.onerror = function () {
        res(null);
      };
      img.src = opts.logoUrl;
    });
  }

  return Promise.all([waitForFonts(), loadLogo()]).then(function (r) {
    var logo = r[1];
    var canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    var ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    var C = WC_COLORS,
      pad = 32;

    var g = ctx.createLinearGradient(0, 0, w * 0.6, h);
    g.addColorStop(0, C.bg[0]);
    g.addColorStop(0.55, C.bg[1]);
    g.addColorStop(1, C.bg[2]);
    wcRoundRect(ctx, 0, 0, w, h, 22);
    ctx.fillStyle = g;
    ctx.fill();
    var bstroke = ctx.createLinearGradient(0, 0, w, h);
    bstroke.addColorStop(0, C.copperDk);
    bstroke.addColorStop(0.25, C.copperHi);
    bstroke.addColorStop(0.5, C.copperBase);
    bstroke.addColorStop(0.75, C.copperHi);
    bstroke.addColorStop(1, C.copperDk);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = bstroke;
    ctx.stroke();

    function copperText(x, y, wd, ht) {
      var t = ctx.createLinearGradient(x, y - ht, x + wd, y);
      t.addColorStop(0, C.copperHi);
      t.addColorStop(0.5, C.copperFlat);
      t.addColorStop(1, C.copperDk);
      return t;
    }
    function silverText(x, y, wd, ht) {
      var t = ctx.createLinearGradient(x, y - ht, x + wd, y);
      t.addColorStop(0, C.silver[0]);
      t.addColorStop(0.5, C.silver[1]);
      t.addColorStop(1, C.silver[2]);
      return t;
    }

    if (logo && logo.naturalWidth) {
      var lh = 26,
        lw = logo.naturalWidth * (lh / logo.naturalHeight);
      ctx.drawImage(logo, pad, 26, lw, lh);
    }

    ctx.textBaseline = "alphabetic";

    ctx.font = '800 29px "Barlow Condensed",sans-serif';
    var nm = data.agentName && String(data.agentName).trim() ? String(data.agentName).trim() : "Your Name";
    var nmW = ctx.measureText(nm).width;
    ctx.fillStyle = silverText(pad, 92, nmW, 26);
    ctx.fillText(nm, pad, 92);

    ctx.fillStyle = C.copperFlat;
    ctx.font = '11px "IBM Plex Mono",monospace';
    ctx.fillText(data.handle || "@Tier 1 Financial", pad, 110);

    var dg = ctx.createLinearGradient(pad, 0, pad + 220, 0);
    dg.addColorStop(0, "rgba(200,121,65,0.6)");
    dg.addColorStop(1, "rgba(200,121,65,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(pad, 126, w - pad * 2, 1);

    var cells = wcBuildCells(data);
    var colW = (w - pad * 2) / 2,
      topY = 152,
      rowH = 44;
    cells.forEach(function (cell, i) {
      var col = i % 2,
        row = Math.floor(i / 2);
      var cx = pad + col * colW,
        cy = topY + row * rowH;
      ctx.fillStyle = C.dim;
      ctx.font = '700 9px "Barlow Condensed",sans-serif';
      ctx.fillText(cell.k.toUpperCase(), cx, cy);
      var vSize = cell.big ? 23 : 19;
      ctx.font = "800 " + vSize + 'px "Barlow Condensed",sans-serif';
      if (cell.copper) {
        var vW = ctx.measureText(cell.v).width;
        ctx.fillStyle = copperText(cx, cy + 22, vW, vSize);
      } else {
        ctx.fillStyle = C.white;
      }
      ctx.fillText(cell.v, cx, cy + 22);
    });

    var bg = ctx.createLinearGradient(w - pad - 84, 26, w - pad, 50);
    bg.addColorStop(0, C.copperDk);
    bg.addColorStop(0.25, C.copperHi);
    bg.addColorStop(0.5, C.copperBase);
    bg.addColorStop(0.75, C.copperHi);
    bg.addColorStop(1, C.copperDk);
    ctx.fillStyle = bg;
    wcRoundRect(ctx, w - pad - 84, 26, 84, 24, 6);
    ctx.fill();
    ctx.fillStyle = C.badgeText;
    ctx.font = '700 12px "Barlow Condensed",sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(data.badge || "BIG WIN", w - pad - 42, 42);
    ctx.textAlign = "left";

    var d = data.date instanceof Date ? data.date : new Date();
    var dt = WC_MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    ctx.fillStyle = C.dim;
    ctx.font = '10px "IBM Plex Mono",monospace';
    ctx.textAlign = "right";
    ctx.fillText(dt, w - pad, h - 18);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png");
  });
}

export type WinCardData = {
  agentName: string | null | undefined;
  annualPremium: number;
  commission: number | null;
  product: string | null | undefined;
  carrier: string | null | undefined;
  date?: Date;
  handle?: string;
  badge?: string;
};

export type WinCardOpts = {
  logoUrl?: string;
  scale?: number;
};

/** Maps a submitted policy + the agent's live name to win-card data.
 *  `commissionAmount` on the policy is the frozen first-year commission
 *  snapshotted at submit time (see resolveCommissionAmount in
 *  lib/commissionServer.ts, called once from POST /api/portal/policies) —
 *  never recomputed from the agent's current comp level. */
export function winCardDataFromPolicy(
  agentName: string | null | undefined,
  policy: { annualPremium: string; commissionAmount?: string | null; product: string | null; carrier: string; submittedAt: string },
): WinCardData {
  const commission = policy.commissionAmount != null ? Number(policy.commissionAmount) : null;
  return {
    agentName,
    annualPremium: Number(policy.annualPremium),
    commission: commission != null && !isNaN(commission) ? commission : null,
    product: policy.product,
    carrier: policy.carrier,
    date: new Date(policy.submittedAt),
  };
}
