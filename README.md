# FoodieCare

FoodieCare is a final year BCA project built with Next.js 14.
It simulates AI-based food recognition and provides nutrition analysis with personalized diet tips.

## Tech Stack

- Next.js 14 (App Router)
- React (JSX)
- Tailwind CSS
- Next.js API Routes
- Local JSON nutrition database

## Features

- Upload a food image (demo upload)
- Enter food name for mock AI recognition
- Nutrition analysis from local data
- Personalized recommendation rules
- Mobile-responsive modern healthcare UI

## Supported Foods

- pizza
- burger
- apple
- salad
- rice
- pasta
- sandwich

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Open in browser:

```bash
http://localhost:3000
```

## API

- `POST /api/analyze`
  - Accepts multipart form data with:
    - `foodName`
    - `image` (optional, ignored for analysis)
  - Returns food nutrition values and recommendation text.

## Deployment

This app is ready to deploy on Vercel.

## License

MIT
