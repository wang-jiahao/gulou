import { defineConfig } from 'vite';
import { readFileSync, createReadStream, statSync } from 'node:fs';
import { resolve } from 'node:path';

// Optional personal music stays outside public/ and dist/. Only loopback playback.
function personalMusic(server) {
  server.middlewares.use((req, res, next) => {
    const requestPath = req.url?.split('?')[0];
    const path = requestPath?.startsWith('/gulou/') ? requestPath.slice('/gulou'.length) : requestPath;
    if (path !== '/data/music.json' && !path?.startsWith('/__local_music__/')) return next();
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    if (!local) return next();
    let playlist;
    try { playlist = JSON.parse(readFileSync(resolve('.local-media/playlist.json'), 'utf8')); }
    catch { return next(); }
    if (path === '/data/music.json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(JSON.stringify({ tracks: playlist.map(t => ({ title: t.title, artist: t.artist, url: '/__local_music__/' + t.file })) }));
    }
    const name = path.slice('/__local_music__/'.length);
    if (!playlist.some(t => t.file === name) || !/^[a-z_]+\.ogg$/.test(name)) { res.statusCode = 404; return res.end(); }
    const file = resolve('.local-media/music', name);
    let size; try { size = statSync(file).size; } catch { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', 'audio/ogg'); res.setHeader('Accept-Ranges', 'bytes');
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
    const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start >= size || start > end) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); return res.end(); }
    if (range) { res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`); }
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(file, { start, end }); stream.on('error', () => res.destroy()); stream.pipe(res);
  });
}
export default defineConfig({ server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local-media/**'] } }, plugins: [{ name: 'optional-personal-music', configureServer: personalMusic, configurePreviewServer: personalMusic }] });
