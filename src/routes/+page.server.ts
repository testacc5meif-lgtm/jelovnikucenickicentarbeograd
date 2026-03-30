import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';

// Keš memorija servera
let sacuvanJelovnik: any = null;
let sacuvanPdfLink: string = '';

// Dodato ': any' da TypeScript prestane da traži skrivene fajlove
export const load = async ({ fetch }: any) => {
    try {
        const adresa = 'https://www.ucenickicentar-bg.rs/sluzba-ishrane/';
        const odgovor = await fetch(adresa);
        if (!odgovor.ok) return { uspesno: false };

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

        if (!aktuelniLink) return { uspesno: false };

        // Ako imamo isti PDF u kešu, vraćamo ga odmah
        if (aktuelniLink === sacuvanPdfLink && sacuvanJelovnik) {
            console.log("⚡ Vraćam jelovnik iz memorije (Brzina svetlosti)!");
            return { uspesno: true, jelovnik: sacuvanJelovnik, pdfLink: aktuelniLink };
        }

        console.log("📄 Novi PDF pronađen! Šaljem Geminiju na čitanje...");
        const pdfOdgovor = await fetch(aktuelniLink);
        const arrayBuffer = await pdfOdgovor.arrayBuffer();
        
        // @ts-ignore
        const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        
        const prompt = `Ti si stručnjak za obradu dokumenata. Ovo je PDF jelovnika za učenički centar.
        Tvoj zadatak je da pročitaš tabele i izvučeš jelovnik za svaki dan.
        
        🚨 VAŽNO PRAVILO ZA SPAJANJE HRANE: 
        U PDF-u su komponente istog obroka spojene crticama ili se nalaze u istom bloku. 
        MORAŠ da zadržiš te crtice! Nemoj da odvajaš svaku namirnicu posebno. 
        Svaki element u JSON nizu treba da bude cela jedna opcija za obrok (npr. "čaj - pileća prsa - proja sa sirom").
        
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

        // Obezbeđujemo se da uvek dobijemo čist tekst
        let sirovTekst = response.text || '';
        let jsonTekst = sirovTekst.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const procitanJelovnik = JSON.parse(jsonTekst);

        // Čuvamo u memoriji
        sacuvanJelovnik = procitanJelovnik;
        sacuvanPdfLink = aktuelniLink;

        return {
            uspesno: true,
            jelovnik: sacuvanJelovnik,
            pdfLink: aktuelniLink
        };

    } catch (e) {
        console.error("Greška na serveru:", e);
        // Ako AI pukne, vrati stari keširani ako postoji
        if (sacuvanJelovnik) return { uspesno: true, jelovnik: sacuvanJelovnik, pdfLink: sacuvanPdfLink };
        return { uspesno: false, jelovnik: null };
    }
};