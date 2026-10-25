# Persian Kabab Showdown

A blind kabab taste test, turned into a 15-slide reveal.

| File | What it is |
|---|---|
| **`index.html`** | The published slides (generated). This is what GitHub Pages serves. |
| **`setup.html`** | The Studio: upload survey results, describe the restaurants, add pictures, preview, and export. |
| `kabab-showdown-setup.json` | The saved setup (restaurant key, prices, pictures, name matches). |
| `data/*.xlsx` | The survey exports (the `*_Corrected.xlsx` files are the ones in use). |
| `build.js` | Regenerates `index.html` (and `assets/`) from the setup + `data/`. |

No install, no server: open `setup.html` or `index.html` by double-click (Chrome, Edge, Firefox, Safari).

## Publishing on GitHub Pages

1. Repo → **Settings → Pages → Deploy from a branch → `main` / root**.
2. The slides are at `https://<user>.github.io/<repo>/` (`index.html`). The Studio is at `…/setup.html`.

## Changing the data (regenerating `index.html`)

Pick whichever is easiest:

* **Replace the Excel files and rebuild.** Put the new exports in `data/` under the same names as `file1` / `file2` in the setup file, then run `node build.js` (Node 16+, no `npm install`). It re-reads the Excel files, re-matches names, and rewrites `index.html` and `assets/`.
* **Automatic.** `.github/workflows/build.yml` runs `node build.js` on GitHub whenever `kabab-showdown-setup.json`, `data/`, `js/` or `css/` change on `main`, and commits the new `index.html`. (Repo → Settings → Actions → General → Workflow permissions must allow read & write.)
* **From the Studio.** Open `setup.html`, change things, then either **Download index.html** (self-contained, pictures embedded; drop it into the repo) or **Save setup file** and replace `kabab-showdown-setup.json`.

`node build.js --inline` embeds the pictures in `index.html` instead of writing `assets/`.

## Using the Studio (`setup.html`)

1. **Event**: title, tagline, date, `$` symbol, logo, title photo, group photo.
2. **Survey results**: drop the *before* and *after* exports (`.xlsx` / `.csv`).
3. **Restaurants**: tick which were served, give each its kabab number and price — or upload a key file (`kabab number · restaurant · price`).
4. **Tidy-up** (only if needed): spelling variants and guest matching across the two surveys are auto-detected; fix any that are wrong.
5. **Private numbering** (optional, off by default): see below.
6. **Kabab pictures**: one per kabab, for the winner slide.
7. **Publish**: download `index.html`. **Preview the slides** runs the show right in the page. Everything is saved in your browser; **Save setup file** / **Load setup file** back it up.

"Preview with demo data" fills everything with fake results.

## Presenting

| Key | Action |
|---|---|
| `→` `Space` `Enter` / click | next step or slide |
| `←` `Backspace` | back |
| `F` | fullscreen |
| `X` (or the 🧮 button) | **What if…?** — interactive table, see below |
| `1`–`9`, `0` | jump to slide |
| `E` | back to setup (preview only) |

### What if…? (alternative results)

Press `X` at any time. Every guest is a chip; untick people to see the final table recomputed without them (rank, average score, price guesses, and ▲▼ change versus everyone). It says whether the winner changes. "Everyone / Nobody / Invert" are shortcuts. Nothing is saved; close it with `X` / `Esc`.

## The 15 slides

1. Welcome and headline numbers
2. **Hype Ranking** — best / worst perceived before eating
3. **Popularity Contest** — least / most popular, most divisive, cult favorite, most #1 votes, crowd favorite
4. **Mistaken Identity** — the real restaurant behind each number, accuracy vs chance, decoys, hardest / easiest, biggest mix-up
5. **Taste Detectives** — podium, wooden spoon, loyalty test, harshest / most generous
6. **Guest Leaderboards** — everyone ranked: best detectives, best price guessers, harshest → most generous
7. **The Price is Right** — guessed vs real prices, best guesser, steal of the night, sticker shock, big spender
8. **Plot Twists** — halo effect, does experience help, taste twins & opposites, wisdom of the crowd, money talks, the usual suspect
9. **Hype vs Reality** — most anticipated, underperformer, underdog, most underrated, heartbreaks (places 1–3 show "🔒 revealed at the end")
10. **Bang for the Buck** — taste points per $ (worst / best value), all restaurants named
11. **Everyone's Favorite** — each guest's highest-scored kabab
12. **The Popular Vote** — favorites and least favorites tally
13. **Taste Similarity** — guest-by-guest similarity heatmap, a 2-D "taste map" (closer = more alike), taste twins and opposites, who is most in tune with the room and the contrarian, how many pairs are kindred spirits or clash
14. **The Table** — last place up to 2nd; **the top 3 stay hidden until their turn**, #1 stays locked
15. **The Winner** 👑 — drum-roll, kabab number, then the restaurant, with confetti

Slides 10–12 show all the data and every restaurant name. The final placements are only revealed on the table (14) and the winner (15).

## Private numbering (optional)

If some guests (e.g. the organisers) were served with a *different* plate numbering, tick them in **Private numbering**. A friend who knows "their number → our number" (no restaurant names needed) opens the hand-over screen, enters it by hand or uploads a 2-column file, and locks it in. Those guests' guesses are then scored against *their* numbering and their ratings count toward the restaurant they actually ate. It is **off by default** and unused for this event.

The private numbering is stored in saved setup files only "sealed" (base64, not encryption), and `build.js` applies it automatically. Don't open the files before the event if you must not know it.

## Expected file format

Microsoft Forms exports: columns `ID, Start time, Completion time, Email, Name`, then the guest's typed name.

* **Survey 1**: a ranking column (restaurants separated by `;`, best first) and one optional 1–10 column per restaurant (empty = not tried).
* **Survey 2**: per kabab number a guess column, a rating column (header contains `امتیاز`/"rating") and a price column (header contains `قیمت`/"price"). The number is read from the header (Persian digits work).

Duplicate submissions from the same name are merged (latest wins). Persian names are fully supported. Winner = highest average blind rating; ties are shown as `4=` and broken by what guests would pay.

## Notes

* Libraries and fonts are bundled (`vendor/`, `fonts/`: SheetJS, Outfit, Playfair Display, Vazirmatn), so everything works offline.
* The published `index.html` contains the guests' names and responses; it is public once on GitHub Pages.
