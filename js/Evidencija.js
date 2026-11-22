
var Evidencija = (function () {
  'use strict';
  var DOZVOLJENI_ENERGENTI = ['struja', 'plin', 'voda'];
  var PODRAZUMIJEVANI_FAKTORI = { struja: 0.5, plin: 2.0, voda: 0.001 };
  var PODRAZUMIJEVANE_JEDINICE = { struja: 'kWh', plin: 'm3', voda: 'm3' };
  var OBAVEZNA_POLJA = ['energent', 'kolicina', 'datum', 'incident'];

  function jeTabela(ref) {
    if (ref === null || typeof ref !== 'object') {
      return false;
    }
    if (typeof HTMLTableElement !== 'undefined' && ref instanceof HTMLTableElement) {
      return true;
    }
    return Object.prototype.toString.call(ref) === '[object HTMLTableElement]';
  }

  function jeDatum(vrijednost) {
    return Object.prototype.toString.call(vrijednost) === '[object Date]' &&
      !isNaN(vrijednost.getTime());
  }

  function zaokruzi(broj) {
    return Math.round((broj + Number.EPSILON) * 100) / 100;
  }

  function normalizujTekst(tekst) {
    return String(tekst).trim().toLowerCase();
  }

  function normalizujZaglavlje(tekst) {
    return normalizujTekst(tekst)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd');
  }

  function parsirajKolicinuIzTeksta(tekst) {
    var t = String(tekst).trim();

    if (!/^\d+([.,]\d{1,2})?$/.test(t)) {
      return null;
    }

    var broj = Number(t.replace(',', '.'));
    return broj > 0 ? broj : null;
  }

  function provjeriKolicinu(vrijednost) {
    
    if (typeof vrijednost === 'string') {
      return parsirajKolicinuIzTeksta(vrijednost);
    }

    if (typeof vrijednost !== 'number' || !isFinite(vrijednost) || vrijednost <= 0) {
      return null;
    }

    var stotinke = vrijednost * 100;
    if (Math.abs(stotinke - Math.round(stotinke)) > 1e-7) {
      return null;
    }

    return Math.round(stotinke) / 100;
  }
  function parsirajDatum(tekst) {
    var t = String(tekst).trim();
    var m;
    var godina;
    var mjesec;
    var dan;
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);

    if (m) {
      godina = Number(m[1]);
      mjesec = Number(m[2]);
      dan = Number(m[3]);
    } 
    else {
      m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(t);
      if (!m) {
        return null;
      }
      dan = Number(m[1]);
      mjesec = Number(m[2]);
      godina = Number(m[3]);
    }

    var datum = new Date(2000, 0, 1);
    datum.setFullYear(godina, mjesec - 1, dan);

    if (datum.getFullYear() !== godina || datum.getMonth() !== mjesec - 1 || datum.getDate() !== dan) {
      return null;
    }

    return datum;
  }

  function dvijeCifre(broj) {
    return broj < 10 ? '0' + broj : String(broj);
  }

  function formatirajDatum(datum) {
    return datum.getFullYear() + '-' + dvijeCifre(datum.getMonth() + 1) + '-' + dvijeCifre(datum.getDate());
  }

  function pocetakDana(datum) {
    return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  }

  function pocetakSedmice(datum) {
    var dan = pocetakDana(datum);
    var pomak = (dan.getDay() + 6) % 7;
    return new Date(dan.getFullYear(), dan.getMonth(), dan.getDate() - pomak);
  }

  function datumIzFiltera(vrijednost) {

    if (jeDatum(vrijednost)) {
      return pocetakDana(vrijednost);
    }

    if (typeof vrijednost === 'string') {
      return parsirajDatum(vrijednost);
    }

    return null;
  }

  function kopirajMjerenje(m) {
    return {id: m.id,energent: m.energent,kolicina: m.kolicina,datum: new Date(m.datum.getTime()),incident: m.incident};
  }

  function csvPolje(vrijednost) {
    var tekst = String(vrijednost);

    if (/[",\r\n]/.test(tekst)) {
      return '"' + tekst.replace(/"/g, '""') + '"';
    }

    return tekst;
  }

  function validirajMjerenje(obj) {

    var o = (obj !== null && typeof obj === 'object') ? obj : {};
    var greske = [];
    var energent = null;

    if (typeof o.energent === 'string') {
      var kandidat = normalizujTekst(o.energent);
      if (DOZVOLJENI_ENERGENTI.indexOf(kandidat) !== -1) {
        energent = kandidat;
      }
    }

    if (energent === null) {
      greske.push({ polje: 'energent', poruka: 'Energent mora biti struja, plin ili voda.' });
    }

    var kolicina = provjeriKolicinu(o.kolicina);
    if (kolicina === null) {
      greske.push({ polje: 'kolicina', poruka: 'Količina mora biti pozitivan broj sa najviše dvije decimale.' });
    }

    var datum = null;

    if (!jeDatum(o.datum)) {
      greske.push({ polje: 'datum', poruka: 'Datum nije ispravan.' });
    } 
    else if (o.datum.getFullYear() !== new Date().getFullYear()) {
      greske.push({ polje: 'datum', poruka: 'Datum mora biti iz tekuće godine.' });
    } 
    else {
      datum = new Date(o.datum.getTime());
    }

    
    var incident = o.incident === undefined ? false : o.incident;
    
    if (typeof incident !== 'boolean') {
      greske.push({ polje: 'incident', poruka: 'Incident mora biti true ili false.' });
    }
    
    if (greske.length > 0) {
      return { greske: greske, mjerenje: null };
    }
    
    return {greske: [], mjerenje: { energent: energent, kolicina: kolicina, datum: datum, incident: incident }};
  }

  function poredi(a, b, kljuc) {
    var x = a;
    var y = b;

    if (kljuc === 'datum') {
      x = a.getTime();
      y = b.getTime();
    } 
    else if (kljuc === 'incident') {
      x = a ? 1 : 0;
      y = b ? 1 : 0;
    }

    if (x < y) {
      return -1;
    }

    if (x > y) {
      return 1;
    }

    return 0;
  }

  function Evidencija(tabelaRef, opcije) {

    if (!jeTabela(tabelaRef)) {
      throw new Error('Neispravna tabela!');
    }

    var tabela = tabelaRef;
    var postavke = (opcije !== null && typeof opcije === 'object') ? opcije : {};
    var faktori = {};
    var jedinice = {};
    var energent;

    for (energent in PODRAZUMIJEVANI_FAKTORI) {
      faktori[energent] = PODRAZUMIJEVANI_FAKTORI[energent];
    }

    for (energent in PODRAZUMIJEVANE_JEDINICE) {
      jedinice[energent] = PODRAZUMIJEVANE_JEDINICE[energent];
    }

    if (postavke.faktoriEmisije && typeof postavke.faktoriEmisije === 'object') {
      for (energent in postavke.faktoriEmisije) {
        if (typeof postavke.faktoriEmisije[energent] === 'number') {
          faktori[normalizujTekst(energent)] = postavke.faktoriEmisije[energent];
        }
      }
    }

    if (postavke.jedinice && typeof postavke.jedinice === 'object') {
      for (energent in postavke.jedinice) {
        jedinice[normalizujTekst(energent)] = String(postavke.jedinice[energent]);
      }
    }

    var mjerenja = [];      
    var redovi = {};        
    var sljedeciId = 1;
    var kolone = odrediKolone();
    ucitajPocetnaMjerenja();

    function odrediKolone() {
      var zaglavlje = null;

      if (tabela.tHead && tabela.tHead.rows.length > 0) {
        zaglavlje = tabela.tHead.rows[tabela.tHead.rows.length - 1];
      }

      if (zaglavlje) {
        
        var nazivi = [];
        for (var i = 0; i < zaglavlje.cells.length; i++) {
          nazivi.push(poljeIzZaglavlja(zaglavlje.cells[i]));
        }

        var sviPrepoznati = true;
        for (var j = 0; j < OBAVEZNA_POLJA.length; j++) {
          if (nazivi.indexOf(OBAVEZNA_POLJA[j]) === -1) {
            sviPrepoznati = false;
          }
        }

        if (sviPrepoznati) {
          return nazivi;
        }
      }

      return OBAVEZNA_POLJA.concat();
    }

    function poljeIzZaglavlja(celija) {

      var oznaka = celija.getAttribute('data-polje');

      if (oznaka) {
        return normalizujZaglavlje(oznaka);
      }

      var tekst = normalizujZaglavlje(celija.textContent);
      if (tekst.indexOf('energ') !== -1) { return 'energent'; }
      if (tekst.indexOf('koli') !== -1) { return 'kolicina'; }
      if (tekst.indexOf('datum') !== -1) { return 'datum'; }
      if (tekst.indexOf('incident') !== -1) { return 'incident'; }
      if (tekst.indexOf('jedin') !== -1) { return 'jedinica'; }

      return null;
    }

    function tekstIncidenta(incident) {
      return incident ? 'Da' : 'Ne';
    }

    function tekstZaPolje(polje, m) {

      if (polje === 'energent') { 
        return m.energent; 
      }

      if (polje === 'kolicina') { 
        return String(m.kolicina); 
      }

      if (polje === 'datum') { 
        return formatirajDatum(m.datum); 
      }

      if (polje === 'incident') { 
        return tekstIncidenta(m.incident); 
      }

      if (polje === 'jedinica') { 
        return jedinice[m.energent] || ''; 
      }

      return '';
    }

    function ucitajPocetnaMjerenja() {

      var tijela = tabela.tBodies;
      for (var t = 0; t < tijela.length; t++) {

        var rows = tijela[t].rows;
        for (var r = 0; r < rows.length; r++) {

          var mjerenje = parsirajRed(rows[r]);
          if (mjerenje === null) {
            continue; 
          }

          mjerenje.id = sljedeciId;
          sljedeciId += 1;
          rows[r].setAttribute('data-id', String(mjerenje.id));
          mjerenja.push(mjerenje);
          redovi[mjerenje.id] = rows[r];

        }
      }
    }

    function parsirajRed(red) {

      var vrijednosti = {};
      for (var i = 0; i < kolone.length; i++) {
        if (kolone[i] && red.cells[i]) {
          vrijednosti[kolone[i]] = red.cells[i];
        }
      }

      for (var j = 0; j < OBAVEZNA_POLJA.length; j++) {
        if (!vrijednosti[OBAVEZNA_POLJA[j]]) {
          return null;
        }
      }

      var kolicina = parsirajKolicinuIzTeksta(vrijednosti.kolicina.textContent);
      if (kolicina === null) {
        return null;
      }

      var datum = parsirajDatum(vrijednosti.datum.textContent);
      if (datum === null) {
        return null;
      }

      return {id: null,energent: normalizujTekst(vrijednosti.energent.textContent),kolicina: kolicina,datum: datum,incident: parsirajIncident(vrijednosti.incident)};
    }

    function parsirajIncident(celija) {

      var checkbox = celija.querySelector('input[type="checkbox"]');
      if (checkbox) {
        return checkbox.checked;
      }

      var tekst = normalizujTekst(celija.textContent);
      return ['da', 'yes', '1', 'x', '✓'].indexOf(tekst) !== -1;
    }

    function napraviRed(m) {

      var red = document.createElement('tr');
      red.setAttribute('data-id', String(m.id));
      var uzorak = tabela.querySelector('tbody tr');

      for (var i = 0; i < kolone.length; i++) {

        var jeZaglavljeRetka = uzorak && uzorak.cells[i] && uzorak.cells[i].tagName === 'TH';
        var celija = document.createElement(jeZaglavljeRetka ? 'th' : 'td');

        if (jeZaglavljeRetka) {
          celija.setAttribute('scope', 'row');
        }

        if (kolone[i]) {
          celija.setAttribute('data-polje', kolone[i]);
        }

        celija.textContent = tekstZaPolje(kolone[i], m);
        red.appendChild(celija);
      }
      return red;
    }


    function osvjeziRed(m) {

      var red = redovi[m.id];

      if (!red) {
        return;
      }

      for (var i = 0; i < kolone.length; i++) {
        if (kolone[i] && red.cells[i]) {
          red.cells[i].textContent = tekstZaPolje(kolone[i], m);
        }
      }

    }



    function nadjiIndeks(id) {

      for (var i = 0; i < mjerenja.length; i++) {
        if (String(mjerenja[i].id) === String(id)) {
          return i;
        }
      }

      return -1;
    }


    function prolaziFilter(m, filter) {

      if (!filter || typeof filter !== 'object') {
        return true;
      }

      if (filter.energent !== undefined && filter.energent !== null && filter.energent !== '') {
        if (normalizujTekst(filter.energent) !== m.energent) {
          return false;
        }
      }

      var dan = pocetakDana(m.datum);
      var od = datumIzFiltera(filter.odDatuma);

      if (od !== null && dan < od) {
        return false;
      }

      var doDatuma = datumIzFiltera(filter.doDatuma);
      if (doDatuma !== null && dan > doDatuma) {
        return false;
      }

      if (filter.samoIncidenti && !m.incident) {
        return false;
      }

      return true;
    }



    function filtriraj(filter) {
      var rezultat = [];

      for (var i = 0; i < mjerenja.length; i++) {
        if (prolaziFilter(mjerenja[i], filter)) {
          rezultat.push(mjerenja[i]);
        }
      }

      return rezultat;
    }


    function faktorZa(energent) {
      return typeof faktori[energent] === 'number' ? faktori[energent] : 0;
    }


    function zapisZaIzvjestaj(m) {
      return {id: m.id,energent: m.energent,kolicina: m.kolicina,datum: formatirajDatum(m.datum),incident: m.incident};
    }


    function napraviCSV() {

      var linije = ['id,energent,kolicina,datum,incident'];

      for (var i = 0; i < mjerenja.length; i++) {

        var z = zapisZaIzvjestaj(mjerenja[i]);
        var polja = [z.id, z.energent, z.kolicina, z.datum, z.incident];

        for (var j = 0; j < polja.length; j++) {
          polja[j] = csvPolje(polja[j]);
        }

        linije.push(polja.join(','));
      }

      return linije.join('\n');
    }

    function dajMjerenja(filter) {
      var filtrirana = filtriraj(filter);
      var kopije = [];

      for (var i = 0; i < filtrirana.length; i++) {
        kopije.push(kopirajMjerenje(filtrirana[i]));
      }

      return kopije;
    }





    function dodajMjerenje(obj) {

      var rezultat = validirajMjerenje(obj);

      if (rezultat.greske.length > 0) {
        return { uspjesno: false, greske: rezultat.greske };
      }

      var mjerenje = rezultat.mjerenje;
      mjerenje.id = sljedeciId;
      sljedeciId += 1;
      var red = napraviRed(mjerenje);
      var tijelo = tabela.tBodies.length > 0 ? tabela.tBodies[0] : tabela.createTBody();

      tijelo.appendChild(red); 
      mjerenja.push(mjerenje);
      redovi[mjerenje.id] = red;
      return { uspjesno: true, greske: [] };
    }


    function ukloniMjerenje(id) {
      
      var indeks = nadjiIndeks(id);
      if (indeks === -1) {
        return false;
      }

      var mjerenje = mjerenja[indeks];
      var red = redovi[mjerenje.id];

      if (red && red.parentNode) {
        red.parentNode.removeChild(red);
      }

      delete redovi[mjerenje.id];
      mjerenja.splice(indeks, 1);

      return true;
    }



    function azurirajMjerenje(id, izmjene) {

      var indeks = nadjiIndeks(id);
      
      if (indeks === -1) {
        return { uspjesno: false, greske: [{ polje: 'id', poruka: 'Mjerenje ne postoji.' }] };
      }
      
      if (izmjene === null || typeof izmjene !== 'object') {
        return { uspjesno: false, greske: [{ polje: 'izmjene', poruka: 'Izmjene moraju biti objekat.' }] };
      }
      
      var kandidat = kopirajMjerenje(mjerenja[indeks]);
      for (var i = 0; i < OBAVEZNA_POLJA.length; i++) {
        var polje = OBAVEZNA_POLJA[i];
        if (polje in izmjene) {
          kandidat[polje] = izmjene[polje];
        }
      }
      
      var rezultat = validirajMjerenje(kandidat);
      if (rezultat.greske.length > 0) {
        return { uspjesno: false, greske: rezultat.greske };
      }
      
      var postojece = mjerenja[indeks];
      postojece.energent = rezultat.mjerenje.energent;
      postojece.kolicina = rezultat.mjerenje.kolicina;
      postojece.datum = rezultat.mjerenje.datum;
      postojece.incident = rezultat.mjerenje.incident;
      osvjeziRed(postojece);
      
      return { uspjesno: true, greske: [] };
    }
    
    
    function brojMjerenja() {
      return mjerenja.length;
    }

    
    function dajUkupnuEmisiju(filter) {

      var zbir = 0;
      var filtrirana = filtriraj(filter);

      for (var i = 0; i < filtrirana.length; i++) {
        zbir += filtrirana[i].kolicina * faktorZa(filtrirana[i].energent);
      }

      return zaokruzi(zbir);
    }

    function dajStatistikuPoEnergentu() {
      var statistika = {};

      for (var i = 0; i < mjerenja.length; i++) {

        var m = mjerenja[i];
        var s = statistika[m.energent];

        if (!s) {
          statistika[m.energent] = { broj: 1, ukupno: m.kolicina, prosjek: 0, min: m.kolicina, max: m.kolicina };
        } 
        else {
          s.broj += 1;
          s.ukupno += m.kolicina;
          s.min = Math.min(s.min, m.kolicina);
          s.max = Math.max(s.max, m.kolicina);
        }
      }

      for (var kljuc in statistika) {
        var st = statistika[kljuc];
        st.prosjek = zaokruzi(st.ukupno / st.broj);
        st.ukupno = zaokruzi(st.ukupno);
      }

      return statistika;
    }


    function prosjecnaPotrosnja(energent, period) {

      if (typeof energent !== 'string' || typeof period !== 'string') {
        return 0;
      }

      var danas = pocetakDana(new Date());
      var godina = danas.getFullYear();
      var mjesec = danas.getMonth();
      var vrsta = normalizujTekst(period);
      var pocetak;
      var kraj;

      if (vrsta === 'sedmica') {
        pocetak = pocetakSedmice(danas);
        kraj = new Date(pocetak.getFullYear(), pocetak.getMonth(), pocetak.getDate() + 6);
      } 
      else if (vrsta === 'mjesec') {
        pocetak = new Date(godina, mjesec, 1);
        kraj = new Date(godina, mjesec + 1, 0); // nulti dan idućeg mjeseca = zadnji dan ovog
      } 
      else if (vrsta === 'godina') {
        pocetak = new Date(godina, 0, 1);
        kraj = new Date(godina, 11, 31);
      } 
      else {
        return 0;
      }

      var trazeni = normalizujTekst(energent);
      var broj = 0;
      var zbir = 0;
      
      for (var i = 0; i < mjerenja.length; i++) {
        var m = mjerenja[i];
        var dan = pocetakDana(m.datum);
      
        if (m.energent === trazeni && dan >= pocetak && dan <= kraj) {
          broj += 1;
          zbir += m.kolicina;
        }
      
      }
      
      return broj === 0 ? 0 : zaokruzi(zbir / broj);
    }
    
    
    
    function detektujAnomalije() {
      var zbirovi = {};
    
      for (var i = 0; i < mjerenja.length; i++) {
    
        var energent = mjerenja[i].energent;
        if (!zbirovi[energent]) {
          zbirovi[energent] = { zbir: 0, broj: 0 };
        }
    
        zbirovi[energent].zbir += mjerenja[i].kolicina;
        zbirovi[energent].broj += 1;
      }
    
      var anomalije = [];
    
      for (var k = 0; k < mjerenja.length; k++) {
    
        var m = mjerenja[k];
        var prosjek = zbirovi[m.energent].zbir / zbirovi[m.energent].broj;
        var razlog = null;
    
        if (m.incident) {
          razlog = 'incident';
        } 
        else if (m.kolicina > 3 * prosjek) {
          razlog = 'visoka_potrosnja';
        } 
        else if (m.kolicina < 0) {
          razlog = 'negativna_potrosnja';
        }
        if (razlog !== null) {
          anomalije.push({ id: m.id, razlog: razlog });
        }
      
      }
      
      return anomalije;
    }
    
    
    function generisiIzvjestaj(format) {
    
      var f = typeof format === 'string' ? normalizujTekst(format) : '';
    
      if (f === 'json') {
    
        var zapisi = [];
        for (var i = 0; i < mjerenja.length; i++) {
          zapisi.push(zapisZaIzvjestaj(mjerenja[i]));
        }
    
        return JSON.stringify(zapisi, null, 2);
      }
    
    
      if (f === 'csv') {
        return napraviCSV();
    
      }
      return '';
    }
    
    
    
    function sortirajMjerenja(kljuc, smjer) {
    
      var kopije = [];
    
      for (var i = 0; i < mjerenja.length; i++) {
        kopije.push(kopirajMjerenje(mjerenja[i]));
      }
    
      if (OBAVEZNA_POLJA.indexOf(kljuc) === -1) {
        return kopije;
      }
    
      var mnozilac = smjer === 'desc' ? -1 : 1;

      for (var j = 1; j < kopije.length; j++) {

        var trenutni = kopije[j];
        var k = j - 1;

        while (k >= 0 && poredi(kopije[k][kljuc], trenutni[kljuc], kljuc) * mnozilac > 0) {
          kopije[k + 1] = kopije[k];
          k--;
        }

        kopije[k + 1] = trenutni;
      }

      return kopije;
    }


    function grupisiPoDanu() {

      var grupe = {};
      var kljucevi = [];

      for (var i = 0; i < mjerenja.length; i++) {
        var kljuc = formatirajDatum(mjerenja[i].datum);

        if (!grupe[kljuc]) {
          grupe[kljuc] = [];
          kljucevi.push(kljuc);
        }
        grupe[kljuc].push(kopirajMjerenje(mjerenja[i]));

      }
      for (var j = 1; j < kljucevi.length; j++) {
        var tekuci = kljucevi[j];
        var k = j - 1;
        while (k >= 0 && kljucevi[k] > tekuci) {
          kljucevi[k + 1] = kljucevi[k];
          k--;
        }
        kljucevi[k + 1] = tekuci;
      }
      
      var sortirano = {};
      for (var n = 0; n < kljucevi.length; n++) {
        sortirano[kljucevi[n]] = grupe[kljucevi[n]];
      }
      return sortirano;
    }

    function izveziKaoCSV() {
      try {
        var blob = new Blob(['\uFEFF' + napraviCSV()], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var veza = document.createElement('a');
        veza.href = url;
        veza.download = 'evidencija.csv';
        document.body.appendChild(veza);
        veza.click();
        document.body.removeChild(veza);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
        return true;
      } catch (greska) {
        return false;
      }
    }
    return {
      dajMjerenja: dajMjerenja,
      dodajMjerenje: dodajMjerenje,
      ukloniMjerenje: ukloniMjerenje,
      azurirajMjerenje: azurirajMjerenje,
      brojMjerenja: brojMjerenja,
      dajUkupnuEmisiju: dajUkupnuEmisiju,
      dajStatistikuPoEnergentu: dajStatistikuPoEnergentu,
      prosjecnaPotrosnja: prosjecnaPotrosnja,
      detektujAnomalije: detektujAnomalije,
      generisiIzvjestaj: generisiIzvjestaj,
      sortirajMjerenja: sortirajMjerenja,
      grupisiPoDanu: grupisiPoDanu,
      izveziKaoCSV: izveziKaoCSV
    };
  }

  return Evidencija;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Evidencija;
}
