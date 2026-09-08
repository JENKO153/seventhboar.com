/*
 * Shared journal/project storage + auth, backed by Supabase.
 * The anon key below is safe to expose client-side — row-level security
 * policies (see supabase/schema.sql) are what actually gate writes to
 * logged-in users. Loaded before every page-specific script.
 *
 * SETUP: create a Supabase project, run supabase/schema.sql in its SQL
 * editor, then replace the two placeholders below with that project's
 * URL and anon/public key (Project Settings -> API).
 */
(function (window) {
  const SUPABASE_URL = 'https://jkougveywojjypwcjbmi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb3VndmV5d29qanlwd2NqYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjg2NzAsImV4cCI6MjEwMjk0NDY3MH0.t0elEbA9tefhSrC3Woq97c_3dl8ecpwXpMRyD78O1zU';

  const configured = !SUPABASE_URL.startsWith('YOUR_') && !SUPABASE_ANON_KEY.startsWith('YOUR_');

  // Session is kept in sessionStorage (not the default localStorage) so
  // logging in only lasts for that browser tab/session — closing the
  // browser logs out automatically instead of staying signed in indefinitely.
  const client = configured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { storage: window.sessionStorage }
      })
    : null;

  function requireClient() {
    if (!client) {
      throw new Error('Supabase is not configured yet — see assets/js/cms.js');
    }
    return client;
  }

  function slugify(title) {
    const base = (title || 'post')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `${base}-${Date.now().toString(36)}`;
  }

  // ---------- Journal posts ----------
  function rowToPost(row) {
    return {
      id: row.slug,
      title: row.title,
      category: row.category,
      excerpt: row.excerpt,
      image: row.image_url,
      cardImage: row.card_image_url || null,
      date: row.published_at,
      author: row.author,
      content: row.content
    };
  }

  async function getPosts() {
    if (!configured) return [];
    const { data, error } = await requireClient()
      .from('journal_posts')
      .select('*')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });
    if (error) {
      console.error('Could not load journal posts', error);
      return [];
    }
    return data.map(rowToPost);
  }

  async function getPostById(slug) {
    if (!configured) return null;
    const { data, error } = await requireClient()
      .from('journal_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return null;
    return rowToPost(data);
  }

  async function addPost(post) {
    const row = {
      slug: slugify(post.title),
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      image_url: post.image,
      card_image_url: post.cardImage || null,
      content: post.content,
      author: post.author || 'Seventh Boar',
      published_at: post.publishAt || new Date().toISOString()
    };
    const { data, error } = await requireClient().from('journal_posts').insert(row).select().single();
    if (error) throw error;
    return rowToPost(data);
  }

  async function updatePost(slug, post) {
    const row = {
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      image_url: post.image,
      card_image_url: post.cardImage || null,
      content: post.content,
      published_at: post.publishAt || new Date().toISOString()
    };
    const { data, error } = await requireClient().from('journal_posts').update(row).eq('slug', slug).select().single();
    if (error) throw error;
    return rowToPost(data);
  }

  async function deletePost(slug) {
    const { error } = await requireClient().from('journal_posts').delete().eq('slug', slug);
    if (error) throw error;
  }

  // ---------- Projects ----------
  function rowToProject(row) {
    return {
      id: row.slug,
      title: row.title,
      categories: row.categories || [],
      platforms: row.platforms || [],
      client: row.client,
      tagline: row.tagline,
      icon: row.icon_url,
      banner: row.banner_url,
      cardBanner: row.card_banner_url || null,
      brief: row.brief,
      featured: row.featured,
      date: row.published_at,
      clientLogo: row.client_logo_url,
      clientLinks: row.client_links || []
    };
  }

  async function getProjects() {
    if (!configured) return [];
    const { data, error } = await requireClient()
      .from('projects')
      .select('*')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });
    if (error) {
      console.error('Could not load projects', error);
      return [];
    }
    return data.map(rowToProject);
  }

  async function getProjectById(slug) {
    if (!configured) return null;
    const { data, error } = await requireClient()
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return null;
    return rowToProject(data);
  }

  async function addProject(project) {
    const row = {
      slug: slugify(project.title),
      title: project.title,
      categories: project.categories || [],
      platforms: project.platforms || [],
      client: project.client || null,
      tagline: project.tagline,
      icon_url: project.icon || null,
      banner_url: project.banner,
      card_banner_url: project.cardBanner || null,
      brief: project.brief,
      featured: !!project.featured,
      published_at: project.publishAt || new Date().toISOString(),
      client_logo_url: project.clientLogo || null,
      client_links: project.clientLinks || []
    };
    const { data, error } = await requireClient().from('projects').insert(row).select().single();
    if (error) throw error;
    return rowToProject(data);
  }

  async function updateProject(slug, project) {
    const row = {
      title: project.title,
      categories: project.categories || [],
      platforms: project.platforms || [],
      client: project.client || null,
      tagline: project.tagline,
      icon_url: project.icon || null,
      banner_url: project.banner,
      card_banner_url: project.cardBanner || null,
      brief: project.brief,
      featured: !!project.featured,
      published_at: project.publishAt || new Date().toISOString(),
      client_logo_url: project.clientLogo || null,
      client_links: project.clientLinks || []
    };
    const { data, error } = await requireClient().from('projects').update(row).eq('slug', slug).select().single();
    if (error) throw error;
    return rowToProject(data);
  }

  async function deleteProject(slug) {
    const { error } = await requireClient().from('projects').delete().eq('slug', slug);
    if (error) throw error;
  }

  // ---------- Comments ----------
  function rowToComment(row) {
    return {
      id: row.id,
      postSlug: row.post_slug,
      author: row.author_name,
      body: row.body,
      likes: row.likes,
      approved: row.approved,
      date: row.created_at
    };
  }

  // Public: approved comments for one devlog post, oldest first.
  async function getApprovedComments(postSlug) {
    if (!configured) return [];
    const { data, error } = await requireClient()
      .from('comments')
      .select('*')
      .eq('post_slug', postSlug)
      .eq('approved', true)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Could not load comments', error);
      return [];
    }
    return data.map(rowToComment);
  }

  // Public: always lands unapproved — nothing here can publish straight to
  // the site (see the comments_public_insert RLS policy).
  async function submitComment(postSlug, authorName, body) {
    const row = { post_slug: postSlug, author_name: authorName, body, approved: false, likes: 0 };
    const { error } = await requireClient().from('comments').insert(row);
    if (error) throw error;
  }

  // Public: can only ever add exactly one like, via the increment_comment_like
  // function — never an arbitrary value (see supabase/schema.sql).
  async function likeComment(commentId) {
    const { error } = await requireClient().rpc('increment_comment_like', { comment_id: commentId });
    if (error) throw error;
  }

  // Studio account only (RLS restricts these to authenticated).
  async function getAllComments() {
    if (!configured) return [];
    const { data, error } = await requireClient()
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Could not load comments', error);
      return [];
    }
    return data.map(rowToComment);
  }

  async function approveComment(id) {
    const { error } = await requireClient().from('comments').update({ approved: true }).eq('id', id);
    if (error) throw error;
  }

  async function deleteComment(id) {
    const { error } = await requireClient().from('comments').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- Images ----------
  // Shrinks an uploaded image to a max dimension and returns it as a <canvas>.
  function scaleImageToCanvas(file, maxDim = 1600) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read that image file.'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function resizeImage(file, maxDim = 1600, quality = 0.85) {
    const canvas = await scaleImageToCanvas(file, maxDim);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }

  // Used for draft-autosave previews, since a resized data URL (unlike a
  // File/Blob) can actually survive being written to localStorage.
  async function resizeImageToDataUrl(file, maxDim = 1600, quality = 0.85) {
    const canvas = await scaleImageToCanvas(file, maxDim);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function uploadBlob(blob) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await requireClient().storage.from('post-images').upload(path, blob, {
      contentType: 'image/jpeg'
    });
    if (error) throw error;
    const { data } = requireClient().storage.from('post-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadImage(file) {
    const blob = await resizeImage(file);
    return uploadBlob(blob);
  }

  async function uploadImageFromDataUrl(dataUrl) {
    return uploadBlob(dataUrlToBlob(dataUrl));
  }

  // ---------- Auth ----------
  async function login(email, password) {
    const { error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function logout() {
    if (!client) return;
    await client.auth.signOut();
  }

  async function getSession() {
    if (!configured) return null;
    const { data } = await requireClient().auth.getSession();
    return data.session;
  }

  window.JournalData = { getPosts, getPostById, addPost, updatePost, deletePost };
  window.ProjectData = { getProjects, getProjectById, addProject, updateProject, deleteProject };
  window.CommentsData = {
    getApprovedComments, submitComment, likeComment,
    getAllComments, approveComment, deleteComment
  };
  window.CmsImages = { uploadImage, uploadImageFromDataUrl, resizeImageToDataUrl };
  window.CmsAuth = { login, logout, getSession, isConfigured: () => configured };
})(window);
