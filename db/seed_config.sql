-- Deal Origination — Seed: Config Version 1
-- Startgewichte aus Briefing Abschnitt 6.1

insert into config_versions (version, payload, created_by, prompt_text, active)
values (
  1,
  '{
    "weights_nachfolge": {
      "inhaberalter":    0.35,
      "kein_nachfolger": 0.25,
      "shab_ruecktritt": 0.15,
      "web_inaktiv":     0.10,
      "firmenalter":     0.15
    },
    "weights_invest": {
      "wiederkehr":              0.30,
      "kundendiversifikation":   0.20,
      "inhaber_unabhaengigkeit": 0.25,
      "groesse":                 0.10,
      "ebitda_marge":            0.15
    },
    "thresholds": {
      "ansprechen": 45,
      "beobachten": 25
    },
    "gates": {
      "klumpenrisiko_max_pct":   20,
      "ai_resilienz_min_klasse": 3,
      "markt_schrumpf_ko":       true
    },
    "groesse_zielband_chf": {
      "min": 1000000,
      "max": 10000000
    },
    "ebitda_multiple": {
      "low":  3.0,
      "high": 5.0
    }
  }'::jsonb,
  'manual',
  'Initiale Konfiguration nach Briefing v1',
  true
);
