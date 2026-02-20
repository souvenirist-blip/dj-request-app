import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "パスワードが必要です" },
        { status: 400 }
      );
    }

    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      console.error("ADMIN_PASSWORD environment variable is not set");
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    if (password === correctPassword) {
      const sessionToken = Buffer.from(
        `${Date.now()}-${Math.random()}`
      ).toString("base64");

      const cookieStore = await cookies();
      cookieStore.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24時間
        path: "/",
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "パスワードが間違っています" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "ログイン処理エラー" },
      { status: 500 }
    );
  }
}
