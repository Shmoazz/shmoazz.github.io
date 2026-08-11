#!/usr/bin/env python3
"""
Timeline bead alignment test.

    python3 tools/timeline-alignment-test.py

Are the beads on the Experience timeline centred on the spine? This asks the
rendered pixels, not the stylesheet.

Why it exists: this bug shipped twice. Both times it was "verified" by reading
computed CSS values, and both times the computed values said the bead was
centred while the screen showed it two pixels to the left. Element geometry
and getComputedStyle are a model of the page. The pixels are the page.

What it does:
  1. serves the site on a throwaway port
  2. writes a copy of index.html with everything but the timeline hidden, so
     nothing else can be mistaken for a bead (the film grain goes too, it is
     noise in a measurement)
  3. renders it in headless Chrome at six device scale factors and two widths
  4. decodes each PNG by hand (no PIL dependency) and measures:
       - the spine, FOUND rather than assumed: the column carrying ink on
         more rows than any other, since text columns are interrupted and a
         hairline is not
       - the spine's optical centre, as the intensity-weighted centroid of
         every row with no bead on it
       - each bead's optical centre, as the centroid of its own rows
  5. fails if any bead's centre differs from the spine's by more than a third
     of a CSS pixel

The fractional scale factors matter: a sub-pixel error is invisible at 1x and
shows up the moment someone runs their browser at 110% or 125%, which is how
this was spotted in the first place.

Exit code 0 means centred.
"""
import http.server, os, socket, socketserver, struct, subprocess, sys
import tempfile, threading, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
INK = 6.0            # darkness over paper that counts as ink
TOL_CSS = 0.34       # a third of a CSS pixel

HIDE = ("<style>#top,.tank,#about,#projects,#awards,#contact,footer,"
        ".section-head{display:none!important}header{display:none}"
        ".js .reveal{opacity:1!important;transform:none!important}"
        "section{padding:0}body::after{display:none}</style></head>")


# ---- PNG reading ----------------------------------------------------------
def read_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"
    pos, idat = 8, []
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, depth, color = struct.unpack(">IIBB", body[:10])
            assert depth == 8 and color in (2, 6), "expected 8-bit RGB(A)"
            nch = 3 if color == 2 else 4
        elif typ == b"IDAT":
            idat.append(body)
        elif typ == b"IEND":
            break
        pos += 12 + ln

    raw = zlib.decompress(b"".join(idat))
    stride, out, prev, p = w * nch, bytearray(h * w * nch), bytearray(w * nch), 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:
            for i in range(nch, stride):
                line[i] = (line[i] + line[i - nch]) & 0xFF
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif f == 3:
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif f == 4:
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                b, c = prev[i], (prev[i - nch] if i >= nch else 0)
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, nch, out


# ---- measurement ----------------------------------------------------------
def measure(path, scale):
    w, h, nch, px = read_png(path)
    lum = []
    for y in range(h):
        base, row = y * w * nch, [0.0] * w
        for x in range(w):
            i = base + x * nch
            row[x] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
        lum.append(row)

    flat = sorted(lum[y][x] for y in range(0, h, 5) for x in range(0, w, 5))
    bg = flat[int(len(flat) * 0.9)]

    coverage = [sum(1 for y in range(h) if bg - lum[y][x] > INK) for x in range(w)]
    sx = max(range(w), key=lambda x: coverage[x])
    if coverage[sx] < h * 0.5:
        return False, 0, "no continuous vertical line found"

    win = int(round(20 * scale))
    lo, hi = max(0, sx - win), min(w, sx + win + 1)
    dark = [[(bg - lum[y][x]) if (bg - lum[y][x]) > INK else 0.0
             for x in range(lo, hi)] for y in range(h)]
    rowsum = [sum(r) for r in dark]

    beads, run = [], None
    for y in range(h):
        if rowsum[y] > 120 * scale:          # a bead is 11 css px of ring or fill
            run = [y, y] if run is None else [run[0], y]
        elif run:
            if run[1] - run[0] >= 4 * scale:
                beads.append(tuple(run))
            run = None
    if run and run[1] - run[0] >= 4 * scale:
        beads.append(tuple(run))

    def centroid(rows):
        num = den = 0.0
        for y in rows:
            for i, d in enumerate(dark[y]):
                if d:
                    num += (lo + i + 0.5) * d
                    den += d
        return (num / den) if den else None

    pad, excluded = int(round(3 * scale)), set()
    for a, b in beads:
        excluded.update(range(a - pad, b + pad + 1))
    spine_rows = [y for y in range(h) if y not in excluded and rowsum[y] > 0]
    spine_cx = centroid(spine_rows)

    tol, ok = TOL_CSS * scale, bool(beads)
    print(f"  spine at col {sx}, centre {spine_cx:.3f} dev px "
          f"({len(spine_rows)} clean rows, {len(beads)} beads)")
    for a, b in beads:
        dx = centroid(range(a, b + 1)) - spine_cx
        good = abs(dx) <= tol
        ok = ok and good
        print(f"    bead y{(a + b) / 2:7.1f}  dx={dx:+.3f} dev "
              f"({dx / scale:+.3f} css)  {'PASS' if good else 'FAIL'}")
    return ok, len(beads), None


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]; s.close(); return p


def main():
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    assert "</head>" in src
    tmp = os.path.join(ROOT, "_alignment_probe.html")
    open(tmp, "w", encoding="utf-8").write(src.replace("</head>", HIDE))

    port = free_port()
    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/_alignment_probe.html"

    allok, total = True, 0
    shots = tempfile.mkdtemp(prefix="beads-")
    try:
        for width, label in ((1200, "desktop"), (560, "narrow")):
            for scale in (1, 1.1, 1.25, 1.5, 2, 3):
                out = f"{shots}/{label}_{scale}.png"
                subprocess.run(
                    [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                     f"--force-device-scale-factor={scale}",
                     f"--window-size={width},1000",
                     "--virtual-time-budget=4000",
                     f"--screenshot={out}", url], capture_output=True)
                print(f"\n{label} @ {width}px, device scale {scale}x")
                ok, n, err = measure(out, scale)
                if err:
                    print("  " + err)
                allok, total = (allok and ok), total + n
    finally:
        httpd.shutdown()
        os.remove(tmp)

    print(f"\n{total} bead measurements")
    print("ALL BEADS CENTRED" if allok else "MISALIGNED")
    return 0 if allok else 1


if __name__ == "__main__":
    sys.exit(main())
