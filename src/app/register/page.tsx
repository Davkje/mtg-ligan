import { getPlayers } from "@/lib/data";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const players = await getPlayers();
  return <RegisterForm players={players} />;
}
