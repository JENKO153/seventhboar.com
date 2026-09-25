/* Seventh Boar admin: Team & clients, Homepage & settings, and Customise.
 * All three edit the one settings record (the homepage wording, people, quotes, colours). */
(function () {
  const { $, $$, esc, view } = AD;
  const lines = (value, max, len) => value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, max).map(x => x.slice(0, len));

  /* =====================================================================
     TEAM & CLIENTS  (people, client quotes, photo strip, social links)
     ===================================================================== */
  function team() {
    AD.setTitle('Team & clients');
    const s = AD.clone(AD.DATA.settings);
    // People come with up to three stats of their own ("Years building 10", "Engines 3"...).
    // They're edited as flat fields here and folded back into a list when saved.
    const statsOf = r => {
      const list = (r.stats || []).filter(x => x && (x.label || x.value)).slice(0, 3);
      return { s1l: list[0]?.label || '', s1v: list[0]?.value || '', s2l: list[1]?.label || '', s2v: list[1]?.value || '', s3l: list[2]?.label || '', s3v: list[2]?.value || '' };
    };
    const people = s.team.map(r => AD.withPhoto({ ...r, ...statsOf(r) }));
    const fold = r => {
      const { s1l, s1v, s2l, s2v, s3l, s3v, ph, ...rest } = r;
      return { ...rest, stats: [[s1l, s1v], [s2l, s2v], [s3l, s3v]].map(([label, value]) => ({ label: (label || '').trim(), value: (value || '').trim() })).filter(x => x.label || x.value) };
    };
    const reports = s.reports.map(r => ({ ...r }));
    const ig = s.ig.map(x => AD.withPhoto(x));
    const socials = s.socials.map(x => ({ ...x }));

    view.innerHTML = `
      <div class="editor">
        <form class="editor__form" id="cform" novalidate>
          <div class="section">
            <h3>Studio section <small>Above the people on the homepage. Hidden while nobody is added.</small></h3>
            <div class="field-row">
              <label>Small text above<input name="eyebrow" maxlength="60" value="${esc(s.teamSection.eyebrow)}"></label>
              <label>Heading<input name="title" maxlength="60" value="${esc(s.teamSection.title)}"></label>
            </div>
            <label>Intro<textarea name="intro" rows="2" maxlength="300" style="min-height:70px">${esc(s.teamSection.intro)}</textarea></label>
            <div class="field-row">
              <label>Link text <span class="hint">Leave empty to hide</span><input name="ctaText" maxlength="30" value="${esc(s.teamSection.ctaText)}"></label>
              <label>Link address<input name="ctaUrl" maxlength="300" placeholder="/contact/ or https://" value="${esc(s.teamSection.ctaUrl)}"></label>
            </div>
          </div>

          <div class="section">
            <h3>The people <small>Drag a photo onto a tile, or click it</small></h3>
            <div class="items" id="peopleList"></div>
          </div>

          <div class="section">
            <h3>Client words <small>What clients say about the work</small></h3>
            <div class="field-row">
              <label>Small text above<input name="rEyebrow" maxlength="60" value="${esc(s.reportsSection.eyebrow)}"></label>
              <label>Heading<input name="rTitle" maxlength="60" value="${esc(s.reportsSection.title)}"></label>
            </div>
            <div class="items" id="reportList"></div>
          </div>

          <div class="section">
            <h3>Photo strip <small>An optional grid under the client words</small></h3>
            <div class="grid-photos items" id="igList"></div>
          </div>

          <div class="section">
            <h3>Social links <small>Shown in the footer, on the coming soon page and in the site's data</small></h3>
            <div class="items" id="socialList"></div>
          </div>

          <div class="savebar">
            <span class="dirty" id="dirtyFlag" hidden>Unsaved changes</span>
            <span class="spacer"></span>
            <button type="submit" class="btn">Save team &amp; clients</button>
          </div>
        </form>
        ${AD.previewPanel('/?preview=1', 'seventhboar.com')}
      </div>`;

    const form = $('#cform');
    const send = AD.wirePreview(() => ({
      settings: { ...s, team: people.map(r => fold({ ...r, image: r.ph ? AD.photoDraft(r.ph) : '' })), reports, socials,
                  ig: ig.map(x => ({ ...x, image: x.ph ? AD.photoDraft(x.ph) : '' })) },
    }));
    const changed = () => { AD.markDirty(); send(); };

    form.addEventListener('input', e => {
      if (e.target.closest('.items')) return; // handled by each list
      Object.assign(s.teamSection, { eyebrow: form.eyebrow.value, title: form.title.value, intro: form.intro.value, ctaText: form.ctaText.value, ctaUrl: form.ctaUrl.value });
      Object.assign(s.reportsSection, { eyebrow: form.rEyebrow.value, title: form.rTitle.value });
      changed();
    });

    AD.listSection({
      host: $('#peopleList'), list: people, max: 12, onChange: changed,
      blank: { name: '', role: '', home: '', number: '', s1l: '', s1v: '', s2l: '', s2v: '', s3l: '', s3v: '', link: '', linkText: '', ph: null },
      label: (r, i) => r.name || `Person ${i + 1}`,
      row: r => `
        <div class="field-row">
          <label>Name<input name="name" maxlength="40" value="${esc(r.name)}" placeholder="e.g. Kurt Jenkins"></label>
          <label>Role<input name="role" maxlength="40" value="${esc(r.role || '')}" placeholder="Founder, developer"></label>
          <label>Number <span class="hint">Optional</span><input name="number" maxlength="6" value="${esc(r.number || '')}" placeholder="07"></label>
        </div>
        <label>Based in<input name="home" maxlength="40" value="${esc(r.home || '')}" placeholder="Newcastle, NSW"></label>
        <p class="hint" style="margin:0">Up to three stats: Years building, Engines, Shipped... Leave a pair empty to skip it.</p>
        ${[1, 2, 3].map(n => `<div class="field-row">
          <label>Stat ${n} name<input name="s${n}l" maxlength="20" value="${esc(r['s' + n + 'l'] || '')}"></label>
          <label>Stat ${n} value<input name="s${n}v" maxlength="14" value="${esc(r['s' + n + 'v'] || '')}"></label></div>`).join('')}
        <div class="field-row">
          <label>Link <span class="hint">Optional. Nothing shows if empty</span><input name="link" maxlength="300" value="${esc(r.link || '')}" placeholder="https://"></label>
          <label>Link text<input name="linkText" maxlength="30" value="${esc(r.linkText || '')}" placeholder="Find out more"></label>
        </div>`,
    });

    AD.listSection({
      host: $('#reportList'), list: reports, max: 9, photo: false, onChange: changed,
      blank: { quote: '', name: '', meta: '', stars: 5, verified: true },
      label: (r, i) => r.name || `Quote ${i + 1}`,
      row: r => `
        <label>What they said<textarea name="quote" rows="3" maxlength="400" style="min-height:80px">${esc(r.quote)}</textarea></label>
        <div class="field-row">
          <label>Name<input name="name" maxlength="60" value="${esc(r.name)}" placeholder="Chooky Chasing Life"></label>
          <label>Under the name<input name="meta" maxlength="80" value="${esc(r.meta)}" placeholder="Not Another Monday // Commissioned app"></label>
          <label>Stars<select name="stars">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${+r.stars === n ? 'selected' : ''}>${'★'.repeat(n)}</option>`).join('')}</select></label>
        </div>
        <label class="toggle"><input type="checkbox" name="verified" ${r.verified ? 'checked' : ''}>Show the "Client" tick</label>`,
    });

    AD.listSection({
      host: $('#igList'), list: ig, max: 12, aspect: '1', onChange: changed,
      blank: { url: '', ph: null },
      label: (x, i) => `Photo ${i + 1}`,
      row: x => `<label>Links to <span class="hint">Optional</span><input name="url" maxlength="300" placeholder="https://" value="${esc(x.url)}"></label>`,
    });

    AD.listSection({
      host: $('#socialList'), list: socials, max: 8, photo: false, onChange: changed,
      blank: { label: '', url: '' },
      label: (x, i) => x.label || `Link ${i + 1}`,
      row: x => `<div class="field-row">
        <label>Name<input name="label" maxlength="30" value="${esc(x.label)}" placeholder="Instagram"></label>
        <label>Address<input name="url" maxlength="300" value="${esc(x.url)}" placeholder="https://instagram.com/…"></label></div>`,
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const bad = socials.find(x => (x.label || x.url) && !/^https:\/\//i.test(x.url.trim()));
      if (bad) return AD.toast(`"${bad.label || 'A social link'}" needs an address starting with https://`, true);
      const before = [...AD.oldPhotos(AD.DATA.settings.team), ...AD.oldPhotos(AD.DATA.settings.ig)];
      const ok = await AD.withWrite('Enter your admin password to save the team and clients.', async () => {
        const savedTeam = await AD.savePhotos(people), savedIg = await AD.savePhotos(ig);
        AD.progress('Saving…');
        const next = { ...s, team: savedTeam.map(fold), reports, ig: savedIg,
                       socials: socials.filter(x => x.label.trim() && x.url.trim()).map(x => ({ label: x.label.trim(), url: x.url.trim() })) };
        await CMS.saveSettings(next);
        AD.DATA.settings = CMS.mergeSettings(next);
        await CMS.removeImages(AD.dropped(before, [...AD.oldPhotos(savedTeam), ...AD.oldPhotos(savedIg)]));
      });
      if (!ok) return;
      AD.dirty = false;
      AD.toast('Team & clients saved');
      team();
      AD.refreshLater();
    });
  }

  /* =====================================================================
     HOMEPAGE & SETTINGS
     ===================================================================== */
  function settings() {
    AD.setTitle('Homepage & settings');
    const s = AD.clone(AD.DATA.settings);
    const ev = s.release;
    const buildImgs = (s.build.images || []).map(u => ({ ph: u ? { url: u } : null }));
    const specs = s.build.specs.map(r => ({ specLabel: r.label, specValue: r.value }));
    const evImg = [AD.withPhoto(ev)];
    const services = (s.servicesSection.items || []).map(x => ({ ...x, bulletsText: (x.bullets || []).join('\n') }));
    const foldService = ({ bulletsText, ...x }) => ({ ...x, bullets: lines(bulletsText || '', 6, 80) });
    const A = AD.ADMIN;

    view.innerHTML = `
      <div class="editor">
        <form class="editor__form" id="sform" novalidate>
          <div class="section section--soon">
            <h3>Coming soon mode</h3>
            <p class="hint" style="margin:0">Closes the site to the public: visitors only see the message below. You and anyone with your preview link still see the whole site. Content is held back by the database, not just hidden on the page.</p>
            <label class="toggle"><input type="checkbox" id="soonToggle" ${A.comingSoon ? 'checked' : ''}>Site is closed with a coming soon page</label>
            <div id="soonLive" class="notice ${A.comingSoon ? 'notice--warn' : ''}" ${A.comingSoon ? '' : 'hidden'} style="margin:0">
              <b>The site is closed to the public right now.</b> Share the preview link below with anyone who needs to see it early.</div>
            <div class="field-row">
              <label>Small text above<input name="csEyebrow" maxlength="60" value="${esc(s.comingSoon.eyebrow)}"></label>
              <label>Headline<input name="csTitle" maxlength="60" value="${esc(s.comingSoon.title)}"></label>
            </div>
            <label>Message<textarea name="csText" rows="3" maxlength="400">${esc(s.comingSoon.text)}</textarea></label>
            <label class="toggle"><input type="checkbox" name="csEmail" ${s.comingSoon.showEmail !== false ? 'checked' : ''}>Show the "notify me" email box</label>
            <label>Preview link <span class="hint">Opens the real site while it's closed. Use the Copy button: selecting it by hand often misses the end.</span>
              <div class="prefix"><input id="previewLink" readonly value="${esc(AD.previewUrl())}"><button type="button" class="btn btn--ghost btn--sm" id="copyPreview">Copy</button></div></label>
            ${A.previewKey ? `<p class="hint" style="margin:-4px 0 0">Key: <code>${esc(A.previewKey)}</code></p>` : '<p class="hint" style="color:var(--amber);margin:0">This admin has no preview key. Press "Make a new preview link" below.</p>'}
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <button type="button" class="btn btn--ghost btn--sm" id="testPreview">Test this link</button>
              <button type="button" class="btn btn--ghost btn--sm" id="newPreview">Make a new preview link</button>
              <span id="testResult" class="hint"></span>
            </div>
            <p class="hint" style="margin:0">A new link stops the old one working. People who signed up on the coming soon page are on the <a class="link" href="#subscribers">Subscribers</a> list.</p>
          </div>

          <div class="section">
            <h3>Header</h3>
            <label>Status chip <span class="hint">The small tag in the header. Leave empty to hide it.</span><input name="status" maxlength="40" value="${esc(s.status)}"></label>
          </div>

          <div class="section">
            <h3>Hero</h3>
            <div class="field-row">
              <label>Headline line 1<input name="line1" maxlength="40" value="${esc(s.hero.line1)}"></label>
              <label>Headline line 2 <span class="hint">in the accent colour</span><input name="line2" maxlength="40" value="${esc(s.hero.line2)}"></label>
            </div>
            <label>Small text above<input name="eyebrow" maxlength="60" value="${esc(s.hero.eyebrow)}"></label>
            <label>Intro<textarea name="subtitle" rows="3" maxlength="280">${esc(s.hero.subtitle)}</textarea></label>
            <div class="field-row">
              <label>Button text<input name="cta" maxlength="30" value="${esc(s.hero.cta)}"></label>
              <label>Button address<input name="ctaUrl" maxlength="300" placeholder="/contact/" value="${esc(s.hero.ctaUrl || '')}"></label>
            </div>
            <div class="field-row">
              <label>Second button <span class="hint">Leave empty to hide</span><input name="cta2" maxlength="30" value="${esc(s.hero.cta2)}"></label>
              <label>Second button address<input name="cta2Url" maxlength="300" placeholder="/work/" value="${esc(s.hero.cta2Url || '')}"></label>
            </div>
            <label>Banner image <span class="hint">Wide, at least 1600px across. Your logo can be part of the picture.</span></label>
            <div id="heroField"></div>
          </div>

          <div class="section">
            <h3>Services <small>What you sell. Shown on the homepage and the Services page.</small></h3>
            <label class="toggle"><input type="checkbox" name="svShow" ${s.servicesSection.show ? 'checked' : ''}>Show this section on the homepage</label>
            <div class="field-row">
              <label>Small text above<input name="svEyebrow" maxlength="60" value="${esc(s.servicesSection.eyebrow)}"></label>
              <label>Heading<input name="svTitle" maxlength="60" value="${esc(s.servicesSection.title)}"></label>
            </div>
            <label>Intro<input name="svIntro" maxlength="200" value="${esc(s.servicesSection.intro)}"></label>
            <div class="items" id="serviceList"></div>
          </div>

          <div class="section">
            <h3>Under the hero <small>Four short points, one per line</small></h3>
            <textarea name="heroBar" rows="4" maxlength="300">${esc((s.hero.bar || []).join('\n'))}</textarea>
          </div>

          <div class="section">
            <h3>Section headings</h3>
            <div class="field-row">
              <label>What we build: small text<input name="tyEyebrow" maxlength="60" value="${esc(s.typesSection.eyebrow)}"></label>
              <label>What we build: heading<input name="tyTitle" maxlength="60" value="${esc(s.typesSection.title)}"></label>
              <label>What we build: link<input name="tyLink" maxlength="40" value="${esc(s.typesSection.link)}"></label>
            </div>
            <div class="field-row">
              <label>Latest work: small text<input name="ltEyebrow" maxlength="60" value="${esc(s.latestSection.eyebrow)}"></label>
              <label>Latest work: heading<input name="ltTitle" maxlength="60" value="${esc(s.latestSection.title)}"></label>
            </div>
            <label>Latest work: intro<input name="ltIntro" maxlength="200" value="${esc(s.latestSection.intro)}"></label>
            <div class="field-row">
              <label>Devlog: small text<input name="dvEyebrow" maxlength="60" value="${esc(s.devlogSection.eyebrow)}"></label>
              <label>Devlog: heading<input name="dvTitle" maxlength="60" value="${esc(s.devlogSection.title)}"></label>
            </div>
            <span class="hint">The studio and client-words headings live in <a class="link" href="#team">Team &amp; clients</a>.</span>
          </div>

          <div class="section">
            <h3>How we build <small>The photos and spec table</small></h3>
            <label class="toggle"><input type="checkbox" name="bdShow" ${s.build.show ? 'checked' : ''}>Show this section</label>
            <div class="field-row">
              <label>Small text above<input name="bdEyebrow" maxlength="60" value="${esc(s.build.eyebrow)}"></label>
              <label>Heading<input name="bdTitle" maxlength="60" value="${esc(s.build.title)}"></label>
            </div>
            <label>Intro<textarea name="bdIntro" rows="2" maxlength="300" style="min-height:70px">${esc(s.build.intro)}</textarea></label>
            <div class="field-row">
              <label>Button text<input name="bdCta" maxlength="30" value="${esc(s.build.cta)}"></label>
              <label>Button address<input name="bdUrl" maxlength="300" placeholder="/work/" value="${esc(s.build.ctaUrl || '')}"></label>
            </div>
            <label>Photos <span class="hint">Up to three. Leave empty for a text-only section.</span></label>
            <div class="grid-photos items" id="buildImgs" style="grid-template-columns:repeat(3,1fr)"></div>
            <label style="margin-top:6px">Spec table</label>
            <div class="items" id="specList"></div>
          </div>

          <div class="section">
            <h3>Call-to-action strip</h3>
            <label class="toggle"><input type="checkbox" name="ctShow" ${s.cta.show ? 'checked' : ''}>Show this section</label>
            <div class="field-row">
              <label>Heading<input name="ctTitle" maxlength="60" value="${esc(s.cta.title)}"></label>
              <label>Button text<input name="ctCta" maxlength="30" value="${esc(s.cta.ctaText)}"></label>
              <label>Button address<input name="ctUrl" maxlength="300" placeholder="/contact/ or mailto:" value="${esc(s.cta.ctaUrl)}"></label>
            </div>
            <label>Text<textarea name="ctText" rows="2" maxlength="300" style="min-height:70px">${esc(s.cta.text)}</textarea></label>
          </div>

          <div class="section">
            <h3>Newsletter block <small>Sign-ups appear under <a class="link" href="#subscribers">Subscribers</a></small></h3>
            <label class="toggle"><input type="checkbox" name="nlShow" ${s.newsletter.show ? 'checked' : ''}>Show this section</label>
            <div class="field-row">
              <label>Small text above<input name="nlEyebrow" maxlength="60" value="${esc(s.newsletter.eyebrow)}"></label>
              <label>Heading<input name="nlTitle" maxlength="60" value="${esc(s.newsletter.title)}"></label>
            </div>
            <label>Text<input name="nlText" maxlength="200" value="${esc(s.newsletter.text)}"></label>
            <div class="field-row">
              <label>Small print<input name="nlFine" maxlength="120" value="${esc(s.newsletter.fine)}"></label>
              <label>Thank-you message<input name="nlThanks" maxlength="120" value="${esc(s.newsletter.thanks)}"></label>
            </div>
          </div>

          <div class="section">
            <h3>Footer</h3>
            <div class="field-row">
              <label>Motto<input name="ftTagline" maxlength="60" value="${esc(s.footer.tagline)}"></label>
              <label>Contact email<input name="ftEmail" type="email" maxlength="120" value="${esc(s.footer.email)}"></label>
            </div>
            <label>About text<textarea name="ftBlurb" rows="2" maxlength="400" style="min-height:70px">${esc(s.footer.blurb)}</textarea></label>
          </div>

          <div class="section">
            <h3>Next release or event <small>A countdown section. Hidden until you switch it on.</small></h3>
            <label class="toggle"><input type="checkbox" name="evShow" ${ev.show ? 'checked' : ''}>Show the countdown section on the homepage</label>
            <div class="field-row">
              <label>Name<input name="evName" maxlength="60" value="${esc(ev.name)}"></label>
              <label>Subtitle<input name="evRound" maxlength="40" value="${esc(ev.round)}"></label>
            </div>
            <div class="field-row">
              <label>Type<select name="evKind">
                <option value="release" ${ev.kind !== 'event' ? 'selected' : ''}>Release (a date it comes out)</option>
                <option value="event" ${ev.kind === 'event' ? 'selected' : ''}>Event (doors time + venue)</option>
              </select></label>
              <label>Platform or venue <span class="hint">Optional</span><input name="evPlace" maxlength="80" value="${esc(ev.place)}"></label>
            </div>
            <div class="field-row">
              <label>Date &amp; time <span class="hint">Leave empty for "coming soon"</span><input name="evDate" type="datetime-local" value="${esc(String(ev.date || '').slice(0, 16))}"></label>
            </div>
            <label>Blurb<textarea name="evBlurb" rows="3" maxlength="400">${esc(ev.blurb)}</textarea></label>
            <div class="field-row">
              <label>Button text<input name="evCta" maxlength="30" value="${esc(ev.ctaText)}"></label>
              <label>Button address<input name="evUrl" maxlength="300" placeholder="/devlog/ or https://" value="${esc(ev.ctaUrl)}"></label>
            </div>
            <label>Background photo</label>
            <div class="grid-photos items" id="evImg" style="grid-template-columns:minmax(0,260px)"></div>
          </div>

          <div class="savebar">
            <span class="dirty" id="dirtyFlag" hidden>Unsaved changes</span>
            <span class="spacer"></span>
            <button type="submit" class="btn">Save homepage</button>
          </div>
        </form>
        ${AD.previewPanel('/?preview=1', 'seventhboar.com')}
      </div>`;

    const form = $('#sform');

    // Coming soon: the switch and the preview link are saved on the spot (not with the form),
    // because they change what the public can load from the database.
    $('#soonToggle').addEventListener('change', async e => {
      const on = e.target.checked;
      e.target.disabled = true;
      const ok = await AD.withWrite(`Enter your admin password to ${on ? 'close the site with a coming soon page' : 'open the site to the public'}.`,
        async () => { await CMS.setComingSoon(on); A.comingSoon = on; });
      e.target.disabled = false;
      e.target.checked = A.comingSoon;
      $('#soonLive').hidden = !A.comingSoon;
      $('#soonLive').classList.toggle('notice--warn', A.comingSoon);
      if (ok) AD.toast(on ? 'The site is now closed to the public' : 'The site is open to everyone');
      AD.comingSoonBanner();
    });
    $('#copyPreview').addEventListener('click', () => {
      const el = $('#previewLink');
      if (!el.value) return AD.toast('Make a preview link first', true);
      el.select(); el.setSelectionRange(0, el.value.length);
      navigator.clipboard?.writeText(el.value).then(() => AD.toast('Preview link copied'), () => AD.toast('Press Cmd+C to copy', true));
    });
    $('#testPreview').addEventListener('click', async () => {
      const out = $('#testResult');
      out.textContent = 'Checking…'; out.style.color = '';
      try {
        const r = await CMS.testPreviewKey(A.previewKey);
        if (!r.coming_soon) { out.textContent = 'The site is open to everyone right now, so no link is needed.'; return; }
        out.textContent = r.ok ? 'Works: this link opens the real site.' : 'The database doesn\'t recognise this key. Press "Make a new preview link".';
        out.style.color = r.ok ? 'var(--ok)' : 'var(--red)';
      } catch (err) { out.textContent = err.message; out.style.color = 'var(--red)'; }
    });
    $('#newPreview').addEventListener('click', async () => {
      if (!confirm('Make a new preview link? The old one stops working straight away.')) return;
      const ok = await AD.withWrite('Enter your admin password to make a new preview link.', async () => { A.previewKey = await CMS.newPreviewKey(); });
      if (ok) { $('#previewLink').value = AD.previewUrl(); AD.toast('New preview link ready'); AD.comingSoonBanner(); }
    });

    const hero = AD.photoField($('#heroField'), { value: s.hero.image || null, aspect: '16/9', onChange: () => changed() });
    const send = AD.wirePreview(() => ({ settings: {
      ...s,
      hero: { ...s.hero, image: hero.get() ? AD.photoDraft(hero.get()) : '' },
      release: { ...s.release, image: evImg[0].ph ? AD.photoDraft(evImg[0].ph) : '' },
      servicesSection: { ...s.servicesSection, items: services.map(foldService) },
      build: { ...s.build, images: buildImgs.map(x => (x.ph ? AD.photoDraft(x.ph) : '')).filter(Boolean), specs: specs.map(r => ({ label: r.specLabel, value: r.specValue })) },
    } }));
    const changed = () => { AD.markDirty(); send(); };

    const read = () => {
      const f = form;
      s.status = f.status.value.trim();
      s.hero.bar = lines(f.heroBar.value, 4, 60);
      Object.assign(s.servicesSection, { show: f.svShow.checked, eyebrow: f.svEyebrow.value, title: f.svTitle.value, intro: f.svIntro.value });
      Object.assign(s.typesSection, { eyebrow: f.tyEyebrow.value, title: f.tyTitle.value, link: f.tyLink.value });
      Object.assign(s.latestSection, { eyebrow: f.ltEyebrow.value, title: f.ltTitle.value, intro: f.ltIntro.value });
      Object.assign(s.devlogSection, { eyebrow: f.dvEyebrow.value, title: f.dvTitle.value });
      Object.assign(s.build, { show: f.bdShow.checked, eyebrow: f.bdEyebrow.value, title: f.bdTitle.value, intro: f.bdIntro.value, cta: f.bdCta.value, ctaUrl: f.bdUrl.value.trim() });
      Object.assign(s.cta, { show: f.ctShow.checked, title: f.ctTitle.value, text: f.ctText.value, ctaText: f.ctCta.value, ctaUrl: f.ctUrl.value.trim() });
      Object.assign(s.newsletter, { show: f.nlShow.checked, eyebrow: f.nlEyebrow.value, title: f.nlTitle.value, text: f.nlText.value, fine: f.nlFine.value, thanks: f.nlThanks.value });
      Object.assign(s.footer, { tagline: f.ftTagline.value, email: f.ftEmail.value.trim(), blurb: f.ftBlurb.value });
      Object.assign(s.hero, { line1: f.line1.value.trim(), line2: f.line2.value.trim(), eyebrow: f.eyebrow.value.trim(), subtitle: f.subtitle.value.trim(), cta: f.cta.value.trim(), ctaUrl: f.ctaUrl.value.trim(), cta2: f.cta2.value.trim(), cta2Url: f.cta2Url.value.trim() });
      Object.assign(s.comingSoon, { eyebrow: f.csEyebrow.value.trim(), title: f.csTitle.value.trim(), text: f.csText.value.trim(), showEmail: f.csEmail.checked });
      Object.assign(s.release, { show: f.evShow.checked, kind: f.evKind.value === 'event' ? 'event' : 'release', name: f.evName.value.trim(), round: f.evRound.value.trim(),
        place: f.evPlace.value.trim(), date: f.evDate.value, blurb: f.evBlurb.value.trim(), ctaText: f.evCta.value.trim(), ctaUrl: f.evUrl.value.trim() });
    };
    form.addEventListener('input', e => { if (e.target.closest('.items')) return; read(); changed(); });
    form.addEventListener('change', e => { if (e.target.closest('.items')) return; read(); changed(); });

    AD.listSection({ host: $('#serviceList'), list: services, max: 4, photo: false, onChange: changed,
      blank: { tag: '', title: '', text: '', bulletsText: '', ctaText: '', ctaUrl: '' }, label: (x, i) => x.title || `Service ${i + 1}`,
      row: x => `
        <div class="field-row">
          <label>Title<input name="title" maxlength="40" value="${esc(x.title)}" placeholder="Websites"></label>
          <label>Small tag <span class="hint">e.g. Main service</span><input name="tag" maxlength="30" value="${esc(x.tag || '')}"></label>
        </div>
        <label>Description<textarea name="text" rows="3" maxlength="300" style="min-height:80px">${esc(x.text || '')}</textarea></label>
        <label>Bullet points <span class="hint">One per line, up to 6</span><textarea name="bulletsText" rows="4" maxlength="500" style="min-height:90px">${esc(x.bulletsText || '')}</textarea></label>
        <div class="field-row">
          <label>Button text<input name="ctaText" maxlength="30" value="${esc(x.ctaText || '')}" placeholder="Start a website"></label>
          <label>Button address<input name="ctaUrl" maxlength="300" value="${esc(x.ctaUrl || '')}" placeholder="/contact/"></label>
        </div>` });
    AD.listSection({ host: $('#buildImgs'), list: buildImgs, max: 3, aspect: '3/4', onChange: changed, blank: { ph: null }, label: (x, i) => `Photo ${i + 1}`, row: () => '' });
    AD.listSection({ host: $('#specList'), list: specs, max: 8, photo: false, onChange: changed, blank: { specLabel: '', specValue: '' }, label: r => r.specLabel || 'Row',
      row: r => `<div class="field-row">
        <label>Name<input name="specLabel" maxlength="40" value="${esc(r.specLabel)}" placeholder="Engines"></label>
        <label>Detail<input name="specValue" maxlength="80" value="${esc(r.specValue)}" placeholder="Unity, Unreal Engine, Godot"></label></div>` });
    AD.listSection({ host: $('#evImg'), list: evImg, max: 1, aspect: '16/10', onChange: changed, blank: { ph: null }, label: () => 'Background photo', row: () => '' });
    read();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      read();
      if (!s.hero.line1) return AD.toast('The headline needs at least line 1', true);
      const before = [AD.DATA.settings.hero.image, AD.DATA.settings.release.image, ...AD.DATA.settings.build.images].filter(Boolean);
      const ok = await AD.withWrite('Enter your admin password to update the homepage.', async () => {
        const img = hero.get() ? await AD.uploadOne(hero.get(), 'pages') : '';
        const evSaved = await AD.savePhotos(evImg), buildSaved = await AD.savePhotos(buildImgs);
        AD.progress('Saving…');
        const next = {
          ...s,
          hero: { ...s.hero, image: img },
          release: { ...s.release, image: evSaved[0].image },
          servicesSection: { ...s.servicesSection, items: services.map(foldService).filter(x => x.title) },
          build: { ...s.build, images: buildSaved.map(x => x.image).filter(Boolean), specs: specs.map(r => ({ label: r.specLabel, value: r.specValue })).filter(r => r.label || r.value) },
        };
        await CMS.saveSettings(next);
        AD.DATA.settings = CMS.mergeSettings(next);
        await CMS.removeImages(AD.dropped(before, [img, evSaved[0].image, ...buildSaved.map(x => x.image)].filter(Boolean)));
      });
      if (!ok) return;
      AD.dirty = false;
      AD.toast('Homepage updated');
      settings();
      AD.refreshLater();
    });
  }

  /* =====================================================================
     CUSTOMISE  (brand accent colour: every accent on the site follows it)
     ===================================================================== */
  function customise() {
    AD.setTitle('Customise');
    const saved = AD.DATA.settings.theme?.accent || DEFAULT_SETTINGS.theme.accent;
    let accent = saved;
    const acc = window.sbAccent;

    view.innerHTML = `
      <div class="editor">
        <form class="editor__form" id="tform" novalidate>
          <div class="section">
            <h3>Accent colour <small>The colour of buttons, badges and highlights across the site</small></h3>
            <div class="swatches" id="swatches"></div>
          </div>
          <div class="section">
            <h3>Or pick your own</h3>
            <div class="custom-colour">
              <input type="color" id="picker2" aria-label="Custom colour">
              <input type="text" id="hex" maxlength="7" aria-label="Colour code" placeholder="#97292A">
              <span class="hint" id="contrast"></span>
            </div>
            <div class="accent-demo" id="demo">
              <span class="demo-btn">View the work</span>
              <span class="demo-text">Sec. 01 // What we build</span>
              <span class="demo-text" style="color:var(--muted)">on the site's black background</span>
            </div>
            <span class="hint">Small text in the accent is automatically lightened so it stays readable on black, and button text switches between white and black to suit the colour. Colours too close to black are blocked.</span>
          </div>
          <div class="savebar">
            <span class="dirty" id="dirtyFlag" hidden>Unsaved changes</span>
            <span class="spacer"></span>
            <button type="button" class="btn btn--ghost btn--sm" id="resetAccent">Reset to boar maroon</button>
            <button type="submit" class="btn">Save colour</button>
          </div>
        </form>
        ${AD.previewPanel('/?preview=1', 'seventhboar.com')}
      </div>`;

    const send = AD.wirePreview(() => ({ settings: { ...AD.DATA.settings, theme: { accent: acc.valid(accent) ? accent : saved } } }));
    const draw = () => {
      const ok = acc.valid(accent);
      $('#swatches').innerHTML = ACCENTS.map(([name, hex]) =>
        `<button type="button" class="swatch ${hex.toLowerCase() === accent.toLowerCase() ? 'on' : ''}" data-hex="${hex}" aria-label="${esc(name)}"><i style="background:${hex}"></i>${esc(name)}</button>`).join('');
      if (ok) $('#picker2').value = accent.toLowerCase();
      if (document.activeElement !== $('#hex')) $('#hex').value = accent.toUpperCase();
      const ratio = /^#[0-9a-f]{6}$/i.test(accent) ? acc.contrast(accent) : 0;
      $('#contrast').innerHTML = !ratio ? 'Enter a colour code like #97292A'
        : ok ? `Works: ${ratio.toFixed(1)}:1 against black` : `<span style="color:var(--red)">Too close to black (${ratio.toFixed(1)}:1, needs 1.8:1)</span>`;
      const shown = ok ? accent : saved;
      const btn = $('#demo .demo-btn');
      btn.style.background = shown; btn.style.color = acc.on(shown);
      $('#demo .demo-text').style.color = acc.text(shown);
      $('#tform button[type=submit]').disabled = !ok || accent.toLowerCase() === saved.toLowerCase();
    };
    const choose = hex => {
      accent = hex;
      AD.dirty = accent.toLowerCase() !== saved.toLowerCase();
      $('#dirtyFlag').hidden = !AD.dirty;
      draw(); send();
    };
    $('#swatches').addEventListener('click', e => { const b = e.target.closest('[data-hex]'); if (b) choose(b.dataset.hex); });
    $('#picker2').addEventListener('input', e => choose(e.target.value.toUpperCase()));
    $('#hex').addEventListener('input', e => {
      let v = e.target.value.trim(); if (v && v[0] !== '#') v = '#' + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) choose(v.toUpperCase()); else { accent = v; draw(); }
    });
    $('#hex').addEventListener('blur', () => { if (!/^#[0-9a-f]{6}$/i.test(accent)) choose(saved); });
    $('#resetAccent').addEventListener('click', () => choose(DEFAULT_SETTINGS.theme.accent));
    draw();

    $('#tform').addEventListener('submit', async e => {
      e.preventDefault();
      if (!acc.valid(accent)) return;
      const next = { ...AD.DATA.settings, theme: { accent: accent.toUpperCase() } };
      const ok = await AD.withWrite('Enter your admin password to change the site colour.', async () => {
        await CMS.saveSettings(next);
        AD.DATA.settings = CMS.mergeSettings(next);
      });
      if (!ok) return;
      AD.dirty = false;
      AD.toast('Colour updated across the site');
      AD.applyAccent();
      customise();
      AD.refreshLater();
    });
  }

  AD.routes.team = team;
  AD.routes.settings = settings;
  AD.routes.customise = customise;
})();
