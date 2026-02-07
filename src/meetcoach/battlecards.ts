export type BattlecardCategory = "objection" | "persona" | "security" | "next-step";

export type Battlecard = {
  key: string;
  category: BattlecardCategory;
  title: string;
  when_to_use: string;
  triggers: string[];
  primary: string;
  alt_1?: string;
  alt_2?: string;
  follow_up: string;
  proof_hook?: string[];
  dont_say?: string[];
  persona_tone?: string;
};

// Minimal battlecards library (CZ) for demo reliability.
// Source: user-provided library in chat.
export const BATTLECARDS: Battlecard[] = [
  {
    key: "price",
    category: "objection",
    title: "Cena / rozpočet",
    when_to_use: "Když CEO zpochybní cenu nebo řekne, že na to není rozpočet.",
    triggers: [
      "drahé",
      "předražené",
      "cena",
      "rozpočet",
      "budget",
      "nemáme budget",
      "na to nemáme",
      "je to moc peněz",
      "kolik to stojí",
      "rozpočtově nejde",
      "šetříme",
      "stop náklady",
    ],
    primary:
      "Chápu, u takové věci je fér chtít jasně vědět, co za to reálně dostanete. Pojďme to rychle přepnout na dopad: co je dnes nejdražší problém ve výkonu, přetížení nebo fluktuaci, který chcete mít pod kontrolou?",
    alt_1:
      "Jasně, cena sama o sobě nic neříká, dokud nevíme, proti čemu ji porovnáváme. Kdyby to mělo ušetřit čas manažerů nebo předejít odchodům, jak byste si to chtěl měřit?",
    alt_2:
      "Rozumím, nechci vás tlačit do ničeho naslepo. Pokud dává smysl, můžeme to ověřit malým pilotem na jednom týmu, ať máte tvrdá data pro rozhodnutí.",
    follow_up: "Co by pro vás bylo nejpřesvědčivější měřítko, že se to vyplatí?",
    proof_hook: [
      "• Neprodáváme „nástroj“, ale signály pro včasné řízení rizik v týmech.",
      "• Nejrychleji to obhájíte přes konkrétní dopad: čas lídrů, stabilita týmů, výkon.",
    ],
    dont_say: ["To se vám vrátí určitě.", "To je vlastně levné, když si to spočítáte."],
    persona_tone: "klidně, věcně, s jistotou",
  },
  {
    key: "roi",
    category: "objection",
    title: "ROI / dopad na byznys",
    when_to_use: "Když CEO chce důkaz dopadu, ne „HR aktivitu“.",
    triggers: [
      "roi",
      "návratnost",
      "jaký dopad",
      "byznys dopad",
      "business case",
      "k čemu mi to bude",
      "co z toho",
      "jak to pomůže výkonu",
      "jak to pomůže firmě",
      "jak to změřím",
    ],
    primary:
      "Dává smysl, bez dopadu to je jen další aktivita. Když se podíváte na poslední 3 měsíce, kde vás nejvíc bolel výkon nebo stabilita týmu?",
    alt_1:
      "ROI u tohohle typicky stojí na tom, že problémy vidíte dřív a řešíte je levněji. Který typ signálu je pro vás nejcennější: přetížení, tichá rezignace, nebo výkyvy výkonu?",
    alt_2:
      "Můžeme to vzít pragmaticky: pilot na jednom týmu a dopředu si dáme 2–3 metriky, které chcete sledovat. Co by tam pro vás mělo být?",
    follow_up: "Kde dnes platíte největší „skrytou daň“ za to, že tyhle věci nejsou vidět včas?",
    proof_hook: [
      "• Včasné signály = menší zásahy a méně eskalací.",
      "• CEO obvykle chce vidět trend a riziková místa, ne stovky komentářů.",
    ],
    dont_say: ["ROI vám garantuju.", "Všichni naši klienti mají skvělé ROI."],
    persona_tone: "stručně, analyticky, bez tlaku",
  },
  {
    key: "not_now",
    category: "objection",
    title: "Teď to neřešíme / není priorita",
    when_to_use: "Když CEO odkládá téma na neurčito.",
    triggers: [
      "teď ne",
      "neřešíme",
      "není priorita",
      "až později",
      "teď na to nemám",
      "teď to nechci",
      "momentálně ne",
      "teď máme jiné",
      "později",
      "v příštím kvartálu",
      "teď hoří jiné věci",
    ],
    primary:
      "Rozumím, nechci vám přidávat další projekt. Jen abych pochopil: odkládáte to, protože je to v pohodě, nebo protože je teď moc jiných věcí?",
    alt_1:
      "Jasně, timing je všechno. Co by se muselo stát, aby tohle téma pro vás vyskočilo do top 3 priorit?",
    alt_2:
      "Když to necháme být, co je nejhorší scénář, který se vám může v týmech tiše rozjet bez signálů?",
    follow_up:
      "Kdybychom to chtěli jen „ověřit“, jaký je nejbližší realistický termín pro krátký pilot nebo follow-up?",
    proof_hook: [
      "• Odklad často znamená jen chybějící jasný další krok, ne nezájem.",
      "• Nejnižší tření je domluvit malý ověřovací krok.",
    ],
    dont_say: ["To je chyba, to musíte řešit hned.", "Když to neuděláte teď, dopadnete špatně."],
    persona_tone: "respektující, klidně, partnersky",
  },
  {
    key: "send_email",
    category: "objection",
    title: "Pošlete to mailem",
    when_to_use: "Když CEO chce ukončit call nebo odsunout rozhodnutí bez závazku.",
    triggers: [
      "pošlete to mailem",
      "pošli mi to mailem",
      "poslete to emailem",
      "email",
      "pošlete podklady",
      "něco mi pošlete",
      "hoďte mi to do mailu",
      "napište mi to",
      "dej mi to do zprávy",
      "poslete prezentaci",
    ],
    primary:
      "Jasně, pošlu shrnutí. Jen aby to nebyl mail do šuplíku: co přesně v tom chcete mít, aby vám to pomohlo rozhodnout?",
    alt_1:
      "Pošlu to, ale největší hodnotu to má, když je to napojené na váš konkrétní problém. Co je ta jedna věc, kterou si z toho máte odnést vy jako CEO?",
    alt_2:
      "Můžu poslat i bezpečnostní a anonymizační podklady, pokud je to pro vás blok. Co je u vás nejcitlivější oblast?",
    follow_up:
      "Domluvíme si rovnou 15 minut v kalendáři na projití toho mailu, ať to má výstup?",
    proof_hook: [
      "• „Pošlete to mailem“ je často signál, že chybí jasný další krok.",
      "• Lepší je připojit krátký follow-up než poslat další PDF.",
    ],
    dont_say: ["Jasně, pošlu a ozvěte se.", "Tak já vám to pošlu a pak si zavoláme."],
    persona_tone: "lehce, konkrétně, bez dotlačování",
  },
  {
    key: "already_solution",
    category: "objection",
    title: "Už máme něco / už to řešíme",
    when_to_use: "Když CEO říká, že mají interní řešení, HR systém nebo průzkumy.",
    triggers: [
      "už máme",
      "už používáme",
      "máme nástroj",
      "máme systém",
      "máme průzkum",
      "děláme engagement",
      "řešíme to",
      "máme HR",
      "máme People",
      "už měříme",
      "máme dotazník",
    ],
    primary:
      "To je super, aspoň nemusíme přesvědčovat, že to má smysl. Co vám na tom současném řešení nejvíc chybí, když jde o včasné signály v týmech?",
    alt_1:
      "Jasně, nástroj mít je jedna věc, ale signály, které z toho dostanete, druhá. Kde dnes nejčastěji zjistíte problém až pozdě?",
    alt_2:
      "Pokud jste s tím spokojení, nemusí to být pro vás. V čem by se to muselo prokázat jako lepší, aby to stálo za změnu nebo doplnění?",
    follow_up: "Který typ signálu chcete mít dřív, než se z toho stane průšvih?",
    proof_hook: [
      "• Neútočit na jejich nástroj, ale na „mezery v signálech“.",
      "• Cíl je doplnit slepá místa, ne dělat revoluci.",
    ],
    dont_say: ["To vaše řešení je špatně.", "My jsme lepší než všichni ostatní."],
    persona_tone: "respektující, zvědavě, věcně",
  },
  {
    key: "gdpr",
    category: "security",
    title: "GDPR / právní riziko",
    when_to_use: "Když CEO nebo IT vytáhne GDPR, compliance, smlouvy.",
    triggers: [
      "gdpr",
      "compliance",
      "dpo",
      "právník",
      "právní",
      "smlouva",
      "zpracovatel",
      "správce",
      "osobní údaje",
      "citlivá data",
      "audit",
    ],
    primary:
      "Rozumím, tady je lepší být přísný než pozdě litovat. Co je u vás největší blok: zpracování dat, smluvní stránka, nebo bezpečnostní kontrola?",
    alt_1:
      "Můžeme to vzít standardně: role správce/zpracovatel, účel, doby uchování a přístupy. Kdo u vás tohle schvaluje, ať to řešíme rovnou s ním?",
    alt_2:
      "Nechci to řešit na pocit, pošlu vám stručný bezpečnostní a GDPR přehled. Chcete to spíš pro právníka, nebo pro IT?",
    follow_up: "Kdo je u vás DPO/právník, aby se to nezaseklo na přeposílání?",
    proof_hook: [
      "• GDPR blok se řeší rychleji s ownerem než přes přeposlané útržky.",
      "• Cíl: jasně vymezit data, účel, přístupy.",
    ],
    dont_say: ["GDPR je v pohodě, to se řešit nemusí.", "Tohle podepisují všichni."],
    persona_tone: "klidně, precizně, bez zlehčování",
  },
  {
    key: "anonymity",
    category: "security",
    title: "Anonymita – jde to dohledat na člověka?",
    when_to_use: "Když CEO řeší identifikovatelnost odpovědí.",
    triggers: [
      "anonym",
      "anonymní",
      "dohledat",
      "identifikovat",
      "kdo to napsal",
      "poznáte člověka",
      "sledování",
      "tracking",
      "ip adresa",
      "mail",
      "jméno",
    ],
    primary:
      "Anonymita je klíčová, jinak to celé nemá cenu. Jak přísně to u vás potřebujete nastavit – jde vám hlavně o to, aby to nešlo použít proti jednotlivci?",
    alt_1:
      "Dává smysl to nastavit tak, aby výstupy byly týmové a ne „na jména“. Kde je u vás hranice, pod kterou už by to bylo rizikové?",
    alt_2:
      "Nechci vás přesvědčovat slovy, radši vám pošlu přesný popis, co se ukládá a co ne. Kdo z vašeho IT nebo právníka to má posoudit?",
    follow_up: "Kdo je u vás owner tématu anonymita/GDPR, aby to mělo zelenou?",
    proof_hook: [
      "• Bez důvěry v anonymitu klesá upřímnost i návratnost.",
      "• Nejrychlejší je dát k tomu jasná pravidla a bezpečnostní popis.",
    ],
    dont_say: ["Je to anonymní, věřte mi.", "Tohle se nemusí řešit."],
    persona_tone: "věcně, bezpečnostně, bez mlžení",
  },
  {
    key: "decision_process",
    category: "objection",
    title: "Musím to probrat s… (HR/CFO/COO)",
    when_to_use: "Když CEO signalizuje stakeholdery a blok schválení.",
    triggers: ["musím probrat", "musím se poradit", "s HR", "s CFO", "s COO", "board", "schválení", "interně"],
    primary:
      "Jasně, je to rozumné. Kdo z nich bude nejvíc řešit co: byznys dopad, data/GDPR, nebo provozní zátěž?",
    alt_1:
      "Ať se to netočí dokola, pojďme si říct, co každý z nich potřebuje slyšet, aby dal zelenou. Kdo je největší skeptic?",
    alt_2:
      "Můžeme udělat krátký společný call, kde vyřešíme jejich otázky rovnou. Koho má smysl přizvat, aby to bylo rozhodnutelné?",
    follow_up: "Jaký je váš ideální další krok, aby to vedlo k rozhodnutí, ne jen k dalšímu kolečku?",
    proof_hook: [
      "• Mapuj role: CFO=ROI, HR=proces a přijetí, IT=bezpečnost.",
      "• Nejrychlejší je společný 20min slot se správnými lidmi.",
    ],
    dont_say: ["Tak jim to prostě přepošlete.", "Tohle je jen formalita."],
    persona_tone: "organizovaně, věcně",
  },
  {
    key: "pilot",
    category: "next-step",
    title: "Návrh pilotu (malý, bezpečný krok)",
    when_to_use: "Když je základní fit, ale CEO nechce závazek bez ověření.",
    triggers: ["pilot", "zkusit", "ověřit", "test", "trial", "zkušebně", "ověření", "bez rizika", "proof"],
    primary:
      "Dává smysl to nebrat na víru. Navrhuju krátký pilot na jednom týmu, a dopředu si řekneme, co přesně má pro vás prokázat.",
    alt_1:
      "Pilot vám dá realitu: návratnost, reakci lidí i to, jestli z toho vznikají akce. Který tým je nejlepší kandidát, aby to bylo reprezentativní?",
    alt_2:
      "Ať je to fér, nastavíme jasná kritéria „pokračujeme / končíme“. Jaké dvě věci musí pilot splnit, aby to mělo cenu rozšířit?",
    follow_up: "Který tým a jaké dvě metriky chcete v pilotu sledovat?",
    proof_hook: [
      "• Pilot snižuje vendor risk a dává interní argumenty.",
      "• Kritéria dopředu = žádná nekonečná diskuze.",
    ],
    dont_say: ["Když nedáte pilot, přijdete o šanci.", "Pilot je jen formalita."],
    persona_tone: "partnersky, klidně, orientace na jistotu",
  },
  {
    key: "persona_ceo_numbers",
    category: "persona",
    title: "Persona: CEO na čísla (ROI, výkon, efektivita)",
    when_to_use: "Když CEO mluví v metrikách, nákladech, výkonu a prioritách.",
    triggers: ["roi", "náklady", "efektivita", "produktivita", "výkon", "metriky", "kpi", "čísla", "rozpočet", "dopad"],
    primary:
      "Pojďme to držet v číslech a dopadu, ne v pocitech. Kde dnes ztrácíte nejvíc peněz nebo času kvůli tomu, že signály z týmů přijdou pozdě?",
    alt_1:
      "Nechci vám přidat náklad bez argumentu pro CFO. Jaké dvě metriky by pro vás byly „deal-breaker“, kdyby se nezlepšily?",
    alt_2:
      "Nejdřív si ujasněme, co má být výstup: rychlé varování, nebo dlouhodobý trend. Co je pro vás teď důležitější?",
    follow_up: "Jaká je vaše top metrika, kterou chcete tímhle chránit nebo zlepšit?",
    proof_hook: ["• Řeč CEO: riziko, náklady, výkon, čas lídrů.", "• Vždy přepnout na „co měříme v pilotu“."],
    dont_say: ["Je to hlavně o pocitech lidí.", "Tohle je moderní HR trend."],
    persona_tone: "stručně, analyticky, rozhodně",
  },
  {
    key: "persona_ceo_people",
    category: "persona",
    title: "Persona: CEO people-first (kultura, stabilita, leadership)",
    when_to_use: "Když CEO řeší atmosféru, lídry, důvěru, hodnoty.",
    triggers: ["kultura", "atmosféra", "lidi", "důvěra", "leadership", "manažeři", "stabilita", "hodnoty"],
    primary:
      "Chápu, že pro vás je důležitá stabilita a zdravé týmy, ne jen čísla. Kde dnes cítíte, že se vám to může začít lámat, ale nemáte jistotu?",
    alt_1:
      "Signály mají smysl jen tehdy, když z nich vznikne bezpečná akce, ne hon na viníka. Jaký styl práce s feedbackem je u vás nepřekročitelný?",
    alt_2:
      "Můžeme začít tam, kde je leadership silný, aby to lidé zažili jako pomoc. Který tým by byl nejlepší první příklad?",
    follow_up: "Co chcete, aby si z toho odnesli manažeři jako praktickou pomoc?",
    proof_hook: ["• People-first CEO chce „bezpečí + akci“, ne kontrolu.", "• Začít v týmu s dobrým leadershipem."],
    dont_say: ["Tohle je hlavně nástroj na kontrolu.", "Když se bojí, ať si zvyknou."],
    persona_tone: "empaticky, klidně, lidsky",
  },
  {
    key: "persona_ceo_skeptic",
    category: "persona",
    title: "Persona: CEO skeptik (nechci hype, chci důkaz)",
    when_to_use: "Když CEO zpochybňuje smysl, má alergii na HR/AI buzz.",
    triggers: ["nevěřím", "skeptický", "to zní hezky", "hype", "buzzwordy", "už jsem to slyšel", "marketing"],
    primary:
      "Respektuju to, hype nikomu nepomáhá. Pojďme to vzít na jednu konkrétní situaci z vašich týmů, kde by včasný signál ušetřil problém.",
    alt_1:
      "Jestli to nedá jasnou odpověď „co řešit a kde“, tak to nemá cenu. Kde dnes nejčastěji přijdete na problém až ve chvíli, kdy už stojí čas a nervy?",
    alt_2:
      "Nechci vás přesvědčovat řečmi, radši pilot s jasnými kritérii. Co by muselo být vidět, abyste řekl: dává to smysl?",
    follow_up: "Jaký je váš největší důvod, proč tohle typicky nefunguje, ať to rovnou otestujeme?",
    proof_hook: ["• Skeptik chce konkrétní příklad a jasná kritéria.", "• Pilot bez tlaku je nejrychlejší důkaz."],
    dont_say: ["Musíte mi věřit.", "Tohle je budoucnost, kdo to nemá, prohraje."],
    persona_tone: "věcně, bez hype, klidně",
  },
];

export const HOTKEYS_1_TO_9: string[] = [
  "price",
  "send_email",
  "not_now",
  "already_solution",
  "gdpr",
  "anonymity",
  "decision_process",
  "persona_ceo_numbers",
  "pilot",
];

// Search aliases -> card key (panic search).
export const PANIC_ALIASES: Record<string, string> = {
  cena: "price",
  drahe: "price",
  drahé: "price",
  rozpočet: "price",
  rozpocet: "price",
  budget: "price",
  náklady: "persona_ceo_numbers",
  naklady: "persona_ceo_numbers",
  roi: "roi",
  návratnost: "roi",
  navratnost: "roi",
  výkon: "roi",
  vykon: "roi",
  "teď ne": "not_now",
  "ted ne": "not_now",
  priorita: "not_now",
  později: "not_now",
  pozdeji: "not_now",
  mail: "send_email",
  email: "send_email",
  podklady: "send_email",
  prezentace: "send_email",
  "už máme": "already_solution",
  "uz mame": "already_solution",
  gdpr: "gdpr",
  anonymita: "anonymity",
  anonym: "anonymity",
  pilot: "pilot",
};

