import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';

export const prerender = false;

// Keš memorija servera
let sacuvanJelovnik: any = null;
let sacuvanPdfLink: string = '';

const iskoristiProxy = (url: string) => `https://api.codetabs.com/v1/proxy?quest=${url}`;
const lazniHederi = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export const load = async ({ fetch }: any) => {
    try {
        console.log("=== 🚀 KREĆEMO: Server započinje posao ===");
        const originalnaAdresa = 'https://www.ucenickicentar-bg.rs/sluzba-ishrane/';
        
        console.log("👉 KORAK 1: Tražim glavni sajt preko proxy-ja...");
        const odgovor = await fetch(iskoristiProxy(originalnaAdresa), { headers: lazniHederi });
        
        if (!odgovor.ok) {
            console.error("❌ PAD NA KORAKU 1: Proxy ili sajt je blokirao pristup! Status koda:", odgovor.status);
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

        if (!aktuelniLink) {
            console.error("❌ PAD NA KORAKU 2: Nije pronađen PDF link unutar HTML-a!");
            return { uspesno: false };
        }

        if (aktuelniLink === sacuvanPdfLink && sacuvanJelovnik) {
            console.log("⚡ Vraćam jelovnik iz brze memorije (keš)!");
            return { uspesno: true, jelovnik: sacuvanJelovnik, pdfLink: aktuelniLink };
        }

        console.log("👉 KORAK 3: Skidam PDF fajl...");
        const pdfOdgovor = await fetch(iskoristiProxy(aktuelniLink), { headers: lazniHederi });
        
        if (!pdfOdgovor.ok) {
             console.error("❌ PAD NA KORAKU 3: Ne mogu da skinem PDF! Status koda:", pdfOdgovor.status);
             return { uspesno: false };
        }

        const arrayBuffer = await pdfOdgovor.arrayBuffer();
        
        // @ts-ignore
        const base64Pdf = Buffer.from(arrayBuffer).toString('base64');

        console.log("👉 KORAK 4: PDF uspešno skinut! Šaljem Geminiju na čitanje...");
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

        console.log("👉 KORAK 5: Gemini je pročitao i vratio tekst!");
        let sirovTekst = response.text || '';
        let jsonTekst = sirovTekst.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const procitanJelovnik = JSON.parse(jsonTekst);

        sacuvanJelovnik = procitanJelovnik;
        sacuvanPdfLink = aktuelniLink;

        console.log("✅ KORAK 6: SVE JE USPEŠNO ZAVRŠENO!");
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
