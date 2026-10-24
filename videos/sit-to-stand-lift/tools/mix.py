#!/usr/bin/env python3
"""mix.py — VO + library SFX (sfx.json, anchored to timeline.json) → -14 LUFS master → muxed MP4.

  python3 tools/mix.py <proj> [--video renders/video.mp4] [--out renders/final.mp4]
"""
import sys, os, json, re, subprocess, argparse
import numpy as np

SR = 48000


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def resolve(at, tl):
    m = re.match(r'^(.*?)([+-]\d+(?:\.\d+)?)?$', str(at)); base, off = m.group(1), float(m.group(2) or 0)
    if re.match(r'^-?\d+(\.\d+)?$', base): return float(base) + off
    kind, _, ref = base.partition(':')
    sc = {s['id']: s for s in tl['scenes']}; vo = {v['id']: v for v in tl['vo']}
    if kind == 'scene': return sc[ref]['start'] + off
    if kind == 'scene-end': return sc[ref]['end'] + off
    if kind == 'line': return vo[ref]['start'] + off
    if kind == 'line-end': return vo[ref]['end'] + off
    if kind == 'word':
        lid, i = ref.split(':'); w = vo[lid]['words']; return w[int(i)]['s'] + off
    raise ValueError(at)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('proj'); ap.add_argument('--video'); ap.add_argument('--out')
    a = ap.parse_args(); P = os.path.abspath(a.proj)
    tl = json.load(open(os.path.join(P, 'timeline.json'), encoding='utf-8'))
    N = int(tl['duration'] * SR) + SR
    vo = decode(os.path.join(P, 'vo', 'vo_full.wav'))[:N]
    vo = np.pad(vo, ((0, N - len(vo)), (0, 0)))
    sfx = np.zeros((N, 2), np.float32); cache = {}
    for e in json.load(open(os.path.join(P, 'sfx.json'), encoding='utf-8')):
        f = os.path.join(P, 'sfx', e['f'])
        if f not in cache:
            x = decode(f); cache[f] = x / (np.abs(x).max() + 1e-9) * 10 ** (-1 / 20)
        x = cache[f][int(e.get('from', 0) * SR):]
        if 'dur' in e: x = x[:int(e['dur'] * SR)]
        x = x.copy()
        if e.get('fi'): n = min(len(x), int(e['fi'] * SR)); x[:n] *= np.linspace(0, 1, n)[:, None]
        if e.get('fo'): n = min(len(x), int(e['fo'] * SR)); x[-n:] *= np.linspace(1, 0, n)[:, None]
        x *= 10 ** (e.get('g', -12) / 20)
        i = int(round(resolve(e['at'], tl) * SR)); i0 = max(0, i); j = min(N, i + len(x))
        if j > i0: sfx[i0:j] += x[i0 - i:j - i]
    # gentle ducking of SFX while the narrator speaks (-3 dB)
    env = np.abs(vo).max(axis=1); k = int(0.12 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same'); duck = 1 - 0.29 * np.clip(env / (env.max() + 1e-9) * 6, 0, 1)
    mix = vo + sfx * duck[:, None]
    mix = mix[:int(tl['duration'] * SR)]
    R = os.path.join(P, 'renders'); os.makedirs(R, exist_ok=True)
    raw = os.path.join(R, 'mix_raw.wav'); master = os.path.join(R, 'master.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', raw], input=mix.astype(np.float32).tobytes(), check=True)
    js = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(js[js.rindex('{'):js.rindex('}') + 1])
    af = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', str(SR), master], check=True)
    js = subprocess.run(['ffmpeg', '-hide_banner', '-i', master, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    q = json.loads(js[js.rindex('{'):js.rindex('}') + 1]); print(f"🔊 master: {q['input_i']} LUFS · TP {q['input_tp']} dBTP")
    video = a.video or os.path.join(R, 'video.mp4')
    if os.path.exists(video):
        out = a.out or os.path.join(R, 'final.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', master, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
        print('✅', out)


if __name__ == '__main__':
    main()
