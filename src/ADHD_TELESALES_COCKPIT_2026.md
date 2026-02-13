🎯 Telesales Cockpit 2026 — Deep Research Synthesis

> Minimalist, frictionless, ADHD-ready internal cockpit for a small telesales team.

---

## 🔬 ZDROJE VÝZKUMU

- **NNGroup** — Dashboard design, pre-attentive processing, progressive disclosure, microinteractions
- **HubSpot** — Sales dashboard best practices, 5-second rule, KPI selection
- **Laws of UX** — 22 UX zákonů (Hick's, Fitts's, Flow, Miller's, Goal-Gradient, Von Restorff, Zeigarnik…)
- **Web Vitals** — Performance thresholds (<400ms Doherty Threshold)

---

## 🧠 KLÍČOVÉ PRINCIPY

### 1. "5-Second Rule" (HubSpot)

> Podívej se na dashboard, zavři oči — za 5 sekund musíš vědět co dělat.

**→ Co změnit:**

- Hlavní akce (ZAVOLAT) musí být okamžitě jasná = ✅ UŽ MÁME (big green button)
- Stats bar musí říkat "jdeš na to!" ne "tady je report" = ✅ UŽ MÁME (dark bar nahoře)
- **NOVÉ: Přidat "Next action" mikro-banner** — malý text pod kontaktem: "Zavolej a zeptej se na velikost týmu"

### 2. Hick's Law — Méně voleb = rychlejší rozhodování

> Čím více možností, tím déle trvá rozhodnutí.

**→ Co změnit:**

- Maximum 2 hlavní tlačítka v "action zone" (Call + Skip) = ✅ UŽ MÁME
- **NOVÉ: Skrýt Pipedrive button do "po hovoru" fáze** — při Ready phase jen 1 mega-akce = VOLAT
- Qualification otázky: max 3 = ✅ UŽ MÁME (přesně podle Miller's Law ±7, ale pro ADHD ještě méně)

### 3. Fitts's Law — Velké + blízké = rychlé kliknutí

> Čas na klik = vzdálenost/velikost cíle.

**→ Co změnit:**

- Call button je velký = ✅ UŽ MÁME (16px padding, 18px font)
- **NOVÉ: Call button by měl být JEŠTĚ větší — celá šířka levého sloupce, 56px výška**
- **NOVÉ: Input fieldy v qualification kartách — zvětšit touch target na min 44px**

### 4. Flow State (Csíkszentmihályi) — "The Zone"

> Plně ponořen v aktivitě = energetic focus + enjoyment.

**→ Co změnit:**

- **NOVÉ: "Streak counter"** — 🔥 3 hovory v řadě! Vizuální dopamine hit.
- **NOVÉ: Micro-celebration** při completed qualification (konfety/animace na vyplnění všech 3 polí)
- **NOVÉ: Odstranit vše co ruší flow:** žádné pop-upy, žádné modaly, inline feedback only

### 5. Goal-Gradient Effect — Čím blíže cíli, tím rychleji

> Motivace roste s blížícím se cílem.

**→ Co změnit:**

- Progress bar = ✅ UŽ MÁME
- **NOVÉ: Micro-milestones** — "Ještě 3 hovory do 50!" s emoji celebration
- **NOVÉ: Progress bar by měl mít "waypoints"** — malé tečky na 25%, 50%, 75%

### 6. Von Restorff Effect — Co je jiné, to si pamatujeme

> Izolovaný/odlišný prvek je zapamatovatelný.

**→ Co změnit:**

- High priority kontakty mají 🔥 = ✅ UŽ MÁME
- **NOVÉ: "Hot lead" kontakty dostanou pulsující okraj** + zvláštní barvu pozadí (ne jen emoji)
- **NOVÉ: Spojeno/Schůzka čísla — animovaný bump** když se změní (+1 efekt)

### 7. Zeigarnik Effect — Nedokončené úkoly = lepší zapamatování

> Lidé si pamatují nedokončené úlohy lépe než dokončené.

**→ Co změnit:**

- **NOVÉ: "Otevřené" qualification karty vizuálně signalizují "dokonči mě"** — prázdné pole = subtle pulsing border
- **NOVÉ: Karta změní stav z "waiting" → "filled" s smooth animací** (ne jen border color)

### 8. Progressive Disclosure (NNGroup)

> Ukaž nejdřív jen minimum. Pokročilé až na vyžádání.

**→ Co změnit:**

- Opening script collapse = ✅ UŽ MÁME
- **NOVÉ: Qualification cards — lazy reveal** — ukázat otázku 2 až po odpovědi na otázku 1?
  - **POZOR**: Pro telesales NE — musím vidět všechny najednou protože hovor je neprediktabilní
  - → Lepší: **Visual hierarchy** — aktuální otázka zvýrazněná, ostatní ztišené (opacity 0.7)

### 9. Microinteractions (NNGroup)

> trigger-feedback páry = engagement + system status + brand

**→ Co změnit:**

- **NOVÉ: Hover na Call button = scale(1.02) + shadow grow**
- **NOVÉ: Klik na Call = button "sinks" + ripple efekt**
- **NOVÉ: Vyplnění qualification answer = checkmark slide-in + green flash**
- **NOVÉ: Save to Pipedrive = progress dot animation → check → fade**

### 10. Pre-attentive Processing (NNGroup)

> Mozek zpracuje délku, pozici, barvu, tvar BEZ vědomé pozornosti.

**→ Co změnit:**

- Stats bar = počty = ✅ UŽ MÁME
- **NOVÉ: Nahradit čísla mini liniovými sparkline grafy** pro trend (call velocity)
- **NOVÉ: Color-coding konzistentní:** zelená=spojeno/dobrý, žlutá=warning, červená=pozor
- **NOVÉ: Nikdy nepoužívat pie-charts nebo gauge meters** (špatný pre-attentive signál)

---

## 🎨 ADHD-SPECIFIC DESIGN RULES

### A) Redukce kognitivní zátěže

1. **Jeden vizuální fokus** — v každém okamžiku jen 1 věc "křičí"
2. **Žádné blikání, auto-play, nebo neočekávané pohyby** — animace jen jako reakce na akci
3. **Konzistentní layout** — brain nemusí "hledat" kam se díváme
4. **Breathing room** — generózní padding, nikdy ne cramped
5. **Tichý default, hlasitý intent** — neutrální barvy + 1 akcent (zelený Call button)

### B) Dopamine-friendly prvky (ale ne rušivé)

1. **Streak counter** s ohněm — "3🔥" malý, v stats baru
2. **Micro-rewards** — completed card = tiny confetti burst (1x, ne opakovaně)
3. **Sound optional** — click/complete zvuky, ale OFF by default (ADHD-sensitive to noise)
4. **Progress je VŽDY viditelný** — nikdy neschovávat progress bar

### C) Anti-distraction patterns

1. **Žádné notifikace** během hovoru
2. **Simplified color palette** — max 3 barvy + neutráls
3. **Monospace čísla** (tabular nums) — čísla se nehýbou = ✅ UŽ MÁME (tnum)
4. **No sidebar, no menu** — cockpit je fullscreen single-purpose

---

## 📐 DOPORUČENÁ ARCHITEKTURA (v2)

```
┌────────────────────────────────────────────────────────┐
│  STATS BAR: 📞12  ✅4 spojeno  ⭐1 schůzka  ⏱8:42   │
│  ████████████░░░░░░░░░░░░  8/25 kontaktů  🔥3 streak │
├──────────────────────────┬─────────────────────────────┤
│  KONTAKT                 │  📖 OPENING (collapsible)   │
│  ┌──────────────────┐    │  "Dobrý den, tady Josef..." │
│  │ 🔥 Jan Novák     │    │                             │
│  │ CEO · Firma s.r.o│    ├─────────────────────────────┤
│  │ +420 777 888 999 │    │  KVALIFIKACE                │
│  └──────────────────┘    │                             │
│                          │  ① Velikost?                │
│  ┌──────────────────┐    │  [_________________]  ✓     │
│  │                  │    │                             │
│  │   📞 ZAVOLAT     │    │  ② Nálada?                  │
│  │     [C]          │    │  [_________________]        │
│  │                  │    │                             │
│  └──────────────────┘    │  ③ Rozhodovatel?            │
│  ─ Přeskočit [→] ───     │  [_________________]        │
│                          │                             │
│  📋 Poznámky             │                             │
│  [___________________]   │                             │
│  [📌 Pipedrive]          │                             │
├──────────────────────────┴─────────────────────────────┤
│  ⌨️ [C] zavolat  · [→] přeskočit · [Tab] další pole   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 KONKRÉTNÍ AKCE (priority order)

### P0 — Okamžitě (mají největší impact)

| #   | Co                                           | Proč                      | Effort |
| --- | -------------------------------------------- | ------------------------- | ------ |
| 1   | **Zvětšit Call button** na full-width + 56px | Fitts's Law, ADHD focus   | 5 min  |
| 2   | **Streak counter** v stats baru              | Flow state, dopamine      | 30 min |
| 3   | **Micro-animation na +1** ve stats           | Von Restorff, engagement  | 20 min |
| 4   | **Hover/active micro-interactions na Call**  | NNGroup microinteractions | 10 min |
| 5   | **Green check slide-in** na filled inputs    | Zeigarnik resolution      | 15 min |

### P1 — Brzy (solidní improvement)

| #   | Co                                           | Proč                      | Effort |
| --- | -------------------------------------------- | ------------------------- | ------ |
| 6   | Hot lead pulsing border                      | Von Restorff pro priority | 15 min |
| 7   | Progress bar waypoints (25/50/75%)           | Goal-gradient             | 20 min |
| 8   | Input touch targets → 44px min               | Fitts's + mobile ready    | 10 min |
| 9   | Visual hierarchy na kartách (active dimming) | ADHD focus management     | 20 min |
| 10  | Milestones celebrations ("50 calls! 🎉")     | Goal-gradient + dopamine  | 30 min |

### P2 — Nice to have

| #   | Co                                   | Proč                     | Effort |
| --- | ------------------------------------ | ------------------------ | ------ |
| 11  | Mini sparklines v stats baru         | Pre-attentive processing | 45 min |
| 12  | Keyboard shortcut hints jako overlay | Discoverability          | 20 min |
| 13  | "Next action" mikro-banner           | 5-second rule            | 10 min |
| 14  | Sound effects (optional toggle)      | Multi-sensory feedback   | 30 min |
| 15  | Dark mode / light mode toggle        | Preference, eye strain   | 45 min |

---

## 📝 SHRNUTÍ PRO IMPLEMENTACI

**Filosifie:** Cockpit, ne dashboard. Pilot nepotřebuje grafy — potřebuje vědět co TEĎKA udělat.

**3 pravidla:**

1. **One screen, one action** — nikdy nepotřebuju scrollovat
2. **Zero-wait feedback** — <200ms na každý klik (Doherty Threshold)
3. **Dopamine loop** — call → qualify → save → next → streak! → repeat

**Anti-patterns (NEDĚLÁME):**

- ❌ Žádné pie-charty
- ❌ Žádné gauge meters
- ❌ Žádné modaly/pop-upy
- ❌ Žádné auto-refreshing čísla (jen po akci)
- ❌ Žádné nested navigace
- ❌ Žádné loading spinnery delší než 300ms (optimistic UI)
