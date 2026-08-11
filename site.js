/* =========================================================================
   site.js

   Four small behaviors, nothing more. The page is static HTML and should
   still read fine with this file missing.
     1. the header grows a hairline once you leave the top
     2. the nav marks the section you are actually in
     3. sections fade up once, the first time they are seen
     4. the clock in the status strip ticks in Manassas time, not yours
   ========================================================================= */
(function(){
  "use strict";

  var header = document.querySelector("header");

  /* ---- 1. header ------------------------------------------------------- */
  if(header){
    var setShadow = function(){ header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", setShadow, { passive: true });
    setShadow();
  }

  /* ---- 2. active nav link ---------------------------------------------- */
  // Only on the index page: the project pages link back out to it, and there
  // is nothing on them for a section marker to track.
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  if(links.length){
    var targets = links
      .map(function(a){ return document.querySelector(a.getAttribute("href")); })
      .filter(Boolean);

    var mark = function(){
      var line = window.scrollY + (header ? header.offsetHeight : 0) + 120;
      var current = null;
      targets.forEach(function(sec){ if(sec.offsetTop <= line) current = sec.id; });
      links.forEach(function(a){
        a.classList.toggle("active", a.getAttribute("href") === "#" + current);
      });
    };
    window.addEventListener("scroll", mark, { passive: true });
    mark();
  }

  /* ---- 3. reveal ------------------------------------------------------- */
  var revealed = document.querySelectorAll(".reveal");
  if(revealed.length && "IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        // a stagger only where siblings arrive together, so a lone card does
        // not sit there waiting for a delay it did not earn
        var i = parseInt(e.target.getAttribute("data-i") || "0", 10);
        setTimeout(function(){ e.target.classList.add("in"); }, i * 70);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    revealed.forEach(function(el){ io.observe(el); });
  } else {
    revealed.forEach(function(el){ el.classList.add("in"); });
  }

  /* ---- 4. the clock ---------------------------------------------------- */
  var clock = document.getElementById("clock");
  if(clock){
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true
    });
    var beat = function(){ clock.textContent = fmt.format(new Date()); };
    beat();
    setInterval(beat, 1000);
  }
})();
