# GitHub Profile Makeover — Setup

## 1. Create the special profile repository

1. Open GitHub and create a **public** repository.
2. The repository name must be exactly your GitHub username.
   - Your profile repository must be named `suryakantarora`.
3. Enable **Add a README file** or create an empty repository.
4. Clone the repository locally and copy the contents of this package into its root.

## 2. Replace the placeholders

Search all files for these placeholders and replace them:

- `YOUR_GITHUB_USERNAME` → `suryakantarora` (already filled in the README).

The GitHub username and portfolio URL are already filled in. Review your name, experience text, and public repository links before publishing.

## 3. Enable contribution animation

1. Commit and push the files to the repository's `main` branch.
2. Open **Settings → Actions → General**.
3. Under Workflow permissions, select **Read and write permissions** and save.
4. Open **Actions** and run **Generate contribution snake** once using **Run workflow**.
5. Wait for the workflow to finish. It creates an `output` branch.
6. The README references the generated SVG from that branch.

If your organization blocks write permissions, the snake workflow cannot publish until the repository or organization policy allows it.

## 4. Suggested repository layout

```text
<your-github-username>/
├── .github/
│   └── workflows/
│       └── snake.yml
├── assets/
│   ├── hero.svg
│   ├── engineer-card.svg
│   └── status-panel.svg
├── README.md
├── SETUP.md
└── .gitignore
```

## 5. Preview and maintain

- Check the profile page after pushing; GitHub may take a short time to refresh remote images.
- GitHub README supports Markdown and sanitized embedded images/SVG, not arbitrary page CSS or JavaScript. This design uses SVG artwork and image-based cards to create the immersive look.
- GitHub stats and streak cards are third-party services. They may occasionally be rate-limited or unavailable; the profile itself will still render.
- Keep the README concise enough that the visual sections remain the focus.
- Add links to real public repositories under **FEATURED ENGINEERING** once you choose which projects to showcase.

## 6. Optional: replace external stats cards

The README uses `github-readme-stats` and `streak-stats` hosted services. For more reliability and control, deploy your own instances or remove those image elements. Never add a personal access token to the README or commit one into the repository.
