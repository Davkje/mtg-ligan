"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const links = [
	{ href: "/", label: "Leaderboard" },
	{ href: "/history", label: "Matches" },
	{ href: "/players", label: "Players" },
	{ href: "/register", label: "Register Match" },
	{ href: "/about", label: "About" },
];

export default function MobileNav() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	return (
		<>
			{/* Hamburger button */}
			<button
				onClick={() => setOpen((v) => !v)}
				className="flex flex-col justify-center items-center w-8 h-8 gap-1.5"
				aria-label="Toggle menu"
			>
				<motion.span
					animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
					transition={{ duration: 0.2 }}
					className="block w-5 h-0.5 bg-foreground origin-center"
				/>
				<motion.span
					animate={open ? { opacity: 0 } : { opacity: 1 }}
					transition={{ duration: 0.15 }}
					className="block w-5 h-0.5 bg-foreground"
				/>
				<motion.span
					animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
					transition={{ duration: 0.2 }}
					className="block w-5 h-0.5 bg-foreground origin-center"
				/>
			</button>

			{/* Overlay + drawer */}
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key="overlay"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-40 bg-black/50"
							onClick={() => setOpen(false)}
						/>
						<motion.nav
							key="drawer"
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", stiffness: 300, damping: 30 }}
							className="fixed top-0 right-0 z-50 h-dvh w-64 bg-surface border-l border-border flex flex-col pt-16 pb-8 px-6"
						>
							<button
								onClick={() => setOpen(false)}
								className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors text-2xl leading-none"
								aria-label="Close menu"
							>
								×
							</button>
							<ul className="space-y-1">
								{links.map(({ href, label }, i) => {
									const active = pathname === href;
									return (
										<motion.li
											key={href}
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: i * 0.05 + 0.05 }}
										>
											<Link
												href={href}
												onClick={() => setOpen(false)}
												className={`block rounded px-3 py-2.5 text-sm font-medium transition-colors ${
													active
														? "bg-accent/15 text-accent"
														: "hover:bg-background text-foreground/80 hover:text-foreground"
												}`}
											>
												{label}
											</Link>
										</motion.li>
									);
								})}
							</ul>
						</motion.nav>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
