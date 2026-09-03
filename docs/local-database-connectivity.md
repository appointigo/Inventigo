# Local database connectivity

The Next.js runtime reads local secrets from `.env.local` first and then `.env`.
This repository currently keeps the local `DATABASE_URL` in the gitignored `.env`.
Use only one of those files for `DATABASE_URL`; `.env.local` is preferred for new
local setups and must not be committed.

The runtime URL must use the Neon pooled host (`-pooler`) with TLS enabled. For
Prisma 7's `@prisma/adapter-pg`, connection timeout behavior is configured in
`src/lib/db.ts`; URL `connect_timeout` is not relied upon by the application
runtime. Local development uses a 15-second connection timeout and retains idle
pool connections for five minutes. Production keeps the adapter defaults.

Never log or paste the complete connection URL. To diagnose a simultaneous
`P1001`, extract only the hostname and run:

```sh
nc -vz -G 10 <NEON_POOLER_HOST> 5432
nslookup <NEON_POOLER_HOST>
dig <NEON_POOLER_HOST>
```

If DNS or TCP connectivity fails at the same time as Prisma, repeat once through
a mobile hotspot with VPN/proxy software disabled. A Wi-Fi failure paired with a
hotspot success is a local network, DNS, VPN, or ISP path problem; application
retries cannot repair it.
