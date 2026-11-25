#!/usr/bin/env python3
"""Met à jour le réalisé hebdomadaire de assets/data/trail-prep.json
à partir d'un export Garmin Connect (archive .zip « Exporter vos données »).

Usage :
    python3 _tools/garmin_semaines.py chemin/vers/export_garmin.zip

Seules les activités de course (running, trail_running, treadmill_running…)
sont prises en compte. Les semaines vont du lundi au dimanche (heure locale).
Les objectifs, séances clés et notes du JSON ne sont pas modifiés.
"""
import datetime as dt
import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "assets" / "data" / "trail-prep.json"


def activites(zip_path):
    """Renvoie la liste des activités résumées contenues dans l'export."""
    out = []
    with zipfile.ZipFile(zip_path) as z:
        for name in z.namelist():
            if name.endswith("summarizedActivities.json"):
                data = json.loads(z.read(name))
                for bloc in data:
                    out.extend(bloc.get("summarizedActivitiesExport", []))
    return out


def lundi(jour):
    return jour - dt.timedelta(days=jour.weekday())


def agreger(acts):
    sem = defaultdict(lambda: {"km": 0.0, "dplus": 0.0, "sec": 0.0, "n": 0, "max_km": 0.0})
    for a in acts:
        if "running" not in (a.get("activityType") or ""):
            continue
        dist_km = (a.get("distance") or 0) / 1e5        # Garmin : centimètres
        if dist_km < 0.5:
            continue
        jour = dt.datetime.fromtimestamp(a["startTimeLocal"] / 1000).date()
        s = sem[lundi(jour).isoformat()]
        s["km"] += dist_km
        s["dplus"] += (a.get("elevationGain") or 0) / 100  # centimètres
        s["sec"] += (a.get("duration") or 0) / 1000        # millisecondes
        s["n"] += 1
        s["max_km"] = max(s["max_km"], dist_km)
    return sem


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sem = agreger(activites(sys.argv[1]))
    plan = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    connues = {w["debut"] for w in plan["semaines"]}
    for w in plan["semaines"]:
        s = sem.get(w["debut"])
        if s:
            w["realise_km"] = round(s["km"], 1)
            w["realise_dplus"] = round(s["dplus"])
            w["realise_heures"] = round(s["sec"] / 3600, 1)
            w["realise_sorties"] = s["n"]
            w["plus_longue_km"] = round(s["max_km"], 1)
    ignorees = sorted(set(sem) - connues)
    plan["mis_a_jour"] = dt.date.today().isoformat()
    JSON_PATH.write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(set(sem) & connues)} semaine(s) mise(s) à jour dans {JSON_PATH.name}")
    if ignorees:
        print("Semaines hors plan ignorées :", ", ".join(ignorees))


if __name__ == "__main__":
    main()
