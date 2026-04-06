<script lang="ts">
    let { data } = $props();
    
    let aktivniObrok = $state('doručak'); 

    // Generišemo datume (Popravljena ćirilica!)
    function generisiDane() {
        let dani = [];
        for(let i = 0; i < 7; i++) {
            let d = new Date();
            d.setDate(d.getDate() + i);
            let dan = d.getDate();
            let mesec = d.getMonth() + 1;
            let danStr = String(dan).padStart(2, '0');
            let mesecStr = String(mesec).padStart(2, '0');
            
            // "Danas" i "Sutra" su sada na ćirilici kako bi se slagali sa ostatkom nedelje
            let naziv = (i === 0) ? "Данас" : (i === 1) ? "Сутра" : 
                        d.toLocaleDateString('sr-RS', {weekday: 'long'}).charAt(0).toUpperCase() + d.toLocaleDateString('sr-RS', {weekday: 'long'}).slice(1);

            dani.push({
                index: i,
                label: `${naziv} (${danStr}.${mesecStr}.)`,
                danStr, mesecStr
            });
        }
        return dani;
    }

    let dostupniDani = $state(generisiDane());
    let izabraniDanIndex = $state(0);

    // Automatski pronalazi jelovnik za izabrani datum iz JSON-a
    function izvuciJelovnikZaDan(index: number) {
        let prazno = { doručak: [], ručak: [], večera: [] };
        if (!data.uspesno || !data.jelovnik) return prazno;

        let izabrani = dostupniDani[index];
        let trazeniPatern = `${izabrani.danStr}.${izabrani.mesecStr}`;

        for (const kljuc in data.jelovnik) {
            if (kljuc.includes(trazeniPatern)) {
                let j = data.jelovnik[kljuc];
                return {
                    doručak: j.doručak || j.dorucak || [],
                    ručak: j.ručak || j.rucak || [],
                    večera: j.večera || j.vecera || []
                };
            }
        }
        return prazno;
    }

    let trenutniJelovnik = $derived(izvuciJelovnikZaDan(izabraniDanIndex));
</script>

<main>
    <div class="logo-container">
        <img src="/logo.png" alt="Logo Učenički Centar Jelovnik" class="app-logo">
    </div>
    <h1 class="naslov">🏛️ Ученички Центар - Јеловник</h1>

    <div class="padajuci-meni-okvir">
        <select bind:value={izabraniDanIndex} class="meni">
            {#each dostupniDani as d} <option value={d.index}>{d.label}</option> {/each}
        </select>
        <div class="meni-tekst">Изабери дан за приказ</div>
    </div>

    {#if !data.uspesno}
        <div class="kartica-greska">
            <h3>🚨 Упс!</h3>
            <p>Изгледа да сервер тренутно не може да прочита јеловник. Покушај поново касније!</p>
        </div>
    {:else}
        <div class="dugmici-okvir">
            <button onclick={() => aktivniObrok = 'doručak'} class="tab-btn {aktivniObrok === 'doručak' ? 'dorucak-aktivan' : 'neaktivan'}">🍳 Доручак</button>
            <button onclick={() => aktivniObrok = 'ručak'} class="tab-btn {aktivniObrok === 'ručak' ? 'rucak-aktivan' : 'neaktivan'}">🍲 Ручак</button>
            <button onclick={() => aktivniObrok = 'večera'} class="tab-btn {aktivniObrok === 'večera' ? 'vecera-aktivan' : 'neaktivan'}">🍽️ Вечера</button>
        </div>

        <div class="hrana-okvir {aktivniObrok}">
            {#if trenutniJelovnik[aktivniObrok] && trenutniJelovnik[aktivniObrok].length > 0}
                <ul>
                    {#each trenutniJelovnik[aktivniObrok] as jelo} <li>{jelo}</li> {/each}
                </ul>
            {:else}
                <p class="nema-hrane">😅 Упс, изгледа да нови јеловник још увек није изашао!</p>
            {/if}
        </div>
        
        {#if data.pdfLink}
            <p class="link-okvir">
                <a href={data.pdfLink} target="_blank" class="pdf-link">📄 Оригинални ПДФ</a>
            </p>
        {/if}
    {/if}

    <div class="disclaimer">
        <p>⚠️ Ова апликација је независни пројекат и није званична апликација Ученичког центра Београд. Јеловник се аутоматски преузима са њиховог званичног сајта.</p>
    </div>
</main>

<style>
    /* OVO MENJA BOJU CELOG EKRANA */
    :global(body) {
        background-color: var(--pozadina);
        color: var(--tekst);
        margin: 0;
        transition: background-color 0.3s ease, color 0.3s ease;
        position: relative; /* Dodato da bi animacija pozadine radila */
        min-height: 100vh;
    }

    /* 🚀 FUTURISTIČKA MREŽA KOJA SE POMERA */
    :global(body::before) {
        content: "";
        position: fixed;
        top: 0; 
        left: 0; 
        width: 100vw; 
        height: 100vh;
        z-index: -1; /* Gura pokretne linije skroz u pozadinu, iza svega */
        pointer-events: none; /* Sprečava da mreža blokira kliktanje prstom */
        
        /* Crtanje linija */
        background-image: 
            linear-gradient(var(--linija-mreza) 1px, transparent 1px),
            linear-gradient(90deg, var(--linija-mreza) 1px, transparent 1px);
        background-size: 50px 50px; /* Veličina kockica u mreži */
        
        /* Magija pomeranja */
        animation: pomeranjeMreze 20s linear infinite;
    }

    /* Kako se tačno mreža pomera (beskonačan skrol dijagonalno) */
    @keyframes pomeranjeMreze {
        0% { background-position: 0 0; }
        100% { background-position: 50px 50px; }
    }

    /* SVETLA TEMA (Podrazumevana) */
    :root {
        --pozadina: #f4f6f9; /* Malo sivkastija da bi se videle bele kartice */
        --tekst: #333333;
        --kartica: #ffffff;
        --ivica: #007bff;
        --podtekst: #888888;
        --dugme-neaktivno: transparent;
        --dugme-tekst: #666666;
        --link-pozadina: #eeeeee;

        --dorucak-pozadina: #fff3cd;
        --dorucak-tekst: #856404;
        --rucak-pozadina: #d1ecf1;
        --rucak-tekst: #0c5460;
        --vecera-pozadina: #d4edda;
        --vecera-tekst: #155724;
        
        /* Boja pokretnih linija za svetlu temu (vrlo suptilna plava) */
        --linija-mreza: rgba(0, 123, 255, 0.08);
    }

    /* TAMNA TEMA (Aktivira se automatski) */
    @media (prefers-color-scheme: dark) {
        :root {
            --pozadina: #0f172a; /* Dublja noćna plava */
            --tekst: #e0e0e0;
            --kartica: #1e293b;
            --ivica: #4facfe;
            --podtekst: #aaaaaa;
            --dugme-neaktivno: transparent;
            --dugme-tekst: #bbbbbb;
            --link-pozadina: #333333;

            --dorucak-pozadina: #3e3310;
            --dorucak-tekst: #ffdd77;
            --rucak-pozadina: #10333e;
            --rucak-tekst: #77ddff;
            --vecera-pozadina: #153e1a;
            --vecera-tekst: #77ff88;
            
            /* Boja pokretnih linija za tamnu temu (jarka neon plava) */
            --linija-mreza: rgba(79, 172, 254, 0.15);
        }
    }

    /* OSTATAK STILOVA ZA APLIKACIJU */
    main { font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; }
    .naslov { text-align: center; color: var(--tekst); margin-bottom: 25px; }
    
    .padajuci-meni-okvir { text-align: center; margin-bottom: 25px; }
    .meni { background-color: var(--kartica); color: var(--tekst); padding: 12px; font-size: 16px; border-radius: 12px; border: 2px solid var(--ivica); width: 100%; max-width: 300px; text-align: center; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .meni-tekst { font-size: 12px; color: var(--podtekst); margin-top: 5px; }
    
    .kartica-greska { text-align: center; padding: 30px; background: #f8d7da; color: #721c24; border-radius: 15px; margin-top: 20px; border: 2px solid #f5c6cb; }
    
    .dugmici-okvir { display: flex; gap: 5px; margin-bottom: 20px; background: var(--kartica); border-radius: 10px; padding: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .tab-btn { flex: 1; padding: 12px 5px; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s; }
    
    .dorucak-aktivan { background: var(--dorucak-pozadina); color: var(--dorucak-tekst); box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
    .rucak-aktivan { background: var(--rucak-pozadina); color: var(--rucak-tekst); box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
    .vecera-aktivan { background: var(--vecera-pozadina); color: var(--vecera-tekst); box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
    .neaktivan { background: var(--dugme-neaktivno); color: var(--dugme-tekst); }
    
    .hrana-okvir { 
        padding: 20px; 
        border-radius: 15px; 
        min-height: 350px; 
        max-height: 450px; 
        overflow-y: auto; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        transition: background-color 0.3s; 
        /* Dodata blaga senka da bi se kartica izdvojila od animiranih linija */
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    /* Senka je malo jača u tamnoj temi */
    @media (prefers-color-scheme: dark) {
        .hrana-okvir { box-shadow: 0 8px 25px rgba(0,0,0,0.5); }
        .meni { box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    }

    .hrana-okvir.doručak { background: var(--dorucak-pozadina); color: var(--dorucak-tekst); }
    .hrana-okvir.ručak { background: var(--rucak-pozadina); color: var(--rucak-tekst); }
    .hrana-okvir.večera { background: var(--vecera-pozadina); color: var(--vecera-tekst); }
    
    ul { margin: 0; padding-left: 20px; font-size: 18px; line-height: 1.8; }
    .nema-hrane { text-align: center; font-weight: bold; margin-top: auto; margin-bottom: auto; }
    
    .link-okvir { text-align: center; margin-top: 30px; }
    .pdf-link { color: var(--tekst); text-decoration: none; font-weight: bold; background: var(--link-pozadina); padding: 10px 20px; border-radius: 20px; transition: 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .pdf-link:hover { opacity: 0.8; transform: translateY(-2px); }
    
    .logo-container { display: flex; justify-content: center; margin-bottom: 20px; margin-top: 10px; }
    .app-logo { max-width: 150px; height: auto; }

    .disclaimer { margin-top: 50px; padding-top: 20px; padding-bottom: 20px; border-top: 1px solid var(--ivica); text-align: center; font-size: 11px; color: var(--podtekst); line-height: 1.5; }
</style>
