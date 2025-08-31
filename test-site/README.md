# Parrot Voice — Next.js + Vercel + Private HF Space

## Kako pokrenuti
1. Napravi novi repo na GitHub-u i ubaci folder **test-site/** (ili uploaduj ZIP).
2. Na Vercel-u importuj repo.
3. U Project Settings → **Root Directory** postavi `test-site`.
4. U **Environment Variables** dodaj:
   - `HF_SPACE` = `Korisnik/NazivSpacea` (npr. `Adam995/parrot_voice`)
   - `HF_TOKEN` = tvoj Hugging Face Access Token (Space je private)
5. Deploy (po mogućnosti **Clear cache**).
6. Otvori sajt i testiraj upload. Sajt šalje posao, a zatim poll-uje status dok ne dobije `audio/wav`.

Napomena: Ako Space prvi put “spava”, prva obrada može potrajati (cold start).
