import { getCommanders, getLeagues, getPlayers } from "@/lib/data";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const [players, commanders, leagues] = await Promise.all([
    getPlayers(),
    getCommanders(),
    getLeagues(),
  ]);
  return <RegisterForm players={players} commanders={commanders} leagues={leagues} />;
}
