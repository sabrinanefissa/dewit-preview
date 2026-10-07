# Handoff: Dr. Stephen de Wit website (Sabrina)

Paste this file into a new chat (or point the new chat at `handoff/HANDOFF.md` in the repo) to pick up where we left off.

## 1. Who and what

- **Me (the user):** Sabrina, a web designer. Email sabrinanefissa@gmail.com.
- **Client:** Dr. Stephen de Wit, a keynote speaker on human connection and relational intelligence. His current site is https://drdewit.com/.
- **His colleague:** Brent (L Squared). Sabrina also made L Squared a homepage mockup.
- **Repo:** `sabrinanefissa/dewit-preview` (GitHub).
- **Working branch:** `claude/exciting-mendel-t9vkgt`. Everything is also pushed to `main`, which deploys.
- **Live concept site (GitHub Pages):** https://sabrinanefissa.github.io/dewit-preview/
  - Speaking page: https://sabrinanefissa.github.io/dewit-preview/speaking/
  - Editor (Sveltia CMS): https://sabrinanefissa.github.io/dewit-preview/admin/. See `EDITING.md`.
- **Deploy:** the `.github/workflows/pages.yml` GitHub Action builds `_site` on push to main. If Pages ever 404s (for example after toggling the repo private and back), go to Settings > Pages and set Source to "GitHub Actions", then re-run pages.yml.
- **Netlify option:** a split zip of the built site was made, `dewit-site.zip` plus `.z01`–`.z04` at 28MB each, because the send limit is 30MB. It lived in the old session's scratchpad, so rebuild it if it's needed (`npm run build`, then zip `_site`).

## 2. My working rules (follow these)

- **Model use:** Fable plans and reviews only. A cheaper model does the building. Never build with Fable.
- **Big builds:** before any major new build, show the plan and wait for my yes.
- **Pushing:** once I've seen a change, push it live without asking ("PUSH LIVE STOP ASKING ME").
- **Mobile:** mobile matters exactly as much as desktop. Check both on every change.
- **Repo hygiene:** no pull requests unless I ask. No model IDs in commits, code or anything else in the repo.
- **Commit footer:**
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WzDdbUoD3YvZzaMURB5SSu
  ```
- **Feedback:** give direct feedback and one clear recommendation. Don't hedge or list options. Say plainly whether something is good or not.
- **"Run it by the teams and directors":** spawn reviewer agents on Fable (account director, creative director, copy editor), each with a tight brief. Apply what's right, and reject anything that goes against my decisions. Tell me what you took and what you didn't, briefly.
- **Email text:** paste it in chat as plain text. No blockquotes and no code blocks, because they paste with a bar or a black highlight. Also save it as a .txt file. No em dashes.

## 3. Tech overview

- **Stack:** Eleventy 3 with Nunjucks "blocks".
  - Content lives in `content/pages/*.json` and `content/site.json` (nav, description).
  - Templates are in `src/_includes/blocks/*.njk`. Eleventy input is `src`, output is `_site`.
  - Styles are in `css/main.css`. Scripts are in `js/main.js` (ES5, module sections marked with `/* ===== ... */`).
  - The CMS config is `src/admin/config.yml`.
- **Motion:**
  - Lenis smooth scroll is on the speaking page only.
  - Pinned or sticky scroll stages are used throughout.
  - A shared `constellation()` canvas (`window.spkConstellation`) drives the bleed blocks:
    - champagne glow hotspots that zoom in;
    - on PC, hover makes hotspots glow and clicking jumps back to that part;
    - you can tap/hold and drag to join dots on phones, or drag on PC;
    - deep sky, distant shooting stars.
  - Skip button (`.pinskip`):
    - a long horizontal arrow with "Skip" on the arrow's line;
    - it appears at the first sign of hurrying (fast scroll, a big wheel delta, flicks, a quick swipe or a tap).
  - Candle wheel (module 7.A, desktop and mobile). It's due to be cut; see section 6.
- **Local checks:**
  - Run `npm run build`, then `cd _site && python3 -m http.server 8094`.
  - Take Playwright screenshots on desktop and phone. Chromium is at `/opt/pw-browsers`.
- **Last commits:**
  - `43da849`: original through-line restored on Home (live).
  - `6c1df74`: constellation interactions.

## 4. History in one paragraph

The homepage went out first, in separate email threads, and Stephen loved it. Then Sabrina built the Speaking page as an all-out showcase: candle wheel, pinned chapters, constellation, AI-assisted "custom images" mixed with real photos, and many custom animations. She sent it with a long email (`previous-email-from-sabrina.txt`) that called the homepage a "rough homepage preview" and the speaking page the place where she "pushed the experience further". That email also offered to drop the AI images, invited honest feedback, used the candles as the example, and asked for vertical video. Stephen replied with a 7-minute video (`stephen-video-transcript.txt`).

## 5. Stephen's feedback (from the video)

- **Audience:** executives, meeting planners and HR professionals.
- **Harvard / Hollywood / Heart:** this is how he balances his talks. He will send percentages for the website, and those become the brief for each page.
- **Content first:** lean towards information first that's still "interesting and intriguing". "That's where your magic comes in." He wants people to think he's "not your usual speaker".
- **No AI imagery at all,** "especially on my human connection website".
- **Candles:** too Hollywood. He agrees with Brent, who said they look like a "church pastor's" site.
- **Private practice:** keep it (Sex Life Unleashed) off the site. The site is about the business of speaking.
- **Couple images:** the intimate couple images have to go. Images must be in a business, professional setting. Two people together is fine.
- **Consultation:** he asked what the "Consultation" menu item was.
- **Through-line:** he loved the original through-line from the first homepage. It's already restored and live.
- **Video:** he has no vertical video. He'll capture B-roll and vertical footage at a BC conference on **October 21**.
- **Omar:** he mentioned Sabrina to his friend Omar, who owns businesses in BC and is redoing his website.
- **One-on-one:** he offered a meeting if useful. Sabrina doesn't want to mention a call in the reply.
- **Birthday:** it was Nate's 50th ("Captain Longballs"). The final email dropped the birthday line.

## 6. Promised site changes (from the reply email)

None of these are done yet. Do them after the email is sent, and confirm with me first since they're a build.

1. **Remove all AI images** site-wide and use real photography only.
2. **Remove the candles** (the candle wheel module and candle imagery).
3. **Remove the "Consultation" nav item.** It's in `content/site.json` lines ~104 and ~139 and points to `#consultation`, which doesn't exist. Every enquiry goes through Book Stephen.
4. **Remove the sexology references:**
   - `content/site.json:31` (description);
   - `content/pages/home.json:329` (lead) and the credentials around lines 331–333;
   - `content/pages/speaking.json:362` (bio line).

   These are only in the concept site, not his live drdewit.com. They came from the first build commit (`1071113`).
5. **Make all images professional and corporate.** No intimate couple imagery.

## 7. Speaking page redesign: pending my yes

Fable's earlier plan:
- keep the reel hero;
- cut the candle wheel and pinned chapters;
- talk cards with outcomes;
- a formats table;
- a visible section for meeting planners;
- proof (logos and testimonials, which Stephen sent);
- real photos only.

Update it for:
- Stephen's Harvard/Hollywood/Heart percentages, once they arrive;
- "lead with information and easy navigation, with a few animations working tastefully in the background";
- whichever animations Stephen says he liked (the email asks him).

Also still planned from the earlier email: a search bar, nav that reappears on scroll-up, skip options, and a mobile-specific rebuild.

## 8. The reply email (current state)

The latest draft is in `reply-email-to-stephen.txt`. It has **not been sent yet**, and I may still want edits. Key decisions in it, which must not be undone:

- **Tone:** agree with him ("You're right on every point") and stay open to criticism, without looking clueless or defensive.
- **Speaking page framing:** it was intentionally pushed all the way to the Hollywood end, with every animation on one page so he could see them all. She would never put that much on one page of the final site, because it turns immersive into gimmicky. The final site uses a few, balanced with Harvard and Heart.
- **Order:** "I love the Harvard, Hollywood and Heart framework" comes **before** using it to explain the speaking page.
- **"Preview":** say it was the wrong word on her part. It previewed the elements, not the site. This goes **after** the explanation.
- **Consistency with her previous email:**
  - she had already started building, so never say "the build hasn't started" or "before I build anything";
  - reuse her phrase "the speaking page was where I pushed the experience further".
- **Wording:** use "won't include", never "remove". It's a concept, so there's nothing to remove.
- **Imagery paragraph:**
  - no AI;
  - real photography only (not "photos of you", since stock or business images may be needed);
  - candles out, "You and Brent are right";
  - the couple images were meant to show how his ideas carry over beyond work, and every image will be professional and corporate. Don't call them "placeholders", because her last email presented the custom images as intentional.
- **Animation question:** the candles were only the imagery, and the animations can work with any images. Ask which animations stood out to him.
- **Consultation and credentials:**
  - Consultation was a placeholder, not a reference to his private practice. It won't be included, and enquiries go through Book Stephen.
  - Sexology credentials: they were included in the mockup because they show how deep his expertise in human connection runs. On the real site they could lead people straight to his private practice, so they won't be included. Don't imply it was a mistake.
- **B-roll:** thank him for offering it on Oct 21, which helps the mobile version and adds genuine human moments.
- **No:** call or meeting mention, birthday line, dated next step, emojis, or em dashes.
- **Close:** "Thanks again… excited to bring it all together." then "All my best, Sabrina".

## 9. Files in this folder

- `HANDOFF.md`: this file.
- `reply-email-to-stephen.txt`: the latest draft reply (unsent).
- `previous-email-from-sabrina.txt`: Sabrina's last email to Stephen, sent with the speaking page.
- `stephen-video-transcript.txt`: the transcript of Stephen's video feedback.
