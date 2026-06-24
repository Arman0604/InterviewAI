import { cookies } from "next/headers";
import { signToken, verifyToken, type JWTPayload } from "@/lib/token";

export { signToken, verifyToken };
export type { JWTPayload };

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(payload: JWTPayload): Promise<string> {
  return await signToken(payload);
}
