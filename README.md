# Persian Kabab Showdown Studio

Turn the results of your blind kabab taste test into a 10-slide, projector-ready reveal.
No install, no server, no internet: **double-click `index.html`** (Chrome, Edge, Firefox or Safari).

## How to use

1. Open `index.html`.
2. **Event**: set the title, tagline, currency, and upload an event logo / title photo / group photo (all optional).
3. **Survey results**: drop in the two Excel exports (`.xlsx` or `.csv`) — *before eating* and *after eating*.
4. **Which restaurants were served?** Switch on the served restaurants, pick the kabab number each one was, and enter its price. Anything switched off is a decoy. Click a "+" square to add a restaurant logo.
5. **Tidy-up** (appears only if needed): the app auto-fixes spelling differences (e.g. "Caspian Kabob" → "Caspian Kebab") and matches guests between the two surveys by name. Correct anything it got wrong.
6. Optionally upload a photo per kabab for the winner reveal, then press **Start the presentation**.

Not ready yet? Press **Preview with demo data** to see the whole show with fake results.

Everything is saved in your browser, so you can close the page and come back. "Save setup file" exports a backup.

## Presenting

| Key | Action |
|---|---|
| `→` `Space` `Enter` / click | next step or slide |
| `←` `Backspace` | back |
| `F` | fullscreen |
| `E` | back to setup |
| `1`–`9`, `0` | jump to slide |

Each slide reveals its content in steps, and the last slide (the winner) is a two-step drum-roll: kabab number first, then the restaurant.

## Fair play for the organisers: private numbering

Guests whose plates were numbered differently (Amirabbas and Mina) are ticked in the **Private numbering** section (names containing "Amirabbas" / "Mina" are pre-ticked). Your friend only needs to know **their number → our number**; restaurant names are never shown to them.

1. Finish everything else on the setup page (survey files, restaurant key, prices).
2. Click **Hand over to your friend**. The page switches to a clean screen showing only kabab numbers — no restaurant names, results, prices or guesses. The setup page is removed from the page while it is open.
3. Your friend either picks, for each number on *their* plates, the matching number on *our* plates (each once), or uploads a 2-column Excel/CSV file (their number · our number). They review it and click **Lock it in**. Nothing is shown back.
4. The setup page then only says "Private numbering received (hidden)". The app combines it with your key (our number → restaurant), scores Amirabbas' and Mina's guesses against *their* numbering, and counts their ratings and prices toward the restaurant they actually ate.

The private numbering is **not** included in "Save setup file", so a backup can't leak it. (If you reload the page mid-way, you land back on the setup page.)

## Uploading everything straight into the app

Everything is uploaded in the web page; nothing needs to be sent anywhere else, and no data leaves your computer.

* Survey 1 and survey 2: the two Excel exports (section 2).
* Restaurant key (optional, section 3): an Excel/CSV with columns `kabab number · restaurant · price`, e.g. `1, Persian Plate, 18`. Or fill the table by hand.
* Private numbering: typed by your friend, or an Excel/CSV with `their number · our number`.
* Pictures and logos: the labelled upload boxes.

## The 10 slides

1. Welcome and headline numbers
2. **Hype Ranking**: best / worst perceived before eating
3. **Popularity Contest**: least / most popular, most divisive, cult favorite, most #1 votes, crowd favorite
4. **Mistaken Identity**: the real restaurant behind each number, overall accuracy vs chance, decoys, hardest / easiest kabab, biggest mix-up
5. **Taste Detectives**: most accurate guests podium, wooden spoon, loyalty test, harshest / most generous critic
6. **The Price is Right**: guessed vs real prices, best price guesser, steal of the night, sticker shock, big spender
7. **Hype vs Reality**: most anticipated, underperformer, underdog, most underrated, heartbreak and pleasant-surprise moments
8. **Bang for the Buck**: taste points per $ of menu price — worst and best value (ratings themselves stay hidden)
9. **The Countdown**: places last → 2nd (the #1 slot stays locked)
10. **The Winner** 👑

Slides 7–8 never reveal the #1 kabab (slide 7 shows "revealed at the end" instead of its finish position).

## Expected file format

Microsoft Forms exports: columns `ID, Start time, Completion time, Email, Name`, then the guest's typed name.

* **Survey 1**: a ranking column (restaurants separated by `;`, best first) and one optional 1–10 column per restaurant (empty = not tried).
* **Survey 2**: for each kabab number, a guess column, a rating column (header contains `امتیاز`/"rating") and a price column (header contains `قیمت`/"price"). The kabab number is read from the header (Persian digits work).

Duplicate submissions from the same name are merged (latest wins). Persian names are fully supported.

## Notes

* Prices are plain numbers shown with a `$` (you can change the symbol).
* Ratings per restaurant are average blind scores; the winner is the highest average (ties broken by what guests would pay).
* Libraries and fonts are bundled in `vendor/` and `fonts/` (SheetJS, Outfit, Playfair Display, Vazirmatn), so it works offline.
