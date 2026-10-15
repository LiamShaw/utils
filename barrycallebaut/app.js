"use strict";

/* ============================================================
   One deal model. Every number displayed on the page is
   computed from this object, so the page cannot contradict
   itself no matter what a viewer clicks.
   ============================================================ */
const DEAL = {
  entryEv: 6600,          // CHF millions
  entryMult: 8.5,
  entryEbitda: 775,
  entryNd: 3820,
  equityEntry: 2780,      // 6600 - 3820
  exitEbitda: 1200,
  exitNd: 1300,
  hold: 5,
  carry: 0.20,            // illustrative carry on gains
  bridge: [
    { label: "Plan base", value: 775, kind: "base",
      tip: "<strong>Plan base</strong>CHF 775M operating EBITDA entering the project" },
    { label: "BC Next Level", delta: 250, kind: "gain",
      tip: "<strong>BC Next Level</strong>+CHF 250M recurring annual cost takeout" },
    { label: "Gourmet mix", delta: 125, kind: "gain",
      tip: "<strong>Gourmet mix</strong>+CHF 125M from the shift into high-margin channels" },
    { label: "Throughput", delta: 50, kind: "gain",
      tip: "<strong>Throughput</strong>+CHF 50M from line efficiency and waste reduction" },
    { label: "Year 5 plan", total: 1200, kind: "total",
      tip: "<strong>Year-5 plan</strong>CHF 1,200M operating EBITDA at exit run-rate" }
  ],
  path: [
    { year: "Entry",  ebitda: 775,  nd: 3820, cash: null, note: "Net debt peaks at the cocoa peak" },
    { year: "Year 1", ebitda: 860,  nd: 2320, cash: 1500, note: "CHF 1.5B working capital release" },
    { year: "Year 2", ebitda: 950,  nd: 2050, cash: 270,  note: "CHF 270M free cash flow to debt" },
    { year: "Year 3", ebitda: 1050, nd: 1800, cash: 250,  note: "CHF 250M free cash flow to debt" },
    { year: "Year 4", ebitda: 1130, nd: 1550, cash: 250,  note: "CHF 250M free cash flow to debt" },
    { year: "Year 5", ebitda: 1200, nd: 1300, cash: 250,  note: "CHF 250M free cash flow to debt" }
  ],
  stress: {
    base:   { ebitda: 950, interest: 165, capex: 280, nd: 2050 },
    shock:  { ebitda: 650, interest: 210, capex: 140, nd: 2470 },
    other: 120,
    covenant: 5.5
  }
};

/* ------------------------------ formatting ------------------------------ */
const money = (v) => {
  if (Math.abs(v) >= 1000) {
    return "CHF " + (v / 1000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + "B";
  }
  return "CHF " + Math.round(v) + "M";
};
const billions = (v) => (v / 1000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + "B";
const mult = (v) => v.toFixed(1) + "x";
const pct = (v) => (v * 100).toFixed(1) + "%";
const leverage = (nd, ebitda) => nd / ebitda;

/* ------------------------------ tooltip ------------------------------ */
const tip = document.createElement("div");
tip.id = "chart-tip";
document.body.appendChild(tip);

function moveTip(ev) {
  const pad = 14;
  let x = ev.clientX + pad;
  let y = ev.clientY + pad;
  const r = tip.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 10) x = ev.clientX - r.width - pad;
  if (y + r.height > window.innerHeight - 10) y = ev.clientY - r.height - pad;
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}
function showTip(html, ev) {
  tip.innerHTML = html;
  tip.classList.add("on");
  moveTip(ev);
}
function hideTip() { tip.classList.remove("on"); }

/* ============================================================
   Topbar shadow + scroll reveal + counters
   ============================================================ */
const topbar = document.getElementById("topbar");
window.addEventListener("scroll", () => {
  topbar.classList.toggle("scrolled", window.scrollY > 8);
}, { passive: true });

const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const decimals = (String(target).split(".")[1] || "").length;
  const t0 = performance.now();
  const dur = 950;
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.querySelectorAll("[data-count]").forEach(animateCount);

/* ============================================================
   Module 1: EBITDA bridge waterfall
   ============================================================ */
(function bridge() {
  const svg = document.getElementById("bridge-svg");
  if (!svg) return;

  const W = 980, H = 420;
  const left = 46, right = 46;
  const top = 40, bottom = 96;
  const baseY = H - bottom;
  const plotH = baseY - top;
  const maxV = 1400;
  const y = (v) => baseY - (v / maxV) * plotH;

  const usable = W - left - right;
  const slot = usable / DEAL.bridge.length;
  const barW = Math.min(112, slot - 46);

  const parts = [];
  parts.push(`<text x="${left}" y="22" class="svg-label">CHF millions, plan case</text>`);

  [400, 800, 1200].forEach((g) => {
    parts.push(`<line x1="${left}" y1="${y(g)}" x2="${W - right}" y2="${y(g)}" stroke="#E6DFD3" stroke-dasharray="3 5"/>`);
    parts.push(`<text x="${left - 8}" y="${y(g) + 4}" text-anchor="end" class="svg-label">${g.toLocaleString("en-US")}</text>`);
  });

  let cumulative = 0;
  DEAL.bridge.forEach((b, i) => {
    const cx = left + slot * (i + 0.5);
    const x = cx - barW / 2;
    let yTop, yBot, fill, cls, label, labelClass;

    if (b.kind === "base") {
      yTop = y(b.value); yBot = baseY; fill = "#1B2A4A";
      cumulative = b.value; label = b.value.toLocaleString("en-US"); labelClass = "svg-value";
    } else if (b.kind === "gain") {
      const from = cumulative; cumulative += b.delta;
      yTop = y(cumulative); yBot = y(from); fill = "#15803D";
      label = "+" + b.delta; labelClass = "svg-value-inv svg-value";
    } else {
      yTop = y(b.total); yBot = baseY; fill = "#C5A059";
      label = b.total.toLocaleString("en-US"); labelClass = "svg-value";
    }

    const gainInside = b.kind === "gain" && (yBot - yTop) >= 34;
    const valueY = b.kind === "gain" ? (gainInside ? (yTop + yBot) / 2 + 5 : yTop - 12) : yTop - 12;
    const valueClass = b.kind === "gain" && !gainInside ? "svg-value" : labelClass;

    parts.push(
      `<g class="bar-group" data-tip="${b.tip.replace(/"/g, "&quot;")}">` +
      `<rect class="bar" style="--d:${i * 0.08}s" x="${x}" y="${yTop}" width="${barW}" height="${Math.max(yBot - yTop, 2)}" rx="7" fill="${fill}"/>` +
      `<text class="fade ${valueClass}" style="--d:${0.35 + i * 0.08}s" x="${cx}" y="${valueY}" text-anchor="middle">${label}</text>` +
      `<text class="fade svg-label" style="--d:${0.45 + i * 0.08}s" x="${cx}" y="${baseY + 26}" text-anchor="middle">${b.label}</text>` +
      `</g>`
    );

    if (i < DEAL.bridge.length - 1) {
      const level = b.kind === "base" ? b.value : (b.kind === "gain" ? cumulative : b.total);
      parts.push(`<line class="fade" style="--d:${0.3 + i * 0.08}s" x1="${cx + barW / 2}" y1="${y(level)}" x2="${cx + slot - barW / 2}" y2="${y(level)}" stroke="#B9AFA0" stroke-dasharray="4 4"/>`);
    }
  });

  parts.push(`<line x1="${left}" y1="${baseY}" x2="${W - right}" y2="${baseY}" stroke="#D9CFC0" stroke-width="1.5"/>`);
  svg.innerHTML = parts.join("");

  svg.querySelectorAll(".bar-group").forEach((grp) => {
    grp.addEventListener("mouseenter", (ev) => showTip(grp.dataset.tip, ev));
    grp.addEventListener("mousemove", moveTip);
    grp.addEventListener("mouseleave", hideTip);
  });

  const module = document.getElementById("module-bridge");
  new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { svg.classList.add("drawn"); obs.disconnect(); }
    });
  }, { threshold: 0.3 }).observe(module);
})();

/* ============================================================
   Module 2: deleveraging trajectory
   ============================================================ */
(function delever() {
  const svg = document.getElementById("delever-svg");
  if (!svg) return;

  const W = 980, H = 430;
  const left = 56, right = 64, top = 36, bottom = 84;
  const baseY = H - bottom;
  const plotH = baseY - top;
  const plotW = W - left - right;
  const ndMax = 4200, levMax = 6;
  const yNd = (v) => baseY - (v / ndMax) * plotH;
  const yLev = (v) => baseY - (v / levMax) * plotH;
  const slot = plotW / DEAL.path.length;
  const barW = 76;

  const parts = [];
  parts.push(`<text x="${left}" y="20" class="svg-label">Net debt (bars) and net debt to EBITDA (line)</text>`);

  [1000, 2000, 3000, 4000].forEach((g) => {
    parts.push(`<line x1="${left}" y1="${yNd(g)}" x2="${W - right}" y2="${yNd(g)}" stroke="#E6DFD3" stroke-dasharray="3 5"/>`);
    parts.push(`<text x="${left - 10}" y="${yNd(g) + 4}" text-anchor="end" class="svg-label">${billions(g)}</text>`);
  });
  [2, 4, 6].forEach((g) => {
    parts.push(`<text x="${W - right + 12}" y="${yLev(g) + 4}" class="svg-label">${g}x</text>`);
  });

  DEAL.path.forEach((p, i) => {
    const cx = left + slot * (i + 0.5);
    const lev = leverage(p.nd, p.ebitda);
    const fill = lev > 2.5 ? "#1B2A4A" : "#15803D";

    parts.push(`<g class="dv-seg" data-year="${i}">`);
    parts.push(`<rect class="dv-bar" x="${cx - barW / 2}" y="${yNd(p.nd)}" width="${barW}" height="${baseY - yNd(p.nd)}" rx="7" fill="${fill}"/>`);
    parts.push(`<text class="dv-ndlabel svg-value-inv svg-value" x="${cx}" y="${baseY - 16}" text-anchor="middle">${billions(p.nd)}</text>`);
    parts.push(`</g>`);
  });

  DEAL.path.forEach((p, i) => {
    if (i === 0) return;
    const cx = left + slot * (i + 0.5);
    const prev = DEAL.path[i - 1];
    parts.push(`<line class="dv-link" x1="${left + slot * (i - 0.5)}" y1="${yLev(leverage(prev.nd, prev.ebitda))}" x2="${cx}" y2="${yLev(leverage(p.nd, p.ebitda))}" stroke="#C5A059" stroke-width="3"/>`);
  });

  DEAL.path.forEach((p, i) => {
    const cx = left + slot * (i + 0.5);
    const lev = leverage(p.nd, p.ebitda);
    const ly = yLev(lev) - 16;
    parts.push(`<g class="dv-seg" data-year="${i}">`);
    parts.push(`<circle class="dv-point" cx="${cx}" cy="${yLev(lev)}" r="6" fill="#FFFFFF" stroke="#C5A059" stroke-width="3"/>`);
    parts.push(`<rect class="dv-pill" x="${cx - 22}" y="${ly - 15}" width="44" height="21" rx="10" fill="#FDFBF7" stroke="#E6DFD3"/>`);
    parts.push(`<text class="dv-levlabel svg-value" x="${cx}" y="${ly}" text-anchor="middle">${mult(lev)}</text>`);
    parts.push(`</g>`);
    parts.push(`<text class="svg-label" x="${cx}" y="${baseY + 26}" text-anchor="middle">${p.year}</text>`);
    parts.push(`<rect class="dv-hit" data-year="${i}" x="${left + slot * i}" y="${top}" width="${slot}" height="${plotH + 30}" fill="transparent"/>`);
  });

  parts.push(`<line x1="${left}" y1="${baseY}" x2="${W - right}" y2="${baseY}" stroke="#D9CFC0" stroke-width="1.5"/>`);
  svg.innerHTML = parts.join("");

  const segs = Array.from(svg.querySelectorAll(".dv-seg"));

  const yearBox = document.getElementById("delever-years");
  const yearBtns = DEAL.path.map((p, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = p.year;
    btn.addEventListener("click", () => select(i));
    yearBox.appendChild(btn);
    return btn;
  });

  const outYear = document.getElementById("delever-year");
  const outNd = document.getElementById("delever-nd");
  const outEbitda = document.getElementById("delever-ebitda");
  const outLev = document.getElementById("delever-lev");
  const outCash = document.getElementById("delever-fcf");
  const outCashLabel = document.getElementById("delever-cash-label");

  let selected = 1;
  let hovered = null;

  function render() {
    const active = hovered !== null ? hovered : selected;
    const p = DEAL.path[active];
    const lev = leverage(p.nd, p.ebitda);

    outYear.textContent = p.year === "Entry" ? "Entry (Year 0)" : p.year;
    outNd.textContent = money(p.nd);
    outEbitda.textContent = money(p.ebitda);
    outLev.textContent = mult(lev);
    outCashLabel.textContent = p.cash ? "Cash released" : "Position at entry";
    outCash.textContent = p.cash ? p.note : "Net debt peaks at CHF 3.82B at the cocoa peak";

    segs.forEach((el) => el.style.opacity = Number(el.dataset.year) === active ? "1" : "0.45");
    yearBtns.forEach((el, i) => el.classList.toggle("chip-active", i === selected));
  }

  svg.querySelectorAll(".dv-hit").forEach((el) => {
    const i = Number(el.dataset.year);
    el.addEventListener("mouseenter", () => { hovered = i; render(); });
    el.addEventListener("mouseleave", () => { hovered = null; render(); });
    el.addEventListener("click", () => select(i));
  });

  function select(i) { selected = i; hovered = null; render(); }

  render();
})();

/* ============================================================
   Module 3: downside stress console
   ============================================================ */
(function stress() {
  const range = document.getElementById("stress-range");
  if (!range) return;

  const s = DEAL.stress;
  const chips = Array.from(document.querySelectorAll("#stress-chips button"));
  const outEbitda = document.getElementById("stress-ebitda");
  const outInterest = document.getElementById("stress-interest");
  const outCapex = document.getElementById("stress-capex");
  const outFcf = document.getElementById("stress-fcf");
  const outLev = document.getElementById("stress-lev");
  const meter = document.getElementById("meter-fill");
  const read = document.getElementById("covenant-read");
  const note = document.getElementById("stress-note");

  function apply(value) {
    const t = value / 100;
    const ebitda = s.base.ebitda + (s.shock.ebitda - s.base.ebitda) * t;
    const interest = s.base.interest + (s.shock.interest - s.base.interest) * t;
    const capex = s.base.capex + (s.shock.capex - s.base.capex) * t;
    const nd = s.base.nd + (s.shock.nd - s.base.nd) * t;
    const fcf = ebitda - interest - capex - s.other;
    const lev = nd / ebitda;
    const headroom = 1 - lev / s.covenant;

    outEbitda.textContent = money(ebitda);
    outInterest.textContent = money(interest);
    outCapex.textContent = money(capex);
    outFcf.textContent = (fcf >= 0 ? "+" : "-") + money(Math.abs(fcf));
    outLev.textContent = mult(lev);
    read.textContent = Math.round(headroom * 100) + "% headroom to the 5.5x banking covenant at peak debt";

    const util = Math.min(lev / s.covenant, 1) * 100;
    meter.style.width = util.toFixed(1) + "%";
    meter.classList.toggle("warn", util >= 75 && util < 95);
    meter.classList.toggle("danger", util >= 95);

    chips.forEach((c) => c.classList.toggle("chip-active", Number(c.dataset.severity) === value));

    if (value === 0) note.textContent = "Plan case: the Year-2 operating anchors, a normal year for the structure.";
    else if (value === 100) note.textContent = "At 100%: the combined shock, volume down 5%, cocoa re-spike, rates up 200bps. The structure still generates cash.";
    else if (value === 125) note.textContent = "Deep stress: beyond the combined case, for paranoia only.";
    else note.textContent = "Severity at " + value + "% of the combined shock case.";
  }

  range.addEventListener("input", () => apply(Number(range.value)));
  chips.forEach((c) => c.addEventListener("click", () => {
    range.value = c.dataset.severity;
    apply(Number(c.dataset.severity));
  }));

  apply(Number(range.value));
})();

/* ============================================================
   Module 4: returns console
   ============================================================ */
(function returns() {
  const range = document.getElementById("exit-range");
  if (!range) return;

  const svg = document.getElementById("returns-svg");
  const W = 520, H = 300;
  const left = 46, right = 18, top = 28, bottom = 44;
  const xMin = 8.5, xMax = 14;
  const yMin = 2, yMax = 6;

  const x = (m) => left + ((m - xMin) / (xMax - xMin)) * (W - left - right);
  const y = (moic) => (H - bottom) - ((moic - yMin) / (yMax - yMin)) * (H - bottom - top);

  const moicAt = (m) => (DEAL.exitEbitda * m - DEAL.exitNd) / DEAL.equityEntry;
  const netOfCarry = (gross) => (1 - DEAL.carry) * (gross - 1) + 1;
  const netIrr = (gross) => Math.pow(netOfCarry(gross), 1 / DEAL.hold) - 1;

  const parts = [];
  parts.push(`<text x="${left}" y="18" class="svg-label">Gross MOIC by exit multiple</text>`);
  [2, 3, 4, 5, 6].forEach((g) => {
    parts.push(`<line x1="${left}" y1="${y(g)}" x2="${W - right}" y2="${y(g)}" stroke="#E6DFD3" stroke-dasharray="3 5"/>`);
    parts.push(`<text x="${left - 8}" y="${y(g) + 4}" text-anchor="end" class="svg-label">${g}x</text>`);
  });
  parts.push(`<line x1="${left}" y1="${y(3)}" x2="${W - right}" y2="${y(3)}" stroke="#B91C1C" stroke-opacity="0.45" stroke-dasharray="6 5"/>`);
  parts.push(`<text x="${W - right}" y="${y(3) - 6}" text-anchor="end" class="svg-label">3.0x level</text>`);

  const points = [];
  for (let m = xMin; m <= xMax + 1e-9; m += 0.25) {
    points.push(`${x(m).toFixed(1)},${y(moicAt(m)).toFixed(1)}`);
  }
  parts.push(`<polyline points="${points.join(" ")}" fill="none" stroke="#C5A059" stroke-width="3" stroke-linejoin="round"/>`);

  [[8.5, "3.2x"], [10.5, "4.1x"], [14, "5.6x"]].forEach(([m, lbl]) => {
    parts.push(`<circle cx="${x(m)}" cy="${y(moicAt(m))}" r="4" fill="#C5A059"/>`);
    parts.push(`<text data-static="${m}" x="${x(m)}" y="${y(moicAt(m)) - 10}" text-anchor="middle" class="svg-label">${lbl}</text>`);
  });

  parts.push(`<circle id="ret-marker" cx="${x(10.5)}" cy="${y(moicAt(10.5))}" r="7" fill="#2C1810" stroke="#C5A059" stroke-width="3"/>`);
  parts.push(`<text id="ret-marker-label" x="${x(10.5)}" y="${y(moicAt(10.5)) - 14}" text-anchor="middle" class="svg-value">4.1x</text>`);
  parts.push(`<text x="${W - right}" y="${H - 14}" text-anchor="end" class="svg-label">Exit multiple (x)</text>`);
  svg.innerHTML = parts.join("");

  const marker = document.getElementById("ret-marker");
  const markerLabel = document.getElementById("ret-marker-label");
  const chips = Array.from(document.querySelectorAll(".marker-row button"));

  const outEv = document.getElementById("ret-ev");
  const outEquity = document.getElementById("ret-equity");
  const outMoic = document.getElementById("ret-moic");
  const outIrr = document.getElementById("ret-irr");
  const note = document.getElementById("returns-note");

  function apply(m) {
    const ev = DEAL.exitEbitda * m;
    const equity = ev - DEAL.exitNd;
    const moic = equity / DEAL.equityEntry;
    const irr = netIrr(moic);

    outEv.textContent = money(ev);
    outEquity.textContent = money(equity);
    outMoic.textContent = mult(moic);
    outIrr.textContent = pct(irr);

    marker.setAttribute("cx", x(m));
    marker.setAttribute("cy", y(moic));
    markerLabel.setAttribute("x", x(m));
    markerLabel.setAttribute("y", y(moic) - 14);
    markerLabel.textContent = mult(moic);

    document.querySelectorAll("#returns-svg [data-static]").forEach((el) => {
      el.style.opacity = Math.abs(Number(el.dataset.static) - m) < 0.5 ? "0" : "1";
    });

    if (m === 8.5) note.textContent = "Entry multiple with no re-rate: 3.2x MOIC and 22.5% net IRR, all operational.";
    else if (m === 10.5) note.textContent = "The 10.5x target case: CHF 12.6B enterprise value, the valuation bridge headline.";
    else if (m === 14) note.textContent = "Strategic re-rate case: the top-quartile exit multiple underwritten for a trade sale.";
    else note.textContent = "Exit at " + m.toFixed(2) + "x: " + mult(moic) + " gross MOIC, " + pct(irr) + " net IRR.";

    chips.forEach((c) => c.classList.toggle("chip-active", Number(c.dataset.mult) === m));
  }

  range.addEventListener("input", () => apply(Number(range.value)));
  chips.forEach((c) => c.addEventListener("click", () => {
    range.value = c.dataset.mult;
    apply(Number(c.dataset.mult));
  }));

  apply(Number(range.value));
})();
