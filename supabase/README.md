# Supabase integration: review only

The migration and pgTAP tests have NOT been applied or executed. No Supabase project has been configured or verified by this milestone. Review the SQL and obtain separate approval before applying anything, including to a local database. Never use production/customer data.

## Configuration

Set APP_ORIGIN to the exact browser-facing application origin, and NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to the project's URL and modern publishable key. Configure these locally without sharing values in chat. No service-role key or database password is used by the application. Missing configuration fails closed with 503.

Enable email/password authentication and retain email confirmation. Configure the Supabase Site URL and allowlisted redirect URL for `/auth/callback` on the chosen origin. Signup uses PKCE; the callback exchanges the code using its request cookie and always redirects to `/`, never a user-supplied URL. SMTP delivery, project password/rate-limit settings, and email confirmation are UNVERIFIED. Signup's generic 202 response intentionally does not prove an email was sent or an account created. No password recovery UI or endpoints are included.

## API contracts

- POST `/api/auth/sign-up`: JSON email/password, password at least 12 characters; generic confirmation response.
- POST `/api/auth/sign-in`: JSON email/password; session goes only into HttpOnly cookies, not response JSON.
- POST `/api/auth/sign-out`: validates identity and signs out the local session.
- GET `/api/auth/session`: validates the user against Supabase Auth and returns the user ID only.
- GET `/auth/callback`: PKCE code exchange; no arbitrary redirects.
- POST `/api/scans`: exactly one multipart `file`, CSV/TXT, 1-1,048,576 bytes. Mutation requests require an Origin header matching APP_ORIGIN, including API clients. Identity is checked before reading uploads. Responses are private/no-store, including refreshed sessions and failures.

All Supabase use is in route handlers, which can write refreshed cookies; no Server Component auth or global proxy is required for these API-only endpoints. Cookies are HttpOnly, SameSite=Lax, Secure in production. Do not add a browser Supabase client without reviewing that server-only session design. The root page is unchanged; auth/upload UI is not included.

Uploads are bounded while streaming before multipart parsing; the body cap is 1 MiB plus 64 KiB of multipart overhead. Invalid UTF-8 and binary control characters are rejected. Only empty/text/plain/text/csv media declarations are accepted; MIME labels are not trusted as content validation. UTF-8 BOM, tabs, and line breaks are accepted. Uploaded content is scanned in memory only, never forwarded to AI, storage, telemetry, logs, or a database. Original filenames can contain sensitive values, so they are not returned or saved; the database generates an opaque scan-UUID display name preserving only csv/txt extension. Upload error messages are fixed and do not echo values.

## Migration review

The SQL creates scans/findings with owner-only SELECT RLS and revokes direct client mutations. The public save_scan function is a SECURITY INVOKER wrapper; its private SECURITY DEFINER implementation pins an empty search_path, derives the owner from auth.uid(), generates a new parent ID, accepts no parent/owner argument, validates masked shapes/type-risk pairs, and saves all rows in one transaction. Any later finding error must roll back the scan and earlier findings. A composite scan_id/owner_id foreign key independently enforces parent ownership. Keep minidsp_private out of Supabase's exposed schemas. Inspect existing schemas/tables/functions before applying; this migration deliberately fails on conflicting names rather than replacing shared objects.

After separate migration/test approval, use a disposable Supabase database with pgTAP to run `supabase test db`. The provided 20-assertion SQL suite covers anonymous denial, two identities, owner reads, rejected direct writes/owner injection, composite parent ownership, and atomic rollback. This command is NOT RUN; the file is review material, not passing RLS evidence. Test real auth/cookie refresh and account isolation with two actual synthetic users before accepting the integration.

## Remaining operational gates

No migrations, project settings, storage buckets, or deployments were changed. Live identity, cookies, PKCE/SMTP, RLS and rollback remain UNVERIFIED until configured and approved. Rate limiting/CAPTCHA, concurrency/resource budgets, and platform/proxy request logging need review before any public deployment; no durable application rate limiter was added. Runtime body caps do not replace platform request/time limits. Database privileged roles remain administrative trust boundaries. Do not enable body/token logging; callback code query strings require redaction at any reverse proxy/access-log layer.

References: https://supabase.com/docs/guides/auth/server-side/creating-a-client ; https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/database/postgres/row-level-security