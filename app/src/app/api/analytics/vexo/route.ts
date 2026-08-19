import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('itemsPerPage') || '10';

  const res = await fetch(
    `https://api.vexo.co/external/apps/43a00e6b-17de-4160-b2ac-c368fd3c0981/events?page=${page}&itemsPerPage=${perPage}`,
    {
      headers: {
        Authorization: process.env.VEXO_API_KEY!,
      },
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch Vexo' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
