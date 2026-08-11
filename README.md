# zachmoas.com

Personal site. Plain HTML, CSS, and two small scripts, served by GitHub Pages
off `main` at the custom domain in `CNAME`. No build step, no dependencies:
open `index.html` in a browser and that is the site.

```
python3 -m http.server 8899     # then http://localhost:8899
```

## Files

| file | what it is |
| --- | --- |
| `index.html` | the whole home page |
| `project-*.html` | one page per project, same shell |
| `styles.css` | the entire design system and every page's layout |
| `site.js` | header shadow, active nav link, reveal on scroll, the clock |
| `aquarium.js` | the fish tank |
| `images/` | photos and CAD screenshots |

## Design

Warm paper (`#f7f7ef`) with `#fcfcfa` cards, hairline ink borders, film grain
over everything, Fraunces for headings and Figtree for text, JetBrains Mono
for anything that ticks. The accent is sea (`#0d7a70`).

All of it is defined once as custom properties at the top of `styles.css`.
Change a token there and the whole site moves.

## The aquarium

`aquarium.js` mounts a tank into any element carrying `data-tank`, sized to
that element's own box and over-filled by a column so fish enter and leave
from behind the page. Click a tank to feed it. It stops simulating when it
scrolls out of view, and renders a single still frame under
`prefers-reduced-motion`.
