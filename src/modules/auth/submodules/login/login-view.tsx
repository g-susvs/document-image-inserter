"use client";

import { Button } from "@/src/shared/components/ui/button";
import { Input } from "@/src/shared/components/ui/input";
import { useForm } from "react-hook-form";
import { ILoginForm } from "./interfaces/login-form.interface";
import { useRouter } from "next/navigation";

export const LoginView = () => {
  const router = useRouter();
  const form = useForm<ILoginForm>();

  const onSubmit = async (data: ILoginForm) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
    'Content-Type': 'application/json',
  },
      body: JSON.stringify({ data }),
    });

    if (res.ok) {
      router.push("/home");
    } else {
      alert("Login fallido");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white p-4 flex flex-col gap-4 pb-6">
          <h1 className="text-3xl">Iniciar sesión</h1>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <Input
              placeholder="Ingresa tu correo"
              type="email"
              {...form.register("email")}
            />
            <Input
              placeholder="Ingresa tu contraseña"
              type="password"
              {...form.register("password")}
            />
            <Button type="submit">Iniciar sessión</Button>
          </form>
        </div>

        {/* Alert de garantía de preservación */}

        {/* Estado del procesamiento */}

        {/* Botones de acción */}
      </div>
    </div>
  );
};
