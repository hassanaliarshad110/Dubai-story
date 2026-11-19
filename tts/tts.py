import json, os, sys, subprocess, asyncio
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'edge-tts'], check=True)
import edge_tts
L = json.load(open(os.path.join(os.path.dirname(__file__), 'ali_lines.json'), encoding='utf-8'))
VOICE = 'ar-AE-HamdanNeural'      # Emirati man
log = {}
async def one(name, text):
    raw = os.path.join(out, name + '.raw.mp3')
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, VOICE, rate='+12%', pitch='+3Hz').save(raw); break
        except Exception as e:
            log[name] = 'retry: ' + str(e)[:100]; await asyncio.sleep(3)
    else:
        return
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-14:TP=-1.5', '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(out, name + '.mp3')], check=True)
    os.remove(raw); log[name] = VOICE
async def main():
    for key, lines in L.items():
        for i, t in enumerate(lines): await one(f'{key}{i}', t)
asyncio.run(main())
json.dump(log, open(os.path.join(out, 'log.json'), 'w'), indent=1); print(log)
