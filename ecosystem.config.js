"use strict";

/* PM2 process definitions, one app per deploy environment. App names are
   "<prefix>-<env>" and the Makefile's deploy-<env> targets select one with
   `pm2 start|reload ecosystem.config.js --only <name>` — keep the names in sync
   with PM2_APP_PREFIX in the Makefile.

   NODE_ENV values here ("dev" / "staging" / "production") must stay inside the
   choices list that getEnv() validates in libs/config/src/env/index.ts, or the
   process exits at boot. NODE_ENV also gates the Swagger/Scalar docs in main.ts:
   they are mounted on dev and staging, and hidden on production.

   env_file loads .env from the deploy directory; per-environment values are
   supplied by that file, not by this config. Only NODE_ENV is set here. */
module.exports = {
	apps: [
		{
			name: "clean-nest-prisma-pg-dev",
			script: "dist/main.js",
			instances: 1,
			exec_mode: "fork",
			env: {
				NODE_ENV: "dev",
			},
			env_file: ".env",
			out_file: "logs/dev-out.log",
			error_file: "logs/dev-error.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			autorestart: true,
			watch: false,
			max_memory_restart: "2G",
		},
		{
			name: "clean-nest-prisma-pg-staging",
			script: "dist/main.js",
			instances: 1,
			exec_mode: "fork",
			env: {
				NODE_ENV: "staging",
			},
			env_file: ".env",
			out_file: "logs/staging-out.log",
			error_file: "logs/staging-error.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			autorestart: true,
			watch: false,
			max_memory_restart: "2G",
		},
		{
			/* Cluster mode is safe here because nothing in this codebase runs on a
			   timer — every instance only serves requests. If you add scheduled work
			   (@nestjs/schedule or a queue producer that self-triggers), it will run
			   once per instance unless you guard it with a lock. */
			name: "clean-nest-prisma-pg-production",
			script: "dist/main.js",
			instances: "max",
			exec_mode: "cluster",
			env: {
				NODE_ENV: "production",
			},
			env_file: ".env",
			out_file: "logs/production-out.log",
			error_file: "logs/production-error.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			autorestart: true,
			watch: false,
			max_memory_restart: "4G",
			kill_timeout: 5000,
			listen_timeout: 30000,
		},
	],
};
