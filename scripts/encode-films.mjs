// Films for Lehi Light, cut from Sam's own reels (assets-gen/instagram/video, The Hunter 2026-10-21).
// Muted H.264 loops + matching poster frames (the poster is the LCP; the film starts after it).
//   hero-*.mp4   reel 01 (new-build deck panning over the valley to the mountains), 1.6–6.6 s, ping-pong
//                loop (seamless), graded down toward dusk. Desktop 1080x720 crop, phone 720x960 crop.
//   studio.mp4   reel 04 (Sam in the Get Leveraged studio), 16.0–21.5 s, 16:10 crop around Sam.
//   keys.mp4     reel 05 (closing confetti under the "Congrats!" neon), 1.0–4.5 s, square crop
//                (client + guest consent confirmed by the user, 2026-10-21).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const C = process.env.SN_CLIENT_DIR || path.join(os.homedir(), 'Projects/fazed-3d-sites/clients/sam-newell');
const V = path.join(C, 'assets-gen/instagram/video');
const GRADE = 'eq=brightness=-0.07:contrast=1.07:saturation=0.74:gamma=0.9';
const run = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const enc = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-profile:v', 'high'];

function film({ src, ss, t, crop, scale, out, crf, pingpong, poster }) {
  const base = `trim=start=${ss}:duration=${t},setpts=PTS-STARTPTS,crop=${crop},scale=${scale}:flags=lanczos,${GRADE},fps=30`;
  const vf = pingpong ? `[0:v]${base},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]` : `[0:v]${base}[v]`;
  run(['-i', path.join(V, src), '-filter_complex', vf, '-map', '[v]', ...enc, '-crf', String(crf), `public/film/${out}`]);
  run(['-i', `public/film/${out}`, '-frames:v', '1', '-q:v', '2', `src/assets/film/${poster}`]);
}

film({ src: '01-new-build-deck-valley-view-kitchen-lehi-2026-08.mp4', ss: 1.6, t: 5, crop: '1080:720:0:600', scale: '1080:720', out: 'hero-desktop.mp4', crf: 27, pingpong: true, poster: 'hero-desktop.jpg' });
film({ src: '01-new-build-deck-valley-view-kitchen-lehi-2026-08.mp4', ss: 1.6, t: 5, crop: '1080:1440:0:240', scale: '720:960', out: 'hero-phone.mp4', crf: 29, pingpong: true, poster: 'hero-phone.jpg' });
film({ src: '04-sam-get-leveraged-podcast-studio-2024-06.mp4', ss: 16.0, t: 5.5, crop: '720:450:0:150', scale: '720:450', out: 'studio.mp4', crf: 27, pingpong: false, poster: 'studio.jpg' });
film({ src: '05-closing-confetti-congrats-neon-office-2026-06.mp4', ss: 1.0, t: 3.5, crop: '720:720:0:280', scale: '720:720', out: 'keys.mp4', crf: 27, pingpong: false, poster: 'keys.jpg' });
console.log(execFileSync('ls', ['-la', 'public/film', 'src/assets/film']).toString());
