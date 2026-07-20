import base64
import argparse
import hashlib
import json
import re
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required to build the PixelLab runtime bundle.") from exc

ARGS = argparse.ArgumentParser(description="Build the frame-image-v1 PixelLab runtime bundle.")
ARGS.add_argument("--staging", type=Path, default=Path(__file__).resolve().parents[1])
ARGS.add_argument("--output", type=Path, default=None)
OPTIONS = ARGS.parse_args()
STAGING = OPTIONS.staging.resolve()
OUT = (OPTIONS.output or (STAGING / "generated" / "pixellab-sprites.js")).resolve()
NUMBER = re.compile(r"(\d+)")

def natural_key(path: Path):
    return [int(part) if part.isdigit() else part.lower() for part in NUMBER.split(path.name)]

def rgba_hash(path: Path) -> str:
    with Image.open(path) as image:
        return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()

SETS = {
    "hale": {
        "idle": (STAGING / "hale-arts-improved-final-bundle/Equipped_four-star_c/animations/Hale_4-Star_Combat_Idle_Southwest/south-west", 6, True),
        "move": (STAGING / "hale-arts-improved-final-bundle/Equipped_four-star_c/animations/Hale_4-Star_Combat_Advance_Southwest/south-west", 8, True),
        "attack": (STAGING / "hale-arts-improved-final-bundle/Equipped_four-star_c/animations/Hale_4-Star_Cross_Slash_Southwest_8f_Revised/south-west", 10, False),
        "skill": (STAGING / "hale-arts-improved-final-bundle/Equipped_four-star_c/animations/Hale_4-Star_Cross_Slash_Southwest_8f_Revised/south-west", 10, False),
        "arts": (STAGING / "Hale_Black_Horizon_Arts_Improved_frames", 10, False),
        "burst": (STAGING / "Hale_Nightmares_End_Burst_frames", 11, False),
        "hit": (STAGING / "hale-4star-complete-2026-07-15/Equipped_four-star_c/animations/Hale_4-Star_Hit_Reaction_Southwest_Final/south-west", 9, False),
        "stagger": (STAGING / "hale-4star-complete-2026-07-15/Equipped_four-star_c/animations/Hale_4-Star_Heavy_Flinch_Southwest_Final/south-west", 8, False),
        "victory": (STAGING / "hale-4star-complete-2026-07-15/Equipped_four-star_c/animations/Hale_4-Star_Victory_Quiet_Resolve_Southwest_Final/south-west", 6, False),
        "defeat": (STAGING / "hale-4star-complete-2026-07-15/Equipped_four-star_c/animations/Hale_4-Star_Defeat_Southwest_Final/south-west", 6, False),
    },
    "cinnia": {
        "idle": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-idle/frames", 6, True),
        "move": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-movement/frames", 8, True),
        "attack": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-basic-attack-preview/frames", 10, False),
        "skill": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-skill-preview-v2/frames", 10, False),
        "arts": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-arts-preview/frames", 9, False),
        "burst": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-burst-preview-v2/frames", 9, False),
        "hit": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-hit/frames", 10, False),
        "stagger": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-flinch/frames", 8, False),
        "victory": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-victory/frames", 7, False),
        "defeat": (STAGING / "dev/pixellab-pilot/output/cinnia-v2-defeat/frames", 7, False),
    },
    "katie": {
        "idle": (STAGING / "dev/pixellab-pilot/output/katie-v7-idle/frames", 6, True),
        "move": (STAGING / "dev/pixellab-pilot/output/katie-v7-combat-movement/frames", 8, True),
        "attack": (STAGING / "dev/pixellab-pilot/output/katie-v7-basic-attack/frames", 8, False),
        "skill": (STAGING / "dev/pixellab-pilot/output/katie-v7-basic-attack/frames", 8, False),
        "arts": (STAGING / "dev/pixellab-pilot/output/katie-v7-arts-contrast-study-combined/frames", 7, False),
        "burst": (STAGING / "dev/pixellab-pilot/output/katie-v7-burst-cat-scan/frames", 7, False),
        "hit": (STAGING / "dev/pixellab-pilot/output/katie-v7-hit/frames", 10, False),
        "stagger": (STAGING / "dev/pixellab-pilot/output/katie-v7-flinch/frames", 8, False),
        "victory": (STAGING / "dev/pixellab-pilot/output/katie-v7-victory/frames", 6, False),
        "defeat": (STAGING / "dev/pixellab-pilot/output/katie-v7-defeat/frames", 6, False),
    },
    "tobin": {
        "idle": (STAGING / "assets/animations/tobin/idle-still-water-listening-v1", 8, True),
        "move": (STAGING / "assets/animations/tobin/move-purposeful-pace-v1", 11, True),
        "attack": (STAGING / "assets/animations/tobin/skill-dampen-pilot-v1", 15, False),
        "skill": (STAGING / "assets/animations/tobin/skill-dampen-pilot-v1", 15, False),
        "arts": ([
            STAGING / "assets/animations/tobin/arts-read-phase-v1",
            STAGING / "assets/animations/tobin/arts-ward-phase-v2",
        ], 12, False),
        "burst": ([
            STAGING / "assets/animations/tobin/burst-silence-phase-v1",
            STAGING / "assets/animations/tobin/burst-confession-phase-v1",
            STAGING / "assets/animations/tobin/burst-pressure-phase-v1",
        ], 11, False),
        "hit": (STAGING / "assets/animations/tobin/hit-v1", 14, False),
        "stagger": (STAGING / "assets/animations/tobin/flinch-stagger-v1", 12, False),
        "victory": (STAGING / "assets/animations/tobin/victory-v1", 9, False),
        "defeat": (STAGING / "assets/animations/tobin/defeat-v1", 9, False),
    },
    "hearthgar": {
        "idle": (STAGING / "assets/animations/hearthgar/idle-scared-still-standing-v1", 8, True),
        "move": (STAGING / "assets/animations/hearthgar/move-protective-rearguard-v1", 10, True),
        "attack": ([
            STAGING / "assets/animations/hearthgar/skill-brace-step-in-approved-v1",
            STAGING / "assets/animations/hearthgar/skill-brace-lock-authored-v1",
        ], 15, False),
        "skill": ([
            STAGING / "assets/animations/hearthgar/skill-brace-step-in-approved-v1",
            STAGING / "assets/animations/hearthgar/skill-brace-lock-authored-v1",
        ], 15, False),
        "arts": ([
            STAGING / "assets/animations/hearthgar/arts-bank-gather-approved-v1",
            STAGING / "assets/animations/hearthgar/arts-bank-shield-v1",
        ], 12, False),
        "burst": ([
            STAGING / "assets/animations/hearthgar/burst-open-furnace-fear-v1",
            STAGING / "assets/animations/hearthgar/burst-open-furnace-open-v1",
            STAGING / "assets/animations/hearthgar/burst-open-furnace-answer-v1",
        ], 11, False),
        "hit": (STAGING / "assets/animations/hearthgar/hit-cinder-ignite-v1", 14, False),
        "stagger": (STAGING / "assets/animations/hearthgar/stagger-one-knee-approved-v1", 12, False),
        "victory": (STAGING / "assets/animations/hearthgar/victory-relieved-thumbs-up-approved-v1", 8, False),
        "defeat": (STAGING / "assets/animations/hearthgar/defeat-covering-kneel-approved-v1", 8, False),
    },
    "brigga": {
        "idle": (STAGING / "assets/animations/brigga/idle-reading-fault-southwest-v1", 8, True),
        "move": (STAGING / "assets/animations/brigga/move-heavy-scuttle-southwest-v1", 11, True),
        "attack": (STAGING / "assets/animations/brigga/skill-kegcracker-approved-v1", 17, False),
        "skill": (STAGING / "assets/animations/brigga/skill-kegcracker-approved-v1", 17, False),
        "arts": ([
            STAGING / "assets/animations/brigga/arts-blast-mining-mark-approved-v1",
            STAGING / "assets/animations/brigga/arts-blast-mining-fire-approved-v1",
        ], 20, False),
        "burst": ([
            STAGING / "assets/animations/brigga/burst-grand-opening-survey-approved-v1",
            STAGING / "assets/animations/brigga/burst-grand-opening-commit-approved-v1",
            STAGING / "assets/animations/brigga/burst-grand-opening-impact-authored-v1",
        ], 22, False),
        "hit": (STAGING / "assets/animations/brigga/hit-irritated-recoil-approved-v1", 14, False),
        "stagger": (STAGING / "assets/animations/brigga/stagger-maul-brace-approved-v1", 12, False),
        "victory": (STAGING / "assets/animations/brigga/victory-record-results-approved-v1", 10, False),
        "defeat": (STAGING / "assets/animations/brigga/defeat-kneeling-by-maul-approved-v1", 10, False),
    },
    "marlowe": {
        "idle": (STAGING / "assets/animations/marlowe/idle-fencing-guard-approved-v1", 8, True),
        "move": (STAGING / "assets/animations/marlowe/move-fencing-advance-approved-v1", 11, True),
        "attack": ([
            STAGING / "assets/animations/marlowe/skill-riposte-invitation-approved-v1",
            STAGING / "assets/animations/marlowe/skill-riposte-counter-approved-v1",
        ], 18, False),
        "skill": ([
            STAGING / "assets/animations/marlowe/skill-riposte-invitation-approved-v1",
            STAGING / "assets/animations/marlowe/skill-riposte-counter-approved-v1",
        ], 18, False),
        "arts": ([
            STAGING / "assets/animations/marlowe/arts-coup-de-grace-measure-authored-v1",
            STAGING / "assets/animations/marlowe/arts-coup-de-grace-lunge-approved-v1",
        ], 16, False),
        "burst": (
            STAGING / "assets/animations/marlowe/burst-curtain-call-five-strike-authored-v1",
            20,
            False,
        ),
        "hit": (STAGING / "assets/animations/marlowe/hit-tight-recoil-approved-v1", 14, False),
        "stagger": (STAGING / "assets/animations/marlowe/stagger-heavy-balance-loss-approved-v1", 12, False),
        "victory": (STAGING / "assets/animations/marlowe/victory-curtain-bow-approved-v1", 10, False),
        "defeat": (STAGING / "assets/animations/marlowe/defeat-kneeling-exhaustion-approved-v1", 10, False),
    },
    "brant": {
        "idle": (STAGING / "assets/animations/brant/idle-planted-anchor-approved-v1", 8, True),
        "move": (STAGING / "assets/animations/brant/move-heavy-haul-approved-v1", 10, True),
        "attack": (STAGING / "assets/animations/brant/skill-anchor-drop-approved-v1", 16, False),
        "skill": (STAGING / "assets/animations/brant/skill-anchor-drop-approved-v1", 16, False),
        "burst": ([
            STAGING / "assets/animations/brant/burst-keelhaul-cast-approved-v1",
            STAGING / "assets/animations/brant/burst-keelhaul-drag-approved-v1",
            STAGING / "assets/animations/brant/burst-keelhaul-recover-approved-v1",
        ], 18, False),
        "hit": (STAGING / "assets/animations/brant/hit-compact-recoil-approved-v1", 14, False),
        "stagger": (STAGING / "assets/animations/brant/stagger-anchor-brace-approved-v1", 12, False),
        "victory": (STAGING / "assets/animations/brant/victory-quiet-check-approved-v1", 9, False),
        "defeat": (STAGING / "assets/animations/brant/defeat-anchor-barrier-approved-v1", 9, False),
    },
    "milla": {
        "idle": (STAGING / "assets/animations/milla/idle-ready-route-approved-v1", 8, True),
        "move": (STAGING / "assets/animations/milla/move-courier-sprint-approved-v1", 12, True),
        "attack": ([
            STAGING / "assets/animations/milla/skill-hand-off-launch-approved-v1",
            STAGING / "assets/animations/milla/skill-hand-off-deliver-approved-v1",
        ], 18, False),
        "skill": ([
            STAGING / "assets/animations/milla/skill-hand-off-launch-approved-v1",
            STAGING / "assets/animations/milla/skill-hand-off-deliver-approved-v1",
        ], 18, False),
        "arts": ([
            STAGING / "assets/animations/milla/arts-express-route-first-approved-v1",
            STAGING / "assets/animations/milla/arts-express-route-second-approved-v1",
            STAGING / "assets/animations/milla/arts-express-route-stop-approved-v1",
        ], 20, False),
        "burst": ([
            STAGING / "assets/animations/milla/burst-special-delivery-compound-approved-v1",
            STAGING / "assets/animations/milla/burst-special-delivery-route-approved-v1",
            STAGING / "assets/animations/milla/burst-special-delivery-finish-authored-v1",
        ], 22, False),
        "hit": (STAGING / "assets/animations/milla/hit-satchel-protect-approved-v1", 14, False),
        "stagger": (STAGING / "assets/animations/milla/stagger-broken-momentum-approved-v1", 12, False),
        "victory": (STAGING / "assets/animations/milla/victory-route-ledger-approved-v1", 10, False),
        "defeat": (STAGING / "assets/animations/milla/defeat-satchel-guard-approved-v1", 9, False),
    },
    "nix": {
        "idle": (STAGING / "assets/animations/nix/idle-impatient-triage-approved-v1", 8, True),
        "move": (STAGING / "assets/animations/nix/move-powered-medical-response-approved-v1", 10, True),
        "attack": ([
            STAGING / "assets/animations/nix/skill-bitter-draught-select-approved-v1",
            STAGING / "assets/animations/nix/skill-bitter-draught-dose-approved-v1",
        ], 16, False),
        "skill": ([
            STAGING / "assets/animations/nix/skill-bitter-draught-select-approved-v1",
            STAGING / "assets/animations/nix/skill-bitter-draught-dose-approved-v1",
        ], 16, False),
        "burst": ([
            STAGING / "assets/animations/nix/burst-panacea-diagnose-approved-v1",
            STAGING / "assets/animations/nix/burst-panacea-compound-approved-v1",
            STAGING / "assets/animations/nix/burst-panacea-administer-approved-v1",
        ], 18, False),
        "hit": (STAGING / "assets/animations/nix/hit-chair-jolt-approved-v1", 14, False),
        "stagger": (STAGING / "assets/animations/nix/stagger-brake-skid-approved-v1", 12, False),
        "victory": (STAGING / "assets/animations/nix/victory-clinical-check-approved-v1", 9, False),
        "defeat": (STAGING / "assets/animations/nix/defeat-emergency-powerdown-approved-v1", 8, False),
    },
    "hale_awakened": {
        "idle": (STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/UnHollowed_Combat_Idle/south-west", 6, True),
        "move": (STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/UnHollowed_Combat_Advance/south-west", 8, True),
        "attack": ([
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Fracture_Edge_Windup/south-west",
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Fracture_Edge_Release/south-west",
        ], 11, False),
        "skill": ([
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Fracture_Edge_Windup/south-west",
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Fracture_Edge_Release/south-west",
        ], 11, False),
        "arts": ([
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Event_Horizon_Charge/south-west",
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Event_Horizon_Release/south-west",
        ], 10, False),
        "burst": ([
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Shatterfall_Charge/south-west",
            STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/Shatterfall_Release/south-west",
        ], 10, False),
        "hit": (STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/UnHollowed_Hit/south-west", 8, False),
        "stagger": (STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/UnHollowed_Flinch/south-west", 8, False),
        "victory": (STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/UnHollowed_Victory_Final/south-west", 6, False),
        "defeat": (STAGING / "generated/hale-awakened-pixellab/Equip_Hale_with_his/animations/UnHollowed_Defeat_Final/south-west", 6, False),
    },
}

# Production identity/scale contracts that must survive the lossy handoff from
# PixelLab exports into the standalone bundle.  The visible-body measurement is
# for the weaponless reference, not the larger VFX/weapon silhouette.
DESIGN_PROFILES = {
    "brigga": {
        "style": "compact-anime",
        "referenceBodyHeightPx": 160,
        "referenceCanvasPx": 256,
        "feetLineY": 238,
        "battleFacing": "south-west",
        "bodyType": "adult-dwarf",
    },
    "marlowe": {
        "style": "compact-anime",
        "referenceBodyHeightPx": 191,
        "referenceCanvasPx": 256,
        "feetLineY": 238,
        "battleFacing": "south-west",
        "bodyType": "slender-adult",
        "weapon": "needle-thin basket-hilt rapier",
    },
    "brant": {
        "style": "compact-anime",
        "referenceBodyHeightPx": 199,
        "referenceCanvasPx": 256,
        "feetLineY": 238,
        "battleFacing": "south-west",
        "bodyType": "large-adult",
        "weapon": "single iron anchor with one continuous chain",
    },
    "milla": {
        "style": "compact-anime",
        "referenceBodyHeightPx": 183,
        "referenceCanvasPx": 256,
        "feetLineY": 238,
        "battleFacing": "south-west",
        "bodyType": "compact-adult",
        "equipment": "fixed courier satchel, winged boots, and red route scarf",
    },
    "nix": {
        "style": "compact-anime",
        "referenceBodyHeightPx": 182,
        "referenceCanvasPx": 256,
        "feetLineY": 238,
        "battleFacing": "south-west",
        "bodyType": "adult-mermaid-seated-rig",
        "equipment": "essential water-tank chair, secured medicine rack, and articulated dosing arm",
    },
    "hale_awakened": {
        "style": "compact-anime",
        "referenceBodyHeightPx": 192,
        "referenceCanvasPx": 256,
        "battleFacing": "south-west",
    },
}

# Canvas size never represents character height. These values document the
# approved cast scale and let the renderer normalize small PixelLab framing
# differences around the shared y=238 feet anchor. Hale's awakened source is
# 183px tall in its reference idle frame, so a modest 192/183 correction keeps
# him on the adult baseline without changing his compact anime anatomy.
UNIT_SCALE = {
    "hale": {"targetHeightPx": 192, "sourceVisibleHeightPx": 192, "renderScale": 0.355},
    "hale_awakened": {"targetHeightPx": 192, "sourceVisibleHeightPx": 183, "renderScale": 0.355 * (192 / 183)},
    "cinnia": {"targetHeightPx": 192, "sourceVisibleHeightPx": 192, "renderScale": 0.355},
    "katie": {"targetHeightPx": 180, "sourceVisibleHeightPx": 180, "renderScale": 0.355},
    "tobin": {"targetHeightPx": 145, "sourceVisibleHeightPx": 143, "renderScale": 0.355 * (145 / 143)},
    "hearthgar": {"targetHeightPx": 206, "sourceVisibleHeightPx": 211, "renderScale": 0.355 * (206 / 211)},
    "brigga": {"targetHeightPx": 160, "sourceVisibleHeightPx": 161, "renderScale": 0.355 * (160 / 161)},
    "marlowe": {"targetHeightPx": 191, "sourceVisibleHeightPx": 195, "renderScale": 0.355 * (191 / 195)},
    "brant": {"targetHeightPx": 199, "sourceVisibleHeightPx": 201, "renderScale": 0.355 * (199 / 201)},
    "milla": {"targetHeightPx": 183, "sourceVisibleHeightPx": 181, "renderScale": 0.355 * (183 / 181)},
    "nix": {"targetHeightPx": 182, "sourceVisibleHeightPx": 184, "renderScale": 0.355 * (182 / 184)},
}


def data_url(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def build_unit(name, animations):
    scale = UNIT_SCALE[name]
    anims = {}
    meta = {}
    fps = {}
    for anim, (folder, rate, loop) in animations.items():
        folders = folder if isinstance(folder, list) else [folder]
        frames = []
        for part_index, part in enumerate(folders):
            part_frames = sorted(part.glob("frame_*.png"), key=natural_key)
            if not part_frames:
                part_frames = sorted(part.glob("frame-*.png"), key=natural_key)
            if part_index and part_frames and frames and rgba_hash(part_frames[0]) == rgba_hash(frames[-1]):
                part_frames = part_frames[1:]
            frames.extend(part_frames)
        if not frames:
            raise FileNotFoundError(f"No frames found for {name}.{anim}: {folder}")
        anims[anim] = [data_url(frame) for frame in frames]
        meta[anim] = {"sourceFps": rate, "playbackFps": rate, "fps": rate, "loop": loop}
        fps[anim] = rate
    unit = {
        "w": 256,
        "h": 256,
        "anchor": {"x": 128, "y": 238},
        "renderScale": scale["renderScale"],
        "targetHeightPx": scale["targetHeightPx"],
        "sourceVisibleHeightPx": scale["sourceVisibleHeightPx"],
        "proportionStyle": "compact-anime",
        "designProfile": {
            "style": "compact-anime",
            "referenceBodyHeightPx": scale["targetHeightPx"],
            "referenceCanvasPx": 256,
            "feetLineY": 238,
        },
        "format": "frame-image-v1",
        "imageFrames": True,
        "anims": anims,
        "meta": meta,
        "playbackFps": fps,
    }
    if name in DESIGN_PROFILES:
        unit["designProfile"] = DESIGN_PROFILES[name]
    return unit


payload = {name: build_unit(name, animations) for name, animations in SETS.items()}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    "/* GENERATED: approved PixelLab combat libraries. */\n"
    "Object.assign(SPRITES," + json.dumps(payload, separators=(",", ":")) + ");\n",
    encoding="utf-8",
)
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
