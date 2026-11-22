# Obrazloženje arhitekture – Spirala 2

## 1. Dodavanje reda i textContent

Novi red se u tabelu dodaje u datoteci Evidencija.js, u metodi dodajMjerenje, na liniji 555 pomoću tijelo.appendChild(red). Red se kreira pomoću funkcije napraviRed, a tekst svake ćelije postavljam kroz textContent.

textContent uneseni sadržaj prikazuje kao običan tekst, a ne kao HTML. Kada bih koristio innerHTML sa unosom <script>alert(1)</script>, skripta ubačena na taj način ne bi se automatski izvršila. Međutim slični zlonamjerni unosi mogali bi se izvršiti i predstavljati XSS napad dok kod orištenja textContent sadržaj se ne tumači kao HTML.

## 2. Immutability

{...mjerenje} pravi samo plitku kopiju objekta. Obična svojstva se kopiraju, ali datum je objekat tipa Date, pa bi original i kopija dijelili isti objekat . Promjena datuma u kopiji zato bi promijenila i datum originalnog mjerenja.

Problem rješavam funkcijom kopirajMjerenje (linija 131), koja pravi zasebnu kopiju datuma pomoću new Date(m.datum.getTime()). Ovu funkciju koristim prilikom vraćanja mjerenja pozivaocu da promjene kopije ne bi uticale na podatke unutar modula.

## 3. aria-live

Na elementu #poruke koristim  aria-live="polite" jer poruke o uspješnom unosu i greškama nisu hitne. Čitač ekrana ih pročita kada završi trenutnu radnju , dok bi assertive odmah prekinuo trenutno čitanje.

Nakon neuspješne validacije fokus se prebacuje na prvo neispravno polje pomoću focus(). Zato je polite prikladniji jer korisnik može čuti i poruku i informaciju o polju na koje je fokus prebačen.

## 4. Debounce

Debounce koristim na događaju submit kako brzi uzastopni klikovi ne bi više puta dodali isto mjerenje. Bez njega bi svaki klik mogao pozvati dodajMjerenje, pa bi u tabeli nastalo više istih unosa s različitim ID vrijednostima. U aplikaciji se prvo slanje izvršava odmah, a naredni pozivi u narednih 300 ms se ignorišu.

Ako bi se forma slala  klasično bez JavaScripta, ovaj JavaScript debounce ne bi bio potreban. Preglednik bi nakon slanja započeo učitavanje nove stranice. 

## 5. Stabilno sortiranje

Primjer je sortirajMjerenja('energent', 'asc') nad početnim mjerenjima. Mjerenja za plin imaju datume 2026-02-02, 2026-05-05, 2026-08-08 i 2026-11-11. Pošto sva imaju isti ključ sortiranja (plin), stabilno sortiranje zadržava njihov postojeći redoslijed.

Stabilnost osiguravam insertion sort algoritmom u metodi sortirajMjerenja (linije 794–805). Element se pomjera samo ako je prethodni strogo veći od njega, pa mjerenja s jednakim ključem ostaju u originalnom međusobnom redoslijedu  i pri rastućem i pri opadajućem sortiranju .