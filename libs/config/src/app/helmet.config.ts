import { FastifyHelmetOptions } from "@fastify/helmet";

export const HelmetConfig: FastifyHelmetOptions = {
	// Content Security Policy
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", "data:", "https:"],
			fontSrc: ["'self'", "data:"],
			connectSrc: ["'self'"],
			frameSrc: ["'none'"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
			formAction: ["'self'"],
			frameAncestors: ["'none'"],
			upgradeInsecureRequests: [],
		},
	},
	// Security headers
	global: true,
	hidePoweredBy: true,
	hsts: {
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true,
	},
	noSniff: true,
	xssFilter: true,
	referrerPolicy: { policy: "strict-origin-when-cross-origin" },
};
