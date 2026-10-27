"use client";

import { useEffect, useState } from "react";

// Art crops come from Scryfall (magicthegathering.io only has full card scans).
// Cached per name for the session so panels and tiles share one request.
const cache = new Map<string, Promise<string | null>>();

function fetchArt(name: string): Promise<string | null> {
	const key = name.toLowerCase();
	let pending = cache.get(key);
	if (!pending) {
		pending = fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`)
			.then((res) => (res.ok ? res.json() : null))
			.then(
				(card) =>
					card?.image_uris?.art_crop ?? card?.card_faces?.[0]?.image_uris?.art_crop ?? null,
			)
			.catch(() => null);
		cache.set(key, pending);
	}
	return pending;
}

export function useCommanderArt(name: string | null): string | null {
	const [art, setArt] = useState<{ name: string; url: string | null } | null>(null);

	useEffect(() => {
		if (!name) return;
		let active = true;
		fetchArt(name).then((url) => {
			if (active) setArt({ name, url });
		});
		return () => {
			active = false;
		};
	}, [name]);

	// Ignore a result that belongs to a previous commander
	return name && art?.name === name ? art.url : null;
}
