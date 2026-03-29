import * as cheerio from 'cheerio';

async function traziJelovnik() {
    console.log('--- Idem na sajt doma da tražim najnoviji PDF... ---');
    
    try {
        // 1. Aplikacija ide na glavnu stranicu
        const adresa = 'https://www.ucenickicentar-bg.rs/sluzba-ishrane/';
        const odgovor = await fetch(adresa);
        const htmlKod = await odgovor.text();

        // 2. Učitavamo kod sajta u naš alat Cheerio
        const $ = cheerio.load(htmlKod);
        let nadjeniLink = null;

        // 3. Tražimo sve linkove (<a> tagove) na sajtu
        $('a').each((index, element) => {
            const link = $(element).attr('href');
            
            // Ako link postoji i završava se na .pdf, to je naš jelovnik!
            if (link && link.endsWith('.pdf')) {
                nadjeniLink = link;
            }
        });

        if (nadjeniLink) {
            console.log('\n🎉 BRAVO! Našao sam najnoviji link:');
            console.log(nadjeniLink);
        } else {
            console.log('\nNisam uspeo da nađem nijedan PDF na ovoj stranici.');
        }

    } catch (greska) {
        console.error('Došlo je do greške prilikom odlaska na sajt:', greska);
    }
}

// Pokrećemo funkciju
traziJelovnik();