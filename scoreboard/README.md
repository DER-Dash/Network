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
