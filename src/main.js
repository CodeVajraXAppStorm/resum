import './style.css';
import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const T = {
  hi: { name:'नाम', title:'पद / प्रोफ़ाइल', phone:'फोन', email:'ईमेल', addr:'पता', obj:'करियर ऑब्जेक्टिव',
    exp:'एक्सपीरियंस', edu:'एजुकेशन', proj:'प्रोजेक्ट्स', cert:'सर्टिफिकेट्स', skills:'स्किल्स (कॉमा से अलग)',
    langs:'भाषाएँ (कॉमा से अलग)', hobbies:'हॉबीज़ (कॉमा से अलग)', add:'+ जोड़ो', del:'हटाओ', pdf:'📥 PDF डाउनलोड',
    export:'💾 बैकअप', import:'📂 इम्पोर्ट', tpl:'टेम्पलेट', color:'रंग', font:'फॉन्ट', photo:'फोटो चुनो',
    ttl:'टाइटल / डिग्री / पद', org:'संस्था / कंपनी', date:'तारीख', desc:'विवरण', delr:'यह रिज्यूम हटाओ',
    sure:'पक्का हटाना है?', t_simple:'सिंपल', t_modern:'मॉडर्न', t_two:'दो कॉलम', t_ats:'ATS (असली टेक्स्ट PDF)', sk:'स्किल्स', lg:'भाषाएँ', hb:'हॉबीज़', ct:'संपर्क' },
  en: { name:'Full name', title:'Job title', phone:'Phone', email:'Email', addr:'Address', obj:'Career objective',
    exp:'Experience', edu:'Education', proj:'Projects', cert:'Certificates', skills:'Skills (comma separated)',
    langs:'Languages (comma separated)', hobbies:'Hobbies (comma separated)', add:'+ Add', del:'Remove', pdf:'📥 Download PDF',
    export:'💾 Backup', import:'📂 Import', tpl:'Template', color:'Color', font:'Font', photo:'Choose photo',
    ttl:'Title / degree / role', org:'Institute / company', date:'Dates', desc:'Description', delr:'Delete this resume',
    sure:'Delete for sure?', t_simple:'Simple', t_modern:'Modern', t_two:'Two column', t_ats:'ATS (real-text PDF)', sk:'Skills', lg:'Languages', hb:'Hobbies', ct:'Contact' }
};
const FONTS = ['Arial', 'Georgia', 'Verdana', 'Times New Roman', 'Trebuchet MS'];
const TPLS = ['simple', 'modern', 'two', 'ats'];
const LISTS = ['exp', 'edu', 'proj', 'cert'];

const $ = s => document.querySelector(s);
const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const blank = () => ({ tpl: 'simple', color: '#2563eb', font: 'Arial', photo: '', name: '', title: '', phone: '', email: '', addr: '',
  obj: '', skills: '', langs: '', hobbies: '', exp: [], edu: [], proj: [], cert: [] });

let S;
try { S = JSON.parse(localStorage.getItem('rb')); } catch { S = null; }
if (!S || !S.list?.length) S = { ui: 'hi', cur: 0, list: [{ d: blank() }] };
const save = () => { try { localStorage.setItem('rb', JSON.stringify(S)); } catch {} };
const D = () => S.list[S.cur].d;
const L = () => T[S.ui];

function form() {
  const d = D(), l = L();
  const inp = (k, ph) => `<input data-k="${k}" placeholder="${l[ph || k]}" value="${e(d[k])}">`;
  const items = k => d[k].map((it, i) => `<div class="item">
    <input data-l="${k}" data-i="${i}" data-f="t" placeholder="${l.ttl}" value="${e(it.t)}">
    <input data-l="${k}" data-i="${i}" data-f="s" placeholder="${l.org}" value="${e(it.s)}">
    <input data-l="${k}" data-i="${i}" data-f="d" placeholder="${l.date}" value="${e(it.d)}">
    <textarea data-l="${k}" data-i="${i}" data-f="x" rows="2" placeholder="${l.desc}">${e(it.x)}</textarea>
    <button class="d" data-del="${k}" data-i="${i}">${l.del}</button></div>`).join('');
  $('#form').innerHTML = `
    <div class="row"><select id="sel">${S.list.map((r, i) => `<option value="${i}" ${i === S.cur ? 'selected' : ''}>${e(r.d.name || 'Resume ' + (i + 1))}</option>`).join('')}</select>
      <button id="new" style="flex:0">＋</button></div>
    <div class="row"><select data-k="tpl">${TPLS.map(t => `<option value="${t}" ${d.tpl === t ? 'selected' : ''}>${l['t_' + t]}</option>`).join('')}</select>
      <select data-k="font">${FONTS.map(f => `<option ${d.font === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
      <input type="color" data-k="color" value="${d.color}" style="flex:0 0 50px;padding:2px"></div>
    <h4>👤</h4>
    ${inp('name')}${inp('title')}${inp('phone')}${inp('email')}${inp('addr')}
    <label class="row"><span>${l.photo}</span><input type="file" id="photo" accept="image/*"></label>
    <h4>${l.obj}</h4><textarea data-k="obj" rows="3">${e(d.obj)}</textarea>
    ${LISTS.map(k => `<h4>${l[k]}</h4>${items(k)}<button class="g" data-add="${k}">${l.add}</button>`).join('')}
    <h4>${l.skills}</h4>${inp('skills', 'skills')}
    <h4>${l.langs}</h4>${inp('langs', 'langs')}
    <h4>${l.hobbies}</h4>${inp('hobbies', 'hobbies')}
    <div class="row" style="margin-top:14px"><button id="pdf">${l.pdf}</button></div>
    <div class="row" style="margin-top:8px"><button class="g" id="exp">${l.export}</button>
      <button class="g" id="imp">${l.import}</button><button class="d" id="delr">${l.delr}</button></div>
    <input type="file" id="impf" accept=".json,application/json" hidden>`;
}

function preview() {
  const d = D(), l = L();
  const sec = (h, body) => body ? `<h2>${h}</h2>${body}` : '';
  const list = k => d[k].filter(i => i.t || i.s || i.x).map(i =>
    `<div class="it"><b>${e(i.t)}</b><small>${e(i.s)}${i.s && i.d ? ' | ' : ''}${e(i.d)}</small>${i.x ? `<p>${e(i.x)}</p>` : ''}</div>`).join('');
  const csv = s => e(s).split(',').map(x => x.trim()).filter(Boolean).join(' • ');
  const contact = [d.phone, d.email, d.addr].filter(Boolean).map(e);
  const head = `<div class="hd">${d.photo ? `<img src="${d.photo}">` : ''}<div><h1>${e(d.name) || '&nbsp;'}</h1><div class="sub">${e(d.title)}</div></div></div>`;
  const main = sec(l.obj, d.obj && `<p>${e(d.obj)}</p>`) + sec(l.exp, list('exp')) + sec(l.edu, list('edu')) + sec(l.proj, list('proj')) + sec(l.cert, list('cert'));
  const side = sec(l.sk, csv(d.skills) && `<p>${csv(d.skills)}</p>`) + sec(l.lg, csv(d.langs) && `<p>${csv(d.langs)}</p>`) + sec(l.hb, csv(d.hobbies) && `<p>${csv(d.hobbies)}</p>`);
  const r = $('#r');
  r.className = 'r t-' + d.tpl;
  r.style.setProperty('--c', d.color);
  r.style.fontFamily = `'${d.font}', 'Noto Sans Devanagari', sans-serif`;
  if (d.tpl === 'two') {
    r.innerHTML = `<div class="sd">${d.photo ? `<img src="${d.photo}">` : ''}<h1 style="font-size:22px">${e(d.name)}</h1><div class="sub">${e(d.title)}</div>
      ${sec(l.ct, contact.map(c => `<p>${c}</p>`).join(''))}${side}</div><div class="mn">${main}</div>`;
  } else if (d.tpl === 'modern') {
    r.innerHTML = `${head.replace('class="hd"', 'class="hd"')}<div class="bd"><p class="sub">${contact.join(' | ')}</p>${main}${side}</div>`;
    r.innerHTML = `<div class="hd">${d.photo ? `<img src="${d.photo}">` : ''}<div><h1>${e(d.name) || '&nbsp;'}</h1><div class="sub">${e(d.title)}</div><div class="sub">${contact.join(' | ')}</div></div></div><div class="bd">${main}${side}</div>`;
  } else {
    r.innerHTML = `${head}<p class="sub">${contact.join(' | ')}</p>${main}${side}`;
  }
  fit();
}

function fit() {
  const pv = $('#pv'), r = $('#r');
  const s = Math.min(1, pv.clientWidth / 794 || 1);
  r.style.transform = `scale(${s})`;
  pv.style.height = r.offsetHeight * s + 'px';
}

async function share(name, data, text) {
  if (Capacitor.isNativePlatform()) {
    const f = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: text ? Encoding.UTF8 : undefined });
    await Share.share({ title: name, url: f.uri });
  } else {
    const a = document.createElement('a');
    a.href = text ? URL.createObjectURL(new Blob([data], { type: 'application/json' })) : 'data:application/pdf;base64,' + data;
    a.download = name; a.click();
  }
}

function textPdf(d, l) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15, mw = 180, fam = ['Times New Roman', 'Georgia'].includes(d.font) ? 'times' : 'helvetica';
  let y = M;
  const line = (s, size, style = 'normal', gap = 0) => {
    doc.setFont(fam, style); doc.setFontSize(size);
    doc.splitTextToSize(String(s), mw).forEach(t => {
      if (y + size * 0.45 > 297 - M) { doc.addPage(); y = M; }
      doc.text(t, M, y); y += size * 0.45;
    });
    y += gap;
  };
  const head = h => {
    y += 3; line(h.toUpperCase(), 11, 'bold');
    doc.setLineWidth(0.3); doc.line(M, y - 3, M + mw, y - 3); y += 1;
  };
  const csv = s => s.split(',').map(x => x.trim()).filter(Boolean).join(', ');
  line(d.name, 20, 'bold', 1);
  if (d.title) line(d.title, 12, 'normal', 1);
  line([d.phone, d.email, d.addr].filter(Boolean).join(' | '), 10, 'normal', 1);
  if (d.obj) { head(l.obj); line(d.obj, 10.5); }
  [['exp', l.exp], ['edu', l.edu], ['proj', l.proj], ['cert', l.cert]].forEach(([k, h]) => {
    const it = d[k].filter(i => i.t || i.s || i.x);
    if (!it.length) return;
    head(h);
    it.forEach(i => {
      if (i.t) line(i.t, 10.5, 'bold');
      const sub = [i.s, i.d].filter(Boolean).join(' | ');
      if (sub) line(sub, 10, 'italic');
      if (i.x) line(i.x, 10.5);
      y += 2;
    });
  });
  [['skills', l.sk], ['langs', l.lg], ['hobbies', l.hb]].forEach(([k, h]) => {
    if (csv(d[k])) { head(h); line(csv(d[k]), 10.5); }
  });
  return doc.output('datauristring').split(',')[1];
}

async function makePdf() {
  const d0 = D();
  if (d0.tpl === 'ats') {
    const all = JSON.stringify(d0).replace(/"photo":"[^"]*"/, '');
    if (!/[^\u0000-\u00ff\u2018-\u201d\u2022\u2013\u2014]/.test(all)) {
      try { await share((d0.name || 'resume').replace(/\s+/g, '_') + '.pdf', textPdf(d0, L())); }
      catch (err) { alert('PDF error: ' + err.message); }
      return;
    }
    alert(S.ui === 'hi' ? 'हिंदी/खास अक्षर हैं, इसलिए ये PDF इमेज वाली बनेगी (ATS नहीं पढ़ पाएगा)। असली टेक्स्ट के लिए अंग्रेज़ी में लिखो।' : 'Non-English characters found, so this PDF will be image-based (ATS cannot read it). Use English for a real-text PDF.');
  }
  const c = $('#r').cloneNode(true);
  c.style.transform = 'none';
  const w = document.createElement('div');
  w.style.cssText = 'position:fixed;left:-9999px;top:0';
  w.append(c); document.body.append(w);
  try {
    const name = (D().name || 'resume').replace(/\s+/g, '_') + '.pdf';
    const job = html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4' } }).from(c);
    const uri = await job.outputPdf('datauristring');
    await share(name, uri.split(',')[1]);
  } catch (err) { alert('PDF error: ' + err.message); }
  finally { w.remove(); }
}

function photo(file) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'), n = 300, m = Math.min(img.width, img.height);
      c.width = c.height = n;
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, n, n);
      D().photo = c.toDataURL('image/jpeg', 0.85); save(); preview();
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

const F = $('#form');
F.addEventListener('input', ev => {
  const t = ev.target, d = D();
  if (t.dataset.k) d[t.dataset.k] = t.value;
  else if (t.dataset.l) d[t.dataset.l][t.dataset.i][t.dataset.f] = t.value;
  else return;
  save(); preview();
});
F.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'sel') { S.cur = +t.value; save(); form(); preview(); }
  else if (t.id === 'photo' && t.files[0]) photo(t.files[0]);
  else if (t.id === 'impf' && t.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result);
        const arr = Array.isArray(o) ? o : [o];
        arr.forEach(x => S.list.push({ d: { ...blank(), ...x } }));
        S.cur = S.list.length - 1; save(); form(); preview();
      } catch { alert('Invalid file'); }
    };
    fr.readAsText(t.files[0]);
  } else if (t.dataset.k === 'tpl' || t.dataset.k === 'font' || t.dataset.k === 'color') { D()[t.dataset.k] = t.value; save(); preview(); }
});
F.addEventListener('click', ev => {
  const t = ev.target.closest('button'); if (!t) return;
  const d = D();
  if (t.dataset.add) { d[t.dataset.add].push({ t: '', s: '', d: '', x: '' }); save(); form(); preview(); }
  else if (t.dataset.del) { d[t.dataset.del].splice(+t.dataset.i, 1); save(); form(); preview(); }
  else if (t.id === 'new') { S.list.push({ d: blank() }); S.cur = S.list.length - 1; save(); form(); preview(); }
  else if (t.id === 'pdf') makePdf();
  else if (t.id === 'exp') share((d.name || 'resume') + '.json', JSON.stringify(S.list.map(x => x.d), null, 1), true);
  else if (t.id === 'imp') $('#impf').click();
  else if (t.id === 'delr' && confirm(L().sure)) {
    S.list.splice(S.cur, 1);
    if (!S.list.length) S.list.push({ d: blank() });
    S.cur = 0; save(); form(); preview();
  }
});
$('#lang').onclick = () => { S.ui = S.ui === 'hi' ? 'en' : 'hi'; save(); form(); preview(); };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('main').className = b.dataset.t; setTimeout(fit, 0);
});
addEventListener('resize', fit);
form(); preview();

