import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LoginSchema } from '@/lib/zodSchema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // SERVER client so Supabase sets the session cookie on the response.
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = data.user;

    return NextResponse.json({
      ok: true,
      user: {
        _id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name ?? '',
        role: user.app_metadata?.role,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
