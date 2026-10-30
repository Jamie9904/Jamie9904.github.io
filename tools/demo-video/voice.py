"""Narration for the Guide demo video: the Kokoro "Heart" voice (Apache 2.0, offline) through sherpa-onnx.
Downloads the engine and the voice model from GitHub once (~350 MB) into ~/.cache/lpn-voice, then speaks every
line in lines.json into out/vo/*.wav (silence trimmed, 48 kHz mono) and writes out/vo.json with each length.
Run: python3 voice.py"""
import json, os, subprocess, tarfile, urllib.request
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, "out"); cache = os.path.expanduser("~/.cache/lpn-voice")
ENGINE = "sherpa-onnx-v1.12.15-linux-x64-shared"
FILES = {ENGINE: f"https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.15/{ENGINE}.tar.bz2",
         "kokoro-multi-lang-v1_0": "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_0.tar.bz2"}
VOICE_SID = 3  # af_heart in kokoro-multi-lang-v1_0 (the speaker list is in the model's metadata)
os.makedirs(cache, exist_ok=True); os.makedirs(os.path.join(out, "vo"), exist_ok=True)
for name, url in FILES.items():
    if not os.path.isdir(os.path.join(cache, name)):
        arc = os.path.join(cache, name + ".tar.bz2"); print("Downloading", url)
        urllib.request.urlretrieve(url, arc)
        with tarfile.open(arc) as t: t.extractall(cache)
        os.remove(arc)
B = os.path.join(cache, ENGINE); K = os.path.join(cache, "kokoro-multi-lang-v1_0")
res = {}
for l in json.load(open(os.path.join(here, "lines.json"))):
    raw = os.path.join(out, "vo", l["id"] + ".raw.wav"); f = os.path.join(out, "vo", l["id"] + ".wav")
    subprocess.run([os.path.join(B, "bin", "sherpa-onnx-offline-tts"), f"--kokoro-model={K}/model.onnx", f"--kokoro-voices={K}/voices.bin",
        f"--kokoro-tokens={K}/tokens.txt", f"--kokoro-data-dir={K}/espeak-ng-data", f"--kokoro-dict-dir={K}/dict",
        f"--kokoro-lexicon={K}/lexicon-us-en.txt", "--num-threads=4", f"--sid={VOICE_SID}", "--output-filename=" + raw, l["say"]],
        env={**os.environ, "LD_LIBRARY_PATH": os.path.join(B, "lib")}, capture_output=True, check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
        "-ar", "48000", "-ac", "1", f], check=True); os.remove(raw)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())
    res[l["id"]] = {"file": f, "duration": round(d, 2), "say": l["say"]}; print(l["id"], round(d, 2), "s")
json.dump(res, open(os.path.join(out, "vo.json"), "w"), indent=1)
