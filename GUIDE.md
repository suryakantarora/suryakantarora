# Build your own profile dashboard

This guide takes you from nothing to a GitHub profile like [github.com/suryakantarora](https://github.com/suryakantarora): a stack of animated cards that refresh themselves every day from your live GitHub data.

It takes about 30 minutes. You copy this repository, replace the personal details with your own, and turn on two GitHub Actions workflows.

For how the pieces work once it is running, see [SETUP.md](SETUP.md).

## What you need

- A GitHub account.
- `git` and Node.js 20 or newer on your machine. The generator has no other dependencies, so there is nothing to `npm install`.
- A square photo of yourself (optional). Without one, the top "who's at the keyboard" card is skipped.
- `ffmpeg` (optional), only if you want the waving animation on that card.

In the commands below, replace `YOUR_USERNAME` with your GitHub username.

## Step 1: Create your profile repository

GitHub shows a README on your profile page when it lives in a public repository named exactly like your username.

1. On GitHub, create a new repository named `YOUR_USERNAME`.
2. Make it **public**.
3. Leave it empty: no README, no licence, no `.gitignore`.

## Step 2: Copy this repository into it

```bash
git clone https://github.com/suryakantarora/suryakantarora.git YOUR_USERNAME
cd YOUR_USERNAME
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_USERNAME.git
```

## Step 3: Remove the original owner's files

These are personal pictures and generated output. The output is rebuilt for you later.

```bash
rm -f assets/coder.jpg assets/wave.jpg assets/intro-*.svg coder.png
rm -rf profile-3d-contrib
```

Then add your own picture, or go without:

- **With a photo:** save a square JPEG, about 560×560, as `assets/coder.jpg`.
- **Without a photo:** open `README.md` and delete the `<div>` block that shows `assets/intro-animated.svg`.

## Step 4: Fill in your public GitHub profile

Some values are read from your GitHub account, not from this repository. Set them under **GitHub → Settings → Public profile**:

- Company
- Location
- Profile picture (used on the ID badge)

Your repository count, star count and the "Also on GitHub" table also come from your account automatically.

## Step 5: Edit your details in the generator

Open `scripts/generate.mjs`. Everything in the `PROFILE` object at the top is yours to change:

| Field | Where it appears |
|:--|:--|
| `user` | Your GitHub username. Change the default so local runs fetch your data. |
| `name`, `role` | Banner and top card. |
| `shell` | The terminal prompt line on the banner. |
| `typing` | The lines that type themselves out on the banner. |
| `positioning` | The small pills under the banner text. |
| `tagline` | Two lines of intro text on the banner. |
| `yearsExperience` | Banner tile and stats card. |
| `portfolio`, `topics` | The "connect" card at the bottom. |
| `focus`, `depth` | The stats card. |
| `coreTools` | The seven large tool tiles. Keep it to seven. |
| `moreTools` | The small tool pills, five per row. |
| `hiddenRepos` | Repositories to leave out of the "Also on GitHub" table. |

Each tool is a `[slug, label, colour]` entry. The slug must exist in `scripts/icons.json`. To add a tool that is not there, copy its SVG path from [Simple Icons](https://simpleicons.org) into `scripts/icons.json` under a new slug.

## Step 6: Rewrite the text that is not in `PROFILE`

A few cards have their wording written directly in their functions in `scripts/generate.mjs`. Search for each and replace the text with your own:

| Function | What to change |
|:--|:--|
| `intro()` | The `DOMAIN` row ("Banking & Payments · Distributed Systems"). |
| `pipeline()` | The pipeline stage names, if yours differ. |
| `about()` | The "My engineering way" heading and the three principles under it. |
| `stats()` | The `STACK` field on the ID badge ("Java"). |
| `connect()` | The "Let's build something reliable" heading. |

## Step 7: Update the README

Open `README.md` and change:

1. `suryakantarora` to `YOUR_USERNAME` in four URLs: the "See all repositories" link, the two snake image URLs, and the "Follow" badge link. The links inside the table fix themselves on the next run.
2. The portfolio badge link (`suryakantarora.com`) to your own site, or delete that badge.
3. The `alt` text on each image so it describes you.
4. The footer line, if you want different wording.

Leave the `<!-- FEATURED:START -->` and `<!-- FEATURED:END -->` markers in place. The table between them is rewritten on every run.

## Step 8: Preview locally

```bash
node scripts/generate.mjs
```

This writes the cards to `assets/` and rewrites the table in `README.md`. Open any card in a browser to see it animate:

```bash
open assets/hero.svg
```

If the script stops with `GitHub API ... 403`, you have hit GitHub's limit for anonymous requests. Create a [personal access token](https://github.com/settings/tokens) (no scopes needed for public data) and run:

```bash
GITHUB_TOKEN=your_token node scripts/generate.mjs
```

## Step 9: Push and switch on the workflows

```bash
git add -A
git commit -m "My profile dashboard"
git push -u origin main
```

Then, in your repository on GitHub:

1. Go to **Settings → Actions → General → Workflow permissions**, select **Read and write permissions**, and save. Without this, the workflows cannot commit the refreshed cards.
2. Go to **Actions → Refresh profile cards → Run workflow**. This regenerates the cards and creates the `profile-3d-contrib/` folder for the contribution skyline.
3. Go to **Actions → Generate contribution snake → Run workflow**. This creates the `output` branch that holds the snake animation.

Both workflows then run on their own every day.

## Step 10: Check your profile

Open `https://github.com/YOUR_USERNAME`. You should see the full dashboard. The skyline and the snake appear once their workflows have finished for the first time.

## Optional: the waving animation

The top card can play a short loop instead of showing a still photo. You need a clip of about four seconds. Turn it into a sheet of frames with `ffmpeg`:

```bash
ffmpeg -i clip.mp4 -vf "fps=12,crop=720:720:190:0,scale=384:384:flags=lanczos,tile=8x6" -frames:v 1 -q:v 8 assets/wave.jpg
```

Adjust the `crop` values so the square frames you and your hand. Then regenerate and push. [SETUP.md](SETUP.md) explains the frame layout and what to change if your clip has a different length.

## Troubleshooting

| Problem | Fix |
|:--|:--|
| `git push` is rejected | The daily workflow committed refreshed cards before you pushed. Run `git pull --rebase origin main`, then push again. |
| The profile still shows an old card after a push | GitHub or your browser is serving a cached image. Wait a few minutes. If it persists, rename the card file and update its name in `README.md` and in the `out` object at the bottom of `scripts/generate.mjs`. |
| A card opened directly from its `raw` URL shows no photo | That is expected. GitHub blocks embedded pictures when an SVG is opened on its own. Judge the result on your profile page. |
| The skyline or snake image is broken | Its workflow has not finished yet. Run it from the **Actions** tab. |
| The workflow fails at the commit step | Workflow permissions are still read-only. See step 9. |
| No "who's at the keyboard" card is generated | Neither `assets/coder.jpg` nor `assets/wave.jpg` exists. Add one, or remove that image from `README.md`. |
