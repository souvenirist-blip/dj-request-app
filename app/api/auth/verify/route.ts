import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    if (session?.value) {
      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json({ authenticated: false });
    }
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { authenticated: false, error: "認証確認エラー" },
      { status: 500 }
    );
  }
}
