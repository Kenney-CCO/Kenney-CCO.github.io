# Clone.Tools
A template for showcasing your `.glb` 3D models.

## Setup
1. Fork this repo.
2. Create a Supabase project ([guide](https://supabase.com/docs/guides/auth)) and get your URL and anon key.
3. Update `config.json`:
   - `repoOwner`: Your GitHub username.
   - `repoName`: Your `.glb` repo (create if needed).
   - `supabaseUrl` & `supabaseAnonKey`: From Supabase.
   - `siteTitle`, `creatorName`, `creatorAvatar`: Customize your site.
4. Tag your fork with `glbtools` (Settings > Tags).
5. Deploy on GitHub Pages (Settings > Pages > Branch: main).

## Usage
- Upload `.glb`, `.txt`, and `.png` files via the portal.
- View your models on `https://<your-username>.github.io/clone.tools`.