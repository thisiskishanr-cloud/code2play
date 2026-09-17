Optional: vendored fonts for fully offline use.

The game loads Anton and IBM Plex Sans from Google Fonts. Without a network
connection it falls back to the system stacks declared in css/style.css and
still runs — the HUD just looks less tight.

To bundle them instead:

1. Download the families (both are Open Font License):
     https://fonts.google.com/specimen/Anton
     https://fonts.google.com/specimen/IBM+Plex+Sans
2. Drop the .woff2 files in this folder, e.g.
     assets/fonts/Anton-Regular.woff2
     assets/fonts/IBMPlexSans-Regular.woff2
     assets/fonts/IBMPlexSans-SemiBold.woff2
3. Uncomment the @font-face block at the top of css/style.css.
4. Delete the three <link> tags for fonts.googleapis.com in index.html.
