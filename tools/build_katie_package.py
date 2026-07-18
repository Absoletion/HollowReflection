from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
sprite_dir = ROOT / "dev" / "sprites2"
sources = {
    "idle": {"path": ROOT / "generated-art-round-11" / "katie_4star_idle_alpha_v2.png", "cols":4, "rows":2, "count":8, "trim_right":80},
    "move": {"path": ROOT / "generated-art-round-13" / "katie_4star_move_alpha_v1.png", "cols":4, "rows":2, "count":8, "trim_right":80},
    "skill": {"path": ROOT / "generated-art-round-14" / "katie_4star_skill_personal-space_alpha_v1.png", "cols":4, "rows":3, "count":12, "trim_right":0, "trim_middle_top":60},
    "arts": {"path": ROOT / "generated-art-round-15" / "katie_4star_arts_contrast-study_alpha_v1.png", "cols":4, "rows":4, "count":16, "trim_right":0},
    "burst": {"path": ROOT / "generated-art-round-16" / "katie_4star_burst_cat-scan_alpha_v1.png", "cols":5, "rows":4, "count":20, "trim_right":0},
    "hit": {"path": ROOT / "generated-art-round-17" / "katie_hit_alpha_v1.png", "cols":4, "rows":1, "count":4, "trim_right":0},
    "stagger": {"path": ROOT / "generated-art-round-17" / "katie_stagger_alpha_v1.png", "cols":6, "rows":1, "count":6, "trim_right":0},
    "victory": {"path": ROOT / "generated-art-round-17" / "katie_victory_alpha_v1.png", "cols":4, "rows":2, "count":8, "trim_right":0},
    "defeat": {"path": ROOT / "generated-art-round-17" / "katie_defeat_alpha_v1.png", "cols":4, "rows":2, "count":8, "trim_right":0},
}

def normalize_sheet(cfg):
    path = cfg["path"]
    src = Image.open(path).convert("RGBA")
    cw, ch = src.width // cfg["cols"], src.height // cfg["rows"]
    frames = []
    for i in range(cfg["count"]):
        x, y = (i % cfg["cols"]) * cw, (i // cfg["cols"]) * ch
        cell = src.crop((x, y, x + cw, y + ch))
        if cfg.get("trim_middle_top",0) and i // cfg["cols"] == 1:
            edge = list(cell.getdata())
            for yy in range(cfg["trim_middle_top"]):
                for xx in range(cell.width):
                    r,g,b,_ = edge[yy*cell.width+xx]
                    edge[yy*cell.width+xx] = (r,g,b,0)
            cell.putdata(edge)
        # Generated wide weapons sometimes intrude from the following cell.
        # Katie's accepted pose leaves this far-right gutter unused.
        if cfg["trim_right"]:
            edge = list(cell.getdata())
            for yy in range(cell.height):
                for xx in range(cell.width - cfg["trim_right"], cell.width):
                    r,g,b,_ = edge[yy*cell.width+xx]
                    edge[yy*cell.width+xx] = (r,g,b,0)
            cell.putdata(edge)
        cleaned = []
        for r,g,b,a in cell.getdata():
            cleaned.append((r,g,b,0) if r > 242 and g > 242 and b > 242 else (r,g,b,a))
        cell.putdata(cleaned)
        bbox = cell.getchannel("A").point(lambda p: 255 if p >= 20 else 0).getbbox()
        if not bbox:
            raise RuntimeError(f"empty frame {i} in {path.name}")
        art = cell.crop(bbox)
        scale = min(184 / art.width, 112 / art.height)
        size = (max(1, round(art.width * scale)), max(1, round(art.height * scale)))
        art = art.resize(size, Image.Resampling.NEAREST)
        frame = Image.new("RGBA", (192,128), (0,0,0,0))
        frame.alpha_composite(art, ((192-size[0])//2, 116-size[1]))
        frames.append(frame)
    return frames

anims = {name: normalize_sheet(cfg) for name,cfg in sources.items()}
# The generated retraction frame contained the hammer without Katie. Hold the
# preceding protected pose for one frame so character continuity is preserved.
anims["arts"][13] = anims["arts"][12].copy()
# The generated dissolve frame omitted Katie. Retain the preceding guardian
# pulse pose for one frame, then continue to the authored recovery.
anims["burst"][17] = anims["burst"][16].copy()
all_frames = [f for name in sources for f in anims[name]]
atlas = Image.new("RGBA", (192*len(all_frames),128), (0,0,0,0))
for i,f in enumerate(all_frames): atlas.alpha_composite(f,(i*192,0))

for name, frames in anims.items():
    sheet = Image.new("RGBA",(192*len(frames),128),(0,0,0,0))
    for i,f in enumerate(frames): sheet.alpha_composite(f,(i*192,0))
    round_dir = {"idle":"generated-art-round-11","move":"generated-art-round-13","skill":"generated-art-round-14","arts":"generated-art-round-15","burst":"generated-art-round-16","hit":"generated-art-round-17","stagger":"generated-art-round-17","victory":"generated-art-round-17","defeat":"generated-art-round-17"}[name]
    sheet.save(ROOT / round_dir / f"katie_4star_{name}_atlas_{len(frames)}f.png")

rgb=Image.new("RGB",atlas.size,(255,0,255)); rgb.paste(atlas.convert("RGB"),mask=atlas.getchannel("A"))
indexed=rgb.quantize(colors=63,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
raw=indexed.getpalette(); used=sorted(set(indexed.getdata()))
magenta=min(used,key=lambda n:sum(abs(a-b) for a,b in zip(raw[n*3:n*3+3],(255,0,255))))
chars="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@"
opaque=[n for n in used if n!=magenta]; mapping={n:chars[i] for i,n in enumerate(opaque)}
palette={mapping[n]:"#%02x%02x%02x"%tuple(raw[n*3:n*3+3]) for n in opaque}
pix=indexed.load()

encoded={}; offset=0
for name in sources:
    enc=[]
    for fi,frame in enumerate(anims[name]):
        gi=offset+fi
        enc.append(["".join("." if frame.getpixel((x,y))[3]<20 else mapping.get(pix[gi*192+x,y],".") for x in range(192)) for y in range(128)])
    encoded[name]=enc; offset+=len(anims[name])

js="SPRITES['katie'] = {\n"
js+="w:192, h:128,\n"
js+="pal:"+json.dumps(palette,separators=(",",":"))+",\n"
js+="facing:'left', asymmetric:true, anchor:{x:96,y:116},\n"
js+="anims:{"+",".join(name+":"+json.dumps(encoded[name],separators=(",",":")) for name in sources)+"},\n"
js+="meta:{idle:{fps:8,loop:true},move:{fps:10,loop:true},skill:{fps:16,loop:false,events:[{frame:6,type:'effect',id:'personal_space'},{frame:6,type:'sfx',id:'katie_barrier'},{frame:6,type:'flash',id:'cyan_guard'}]},arts:{fps:20,loop:false,events:[{frame:10,type:'effect',id:'contrast_reveal'},{frame:10,type:'sfx',id:'katie_scan'},{frame:12,type:'effect',id:'contrast_shield'},{frame:12,type:'flash',id:'cyan_party_guard'}]},burst:{fps:22,loop:false,events:[{frame:13,type:'effect',id:'cat_scan_party_shield'},{frame:13,type:'sfx',id:'katie_cat_scan_guard'},{frame:13,type:'flash',id:'cyan_burst_guard'},{frame:15,type:'effect',id:'cat_scan_suppression'},{frame:15,type:'sfx',id:'katie_suppression_scan'},{frame:15,type:'shake',id:'burst_support'}]},hit:{fps:16,loop:false},stagger:{fps:14,loop:false},victory:{fps:12,loop:false,holdLast:true},defeat:{fps:12,loop:false,holdLast:true}}\n};\n"
(sprite_dir/"katie.js").write_text(js,encoding="utf-8")

manifest={
 "format":"hollowing-pixel-unit-v1","key":"katie","form":"4star","facing":"left","asymmetric":True,
 "canvas":{"width":192,"height":128},"anchor":{"x":96,"y":116},"visibleHeight":100,
 "animations":{"idle":{"fps":8,"loop":True,"frames":8,"events":[]},"move":{"fps":10,"loop":True,"frames":8,"events":[]},
 "skill":{"fps":16,"loop":False,"frames":12,"events":[{"frame":6,"type":"effect","id":"personal_space"},{"frame":6,"type":"sfx","id":"katie_barrier"},{"frame":6,"type":"flash","id":"cyan_guard"}]},
 "arts":{"fps":20,"loop":False,"frames":16,"events":[{"frame":10,"type":"effect","id":"contrast_reveal"},{"frame":10,"type":"sfx","id":"katie_scan"},{"frame":12,"type":"effect","id":"contrast_shield"},{"frame":12,"type":"flash","id":"cyan_party_guard"}]},
 "burst":{"fps":22,"loop":False,"frames":20,"events":[{"frame":13,"type":"effect","id":"cat_scan_party_shield"},{"frame":13,"type":"sfx","id":"katie_cat_scan_guard"},{"frame":13,"type":"flash","id":"cyan_burst_guard"},{"frame":15,"type":"effect","id":"cat_scan_suppression"},{"frame":15,"type":"sfx","id":"katie_suppression_scan"},{"frame":15,"type":"shake","id":"burst_support"}]},
 "hit":{"fps":16,"loop":False,"frames":4,"events":[]},"stagger":{"fps":14,"loop":False,"frames":6,"events":[]},
 "victory":{"fps":12,"loop":False,"frames":8,"holdLast":True,"events":[]},"defeat":{"fps":12,"loop":False,"frames":8,"holdLast":True,"events":[]}},
 "effects":{"canvas":{"width":384,"height":256},"anchor":{"x":192,"y":192}},
 "notes":"Wide frames preserve the radiographic hammer at canonical body scale. Effects remain independently sized."
}
(sprite_dir/"katie_4star.unit.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
(ROOT/"generated-art-round-13"/"ROUND-13-MANIFEST.md").write_text(
 "# Round 13 — Katie Movement\n\n- Eight-frame heavy advance, screen-left.\n- Runtime canvas 192x128; anchor (96,116).\n- Playback: 10 fps loop.\n",encoding="utf-8")
(ROOT/"generated-art-round-15"/"ROUND-15-MANIFEST.md").write_text(
 "# Round 15 - Katie Arts: Contrast Study\n\n"
 "- Sixteen-frame diagnostic scan and party-shield Arts.\n"
 "- Screen-left; 20 fps; non-looping.\n"
 "- Intent reveal: frame index 10. Party shield: frame index 12.\n"
 "- Source frame 14 omitted Katie; runtime frame 14 holds the preceding protected pose for continuity.\n",
 encoding="utf-8")
(ROOT/"generated-art-round-16"/"ROUND-16-MANIFEST.md").write_text(
 "# Round 16 - Katie Burst: CAT Scan\n\n"
 "- Twenty-frame guardian, party-shield, and suppression Burst.\n"
 "- Screen-left; 22 fps; non-looping.\n"
 "- Party shield: frame index 13. Enemy attack reduction: frame index 15.\n"
 "- Source frame 18 omitted Katie; runtime frame 18 holds the preceding guardian pose for continuity.\n",
 encoding="utf-8")
(ROOT/"generated-art-round-17"/"ROUND-17-MANIFEST.md").write_text(
 "# Round 17 - Katie Reactions and Outcomes\n\n- Hit: 4 frames at 16 fps.\n- Stagger: 6 frames at 14 fps.\n- Victory: 8 frames at 12 fps, hold last.\n- Defeat: 8 frames at 12 fps, hold last.\n",encoding="utf-8")
print("Built Katie complete package: 90 frames")
