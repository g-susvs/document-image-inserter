import bcrypt from "bcrypt";
import prisma from "../lib/prisma";

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  await prisma.user.create({
    data: {
      email: "test@example.com",
      password: hashedPassword,
    },
  });

  console.log("✅ Usuario creado");
}

(() => {
  main();
})();
