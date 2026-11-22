
(function () {
  'use strict';

  var TRAJANJE_DEBOUNCE = 300;     
  var TRAJANJE_OZNAKE_NOVOG = 2000; 
  var UDIO_USTEDE = 0.2;           

  var tabela = document.querySelector('[data-testid="tabela"]');
  var forma = document.querySelector('[data-testid="forma"]');
  var poruke = document.getElementById('poruke');
  var karticaEmisija = document.querySelector('[data-testid="kartica-emisija"]');
  var karticaUsteda = document.querySelector('[data-testid="kartica-usteda"]');
  var karticaStatus = document.querySelector('[data-testid="kartica-status"]');

  if (!tabela || !forma || !poruke || !karticaEmisija || !karticaUsteda || !karticaStatus) {
    return;
  }

  var evidencija = Evidencija(tabela, {
    jedinice: { struja: 'kWh', plin: 'm³', voda: 'm³' }
  });


  function upisiUKarticu(kartica, tekst) {
    var mjesto = kartica.querySelector('.vrijednost') || kartica;
    mjesto.textContent = tekst;
  }

  function osvjeziKartice() {

    var emisija = evidencija.dajUkupnuEmisiju();
    var usteda = Math.round(emisija * UDIO_USTEDE * 100) / 100;
    var imaIncident = evidencija.dajMjerenja({ samoIncidenti: true }).length > 0;

    upisiUKarticu(karticaEmisija, emisija.toFixed(2));
    upisiUKarticu(karticaUsteda, usteda.toFixed(2));
    upisiUKarticu(karticaStatus, imaIncident ? 'Kritično' : 'Normalno');
  }

  function brojKolona() {
    var zaglavlje = tabela.tHead ? tabela.tHead.rows[tabela.tHead.rows.length - 1] : null;
    return zaglavlje ? zaglavlje.cells.length : 0;
  }

  function dodajDugmeZaBrisanje(red) {

    var zadnja = brojKolona() - 1;
    
    if (zadnja < 0) {
      return;
    }

    while (red.cells.length <= zadnja) {
      red.appendChild(document.createElement('td'));
    }

    var celija = red.cells[zadnja];

    if (celija.querySelector('button')) {
      return;
    }

    var dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.textContent = 'Obriši';
    dugme.setAttribute('data-akcija', 'ukloni');
    celija.appendChild(dugme);
  }

  function dodajDugmadSvimRedovima() {
    var redovi = tabela.querySelectorAll('tbody tr[data-id]');
    for (var i = 0; i < redovi.length; i++) {
      dodajDugmeZaBrisanje(redovi[i]);
    }
  }

  tabela.addEventListener('click', function (event) {

    var dugme = event.target;

    if (dugme.tagName !== 'BUTTON' || dugme.getAttribute('data-akcija') !== 'ukloni') {
      return;
    }

    var red = dugme.parentNode.parentNode; 
    var id = Number(red.getAttribute('data-id'));

    if (evidencija.ukloniMjerenje(id)) {
      osvjeziKartice();
      prikaziPoruku('Mjerenje je uklonjeno.', 'uspjeh');
      tabela.dispatchEvent(new CustomEvent('mjerenje:uklonjeno', {
        bubbles: true,
        detail: { id: id }
      }));
    }
  });


  function prikaziPoruku(tekst, stanje) {
    poruke.textContent = tekst;
    poruke.setAttribute('data-stanje', stanje);
  }

  function pretvoriDatum(tekst) {

    var dijelovi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tekst);

    if (!dijelovi) {
      return null;
    }

    var datum = new Date(Number(dijelovi[1]), Number(dijelovi[2]) - 1, Number(dijelovi[3]));
    return isNaN(datum.getTime()) ? null : datum;
  }

  function procitajFormu() {

    var kolicinaTekst = forma.elements['kolicina'].value.trim();

    return {
      energent: forma.elements['energent'].value,
      kolicina: kolicinaTekst === '' ? NaN : Number(kolicinaTekst),
      datum: pretvoriDatum(forma.elements['datum'].value),
      incident: forma.elements['incident'].checked
    };
  }

  function oznaciNoviRed(id) {

    var red = tabela.querySelector('tr[data-id="' + id + '"]');

    if (!red) {
      return;
    }

    dodajDugmeZaBrisanje(red);
    red.className = '--new';
    
    setTimeout(function () {
      red.className = '';
    }, TRAJANJE_OZNAKE_NOVOG);
  }

  function obradiSlanje() {

    var rezultat = evidencija.dodajMjerenje(procitajFormu());

    if (!rezultat.uspjesno) {

      var linije = [];

      for (var i = 0; i < rezultat.greske.length; i++) {
        linije.push(rezultat.greske[i].poruka);
      }

      prikaziPoruku(linije.join('\n'), 'greska');

      var polje = forma.elements[rezultat.greske[0].polje];

      if (polje && typeof polje.focus === 'function') {
        polje.focus();
      }
      return;
    }

    var sva = evidencija.dajMjerenja();
    var novo = sva[sva.length - 1];

    oznaciNoviRed(novo.id);
    osvjeziKartice();
    forma.reset();
    prikaziPoruku('Mjerenje je uspješno dodano.', 'uspjeh');

    tabela.dispatchEvent(new CustomEvent('mjerenje:dodano', {
      bubbles: true,
      detail: { mjerenje: novo }
    }));
  }

  function debounce(funkcija, kasnjenje) {
    
    var tajmer = null;
    
    return function () {

      var mozeOdmah = (tajmer === null);
      clearTimeout(tajmer);
      
      tajmer = setTimeout(function () {
        tajmer = null;
      }, kasnjenje);

      if (mozeOdmah) {
        funkcija();
      }

    };
  }

  var obradiSlanjeSaKasnjenjem = debounce(obradiSlanje, TRAJANJE_DEBOUNCE);

  forma.addEventListener('submit', function (event) {
    event.preventDefault();
    obradiSlanjeSaKasnjenjem();
  });


  dodajDugmadSvimRedovima();
  osvjeziKartice();

})();
