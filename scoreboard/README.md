# Scoreboard setup

The game stores scores in a Google Sheet through a small Apps Script web app
(`Code.gs` in this folder). One-off setup, about five minutes:

1. Create a new Google Sheet, e.g. "Firm Capacity scores".
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the starter code, paste in everything from `Code.gs`, and save.
4. Click **Deploy → New deployment**. Choose type **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy** and approve the permissions prompt.
6. Copy the **Web app URL** (it ends in `/exec`) and set it as `SCORE_URL`
   near the top of the script in `index.html`.

Scores appear in a **Scores** tab in the sheet. Delete a row there to remove
an entry from the scoreboard.

If you later change `Code.gs`, use **Deploy → Manage deployments → Edit →
New version** so the URL stays the same.

## Updating to version 2 (daily challenge boards and name filter)

`Code.gs` now stores a **Mode** column (free play or the day's challenge),
shows each player's best score only, and rejects rude names. To switch it on:

1. Open the sheet, then **Extensions → Apps Script**.
2. Replace all the code with the new `Code.gs` from this folder and save.
3. Go to **Deploy → Manage deployments**, click the pencil icon on the
   existing deployment, set **Version** to **New version**, and click
   **Deploy**. Don't use **New deployment**, or the URL will change.

Until this is done, the game still works: daily scores go on the free play
board and the daily board shows "coming soon".

## Updating to version 3 (control room game)

Version 3 adds scoreboards for the control room switching game at
`/control-room/`, alongside the generation game. It stores two extra
columns: customers off (MW·min) and switching incidents.

Update it the same way: paste the new `Code.gs` into Apps Script, save, then
**Deploy → Manage deployments → Edit (pencil) → Version: New version →
Deploy**. Until then, the control room game shows its scoreboard as "coming
soon" and players can still carry on after a shift.

## Version 4 (a tab for each game)

Scores are now kept on two tabs: **Scores** for the generation game and
**Control room scores** for the control room game. The new tab is created
automatically the first time someone submits a control room score. Paste in
the new `Code.gs`, save, then **Deploy → Manage deployments → Edit (pencil)
→ Version: New version → Deploy**.

## Version 5 (12-hour control room shift)

The control room game now runs 08:00 to 20:00, so the script accepts a
720-minute full shift for it. Update it the same way: paste, save, then
**Deploy → Manage deployments → Edit (pencil) → New version → Deploy**.

## Feedback emails (version 6)

Both games have a **Feedback** button. Messages are saved on a **Feedback** tab in the
scoreboard spreadsheet and emailed to the Google account that owns the script.

To switch it on:

1. Paste the new `Code.gs` into the Apps Script editor and save.
2. Pick `sendTestFeedbackEmail` in the function list and press **Run**. Allow the
   permission to send email when asked. A test email should arrive.
3. **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy.**
   Keep the same deployment so the web app URL doesn't change.

At most 20 feedback messages are accepted in any 10 minutes, to protect the daily email quota.

## Version 12 (EV evening and the domain lock)

Accepts scores for the new **EV evening** control room shift (`ev`), and only
accepts scores sent from the games on `der-dash.github.io`. Copies of the game
re-hosted on other websites get "Invalid score". Paste in the new `Code.gs`,
save, then **Deploy → Manage deployments → Edit (pencil) → Version: New version
→ Deploy**.

The check uses the website name the game sends with each score, because Apps
Script can't see where a request came from. It stops copies of the game from
posting scores, but someone deliberately faking requests could still get past it.

## Version 13 (Christmas Day)

Accepts scores for the new **Christmas Day** control room shift (`xmas`). Paste in
the new `Code.gs`, save, then **Deploy → Manage deployments → Edit (pencil) →
Version: New version → Deploy**.

## Version 14 (career sync across devices)

Players can save their career with a name and a 4-digit PIN and carry it on another
phone or computer. Careers are kept on a new **Careers** tab, created automatically the
first time someone saves one: one row per name, with the control room and generation
careers in their own columns and a star total for each.

- The PIN is never stored. The sheet only holds a scrambled version of it (a salted
  SHA-256 hash), and the salt is kept in the script's properties, not the sheet.
- Saving merges with what is already there: the best stars for each shift and every
  achievement, so playing on two devices never loses anything.
- Five wrong PINs for a name locks that name for 15 minutes.
- **Forgotten PIN:** delete that player's row on the Careers tab. They can then save
  again under the same name with a new PIN, and their own devices still have their career.

Paste in the new `Code.gs`, save, then **Deploy → Manage deployments → Edit (pencil) →
Version: New version → Deploy**. It is safe to deploy before the game update: scores and
feedback work exactly as before.
