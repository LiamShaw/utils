# Barry Callebaut interactive exhibit

[AUDIENCE: INTERNAL / TWIN]

The live page the CFO drives during the downside segment of the recorded pitch. One page, no internet needed, every figure computed from a single model.

## Open it

Double-click `index.html`, or from this folder run `python -m http.server` and open the address it prints. Works offline: no build step, no CDN, no server requirement.

## Assets

- `fonts/CalSansVF.woff2`: Cal Sans variable, the same typeface as the AntiBrain dashboard, embedded locally (SIL OFL 1.1, license text in `fonts/OFL.txt`).
- `img/cocoa-pod.png`: the cocoa pod mark, shown on the light chip in the top banner and used as the page favicon.

## Presenter path (CFO segment, about 3 minutes)

1. Top bar, **The Numbers**. The page jumps straight to the finance console.
2. **EBITDA bridge.** Hover the +250 bar: three earnings engines, no financial engineering.
3. **Deleveraging.** Click Year 1: the CHF 1.5B working capital release lands. Click Year 5: net debt at 1.1x.
4. **Stress console.** The slider sits at the combined shock case. Point at +CHF 180M free cash flow and the 31% covenant headroom. Slide to Plan case and back if time allows.
5. **Returns console.** At 8.5x (entry multiple, no re-rate) it reads 3.2x MOIC and 22.5% net IRR. Slide to 14.0x for the strategic case.
6. Continue to Risk, The Ask, the Verdict if the format wants more.

Recording tips: browser at 100% zoom, F11 fullscreen. The top bar links jump between sections. Every control is keyboard accessible (Tab, then arrow keys).

## Numbers

Every displayed figure comes from the `DEAL` object at the top of `app.js`. Change a number there and the whole page recomputes; there is no other place where a figure is typed twice.

Before recording, read `RECONCILIATION.md`. The deck text and several exhibit images currently disagree with each other on exit debt multiples, exit value, returns and the stress case. The page implements one specific choice per conflict, so the PDF and the script need the same alignment.
