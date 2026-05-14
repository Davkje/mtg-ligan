import { getCommanders, getLeagues, getPlayerCommanderUsage, getPlayers } from "@/lib/data";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const [players, commanders, leagues, playerCommanderUsage] = await Promise.all([
    getPlayers(),
    getCommanders(),
    getLeagues(),
    getPlayerCommanderUsage(),
  ]);
  return (
    <RegisterForm
      players={players}
      commanders={commanders}
      leagues={leagues}
      playerCommanderUsage={playerCommanderUsage}
    />
  );
}
