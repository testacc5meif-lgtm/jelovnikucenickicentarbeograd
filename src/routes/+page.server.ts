import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';

export const prerender = false;

// Keš memorija servera
let sacuvanJelovnik: any = null;
let sacuvanPdfLink: string = '';

// Maskiramo se u pravog korisnika još ubedljivije
const lazniHederi = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'sr-RS,sr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/'
};

export const load = async ({ fetch, setHeaders }: any) => {
    try {
        console.log("=== 🚀 KREĆEMO: Server započinje posao ===");
        const originalnaAdresa = 'https://www.ucenickicentar-bg.rs/sluzba-ishrane/';
        
        console.log("👉 KORAK 1: Tražim HTML sajta DIREKTNO (bez posrednika)...");
        
        // 🏆 KLJUČNA IZMENA: Izbacili smo proxy! Kucamo direktno na njihov sajt.
        const odgovor = await fetch(originalnaAdresa, { headers: lazniHederi });
        
        if (!odgovor.ok) {
            console.error("❌ PAD NA KORAKU 1: Sajt je blokirao direktan pristup. Status koda:", odgovor.status);
            return { uspesno: false };
        }

        const html = await odgovor.text();
        const $ = cheerio.load(html);
        
        let aktuelniLink = '';
        $('a').each((_: any, el: any) => {
            const href = $(el).attr('href');
            if (href && href.toLowerCase().endsWith('.pdf')) {
                aktuelniLink = href.startsWith('http') ? href : 'https://www.ucenickicentar-bg.rs' + href;
                return false; 
            }
        });

        console.log("👉 KORAK 2: Pronađen PDF link:", aktuelniLink);

        if (!aktuelniLink) return { uspesno: false };

        if (aktuelniLink === sacuvanPdfLink && sacuvanJelovnik) {
            console.log("⚡ Vraćam jelovnik iz memorije!");
            setHeaders({
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
            });
            return { uspesno: true, jelovnik: sacuvanJelovnik, pdfLink: aktuelniLink };
        }

        console.log("👉 KORAK 3: Skidam PDF DIREKTNO...");
        const pdfOdgovor = await fetch(aktuelniLink, { headers: lazniHederi });
        
        if (!pdfOdgovor.ok) {
             console.error("❌ PAD NA KORAKU 3: Ne mogu da skinem PDF direktno! Status:", pdfOdgovor.status);
             return { uspesno: false };
        }

        const arrayBuffer = await pdfOdgovor.arrayBuffer();
        
        // @ts-ignore
        const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

        console.log("👉 KORAK 4: PDF uspešno skinut! Šaljem Geminiju na čitanje...");
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        
       const prompt = `Ti si stručnjak za obradu dokumenata. Ovo je PDF jelovnika za učenički centar.
        Tvoj zadatak je da pročitaš tabele i izvučeš jelovnik za svaki dan.
        
        🚨 VAŽNA PRAVILA: 
        1. SPAJANJE HRANE: U PDF-u su komponente istog obroka spojene crticama ili se nalaze u istom bloku. MORAŠ da zadržiš te crtice! Nemoj da odvajaš svaku namirnicu posebno. Svaki element u JSON nizu treba da bude cela jedna opcija za obrok (npr. "čaj - pileća prsa - proja sa sirom").
        2. PAMETNA LEKTURA (ISPRAVLJANJE GREŠAKA): PDF dokumenti iz kojih čitaš često imaju greške u kucanju ili skeniranju (npr. piše "вође" umesto "воће", "сирче" umesto "сир" itd.). Tvoj zadatak je da prepoznaš te očigledne greške i ispraviš ih tako da nazivi hrane budu potpuno gramatički tačni i logični na srpskom jeziku pre nego što ih vratiš.
        
        Vrati ISKLJUČIVO validan JSON format, bez ikakvog dodatnog teksta ili markdown oznaka.
        Format mora izgledati tačno ovako:
        {
          "28.03.": {
            "doručak": ["čaj - pileća prsa - proja", "kakao - riblja pašteta"],
            "ručak": ["čorba - pasulj - kupus salata", "supa - šnicla - pire"],
            "večera": ["makarone sa sirom - voće"]
          }
        }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                { inlineData: { data: base64Pdf, mimeType: 'application/pdf' } }
            ]
        });

        console.log("👉 KORAK 5: Gemini je pročitao i vratio tekst!");
        let sirovTekst = response.text || '';
        let jsonTekst = sirovTekst.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const procitanJelovnik = JSON.parse(jsonTekst);

        sacuvanJelovnik = procitanJelovnik;
        sacuvanPdfLink = aktuelniLink;

        console.log("✅ KORAK 6: SVE JE USPEŠNO ZAVRŠENO!");

        setHeaders({
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
        });

        return {
            uspesno: true,
            jelovnik: sacuvanJelovnik,
            pdfLink: aktuelniLink
        };

    } catch (e) {
        console.error("❌ KATASTROFA NA SERVERU (Catch blok):", e);
        if (sacuvanJelovnik) return { uspesno: true, jelovnik: sacuvanJelovnik, pdfLink: sacuvanPdfLink };
        return { uspesno: false, jelovnik: null };
    }
};
