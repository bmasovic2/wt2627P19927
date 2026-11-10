# Obrazloženje arhitekture – Spirala 1

## 1. Flexbox ili Grid

Grid sam koristio za kartice. Kartice trebaju stajati u pravilnim kolonama, a broj kolona se sam prilagođava širini prostora. S Flexboxom bi se posljednji red razvukao ili ne bi bio poravnat s kolonama iznad, pa bih širine morao podešavati ručno.

Flexbox sam koristio za zaglavlje i navigaciju. Elementi su različitih širina i raspoređuju se u jednom redu prema svom sadržaju, a glavna navigacija se lako pomjera udesno. S Gridom bih morao unaprijed definisati kolone koje se teže prilagođavaju dužini teksta.

## 2. CSS specifičnost

U kodu nema !important. Selektori su jednostavni i zasnovani na klasama, bez ID selektora, pa nema sukoba prioriteta, a preklapanja rješava redoslijed pravila u datoteci.

## 3. Simulacija box modela

Bez border-box kartice se ne bi promijenile. Kartica nema zadanu širinu, pa popunjava roditelja zajedno s paddingom i ivicom, a broj kolona određuje Grid.

Promjena bi se vidjela na poljima forme. Širina 100%, a padding i ivica bi se dodali izvan te širine. Polje bi bilo šire od roditelja.