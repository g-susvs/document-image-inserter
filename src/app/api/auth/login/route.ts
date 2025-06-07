import { login } from "@/src/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  console.log(body);
  const { email, password } = body.data;
  if (login(email, password)) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth", "true", { httpOnly: true, path: "/" });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
