/**
 * Objection Battle Cards – Data Model & Seed Dataset
 *
 * Each card represents a common sales objection with a structured response framework.
 * To add a new card: append to OBJECTION_CARDS array following the ObjectionCard type.
 */

export type ObjectionCategory =
  | 'emotional_fear'
  | 'authority_politics'
  | 'financial_roi'
  | 'data_privacy_trust'
  | 'status_quo'
  | 'adoption_engagement'
  | 'value_skepticism'
  | 'timing'
  | 'implementation_tech';

export interface ObjectionCard {
  id: string;
  /** Sort order — lower = more common objection, shown first */
  order: number;
  category: ObjectionCategory;
  title: string;
  whatProspectSays: string;
  whatTheyMean: string;
  commonMistake: string;
  /** Array of 3–6 spoken sentences — the actual talk track */
  functionalResponse: string[];
  conversationDirection: string;
}

export const CATEGORY_LABELS: Record<ObjectionCategory, { label: string; emoji: string; color: string }> = {
  emotional_fear:       { label: 'Emoce / Strach',       emoji: '😨', color: '#ef4444' },
  authority_politics:   { label: 'Autorita / Politika',  emoji: '🏛️', color: '#8b5cf6' },
  financial_roi:        { label: 'Finance / ROI',        emoji: '💰', color: '#f59e0b' },
  data_privacy_trust:   { label: 'Data / Důvěra',       emoji: '🔒', color: '#06b6d4' },
  status_quo:           { label: 'Status quo',           emoji: '🪨', color: '#6b7280' },
  adoption_engagement:  { label: 'Adopce / Engagement',  emoji: '📊', color: '#10b981' },
  value_skepticism:     { label: 'Hodnota / Skepse',     emoji: '🤔', color: '#ec4899' },
  timing:               { label: 'Timing',               emoji: '⏰', color: '#f97316' },
  implementation_tech:  { label: 'Implementace / Tech',  emoji: '⚙️', color: '#3b82f6' },
};

export const OBJECTION_CARDS: ObjectionCard[] = [
  {
    id: 'pandora',
    order: 1,
    category: 'emotional_fear',
    title: 'Nechci otevřít Pandořinu skříňku',
    whatProspectSays: 'Nechci, aby se to zvrhlo v lavinu problémů.',
    whatTheyMean:
      'Když se lidé rozmluví, budu to muset řešit. A možná na to teď nemám kapacitu.',
    commonMistake:
      'Obchodník strach zlehčí nebo moralizuje („to je přece dobře" / „aspoň budete vědět") a tím klienta zatlačí do obrany.',
    functionalResponse: [
      'Tohle je velmi reálná obava. Spousta lídrů se bojí, že když se zeptají, otevřou víc, než unesou.',
      'Ve skutečnosti se ty věci už dějí. Rozdíl je jen v tom, jestli o nich víte včas.',
      'Když se o problému dozvíte až ve chvíli, kdy někdo odchází, je to vždycky dražší.',
      'Echo Pulse vám nedává víc práce. Dává vám prioritu, co má smysl řešit.',
    ],
    conversationDirection:
      'Ukázat, že data znamenají kontrolu, ne chaos. Navést na pilot / omezený scope.',
  },
  {
    id: 'manager-problem',
    order: 2,
    category: 'authority_politics',
    title: 'Co když to ukáže, že problém je u manažerů?',
    whatProspectSays: 'A co když se ukáže, že problém je ve vedení?',
    whatTheyMean:
      'Bojím se konfliktu a destabilizace manažerského týmu.',
    commonMistake:
      'Obchodník začne manažery bránit nebo naopak bagatelizuje téma („to se nestává", „vezmou to sportovně") a zlehčí politickou realitu firmy.',
    functionalResponse: [
      'Tohle je časté. A právě proto jsou ta data tak cenná.',
      'Nejde o hledání viníků. Jde o vzorce a trendy v týmech.',
      'Bez dat se problémy kolem vedení řeší šeptem, emocemi a politikou.',
      'Data dávají manažerům možnost reagovat dřív, než je pozdě.',
    ],
    conversationDirection:
      'Přerámovat na systémové zlepšování, ne osobní útok.',
  },
  {
    id: 'small-company',
    order: 3,
    category: 'status_quo',
    title: 'Jsme malá firma, tohle je spíš pro korporace',
    whatProspectSays: 'My jsme malí, tohle dává smysl spíš pro velké firmy.',
    whatTheyMean:
      'Nechci zbytečný proces a nechci se cítit jako malý klient.',
    commonMistake:
      'Obchodník se začne obhajovat („máme i malé klienty", „velikost nehraje roli") a ztratí šanci otočit rámec.',
    functionalResponse: [
      'Právě menší firmy na to nejvíc doplácejí.',
      'Když vám odejde jeden klíčový člověk, cítí to celá firma.',
      'U menších týmů má včasný signál násobně větší dopad.',
      'O to víc dává smysl začít malým pilotem.',
    ],
    conversationDirection:
      'Otočit „jsme malí" na důvod začít dřív. Navrhnout pilot.',
  },
  {
    id: 'hr-not-business',
    order: 4,
    category: 'value_skepticism',
    title: 'Tohle je spíš HR věc, ne byznys priorita',
    whatProspectSays: 'Tohle by si měla řešit HR, ne?',
    whatTheyMean: 'Tohle není něco, co mi přímo vydělá peníze.',
    commonMistake:
      'Obchodník začne mluvit v HR terminologii („engagement") a CEO tím ještě víc odpojí.',
    functionalResponse: [
      'Souhlasím, že to není HR nástroj v klasickém smyslu.',
      'Je to nástroj pro řízení výkonu, kapacity a rizik.',
      'Výkon padá vždycky dřív, než si toho někdo všimne v číslech.',
      'Echo Pulse funguje jako včasný varovný systém pro byznys.',
    ],
    conversationDirection:
      'Posunout debatu z HR do řízení firmy a rizik.',
  },
  {
    id: 'honesty',
    order: 5,
    category: 'data_privacy_trust',
    title: 'Co když lidé nebudou upřímní?',
    whatProspectSays: 'A co když nám neřeknou pravdu?',
    whatTheyMean: 'Dostanu zkreslená data a bude to k ničemu.',
    commonMistake:
      'Obchodník argumentuje statistikami nebo sliby a neřeší jádro.',
    functionalResponse: [
      'Lidé nejsou upřímní, když se bojí následků.',
      'Anonymita a krátký formát zásadně mění chování.',
      'Bez bezpečného kanálu dostáváte jen oficiální verzi reality.',
      'Tady získáte signály, které se jinak nikdy neřeknou.',
    ],
    conversationDirection:
      'Vysvětlit systémové chování a ukotvit anonymitu.',
  },
  {
    id: 'another-dashboard',
    order: 6,
    category: 'adoption_engagement',
    title: 'Nechci další dashboard, na který se nebude nikdo dívat',
    whatProspectSays: 'Nechci další nástroj, co zapadne.',
    whatTheyMean: 'Už teď máme moc dat a málo pozornosti.',
    commonMistake:
      'Obchodník začne ukazovat grafy a funkce, čímž obavu potvrzuje.',
    functionalResponse: [
      'Tohle je přesně problém dnešních nástrojů.',
      'Proto Echo Pulse není dashboard, ale rozhodovací signál.',
      'Neukazuje všechno. Ukazuje, kde má smysl zbystřit.',
      'Šetří pozornost vedení.',
    ],
    conversationDirection:
      'Zdůraznit, že Echo Pulse ubírá šum a šetří pozornost.',
  },
  {
    id: 'timing',
    order: 7,
    category: 'timing',
    title: 'Teď není správný timing',
    whatProspectSays: 'Teď na to nemáme prostor.',
    whatTheyMean: 'Nejsem si jistý, raději to odložím.',
    commonMistake:
      'Obchodník tlačí na uzavření („teď je ideální doba") a zvyšuje odpor.',
    functionalResponse: [
      'Chápu, že toho máte teď hodně.',
      'Právě v obdobích změn se tyhle věci nejčastěji lámou.',
      'Co by se muselo stát, abyste si za tři měsíce řekl, že bylo škoda to nemít dřív?',
    ],
    conversationDirection:
      'Posunout k malému bezpečnému kroku (pilot, časově ohraničené ověření).',
  },
  {
    id: 'price-budget',
    order: 8,
    category: 'financial_roi',
    title: 'Je to drahé / nemáme rozpočet',
    whatProspectSays: 'Je to drahé. Teď na to nemáme rozpočet.',
    whatTheyMean:
      'Nejsem si jistý návratností a nechci udělat špatné rozhodnutí, které neobhájím.',
    commonMistake:
      'Obchodník obhajuje cenu nebo jde hned do slev.',
    functionalResponse: [
      'Rozumím, dává smysl dívat se na návratnost.',
      'Když dnes odejde dobrý člověk a zjistíte to pozdě, kolik vás to stojí?',
      'Echo Pulse nekupujete jako náklad, ale jako včasný signál rizika.',
      'Proto většinou začínáme pilotem na jednom týmu.',
    ],
    conversationDirection:
      'Převést cenu na riziko a otevřít pilot.',
  },
  {
    id: 'roi',
    order: 9,
    category: 'financial_roi',
    title: 'Jaký to má dopad? Kde je ROI?',
    whatProspectSays: 'Pěkné, ale jaký to má reálný dopad na byznys?',
    whatTheyMean:
      'Nechci kupovat „HR aktivitu". Potřebuju důkaz, že to má měřitelný přínos.',
    commonMistake:
      'Obchodník začne chrlit obecné statistiky nebo citovat studie, místo aby se zeptal na konkrétní bolest klienta.',
    functionalResponse: [
      'Dává smysl, bez dopadu je to jen další aktivita.',
      'Když se podíváte na poslední kvartál, kde vás nejvíc bolel výkon nebo stabilita týmu?',
      'Včasné signály znamenají menší zásahy a méně eskalací.',
      'Pojďme si definovat 2–3 metriky, které chcete sledovat. Co by tam mělo být?',
    ],
    conversationDirection:
      'Přesměrovat z obecného „ROI" na konkrétní bolest klienta a navrhnout pilotní metriky.',
  },
  {
    id: 'send-email',
    order: 10,
    category: 'status_quo',
    title: 'Pošlete to mailem',
    whatProspectSays: 'Pošlete mi to mailem, podívám se na to.',
    whatTheyMean:
      'Chci ukončit hovor, aniž bych řekl ne. Nebo se nechci rozhodovat teď.',
    commonMistake:
      'Obchodník řekne „jasně, pošlu" a ztratí kontrolu nad procesem. Mail skončí nepřečtený.',
    functionalResponse: [
      'Jasně, pošlu shrnutí. Jen aby to nebyl mail do šuplíku.',
      'Co přesně v tom chcete mít, aby vám to pomohlo rozhodnout?',
      'Největší hodnotu to má, když je to napojené na váš konkrétní problém.',
      'Domluvíme si rovnou 15 minut na projití toho mailu, ať to má výstup?',
    ],
    conversationDirection:
      'Zachovat kontrolu: zjistit, co přesně v mailu potřebují, a rovnou domluvit follow-up schůzku.',
  },
  {
    id: 'already-have',
    order: 11,
    category: 'status_quo',
    title: 'Už máme něco / Řešíme to interně',
    whatProspectSays: 'Už máme nástroj na engagement / děláme průzkumy.',
    whatTheyMean:
      'Nechci měnit status quo. Mám pocit, že to máme pokryté.',
    commonMistake:
      'Obchodník útočí na konkurenční řešení („to je zastaralé") a vyvolá defenzivní reakci.',
    functionalResponse: [
      'To je super, aspoň nemusíme přesvědčovat, že to má smysl.',
      'Co vám na tom současném řešení nejvíc chybí, když jde o včasné signály?',
      'Kde dnes nejčastěji zjistíte problém až pozdě?',
      'Nejde o nahrazení, ale o zachycení signálů, které propadnou sítem.',
    ],
    conversationDirection:
      'Neútočit na jejich řešení. Hledat „slepá místa" a pozicionovat jako doplněk.',
  },
  {
    id: 'gdpr',
    order: 12,
    category: 'data_privacy_trust',
    title: 'GDPR / právní riziko / compliance',
    whatProspectSays: 'Musí to projít přes DPO / právníka. Co s GDPR?',
    whatTheyMean:
      'Nemám jasno v právním rámci a nechci riskovat problém.',
    commonMistake:
      'Obchodník mávne rukou („to je v pohodě") nebo zahltí technickými detaily, místo aby zjistil konkrétní blok.',
    functionalResponse: [
      'Rozumím, tady je lepší být přísný než pozdě litovat.',
      'Co je u vás největší blok: zpracování dat, smluvní stránka, nebo bezpečnostní audit?',
      'Pošlu vám stručný bezpečnostní a GDPR přehled. Pro právníka, nebo pro IT?',
      'Kdo je u vás DPO, ať to řešíme rovnou s ním a nezasekne se to?',
    ],
    conversationDirection:
      'Identifikovat konkrétní právní blok a propojit se s ownerem (DPO/právník) přímo.',
  },
  {
    id: 'decision-process',
    order: 13,
    category: 'authority_politics',
    title: 'Musím to probrat s kolegy / boardem',
    whatProspectSays: 'Musím to probrat s HR / CFO / boardem.',
    whatTheyMean:
      'Nemám mandát rozhodnout sám, nebo nechci nést zodpovědnost za rozhodnutí.',
    commonMistake:
      'Obchodník řekne „tak jim to přepošlete" a nechá proces nekontrolovaně odjet.',
    functionalResponse: [
      'Jasně, je to rozumné. Kdo z nich bude řešit co?',
      'CFO typicky chce ROI, HR proces a přijetí, IT bezpečnost.',
      'Pojďme si říct, co každý z nich potřebuje slyšet, aby dal zelenou.',
      'Můžeme udělat krátký společný call. Koho má smysl přizvat?',
    ],
    conversationDirection:
      'Zmapovat stakeholdery, připravit argumenty pro každého a navrhnout společný call.',
  },
  {
    id: 'tried-before',
    order: 14,
    category: 'value_skepticism',
    title: 'Už jsme to zkusili a nefungovalo to',
    whatProspectSays: 'Měli jsme engagement survey a nic se nezměnilo.',
    whatTheyMean:
      'Spálili jsme se s podobným nástrojem a nevěřím, že tohle bude jiné.',
    commonMistake:
      'Obchodník začne srovnávat produkty nebo říkat „my jsme jiní" bez pochopení, co konkrétně selhalo.',
    functionalResponse: [
      'To je cenná zkušenost. Co přesně tehdy nefungovalo?',
      'Většinou to padne na jednom ze tří míst: data přišla pozdě, nebyla akční, nebo se s nimi nic neudělalo.',
      'Echo Pulse je navržený přesně proti tomu: krátké pulzy, okamžité signály, jasné akční kroky.',
      'Pojďme to nastavit tak, aby se neopakovalo to, co vás minule zklamalo.',
    ],
    conversationDirection:
      'Diagnóza: co konkrétně selhalo. Pak ukázat, jak Echo Pulse řeší přesně ten bod selhání.',
  },
  {
    id: 'no-problem',
    order: 15,
    category: 'status_quo',
    title: 'U nás je to v pohodě / Nemáme problém',
    whatProspectSays: 'Nemáme fluktuaci, lidé jsou spokojení.',
    whatTheyMean:
      'Nevnímám problém, nebo ho nechci vidět. Chybí mi data, která by řekla opak.',
    commonMistake:
      'Obchodník začne strašit („to si myslíte" / „to se vám může rychle změnit") a vzbuzuje odpor.',
    functionalResponse: [
      'To zní skvěle. Otázka je, jak to víte s jistotou.',
      'Když jsou lidé spokojení, signály to potvrdí a máte klid.',
      'Nejnákladnější odchody přicházejí od lidí, u kterých nikdo neviděl problém.',
      'Co kdybyste to vzal jako „health check" — pokud je vše OK, nic se neděje.',
    ],
    conversationDirection:
      'Přerámovat na validaci: „pokud je vše v pořádku, data to potvrdí". Snížit vnímané riziko.',
  },
  {
    id: 'implementation',
    order: 16,
    category: 'implementation_tech',
    title: 'Nemáme kapacitu to implementovat',
    whatProspectSays: 'Nemáme čas ani lidi na další implementaci.',
    whatTheyMean:
      'Bojím se, že to bude náročné na čas a zdroje a přidá to práci.',
    commonMistake:
      'Obchodník vysvětluje funkce a onboarding proces, místo aby uklidnil hlavní obavu: kolik to reálně zabere.',
    functionalResponse: [
      'Chápu, nikdo nechce další IT projekt.',
      'Nasazení Echo Pulse trvá hodiny, ne týdny. Není to klasická implementace.',
      'Nepotřebujete API integraci ani IT tým. Stačí pozvat lidi mailem.',
      'Proto děláme pilot: ověříte si to na jednom týmu, bez zátěže pro celou firmu.',
    ],
    conversationDirection:
      'Ukázat jednoduchost nasazení. Konkrétní čísla (hodiny, ne dny). Navrhnout pilot.',
  },
];
