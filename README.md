# Jewelry Vault

A phone-friendly jewelry inventory and listing manager.

## Categories

- N: Necklaces
- C: Chains
- B: Bracelets
- E: Earrings
- P: Pendants
- R: Rings
- W: Watches

Each category has its own numbering sequence.

## Quick test

Open `index.html` and choose **Use demo mode**. Demo mode saves records only in that browser.

## Permanent Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase-schema.sql`.
4. Copy the project URL and publishable key from Supabase project settings.
5. Open the app and paste both values.
6. Create your private account and sign in.

## Publishing the app

Upload this folder to GitHub Pages, Netlify, or Vercel. For iPhone use, open the published site in Safari and choose **Add to Home Screen**.

## Important

Demo mode is not a permanent backup. Use Supabase for the real inventory.


## Core fields for every item

Each jewelry record now includes:
- Description
- Designer / maker
- Material
- Stone, if any
- Length
- Width
- Weight in grams
- Hallmark / stamp
- Special notes
- Price


## Required fields

Only these fields are required:
- Category
- Inventory number
- Description

Condition and all other item details are optional and may be added later.
