'use strict';
// Trieur : dossier → bande de vignettes → vue grande → cocher → corbeille. Tout reste ouvert.
const $ = id => document.getElementById(id);
let dossier = null, tous = [], fichiers = [], sousDossiers = [], courant = -1, coches = new Set();
let filtre = 'tout'; try { filtre = localStorage.getItem('trieur.filtre') || 'tout'; } catch {}

const el = (tag, attrs = {}, ...enfants) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v); } for (const c of enfants) if (c) e.append(c); return e; };
const taille = o => o < 1024 ? o + ' o' : o < 1048576 ? (o / 1024).toFixed(0) + ' Ko' : (o / 1048576).toFixed(1) + ' Mo';
const url = f => '/api/fichier?chemin=' + encodeURIComponent(f.chemin);

async function raccourcis() {
  const r = await (await fetch('/api/raccourcis')).json();
  for (const x of r) if (x.existe) $('raccourcis').append(el('option', { value: x.chemin, text: x.nom }));
}

async function ouvrir(chemin) {
  const r = await fetch('/api/dossier?chemin=' + encodeURIComponent(chemin));
  if (!r.ok) { $('vue').replaceChildren(el('p', { class: 'vide', text: 'Dossier refusé ou introuvable (seulement dans ton dossier personnel).' })); return; }
  const d = await r.json();
  dossier = d.dossier; tous = d.fichiers; sousDossiers = d.dossiers; coches = new Set();
  appliquerFiltre();
  $('chemin').value = dossier; $('parent').disabled = !d.parent; $('parent').dataset.cible = d.parent || '';
  try { localStorage.setItem('trieur.dossier', dossier); } catch {}
  bande(); montrer();
}

function appliquerFiltre() {
  fichiers = filtre === 'tout' ? tous : tous.filter(f => f.type === filtre);
  courant = fichiers.length ? 0 : -1;
}

function bande() {
  const b = $('bande'); b.replaceChildren();
  for (const sd of sousDossiers) {
    const v = el('div', { class: 'vignette dossier' }, el('div', { class: 'icone', text: '📁' }), el('div', { class: 'nom', text: sd }));
    v.onclick = () => ouvrir(dossier + '/' + sd); b.append(v);
  }
  fichiers.forEach((f, i) => {
    const coche = el('input', { type: 'checkbox' }); coche.checked = coches.has(i);
    coche.onclick = e => { e.stopPropagation(); basculer(i, coche.checked); };
    const v = el('div', { class: 'vignette' + (i === courant ? ' courant' : '') + (coches.has(i) ? ' coche' : ''), 'data-i': i },
      coche, f.type === 'image' ? el('img', { src: url(f), loading: 'lazy', alt: '' }) : el('div', { class: 'icone', text: f.type === 'texte' ? '📄' : f.type === 'video' ? '🎬' : '📦' }), el('div', { class: 'nom', text: f.nom }));
    v.onclick = () => { courant = i; montrer(); };
    b.append(v);
  });
  compte();
}

function montrer() {
  const vue = $('vue'); vue.replaceChildren();
  document.querySelectorAll('.vignette.courant').forEach(x => x.classList.remove('courant'));
  if (courant < 0) { vue.append(el('p', { class: 'vide', text: fichiers.length ? '' : 'Aucun fichier dans ce dossier.' })); $('info').textContent = ''; $('coche-courant').checked = false; return; }
  const f = fichiers[courant];
  const v = document.querySelector(`.vignette[data-i="${courant}"]`); if (v) { v.classList.add('courant'); v.scrollIntoView({ block: 'nearest' }); }
  if (f.type === 'image') vue.append(el('img', { src: url(f), alt: f.nom }));
  else if (f.type === 'video') { const vid = el('video', { src: url(f), controls: '' }); vue.append(vid); }
  else if (f.type === 'texte') fetch(url(f)).then(r => r.text()).then(t => { if (fichiers[courant] === f) vue.replaceChildren(el('pre', { text: t })); });
  else vue.append(el('p', { class: 'vide', text: f.nom + ' — pas de prévisualisation (' + taille(f.taille) + ')' }));
  vue.classList.toggle('coche', coches.has(courant));
  $('coche-courant').checked = coches.has(courant);
  $('info').textContent = `${courant + 1} / ${fichiers.length} · ${f.nom} · ${taille(f.taille)} · ${new Date(f.modifie * 1000).toLocaleString('fr-FR')}`;
}

function basculer(i, etat) {
  if (etat === undefined) etat = !coches.has(i);
  etat ? coches.add(i) : coches.delete(i);
  const v = document.querySelector(`.vignette[data-i="${i}"]`); if (v) { v.classList.toggle('coche', etat); v.querySelector('input').checked = etat; }
  if (i === courant) { $('vue').classList.toggle('coche', etat); $('coche-courant').checked = etat; }
  compte();
}

function compte() {
  const noms = { image: 'photo', video: 'vidéo', texte: 'texte', autre: 'autre' };
  const n = fichiers.length, base = filtre === 'tout' ? `${n} fichier${n > 1 ? 's' : ''}` : `${n} ${noms[filtre]}${n > 1 ? 's' : ''} sur ${tous.length} fichier${tous.length > 1 ? 's' : ''}`;
  $('compte').textContent = base + (coches.size ? ` · ${coches.size} sélectionné${coches.size > 1 ? 's' : ''}` : '');
  $('supprimer').disabled = !coches.size; $('envoyer').disabled = !coches.size;
}

function aller(delta) { if (!fichiers.length) return; courant = (courant + delta + fichiers.length) % fichiers.length; montrer(); }

async function supprimer() {
  if (!coches.size) return;
  $('confirm-texte').textContent = `Supprimer ${coches.size} fichier${coches.size > 1 ? 's' : ''} ?`;
  $('confirm').hidden = false;
  $('confirm-oui').focus();
}
async function confirmer() {
  $('confirm').hidden = true;
  const chemins = [...coches].map(i => fichiers[i].chemin);
  const r = await (await fetch('/api/corbeille', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chemins }) })).json();
  const nomCourant = courant >= 0 ? fichiers[courant].chemin : null;
  await ouvrir(dossier);
  const idx = fichiers.findIndex(f => f.chemin === nomCourant); if (idx >= 0) { courant = idx; montrer(); }
  $('info').textContent = `${r.corbeille.length} fichier(s) envoyé(s) à la corbeille` + (r.refuses.length ? ` · ${r.refuses.length} refusé(s)` : '');
}

async function envoyer() {
  if (!coches.size || $('envoyer').disabled) return;
  $('envoyer').disabled = true;
  try {
    const r = await (await fetch('/api/choisir?depuis=' + encodeURIComponent(dossier || '~') + '&titre=' + encodeURIComponent('Trieur — envoyer ' + coches.size + ' fichier(s) vers…'))).json();
    if (!r.chemin) { if (r.error) $('info').textContent = r.error; return; }
    const chemins = [...coches].map(i => fichiers[i].chemin);
    const d = await (await fetch('/api/deplacer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chemins, dossier: r.chemin }) })).json();
    const nomCourant = courant >= 0 ? fichiers[courant].chemin : null;
    await ouvrir(dossier);
    const idx = fichiers.findIndex(f => f.chemin === nomCourant); if (idx >= 0) { courant = idx; montrer(); }
    $('info').textContent = d.error ? d.error : `${d.deplaces.length} fichier(s) déplacé(s) vers ${d.dossier}` + (d.refuses.length ? ` · ${d.refuses.length} refusé(s) (déjà présent ou hors dossier personnel)` : '');
  } finally { $('envoyer').disabled = !coches.size; }
}

$('filtre').value = filtre;
$('filtre').onchange = e => { filtre = e.target.value; try { localStorage.setItem('trieur.filtre', filtre); } catch {} appliquerFiltre(); bande(); montrer(); };
$('envoyer').onclick = envoyer;
$('form-dossier').onsubmit = e => { e.preventDefault(); ouvrir($('chemin').value.trim() || '~'); };
// Bouton « Ouvrir » : boîte de dialogue native (GTK) ; Entrée dans le champ ouvre le chemin tapé.
$('ouvrir').onclick = async () => {
  $('ouvrir').disabled = true;
  try {
    const r = await fetch('/api/choisir?depuis=' + encodeURIComponent(dossier || $('chemin').value || '~'));
    const d = await r.json();
    if (d.chemin) ouvrir(d.chemin); else if (d.error) $('info').textContent = d.error;
  } finally { $('ouvrir').disabled = false; }
};
$('parent').onclick = () => { if ($('parent').dataset.cible) ouvrir($('parent').dataset.cible); };
$('raccourcis').onchange = e => { if (e.target.value) ouvrir(e.target.value); e.target.value = ''; };
$('tout').onclick = () => { fichiers.forEach((_, i) => basculer(i, true)); };
$('rien').onclick = () => { fichiers.forEach((_, i) => basculer(i, false)); };
$('supprimer').onclick = supprimer;
$('coche-courant').onchange = e => { if (courant >= 0) basculer(courant, e.target.checked); };
$('confirm-non').onclick = () => { $('confirm').hidden = true; };
$('confirm-oui').onclick = confirmer;
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  if (!$('confirm').hidden) { if (e.key === 'Escape') $('confirm').hidden = true; if (e.key === 'Enter') confirmer(); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); aller(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); aller(-1); }
  else if (e.key === ' ') { e.preventDefault(); if (courant >= 0) basculer(courant); }
  else if (e.key.toLowerCase() === 'a') $('tout').click();
  else if (e.key.toLowerCase() === 'n') $('rien').click();
  else if (e.key === 'Delete') supprimer();
  else if (e.key.toLowerCase() === 'e') envoyer();
  else if (e.key === 'Home') { courant = 0; montrer(); }
  else if (e.key === 'End') { courant = fichiers.length - 1; montrer(); }
});
// Ouverture depuis un fichier (menu « Ouvrir avec » / double-clic sur un PNG) : ?dossier=…&fichier=… dans l'adresse.
raccourcis().then(async () => {
  const q = new URLSearchParams(location.search);
  let d = q.get('dossier') || '~/Pictures'; if (!q.get('dossier')) { try { d = localStorage.getItem('trieur.dossier') || d; } catch {} }
  await ouvrir(d);
  const f = q.get('fichier'); if (f) { const i = fichiers.findIndex(x => x.nom === f || x.chemin === f); if (i >= 0) { courant = i; montrer(); } }
  if (q.toString()) history.replaceState(null, '', '/');
});
