import json, os, sys, subprocess, urllib.request
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'kokoro-onnx', 'soundfile'], check=True)
base = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
for f in ('kokoro-v1.0.onnx', 'voices-v1.0.bin'):
    if not os.path.exists(f): urllib.request.urlretrieve(base + f, f)
from kokoro_onnx import Kokoro
import soundfile as sf
k = Kokoro('kokoro-v1.0.onnx', 'voices-v1.0.bin')
L = json.load(open(os.path.join(os.path.dirname(__file__), 'ali_lines.json'), encoding='utf-8'))
log = {}
for key, lines in L.items():
    for i, t in enumerate(lines):
        name = f'{key}{i}'
        try:
            a, sr = k.create(t, voice='am_fenrir', speed=1.08, lang='ar'); log[name] = 'ar'
        except Exception as e:
            log[name] = 'failed: ' + str(e)[:120]; continue
        wav = os.path.join(out, name + '.wav'); sf.write(wav, a, sr)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.5,highpass=f=90', '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(out, name + '.mp3')], check=True)
        os.remove(wav)
json.dump(log, open(os.path.join(out, 'log.json'), 'w'), indent=1)
print(log)
