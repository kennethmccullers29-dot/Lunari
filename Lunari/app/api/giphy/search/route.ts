import { NextRequest, NextResponse } from "next/server";

interface GiphyGif {
  id: string;
  images: {
    original: { url: string };
    fixed_width_small: { url: string };
  };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Giphy not configured" }, { status: 500 });
  }

  const giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=20&rating=pg-13`;

  const res = await fetch(giphyUrl);
  if (!res.ok) {
    return NextResponse.json({ error: "Giphy request failed" }, { status: 502 });
  }

  const json = await res.json();
  const results = (json.data as GiphyGif[]).map((gif) => ({
    id: gif.id,
    url: gif.images.original.url,
    previewUrl: gif.images.fixed_width_small.url,
  }));

  return NextResponse.json({ results });
}
