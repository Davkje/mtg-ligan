import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import MobileNav from "./MobileNav";
import "./globals.css";

const geist = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Ligan - MTG Commander",
	description: "Track standings and matches for your Commander league",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${geist.variable} h-full`}>
			<body className="min-h-full flex flex-col bg-background text-foreground antialiased">
				<header className="border-b border-border sticky top-0 z-50 bg-background/90 backdrop-blur">
					<div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
						<Link href="/" className="font-bold text-accent text-lg tracking-tight">
							Ligan
						</Link>
						<nav className="hidden sm:flex items-center gap-4 text-sm">
							<Link href="/" className="hover:text-accent transition-colors">
								Leaderboard
							</Link>
							<Link href="/history" className="hover:text-accent transition-colors">
								Matches
							</Link>
							<Link href="/players" className="hover:text-accent transition-colors">
								Players
							</Link>
							<Link href="/register" className="hover:text-accent transition-colors">
								Register Match
							</Link>
							<Link href="/about" className="hover:text-accent transition-colors">
								About
							</Link>
						</nav>
						<div className="md:hidden ml-auto">
							<MobileNav />
						</div>
					</div>
				</header>
				<main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">{children}</main>
				<footer className="border-border text-center text-xs text-foreground/40 py-4">
					Ligan - MTG Commander
				</footer>
			</body>
		</html>
	);
}
