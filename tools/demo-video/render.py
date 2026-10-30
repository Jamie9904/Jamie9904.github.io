import json, subprocess, os
here = os.path.dirname(os.path.abspath(__file__)); out_dir = os.path.join(here, "out")
# Music and sound effects: the app-demo-video skill's royalty-free set (not kept in the repo). SFX_DIR points at it;
# without it the video is rendered with the voice only.
sfx = os.environ.get("SFX_DIR") or next((d for d in [os.path.expanduser("~/app-demos/lpn-pallet-log/public/sfx")] if os.path.isdir(d)), "")
tl = json.load(open(os.path.join(out_dir, "timeline.json"))); vo = json.load(open(os.path.join(out_dir, "vo.json")))
def magenta(f):
    rgb = subprocess.check_output(["ffmpeg","-loglevel","error","-i",f,"-vf","crop=4:4:538:958,scale=1:1","-f","rawvideo","-pix_fmt","rgb24","-"])
    return rgb[0] > 200 and rgb[1] < 60 and rgb[2] > 200
fr = tl["frames"]; first = 0; seen = False
for i in range(min(60, len(fr))):
    m = magenta(fr[i]["file"])
    if m: seen = True
    elif seen: first = i; break
fr = fr[first:]; t0 = fr[0]["t"]; total = tl["end"] - t0
with open(os.path.join(out_dir, "frames.ffconcat"), "w") as f:
    f.write("ffconcat version 1.0\n")
    for i, x in enumerate(fr):
        nxt = fr[i+1]["t"] if i+1 < len(fr) else tl["end"]
        f.write(f"file '{x['file']}'\nduration {max(0.001, nxt - x['t']):.4f}\n")
    f.write(f"file '{fr[-1]['file']}'\n")
inp = ["-f","concat","-safe","0","-i",os.path.join(out_dir,"frames.ffconcat")]; flt = []; n = 1; vl = []; fx = []
for s in tl["scenes"]:
    inp += ["-i", vo[s["id"]]["file"]]; d = int((s["voStart"] - t0) * 1000)
    flt.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d}|{d}[v{n}]"); vl.append(f"[v{n}]"); n += 1
def add(file, t, vol):
    global n
    inp.extend(["-i", os.path.join(sfx, file)]); d = max(0, int((t - t0) * 1000))
    flt.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},adelay={d}|{d}[f{n}]"); fx.append(f"[f{n}]"); n += 1
flt.append(f"{''.join(vl)}amix=inputs={len(vl)}:normalize=0,apad=whole_dur={total:.2f}[vo]")
if sfx:
    for s in tl["scenes"][1:]: add("whoosh.wav", s["start"] - 0.05, 0.35)
    taps = tl["taps"]
    if taps: add("ding.wav", taps[0], 0.5)
    for t in taps[1:]: add("pop.wav", t, 0.45)
    inp += ["-stream_loop","-1","-i",os.path.join(sfx,"starter-beat.mp3")]; beat = n
    flt.append(f"{''.join(fx)}amix=inputs={len(fx)}:normalize=0,apad=whole_dur={total:.2f}[fx]")
    flt.append(f"[{beat}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total:.2f},volume=0.22,afade=t=in:d=1,afade=t=out:st={total-2.5:.2f}:d=2.5[bed]")
    flt += ["[vo]asplit=2[vo1][vo2]", "[bed][vo2]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=600[duck]",
            "[vo1][duck][fx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"]
else:
    print("No SFX_DIR: rendering with the voice only.")
    flt.append("[vo]loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
out = os.path.join(out_dir, "demo-full.mp4")
subprocess.run(["ffmpeg","-y","-loglevel","error",*inp,"-filter_complex",";".join(flt),"-map","0:v","-map","[aout]",
  "-vf","scale=1080:1920,fps=30,format=yuv420p","-c:v","libx264","-preset","veryfast","-crf","19","-c:a","aac","-b:a","160k","-ar","48000",
  "-movflags","+faststart","-t",f"{total:.2f}",out], check=True)
print(out, round(total,1), "s")
