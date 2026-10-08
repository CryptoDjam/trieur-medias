/* Calque « cadre CyberServices » : comportement commun (bouton fermer, ouverture en fenêtre à part).
   Source unique, à copier tel quel. Aucun appel réseau. */
(function () {
  "use strict";

  /* Ouvre un outil dans une fenêtre à part (popup), sans onglets ni barre de navigation.
     Le navigateur garde une mince barre d'adresse : on ne peut pas l'enlever. Sur téléphone : nouvel onglet. */
  function ouvrirOutil(url, nom) {
    var l = Math.min(1280, screen.availWidth - 40), h = Math.min(860, screen.availHeight - 60);
    var g = Math.max(0, Math.round((screen.availWidth - l) / 2)), t = Math.max(0, Math.round((screen.availHeight - h) / 2));
    var f = window.open(url, "cs-" + (nom || "outil").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      "popup=yes,width=" + l + ",height=" + h + ",left=" + g + ",top=" + t + ",menubar=no,toolbar=no,location=no,status=no");
    if (f) { try { f.focus(); } catch (e) {} }
    return f;
  }

  /* Les deux liens de la signature (ne jamais les changer). */
  /* « github » mène au dépôt public du projet (attribut data-github sur .cs-cadre ou <html>) ;
     seuls nos dépôts sont admis, sinon la page GitHub de CyberServices-ai (changement voulu par Cyril, 08/10/2026). */
  var GITHUB = "https://github.com/CyberServices-ai";
  function lienGithub(cadre) {
    var g = cadre.getAttribute("data-github") || document.documentElement.getAttribute("data-github") || GITHUB;
    return (g === GITHUB || g.indexOf(GITHUB + "/") === 0) ? g : GITHUB;
  }
  var LIENS = [["site", "https://www.cyberservices-ai.com/", "Le site CyberServices"],
               ["github", null, "Le code du projet sur GitHub"]];
  var ACCUEIL = LIENS[0][1];

  /* Barre de titre : « site », « github », puis le bouton fermer. Ajoutés par le calque : identiques partout. */
  function brancher(cadre) {
    var b = cadre.querySelector(".cs-cadre-fermer");
    if (!b || b.dataset.branche) return;
    b.dataset.branche = "1";
    b.classList.add("cs-cadre-btn");
    if (!cadre.querySelector(".cs-cadre-actions")) {
      var actions = document.createElement("span"); actions.className = "cs-cadre-actions";
      b.parentNode.insertBefore(actions, b);
      LIENS.forEach(function (l) {
        var a = document.createElement("a"); a.className = "cs-cadre-btn"; a.href = l[1] || lienGithub(cadre); a.target = "_blank"; a.rel = "noopener";
        a.textContent = l[0]; a.title = l[2] + " (nouvel onglet)"; actions.appendChild(a);
      });
      actions.appendChild(b);
    }
    b.addEventListener("click", function () {
      if (cadre.tagName === "DIALOG") { cadre.close(); return; }
      var garde = cadre.getAttribute("data-avant-fermer");
      if (garde && typeof window[garde] === "function" && window[garde]() === false) return;
      window.close();
      /* Si le navigateur refuse (page ouverte à la main, pas par un script) : on le dit, sans boîte d'alerte. */
      setTimeout(function () {
        if (!window.closed) {
          b.textContent = "fermer l'onglet";
          b.title = "Cette page n'a pas été ouverte par un outil : ferme l'onglet toi-même.";
        }
      }, 200);
    });
  }

  /* Fenêtre-cadre : cadre.html?page=<adresse de la page>&nom=<nom de l'outil>.
     Pages admises : celles du même site (chemin relatif ou même origine), ou une adresse de la liste ci-dessous.
     Tout le reste est refusé, pour que le cadre ne serve jamais à habiller la page de quelqu'un d'autre. */
  var ADRESSES_ADMISES = [ACCUEIL];
  function chargerPage() {
    var f = document.querySelector("iframe.cs-cadre-page"); if (!f) return;
    var q = new URLSearchParams(location.search), page = q.get("page") || "", nom = q.get("nom") || "outil";
    var nomEl = document.querySelector(".cs-cadre-nom"); nomEl.textContent = nom; document.title = nom + " · CyberServices"; f.title = nom;
    var u; try { u = new URL(page, location.href); } catch (e) { u = null; }
    var ok = u && (u.protocol === location.protocol && (u.origin === location.origin || location.protocol === "file:") || ADRESSES_ADMISES.some(function (a) { return u.href.indexOf(a) === 0; }));
    if (!page) { f.remove(); return; }   /* sans page : le cadre seul, vide */
    if (!ok || /^(javascript|data):/i.test(page)) {
      nomEl.textContent = nom + " · page refusée"; f.remove();
      var p = document.createElement("p"); p.className = "cs-cadre-refus"; p.textContent = "Cette adresse n'est pas une page de nos outils : le cadre ne l'ouvre pas.";
      document.querySelector(".cs-cadre").appendChild(p); return;
    }
    f.src = u.href;
  }

  /* Petit mot quand un outil du site est ouvert directement, sans passer par le terminal (demande de Cyril, 08/10/2026).
     Seulement si la page le demande (<html data-astuce-terminal>), jamais dans une fenêtre ouverte par le terminal
     (nom « cs-… »), et plus jamais une fois la case cochée. */
  var CLE_ASTUCE = "cs-astuce-terminal";
  function astuceTerminal() {
    var d = document.documentElement;
    if (!d.hasAttribute("data-astuce-terminal") || /^cs-/.test(window.name || "") || window.opener) return;
    try { if (localStorage.getItem(CLE_ASTUCE) === "1") return; } catch (e) {}
    var dlg = document.createElement("dialog"); dlg.className = "cs-cadre cs-astuce";
    dlg.innerHTML = '<div class="cs-cadre-barre"><span class="cs-cadre-nom">terminal</span><button type="button" class="cs-cadre-btn cs-cadre-fermer" aria-label="Fermer">×</button></div>' +
      '<div class="cs-astuce-texte"><p>Tu n’es pas passé par le terminal ? Dommage ;)</p>' +
      '<label><input type="checkbox"> Ne plus afficher</label></div>';
    document.body.appendChild(dlg);
    var coche = dlg.querySelector("input");
    coche.addEventListener("change", function () { try { localStorage.setItem(CLE_ASTUCE, coche.checked ? "1" : "0"); } catch (e) {} });
    brancher(dlg);
    dlg.showModal();
  }

  function demarrer() {
    chargerPage();
    if (window.opener || document.documentElement.classList.contains("cs-fenetre")) document.documentElement.classList.add("cs-fenetre");
    document.querySelectorAll(".cs-cadre").forEach(function (c) {
      brancher(c);
      var nom = c.querySelector(".cs-cadre-nom");
      if (nom && !document.title) document.title = nom.textContent.trim();
    });
    document.querySelectorAll("[data-ouvrir-outil]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); ouvrirDansCadre(a.getAttribute("href"), a.dataset.ouvrirOutil); });
    });
  }

  /* Ouvre une page dans la fenêtre-cadre (chemin du calque à adapter : data-cadre sur <html>, sinon "calque/cadre.html"). */
  function ouvrirDansCadre(page, nom) {
    var cadre = document.documentElement.getAttribute("data-cadre") || "calque/cadre.html";
    var url = new URL(cadre, location.href); url.searchParams.set("page", new URL(page, location.href).href); url.searchParams.set("nom", nom || "outil");
    return ouvrirOutil(url.href, nom);
  }

  if (document.readyState === "complete") setTimeout(astuceTerminal, 400); else window.addEventListener("load", function () { setTimeout(astuceTerminal, 400); });
  window.CSCadre = { ouvrirOutil: ouvrirOutil, ouvrirDansCadre: ouvrirDansCadre, brancher: brancher };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
