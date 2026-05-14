"use client";

import { useState, useEffect, useRef } from "react";
import { RiSearchLine, RiLoaderLine } from "@remixicon/react";

interface Props {
	value: string;
	onChange: (name: string) => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	placeholder?: string;
	autoFocus?: boolean;
	className?: string;
}

export default function CommanderSearch({
	value,
	onChange,
	onKeyDown,
	placeholder = "Search commander…",
	autoFocus,
	className = "",
}: Props) {
	const [results, setResults] = useState<string[]>([]);
	const [searching, setSearching] = useState(false);
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	// Debounced search
	useEffect(() => {
		if (!value.trim() || value.length < 2) {
			setResults([]);
			setOpen(false);
			return;
		}
		const t = setTimeout(async () => {
			setSearching(true);
			try {
				const url =
					`https://api.magicthegathering.io/v1/cards` +
					`?supertypes=legendary` +
					`&name=${encodeURIComponent(value)}&pageSize=50`;
				const res = await fetch(url);
				const data = await res.json();
				const cards: { name: string }[] = data.cards ?? [];
				// Deduplicate names and sort
				const unique = [...new Set(cards.map((c) => c.name))].sort();
				setResults(unique.slice(0, 10));
				setOpen(unique.length > 0);
			} catch {
				setResults([]);
			}
			setSearching(false);
		}, 350);
		return () => clearTimeout(t);
	}, [value]);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<div className="relative">
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={onKeyDown}
					onFocus={() => results.length > 0 && setOpen(true)}
					placeholder={placeholder}
					autoFocus={autoFocus}
					className="w-full rounded border border-border bg-surface pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
				/>
				<span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/30">
					{searching ? (
						<RiLoaderLine size={14} className="animate-spin" />
					) : (
						<RiSearchLine size={14} />
					)}
				</span>
			</div>

			{open && results.length > 0 && (
				<ul className="absolute top-full left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded border border-border bg-surface shadow-xl">
					{results.map((name) => (
						<li key={name}>
							<button
								type="button"
								onMouseDown={(e) => {
									e.preventDefault(); // prevent input blur before click registers
									onChange(name);
									setOpen(false);
								}}
								className="w-full px-3 py-2 text-left text-sm hover:bg-background transition-colors"
							>
								{name}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
