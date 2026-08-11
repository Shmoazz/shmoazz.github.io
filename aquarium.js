/* =========================================================================
   aquarium.js

   The fish tank from the Daily's cell panel (primitive_layer/panel.html),
   pulled out of the operator UI and made mountable anywhere. In the cell it
   lives in the median strip between the machine column and the capture
   workspace. Here it fills the space between sections, which is the same
   job: give the room some air without inventing content to put in it.

   Mount by markup. Any element with [data-tank] gets a tank sized to its own
   box, over-filled by one character column so the clip edges ARE the element
   edges: fish enter and leave from behind the page, not out of thin air.

   Two things it does that the cell's tank does not:
     - it is fed by clicking, and the fish steer toward the food
     - it stops ticking when it scrolls out of view

   Static single frame under prefers-reduced-motion.
   ========================================================================= */
(function(){
  "use strict";

  var FISH = [
    ["><>",      "<><"],
    ["><>",      "<><"],
    ["><((*>",   "<*))><"],
    ["><>",      "<><"],
    ["><)))*>",  "<*(((><"],
    ["><(((@>",  "<@)))><"]
  ];

  // A character cell is measured, not assumed: the mono stack falls back to
  // whatever the machine has, and a guessed advance width leaves a ragged
  // right edge that only shows up on somebody else's laptop.
  function cellSize(pre){
    var probe = document.createElement("span");
    probe.textContent = "0000000000";
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
    pre.appendChild(probe);
    var w = probe.getBoundingClientRect().width / 10;
    probe.remove();
    return { w: w || 7.2, h: parseFloat(getComputedStyle(pre).lineHeight) || 14 };
  }

  function mount(host){
    var pre = document.createElement("pre");
    host.appendChild(pre);

    var hint = document.createElement("span");
    hint.className = "hint";
    hint.textContent = "click to feed";
    host.appendChild(hint);

    var cell = cellSize(pre);
    var fish = [], bubbles = [], weeds = [], food = [];
    var crab = null, jelly = null, snail = null;
    var t = 0, timer = null, W = 0, H = 0;

    function dims(){
      // over-fill by a column so entrances happen off-page
      return {
        w: Math.max(20, Math.ceil(host.clientWidth / cell.w) + 2),
        h: Math.max(8,  Math.floor(host.clientHeight / cell.h))
      };
    }

    function swimLane(h){ return 1 + Math.floor(Math.random() * Math.max(1, h - 5)); }

    function spawn(){
      var d = dims(); W = d.w; H = d.h;
      // one fish per ~26 columns, minimum four, so a narrow phone tank is not
      // a traffic jam and a wide desktop one is not empty
      var n = Math.max(5, Math.min(11, Math.round(W / 20)));
      fish = [];
      for(var i = 0; i < n; i++){
        var g = FISH[i % FISH.length];
        fish.push({
          g: g,
          x: Math.random() * W,
          y: swimLane(H),
          // alternate direction at spawn: a pure coin flip can strand the
          // whole school swimming one way forever
          v: (0.22 + Math.random() * 0.45) * (i % 2 ? -1 : 1),
          hot: i === 2
        });
      }
      bubbles = []; food = [];
      // A ragged meadow, deliberately sparse: at the cell's density a strip
      // this wide reads as static rather than as a tank, and the fish
      // disappear into it.
      weeds = [];
      for(var x = 2; x < W - 2; x += 7 + Math.floor(Math.random() * 12))
        weeds.push({ x: x, hgt: 1 + Math.floor(Math.random() * Math.min(5, Math.max(2, H - 4))) });
      crab  = { x: 2 + Math.random() * (W - 8), v: (Math.random() < 0.5 ? -1 : 1) * 0.08 };
      jelly = { x: 3 + Math.random() * (W - 8), y: H - 5 };
      snail = { x: Math.floor(Math.random() * W), v: Math.random() < 0.5 ? -1 : 1 };
    }

    function tick(){
      var d = dims();
      if(d.w !== W || d.h !== H) spawn();
      var w = W, h = H;
      t++;

      var grid = [], cls = [], y, x;
      for(y = 0; y < h; y++){
        grid.push(new Array(w).fill(" "));
        cls.push(new Array(w).fill(null));
      }

      weeds.forEach(function(wd){                       // seaweed, swaying
        for(var k = 0; k < wd.hgt; k++){
          var gy = h - 2 - k;
          if(gy >= 0 && wd.x < w){
            grid[gy][wd.x] = (k + (t >> 2)) % 2 ? "(" : ")";
            cls[gy][wd.x] = "weed";
          }
        }
      });
      for(x = 0; x < w; x++) grid[h - 1][x] = ".";      // sand

      // the snail inches along the sand, one character every ten ticks
      if(snail){
        if(t % 10 === 0){
          snail.x += snail.v;
          if(snail.x < 0 || snail.x > w - 1){ snail.v = -snail.v; snail.x += 2 * snail.v; }
        }
        var sx = Math.round(snail.x);
        if(sx >= 0 && sx < w) grid[h - 1][sx] = "@";
      }

      // the crab scuttles above the sand, claws working
      if(crab){
        crab.x += crab.v;
        if(crab.x < 1 || crab.x > w - 5) crab.v = -crab.v;
        if(Math.random() < 0.008) crab.v = -crab.v;
        var glyph = (t >> 2) % 2 ? "(\\/)" : "(\\|)";
        var cy = h - 2, cx = Math.round(crab.x);
        for(var ci = 0; ci < glyph.length; ci++)
          if(cx + ci >= 0 && cx + ci < w && grid[cy][cx + ci] === " ") grid[cy][cx + ci] = glyph[ci];
      }

      // the jellyfish drifts up on a wobble and respawns from the depths
      if(jelly){
        jelly.y -= 0.10; jelly.x += Math.sin(t / 6) * 0.15;
        if(jelly.y < 1){ jelly.y = h - 3; jelly.x = 3 + Math.random() * (w - 8); }
        var rows = [".-.", "\\|/"], jx = Math.round(jelly.x), jy = Math.round(jelly.y);
        rows.forEach(function(r, ri){
          for(var i = 0; i < r.length; i++){
            var gy = jy + ri, gx = jx + i;
            if(r[i] !== " " && gy >= 0 && gy < h && gx >= 0 && gx < w && grid[gy][gx] === " ")
              grid[gy][gx] = r[i];
          }
        });
      }

      // food sinks, lands on the sand, and dissolves if nobody wants it
      food.forEach(function(f){ f.y += 0.22; if(f.y > h - 2){ f.y = h - 2; f.rest = (f.rest || 0) + 1; } });
      food = food.filter(function(f){ return (f.rest || 0) < 90; });
      food.forEach(function(f){
        var gy = Math.round(f.y), gx = Math.round(f.x);
        if(gy >= 0 && gy < h && gx >= 0 && gx < w){ grid[gy][gx] = "*"; cls[gy][gx] = "food"; }
      });

      bubbles = bubbles.filter(function(b){ return b.y > 1; });
      if(t % 18 === 0 && fish.length){
        var f0 = fish[(t / 18 | 0) % fish.length];
        bubbles.push({ x: Math.round(f0.x + (f0.v > 0 ? f0.g[0].length : 0)), y: f0.y - 1 });
      }
      bubbles.forEach(function(b){
        b.y -= 0.5;
        var gy = Math.round(b.y), gx = Math.round(b.x);
        if(gy > 0 && gy < h && gx > 0 && gx < w) grid[gy][gx] = gy % 3 ? "o" : "O";
      });

      fish.forEach(function(f){
        // hungry: head for the nearest pellet, turning around if it is behind
        var target = null, best = 1e9;
        food.forEach(function(p){
          var dx = p.x - f.x, dy = p.y - f.y, dist = Math.abs(dx) + Math.abs(dy) * 2;
          if(dist < best){ best = dist; target = p; }
        });
        if(target){
          var want = target.x > f.x ? 1 : -1;
          if(Math.sign(f.v) !== want) f.v = -f.v;
          if(t % 3 === 0 && Math.round(target.y) !== f.y) f.y += target.y > f.y ? 1 : -1;
          if(f.y < 0) f.y = 0;
          if(f.y > h - 2) f.y = h - 2;
          if(Math.abs(target.x - f.x) < 2 && Math.abs(target.y - f.y) < 1.2){
            food = food.filter(function(p){ return p !== target; });
            bubbles.push({ x: Math.round(f.x), y: f.y - 1 });
          }
        }

        f.x += f.v;
        var s = f.v > 0 ? f.g[0] : f.g[1];
        // on wrap: new depth, and a coin flip on direction so entries stay
        // two-sided over time
        var flip = function(){ if(Math.random() < 0.5) f.v = -f.v; };
        if(f.v > 0 && f.x > w + 2){
          f.y = swimLane(h); flip(); f.x = f.v > 0 ? -s.length - 2 : w + 2;
        } else if(f.v < 0 && f.x < -s.length - 2){
          f.y = swimLane(h); flip(); f.x = f.v > 0 ? -s.length - 2 : w + 2;
        }
        for(var i = 0; i < s.length; i++){
          var gx = Math.round(f.x) + i;
          if(gx >= 0 && gx < w && f.y >= 0 && f.y < h){
            grid[f.y][gx] = s[i];
            cls[f.y][gx] = f.hot ? "fish-hot" : null;
          }
        }
      });

      var out = "";
      for(y = 0; y < h; y++){
        var row = "", open = null;
        for(x = 0; x < w; x++){
          var c = grid[y][x], k = cls[y][x];
          var esc = c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c;
          if(k !== open){
            if(open) row += "</span>";
            if(k) row += '<span class="' + k + '">';
            open = k;
          }
          row += esc;
        }
        if(open) row += "</span>";
        out += row + "\n";
      }
      pre.innerHTML = out;
    }

    function feed(ev){
      if(!W) return;
      var r = host.getBoundingClientRect();
      var cx = Math.round((ev.clientX - r.left) / cell.w);
      for(var i = 0; i < 3; i++)
        if(food.length < 14)
          food.push({ x: Math.max(1, Math.min(W - 2, cx + i - 1)), y: 0.5 + Math.random(), rest: 0 });
      if(!timer) tick();
    }
    host.addEventListener("pointerdown", feed);

    spawn(); tick();

    var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function run(on){
      if(on && !timer && !still) timer = setInterval(tick, 180);
      if(!on && timer){ clearInterval(timer); timer = null; }
    }
    // a tank nobody is looking at does not need to be simulated
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ run(e.isIntersecting); });
      }, { rootMargin: "120px" }).observe(host);
    } else run(true);

    var rt;
    window.addEventListener("resize", function(){
      clearTimeout(rt);
      rt = setTimeout(function(){ cell = cellSize(pre); spawn(); tick(); }, 160);
    });

    // the measurement above is taken before the webfont has necessarily
    // landed, so take it again once it has
    if(document.fonts && document.fonts.ready)
      document.fonts.ready.then(function(){ cell = cellSize(pre); spawn(); tick(); });
  }

  function boot(){ document.querySelectorAll("[data-tank]").forEach(mount); }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
