import { useState, useEffect, useRef, useMemo } from "react";
import type { Brief } from "../../types/contracts";
import type { Contact } from "../../features/dialer/types";
import { PipedrivePopup } from "../../features/dialer/components/PipedrivePopup";

// ─── Sales wisdom from Brian Tracy's "The Psychology of Selling" ───
const SALES_WISDOM: { quote: string; tip: string }[] = [
  {
    quote: "Lidé nekupují produkt. Kupují pocit, který jim ten produkt dá.",
    tip: "Mluv o výsledcích, ne o funkcích.",
  },
  {
    quote:
      "80 % prodeje se uzavře až po pátém kontaktu. Většina prodejců to vzdá po prvním.",
    tip: "Vytrvej — každý hovor je investice.",
  },
  {
    quote:
      "Nejdůležitější slovo v prodeji je PTEJ SE. Kdo se ptá, ten řídí konverzaci.",
    tip: "Otevřené otázky > monology.",
  },
  {
    quote: "Zákazník si kupuje důvěru dřív, než si koupí produkt.",
    tip: "Buď upřímný, i když to znamená říct 'nevím'.",
  },
  {
    quote: "Strach ze ztráty je 2,5× silnější motivátor než touha po zisku.",
    tip: "Ukaž, co ztrácí tím, že nic nedělá.",
  },
  {
    quote: "Tvůj přístup rozhoduje o 80 % úspěchu. Technika je jen 20 %.",
    tip: "Než zvedneš telefon, nadechni se a usmej.",
  },
  {
    quote: "Úspěšní prodejci mluví 30 % času a poslouchají 70 %.",
    tip: "Po otázce — mlč. Nech klienta mluvit.",
  },
  {
    quote:
      "Každý 'ne' tě posouvá blíž k 'ano'. Je to matematika, ne osobní selhání.",
    tip: "Sleduj poměr hovorů → schůzek, ne emoce.",
  },
  {
    quote:
      "Nejlepší čas na prodej je hned po úspěšném prodeji — tvoje energie je na vrcholu.",
    tip: "Po spojeném hovoru zavolej hned dalšího.",
  },
  {
    quote:
      "Zákazník potřebuje pocítit, že mu rozumíš, dřív než pochopí, co prodáváš.",
    tip: "Začni tím, co trápí JEHO, ne co umí tvůj produkt.",
  },
  {
    quote: "Lidé nenávidí, když se jim prodává, ale milují nakupovat.",
    tip: "Pomáhej jim rozhodovat se, netlač.",
  },
  {
    quote:
      "Jasnost je síla. Čím jednodušeji vysvětlíš hodnotu, tím rychleji se rozhodnou.",
    tip: "Jeden hlavní benefit. Žádný feature-dump.",
  },
];

interface ReadyPhaseProps {
  contact: Contact;
  displayBrief: Brief | null;
  onCall: () => void;
  onSkip: () => void;
  queuePosition?: number;
  queueTotal?: number;
  completedCount?: number;
}

export function ReadyPhase({
  contact,
  displayBrief,
  onCall,
  onSkip,
  queuePosition,
  queueTotal,
  completedCount,
}: ReadyPhaseProps) {
  const [scriptCollapsed, setScriptCollapsed] = useState(false);
  const [showPipedrive, setShowPipedrive] = useState(false);
  const callBtnRef = useRef<HTMLButtonElement>(null);

  // Pick a random wisdom quote — stable per contact
  const wisdom = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < contact.id.length; i++) {
      hash = (hash * 31 + contact.id.charCodeAt(i)) | 0;
    }
    return SALES_WISDOM[Math.abs(hash) % SALES_WISDOM.length];
  }, [contact.id]);

  // Auto-focus call button on mount — THE dominant action
  useEffect(() => {
    callBtnRef.current?.focus();
    callBtnRef.current?.classList.add("td-pulse");
    const t = setTimeout(
      () => callBtnRef.current?.classList.remove("td-pulse"),
      600,
    );
    return () => clearTimeout(t);
  }, [contact.id]);

  return (
    <div className="td" data-phase="ready">
      {/* ━━━ CENTERED SINGLE-COLUMN LAYOUT ━━━
           UX logic: eye enters → contact (WHO) → call (DO) → wisdom (FEEL)
           All vertically stacked, centered, no side-to-side scanning */}
      <div className="td-ready-center">
        {/* Contact card — hero, biggest element */}
        <div className="td-contact">
          <div className="td-contact-top">
            <div className="td-avatar">
              {contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="td-contact-info">
              <h2 className="td-name">{contact.name}</h2>
              <p className="td-role">
                {contact.title || "—"} · {contact.company}
              </p>
            </div>
          </div>
          <div className="td-contact-links">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="td-phone">
                📞 {contact.phone}
              </a>
            )}
            <button
              className="td-pipedrive-btn"
              onClick={() => setShowPipedrive(true)}
              title="Otevřít deal v Pipedrive"
            >
              🟢 Pipedrive
            </button>
          </div>
        </div>

        {/* Pipedrive embedded popup */}
        <PipedrivePopup
          open={showPipedrive}
          onClose={() => setShowPipedrive(false)}
          contactId={contact.id}
          contactName={contact.name}
        />

        {/* Call & Skip — THE action, right under contact */}
        <div className="td-action-buttons">
          <button ref={callBtnRef} className="td-call-btn" onClick={onCall}>
            <span className="td-call-icon">📞</span>
            <span>Zavolat</span>
            <kbd>C</kbd>
          </button>
          <button className="td-skip-btn" onClick={onSkip}>
            Přeskočit <span className="td-kbd">→</span>
          </button>
        </div>

        {/* Wisdom — subtle accent strip at bottom */}
        <div className="td-wisdom-strip">
          <span className="td-wisdom-strip-icon">💡</span>
          <div className="td-wisdom-strip-text">
            <span className="td-wisdom-strip-quote">{wisdom.quote}</span>
            <span className="td-wisdom-strip-tip">→ {wisdom.tip}</span>
          </div>
        </div>
      </div>

      {/* ━━━ KEYBOARD HINTS ━━━ */}
      <div className="td-shortcuts">
        <kbd>C</kbd> zavolat &nbsp;·&nbsp; <kbd>→</kbd> přeskočit &nbsp;·&nbsp;{" "}
        <kbd>↑↓</kbd> leady &nbsp;·&nbsp; <kbd>Tab</kbd> další pole
      </div>
    </div>
  );
}
