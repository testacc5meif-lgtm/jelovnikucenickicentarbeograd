import Tesseract from 'tesseract.js';

const putanjaDoSlike = './test.png';
const jezik = 'srp';

// 1. OVO JE NAŠA NOVA PAMETNA FUNKCIJA ZA SREĐIVANJE TEKSTA
function srediJelovnik(sirovTekst) {
    // Pravimo prazne liste (nizove) za svaki obrok
    let doručak = [];
    let ručak = [];
    let večera = [];

    // Delimo ceo dugačak tekst na pojedinačne redove
    const redovi = sirovTekst.split('\n');

    let citamHranu = false;

    for (let red of redovi) {
        // Preskačemo prazne redove
        if (red.trim() === '') continue;

        // Kad naiđemo na reč "ДОРУЧАК", znamo da od sledećeg reda kreće hrana
        if (red.includes('ДОРУЧАК')) {
            citamHranu = true;
            continue;
        }

        // Ako smo u delu gde je hrana, seckamo tekst
        if (citamHranu) {
            // Sečemo red svaki put kad nađemo crticu (-) ili onu grešku (,,) 
            // i čistimo višak razmaka
            let delovi = red.split(/[-„|]/)
                            .map(deo => deo.trim())
                            .filter(deo => deo.length > 0);

            // Ako postoji prvi deo, to je doručak
            if (delovi[0]) doručak.push(delovi[0]);
            // Ako postoji drugi deo, to je ručak
            if (delovi[1]) ručak.push(delovi[1]);
            // Ako postoji treći deo, to je večera
            if (delovi[2]) večera.push(delovi[2]);
        }
    }

    // Vraćamo lepo upakovane podatke
    return {
        doručak: doručak,
        ručak: ručak,
        večera: večera
    };
}

// 2. ISTI KOD ZA POKRETANJE ČITAČA
console.log('--- Počinjem čitanje i sortiranje... ---');

Tesseract.recognize(putanjaDoSlike, jezik)
.then(({ data: { text } }) => {
  
  // Kada dobijemo tekst od mašine, šaljemo ga u našu pametnu funkciju
  const sredjeniPodaci = srediJelovnik(text);

  console.log('\n==============================');
  console.log('--- SORTIRANI JELOVNIK ---');
  console.log('==============================\n');
  
  // Lepo ispisujemo sređene podatke u terminal
  console.log('🍳 DORUČAK:');
  sredjeniPodaci.doručak.forEach(jelo => console.log('  * ' + jelo));
  
  console.log('\n🍲 RUČAK:');
  sredjeniPodaci.ručak.forEach(jelo => console.log('  * ' + jelo));
  
  console.log('\n🍽️ VEČERA:');
  sredjeniPodaci.večera.forEach(jelo => console.log('  * ' + jelo));

}).catch(err => {
  console.error('\n!!! DOŠLO JE DO GREŠKE !!!\n', err);
});