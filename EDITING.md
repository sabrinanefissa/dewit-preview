# Editing the site

The site is edited through a small form-based editor, not by editing the page
directly. Changes go through a review step before they go live.

## Open the editor

Go to `https://sabrinanefissa.github.io/dewit-preview/admin/`.

## Sign in

The editor signs in with a GitHub access token instead of a password.

1. On GitHub, go to **Settings → Developer settings → Personal access tokens
   → Fine-grained tokens** and create a new token.
2. Give it access to only the `dewit-preview` repository.
3. Under **Permissions → Repository permissions**, set:
   - **Contents: Read and write**
   - **Pull requests: Read and write**
4. Generate the token and copy it (you won't be able to see it again).
5. On the editor's sign-in screen, choose **Sign in with Token** and paste it
   in.

Keep the token somewhere safe (a password manager). If you ever need to
revoke access, delete the token on GitHub.

## Edit a page

Open **Pages** in the sidebar, then **Home** or **Speaking**. The page is a
list of blocks (Hero, The through-line, Three talks, and so on) in the order
they appear on the page. Open a block to expand it, change any text, image or
setting, and the editor saves your place as you go.

**Save** does not publish anything — it creates a draft (see **Publish**
below).

## Reorder, duplicate or remove a block

Each block in the **Blocks** list has drag handles and buttons to move it up
or down, duplicate it, or delete it. Duplicating a block is safe: give the
copy its own **Block id** (see the hint under that field) so links and
accessibility don't collide with the original.

A block also has a **Show on page** switch — turn it off to hide a block
without deleting it.

## Add an image or video

Click into an image field and upload a file. A few notes:

- **Sizes**: the site can serve a smaller image to a phone and a larger one
  to a desktop screen, but only if you upload the different sizes yourself,
  named like `photo-520.webp`, `photo-860.webp`, `photo-1280.webp` (same
  name, a dash, then the width in pixels, same extension). If you upload
  only one file, that one size is used everywhere — which still works, just
  less efficiently.
- Videos go through the same kind of field; there's no automatic resizing
  for video, so upload a file that's already reasonably sized for the web.

## Timings and backgrounds

Every block has a **Settings** group at the bottom with:

- **Background** — the section's tone (plum, dark plum, ink, paper, or
  transparent so the page shows through).
- **Motion** — a handful of numbers that control that block's animation
  (how much scroll it takes to turn a step, how long a fade takes, and so
  on). Each field's hint says what it does and what the default is. Leave a
  motion field blank to use the default; you don't need to fill in every
  number.

## Colours and fonts

Open **Site → Theme**. Colours use a colour picker; fonts and the motion
timings underneath them are text values for anyone comfortable editing CSS
values (font stacks, `clamp()` sizes, easing curves) — leave them alone
unless you mean to change the whole site's look.

## Preview

Every save creates a draft. Vercel automatically builds that draft and posts
a **preview link** as a comment on its pull request on GitHub — open the
**Pull requests** tab on the repository to find it. The preview is the full
site with your change, safe to share for a look before anything goes live.

## Publish

In the editor, open the **Workflow** view (drafts move through **Draft →
In review → Ready**). Set a draft to **Ready**, then **Publish**. This merges
the draft's pull request into `main`. Vercel rebuilds the live site
automatically — the change appears in about a minute.

## Undo

If something published that shouldn't have:

1. On GitHub, find the commit that made the change (the repository's
   **Commits** list, or the merged pull request).
2. Open it and click **Revert**. That creates a new pull request that undoes
   exactly that change; merge it the same way.

This always works, even for changes made a while ago — nothing is ever lost,
only added to on top.

## Things you can't break vs. things that need a developer

**Safe to do yourself, any time:**
- Edit any text, image, video or link in a block.
- Reorder, duplicate, hide or remove blocks.
- Add or remove items in a list (lines, chapters, talks, steps, counters,
  rooms, logos, words...).
- Change a block's background tone or motion timings.
- Change colours, fonts and site-wide chrome (nav, footer, contact details).

**Needs a developer:**
- A brand-new kind of block (something not already in the **Blocks** list).
- A new animation or interaction that doesn't exist yet.
- Changing how many candles, chapters or talks a *type* of block is allowed
  to have (the ranges noted in each block's hints, e.g. "3–9 lines") are
  soft limits the design was built and tested for — going further may still
  build, but hasn't been checked for how it looks or animates.
