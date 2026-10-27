import type { MetadataRoute } from "next";

// Lets the app be added to the home screen and open without browser bars (needed for a
// fullscreen life counter on iPhone, where web pages can't hide the browser UI otherwise)
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Ligan - MTG Commander",
		short_name: "Ligan",
		description: "Track standings and matches for your Commander league",
		start_url: "/",
		display: "standalone",
		background_color: "#0a0a0a",
		theme_color: "#0a0a0a",
		icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
	};
}
