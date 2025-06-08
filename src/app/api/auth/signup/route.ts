import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/src/lib/prisma";

export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const data = {
    email,
    password: hashedPassword,
    name,
  };

  await prisma.user.create({ data });

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth", "true", { httpOnly: true, path: "/" });

  return response;
}
