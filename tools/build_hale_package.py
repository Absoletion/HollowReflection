from pathlib import Path
from PIL import Image
import json

ROOT=Path(__file__).resolve().parents[1]; sprite_dir=ROOT/"dev"/"sprites2"
sources={
 "idle":{"path":ROOT/"generated-art-round-12"/"hale_4star_idle_alpha_v1.png","cols":4,"rows":2,"count":8,"trim_right":100},
 "move":{"path":ROOT/"generated-art-round-18"/"hale_move_alpha_v1.png","cols":4,"rows":2,"count":8,"trim_right":60},
 "skill":{"path":ROOT/"generated-art-round-18"/"hale_skill_alpha_v1.png","cols":4,"rows":3,"count":12,"trim_middle_top":55},
 "arts":{"path":ROOT/"generated-art-round-18"/"hale_arts_alpha_v1.png","cols":4,"rows":4,"count":16,"trim_middle_top":55},
 "burst":{"path":ROOT/"generated-art-round-18"/"hale_burst_alpha_v1.png","cols":5,"rows":4,"count":20},
 "hit":{"path":ROOT/"generated-art-round-18"/"hale_hit_alpha_v1.png","cols":4,"rows":1,"count":4,"trim_right":50},
 "stagger":{"path":ROOT/"generated-art-round-18"/"hale_stagger_alpha_v1.png","cols":6,"rows":1,"count":6,"trim_right":35},
 "victory":{"path":ROOT/"generated-art-round-18"/"hale_victory_alpha_v1.png","cols":4,"rows":2,"count":8,"trim_right":60},
 "defeat":{"path":ROOT/"generated-art-round-18"/"hale_defeat_alpha_v1.png","cols":4,"rows":2,"count":8,"trim_right":60},
}

def normalize(cfg):
 src=Image.open(cfg["path"]).convert("RGBA"); cw=src.width//cfg["cols"]; ch=src.height//cfg["rows"]; out=[]
 for i in range(cfg["count"]):
  x=(i%cfg["cols"])*cw; y=(i//cfg["cols"])*ch; cell=src.crop((x,y,x+cw,y+ch))
  if cfg.get("trim_middle_top",0) and i//cfg["cols"] in (1,2):
   d=list(cell.getdata())
   for yy in range(cfg["trim_middle_top"]):
    for xx in range(cell.width):
     r,g,b,_=d[yy*cell.width+xx]; d[yy*cell.width+xx]=(r,g,b,0)
   cell.putdata(d)
  tr=cfg.get("trim_right",0)
  if tr:
   d=list(cell.getdata())
   for yy in range(cell.height):
    for xx in range(cell.width-tr,cell.width):
     r,g,b,_=d[yy*cell.width+xx]; d[yy*cell.width+xx]=(r,g,b,0)
   cell.putdata(d)
  bbox=cell.getchannel("A").point(lambda p:255 if p>=20 else 0).getbbox()
  if not bbox: raise RuntimeError(f"empty {cfg['path'].name} frame {i}")
  art=cell.crop(bbox); scale=min(184/art.width,112/art.height); sz=(max(1,round(art.width*scale)),max(1,round(art.height*scale)))
  art=art.resize(sz,Image.Resampling.NEAREST); f=Image.new("RGBA",(192,128),(0,0,0,0)); f.alpha_composite(art,((192-sz[0])//2,116-sz[1])); out.append(f)
 return out

anims={n:normalize(c) for n,c in sources.items()}; frames=[f for n in sources for f in anims[n]]
atlas=Image.new("RGBA",(192*len(frames),128),(0,0,0,0))
for i,f in enumerate(frames): atlas.alpha_composite(f,(i*192,0))
for n,fs in anims.items():
 a=Image.new("RGBA",(192*len(fs),128),(0,0,0,0))
 for i,f in enumerate(fs): a.alpha_composite(f,(i*192,0))
 a.save(ROOT/("generated-art-round-12" if n=="idle" else "generated-art-round-18")/f"hale_4star_{n}_atlas_{len(fs)}f.png")
rgb=Image.new("RGB",atlas.size,(255,0,255)); rgb.paste(atlas.convert("RGB"),mask=atlas.getchannel("A")); idx=rgb.quantize(colors=63,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
raw=idx.getpalette(); used=sorted(set(idx.getdata())); mag=min(used,key=lambda n:sum(abs(a-b) for a,b in zip(raw[n*3:n*3+3],(255,0,255))))
chars="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@"; opaque=[n for n in used if n!=mag]; mp={n:chars[i] for i,n in enumerate(opaque)}; pal={mp[n]:"#%02x%02x%02x"%tuple(raw[n*3:n*3+3]) for n in opaque}; px=idx.load()
enc={}; off=0
for n in sources:
 enc[n]=[["".join("." if f.getpixel((x,y))[3]<20 else mp.get(px[(off+i)*192+x,y],".") for x in range(192)) for y in range(128)] for i,f in enumerate(anims[n])]; off+=len(anims[n])
js="SPRITES['hale'] = {\nw:192, h:128,\npal:"+json.dumps(pal,separators=(",",":"))+",\nfacing:'left', asymmetric:true, anchor:{x:96,y:116},\n"
js+="anims:{"+",".join(n+":"+json.dumps(enc[n],separators=(",",":")) for n in sources)+"},\n"
js+="meta:{idle:{fps:8,loop:true},move:{fps:10,loop:true},skill:{fps:18,loop:false,events:[{frame:7,type:'hit',target:'primary'},{frame:7,type:'effect',id:'cross_slash'}]},arts:{fps:20,loop:false,events:[{frame:10,type:'effect',id:'riftguard'},{frame:10,type:'sfx',id:'hale_ward'}]},burst:{fps:22,loop:false,events:[{frame:14,type:'hit',target:'primary'},{frame:14,type:'effect',id:'black_horizon'},{frame:14,type:'shake',id:'heavy'}]},hit:{fps:16,loop:false},stagger:{fps:14,loop:false},victory:{fps:12,loop:false,holdLast:true},defeat:{fps:12,loop:false,holdLast:true}}\n};\n"
(sprite_dir/"hale.js").write_text(js,encoding="utf-8")
meta={"format":"hollowing-pixel-unit-v1","key":"hale","form":"4star","facing":"left","asymmetric":True,"canvas":{"width":192,"height":128},"anchor":{"x":96,"y":116},"visibleHeight":100,
"animations":{"idle":{"fps":8,"loop":True,"frames":8,"events":[]},"move":{"fps":10,"loop":True,"frames":8,"events":[]},"skill":{"fps":18,"loop":False,"frames":12,"events":[{"frame":7,"type":"hit","target":"primary"},{"frame":7,"type":"effect","id":"cross_slash"}]},"arts":{"fps":20,"loop":False,"frames":16,"events":[{"frame":10,"type":"effect","id":"riftguard"},{"frame":10,"type":"sfx","id":"hale_ward"}]},"burst":{"fps":22,"loop":False,"frames":20,"events":[{"frame":14,"type":"hit","target":"primary"},{"frame":14,"type":"effect","id":"black_horizon"},{"frame":14,"type":"shake","id":"heavy"}]},"hit":{"fps":16,"loop":False,"frames":4,"events":[]},"stagger":{"fps":14,"loop":False,"frames":6,"events":[]},"victory":{"fps":12,"loop":False,"frames":8,"holdLast":True,"events":[]},"defeat":{"fps":12,"loop":False,"frames":8,"holdLast":True,"events":[]}},"effects":{"canvas":{"width":384,"height":256},"anchor":{"x":192,"y":192}}}
(sprite_dir/"hale_4star.unit.json").write_text(json.dumps(meta,indent=2)+"\n",encoding="utf-8")
(ROOT/"generated-art-round-18"/"ROUND-18-MANIFEST.md").write_text("# Round 18 - Hale, Adventurer Complete Combat Package\n\n90 frames: idle, move, Cross Slash, Riftguard, Black Horizon, hit, stagger, victory, defeat.\n",encoding="utf-8")
print("Built Hale, Adventurer complete package: 90 frames")
