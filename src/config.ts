import type {
	ContactConfig,
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Dicer's Blog",
	subtitle: "Trying to reach the star.",
	lang: "zh_CN",
	themeColor: {
		hue: 250,
		fixed: false,
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png",
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true,
		depth: 3,
	},
	favicon: [
		{
			src: '/img/favicon.png',
		}
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/Dicer-Zz",
			external: true,
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/img/avatar.png",
	name: "Dicer",
	bio: "Trying to reach the star.",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Dicer-Zz",
		},
		{
			name: "Email",
			icon: "fa6-solid:envelope",
			url: "mailto:dicer0615@gmail.com",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC 4.0",
	url: "https://creativecommons.org/licenses/by-nc/4.0/",
};

export const contactConfig: ContactConfig = {
	enable: true,
	wechat: "Dicer__",
	email: "dicer0615@gmail.com",
	github: "https://github.com/Dicer-Zz",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
