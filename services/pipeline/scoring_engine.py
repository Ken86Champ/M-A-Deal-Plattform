"""
Scoring Core — Step 3 Anpassung.

Architektur:
  - Gewichte/Schwellen kommen aus der aktiven config_version (kein Hardcoding)
  - run_pipeline(companies, config) → schreibt scores + gates + status in Supabase

Formel: combined = nachfolge_score × investierbar_score / 100
KO-Gates: ein 'rot' = verworfen
"""
import logging
from db import write_score, upsert_gate, update_company_status, get_enrichment, get_db

log = logging.getLogger(__name__)

# ── Gate-Schlüssel ────────────────────────────────────────────────────────────

GATES = ["inhaberabh", "klumpen", "ai_disrupt", "markt", "bilanz"]


# ── Normalisierung ────────────────────────────────────────────────────────────

def _norm_inhaberalter(alter: int | None) -> float:
    """Höheres Alter = höheres Nachfolge-Risiko = höherer Score (0..100)."""
    if alter is None:
        return 50.0
    if alter >= 65:
        return 100.0
    if alter <= 40:
        return 10.0
    return (alter - 40) / 25 * 90 + 10


def _norm_binary(val: bool | None, invert: bool = False) -> float:
    if val is None:
        return 50.0
    score = 100.0 if val else 0.0
    return (100 - score) if invert else score


def _norm_firmenalter(founded_year: int | None) -> float:
    """Ältere Firma = höheres Nachfolge-Potenzial."""
    if founded_year is None:
        return 50.0
    import datetime
    age = datetime.date.today().year - founded_year
    if age >= 30:
        return 100.0
    if age <= 5:
        return 10.0
    return (age - 5) / 25 * 90 + 10


def _norm_web_inaktiv(years: float | None) -> float:
    """Mehr Jahre seit letztem Update = höheres Nachfolge-Signal."""
    if years is None:
        return 50.0
    return min(100.0, years / 5 * 100)


def _norm_ratio(val: float | None) -> float:
    """0..1 ratio → 0..100."""
    if val is None:
        return 50.0
    return max(0.0, min(100.0, val * 100))


def _norm_groesse(umsatz: int | None, config: dict) -> float:
    """Umsatz innerhalb Zielband = max Score."""
    if umsatz is None:
        return 50.0
    band = config.get("groesse_zielband_chf", {"min": 1_000_000, "max": 10_000_000})
    lo, hi = band["min"], band["max"]
    if lo <= umsatz <= hi:
        return 100.0
    if umsatz < lo:
        return max(0, umsatz / lo * 80)
    # zu gross
    return max(0, 100 - (umsatz - hi) / hi * 50)


def _norm_ebitda(marge: float | None) -> float:
    """Marge >15% = Ziel, >25% = Maximum."""
    if marge is None:
        return 50.0
    if marge >= 0.25:
        return 100.0
    if marge <= 0:
        return 0.0
    return marge / 0.25 * 100


# ── Scoring ───────────────────────────────────────────────────────────────────

def _nachfolge_score(company: dict, enrichment: dict | None, weights: dict) -> float:
    e = enrichment or {}
    # auf_plattform = Firma ist öffentlich inseriert → stärkstes Verkaufssignal (stärker als SHAB)
    if e.get("auf_plattform"):
        return 95.0
    signals = {
        "inhaberalter":    _norm_inhaberalter(e.get("inhaber_alter")),
        "kein_nachfolger": _norm_binary(e.get("kein_nachfolger")),
        "shab_ruecktritt": _norm_binary(e.get("shab_ruecktritt")),
        "web_inaktiv":     _norm_web_inaktiv(e.get("web_last_update_years")),
        "firmenalter":     _norm_firmenalter(company.get("founded_year")),
    }
    return sum(signals[k] * weights.get(k, 0) for k in signals)


def _investierbar_score(company: dict, enrichment: dict | None, weights: dict, config: dict) -> float:
    e = enrichment or {}

    # On-Market: eigene Formel — misst Branche/Umsatz-Fit statt Nachfolgesignale
    if e.get("auf_plattform"):
        score = 60.0  # Basisprämie: Inhaber ist Verkaufswillig
        # Umsatz im Zielband → starker Boost
        umsatz = e.get("umsatz_est_chf")
        if umsatz:
            groesse_score = _norm_groesse(umsatz, config)
            score = max(score, 50 + groesse_score * 0.35)
        # Mitarbeiter bekannt → leichter Datenqualitäts-Bonus
        if e.get("mitarbeiter_est"):
            score = min(score + 8, 90)
        # EBITDA bekannt → weiterer Bonus
        if e.get("ebitda_marge_est"):
            score = min(score + _norm_ebitda(e.get("ebitda_marge_est")) * 0.15, 95)
        return score

    signals = {
        "wiederkehr":              _norm_ratio(e.get("wiederkehr_signal")),
        "kundendiversifikation":   _norm_ratio(e.get("kundendiversifikation")),
        "inhaber_unabhaengigkeit": _norm_binary(e.get("kein_nachfolger"), invert=True),
        "groesse":                 _norm_groesse(e.get("umsatz_est_chf"), config),
        "ebitda_marge":            _norm_ebitda(e.get("ebitda_marge_est")),
    }
    return sum(signals[k] * weights.get(k, 0) for k in signals)


def _evaluate_gates(company: dict, enrichment: dict | None, config: dict) -> dict[str, tuple[str, str]]:
    """Returns dict gate → (status, begruendung)."""
    e = enrichment or {}
    gates_cfg = config.get("gates", {})
    result: dict[str, tuple[str, str]] = {}

    # inhaberabh: only KO when we have actual web evidence of shallow team page
    tiefe = e.get("team_seite_tiefe")  # None = not measured (no website)
    if e.get("personenname_in_name") and tiefe is not None and tiefe < 0.1:
        result["inhaberabh"] = ("rot", "Personenname im Firmennamen + minimale Teamseite (web-bestätigt)")
    elif e.get("personenname_in_name"):
        result["inhaberabh"] = ("gelb", "Personenname im Firmennamen — Teamseite nicht geprüft")
    else:
        result["inhaberabh"] = ("gruen", "Kein kritisches Abhängigkeitssignal")

    # klumpen: Kundendiversifikation zu gering
    div = e.get("kundendiversifikation")
    threshold = gates_cfg.get("klumpenrisiko_max_pct", 20) / 100
    if div is not None and div < (1 - threshold):
        result["klumpen"] = ("rot", f"Diversifikation {div:.0%} unter Schwelle {1-threshold:.0%}")
    else:
        result["klumpen"] = ("offen", "Keine Daten — nach NDA verifizieren")

    # ai_disrupt: AI-Resilienz (aus enrichment.wiederkehr_signal als Proxy, echte Klasse TBD)
    # Echte Klasse (1–5) wird später durch einen Claude-Prefilter gesetzt (aus deal-sourcing)
    result["ai_disrupt"] = ("offen", "AI-Resilienz-Klasse nach NDA / Prefilter")

    # markt: strukturell schrumpfend (offen bis Marktdaten)
    result["markt"] = ("offen", "Marktstruktur nach NDA klären")

    # bilanz: Bilanz-Red-Flags (offen bis NDA)
    result["bilanz"] = ("offen", "Bilanz nach NDA prüfen")

    return result


# ── Public API ────────────────────────────────────────────────────────────────

def run_pipeline(companies: list[dict], config: dict) -> list[dict]:
    """
    Score companies und schreibe Ergebnisse in Supabase.
    config = payload aus aktiver config_version.
    """
    w_n  = config["weights_nachfolge"]
    w_i  = config["weights_invest"]
    thr  = config["thresholds"]
    cv   = config.get("version", 0)   # config_version.version (injiziert von scoring.py)

    results = []
    for company in companies:
        cid = company["id"]
        enrichment = get_enrichment(cid)

        nachfolge   = _nachfolge_score(company, enrichment, w_n)
        investierbar = _investierbar_score(company, enrichment, w_i, config)
        combined    = nachfolge * investierbar / 100

        # Schreibe Score
        write_score(cid, round(nachfolge, 2), round(investierbar, 2), round(combined, 2), cv)

        # Gates evaluieren und schreiben
        gate_results = _evaluate_gates(company, enrichment, config)
        has_red_gate = False
        for gate_key, (status, begruendung) in gate_results.items():
            upsert_gate(cid, gate_key, status, begruendung)
            if status == "rot":
                has_red_gate = True

        # Status setzen
        if has_red_gate:
            new_status = "verworfen"
        elif combined >= thr["ansprechen"]:
            new_status = "qualified"
        else:
            new_status = "bewertet"

        update_company_status(cid, new_status)
        log.info(f"Scored {company.get('name','?')}: N={nachfolge:.1f} I={investierbar:.1f} C={combined:.1f} → {new_status}")

        results.append({**company, "combined": combined, "status": new_status})

    return results
