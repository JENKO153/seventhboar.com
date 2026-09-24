/*
 * Seventh Boar Development — site configuration. Loaded first on every page.
 *
 * The URL and key below are the PUBLIC ones (safe to expose in a website): the row-level
 * security rules in supabase/schema.sql are what actually protect the data.
 * NEVER put the secret / service_role key anywhere in this website.
 *
 * Demo mode: on localhost only, open any page with ?demo=1 and the whole site, including the
 * admin, runs against sample data stored in this browser (no Supabase needed). ?demo=0 turns it
 * off again. It can never switch on for visitors of the real site.
 */
window.SB_CONFIG = Object.freeze({
  supabaseUrl: 'https://jkougveywojjypwcjbmi.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb3VndmV5d29qanlwd2NqYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjg2NzAsImV4cCI6MjEwMjk0NDY3MH0.t0elEbA9tefhSrC3Woq97c_3dl8ecpwXpMRyD78O1zU',

  // Optional bot protection on the admin login (recommended). Turn on Captcha in Supabase:
  // Authentication -> Attack Protection, choose Turnstile, paste Cloudflare's SECRET key there,
  // and put the SITE key here.
  captcha: { provider: 'turnstile', siteKey: '' },

  // The admin logs out after this many minutes without activity.
  adminIdleMinutes: 15,
});
