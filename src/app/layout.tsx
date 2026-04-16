import type { Metadata } from "next";
import { Geist, Jacquarda_Bastarda_9 } from "next/font/google";
import Link from "next/link";
import MobileNav from "./MobileNav";
import "./globals.css";
import { RiSwordFill } from "@remixicon/react";

const geist = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const jacquarda = Jacquarda_Bastarda_9({
	weight: "400",
	subsets: ["latin"],
	variable: "--font-jacquarda",
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
		<html lang="en" className={`${geist.variable} ${jacquarda.variable} h-full`}>
			<body className="min-h-full flex flex-col text-foreground antialiased">
				<header className="sticky top-0 z-50 ">
					<div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
						<Link
							href="/"
							className="flex items-center font-bold text-accent text-lg tracking-tight"
						>
							<RiSwordFill />
							<span className="text-2xl font-jacquarda">Ligan</span>
						</Link>
						<nav className="hidden sm:flex items-center gap-4 text-sm">
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
				<footer className="border-border text-center text-xs text-foreground/10 py-4">
					Ligan - MTG Commander
				</footer>
			</body>
		</html>
	);
}
