# Kvízovna

Česká webová aplikace na testy a procvičování. Obsahuje 149 otázek k omezenému průkazu radiotelefonisty letecké pohyblivé služby (OFL) a umožňuje použít vlastní sady pro jiné předměty.

- **Simulace OFL** vybírá 20 otázek z předpisů, 40 z provozu a 20 z elektrotechniky a radiotechniky. Na vypracování je 60 minut. Hranice úspěchu je 90 % v každém okruhu.
- **Vlastní test** umožňuje zvolit okruh a počet otázek. Výsledek zobrazí po odevzdání.
- **Dril** vyhodnotí každou odpověď hned. Zaměřit se dá i jen na otázky zodpovězené chybně.
- **Banka a historie** umožňují vyhledat otázky, prohlédnout si správné odpovědi a vracet se k výsledkům.

## Spuštění

Otevři [`dist/index.html`](dist/index.html) v prohlížeči nebo spusť z kořene repozitáře místní HTTP server.

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Pak otevři [localhost:8000](http://localhost:8000). Aplikace používá statické HTML, CSS a JavaScript bez sestavování. Při použití místního serveru nebo hostované verze se sady, pokrok a rozpracovaný test ukládají v prohlížeči pro danou adresu.

## Vlastní sada

V aplikaci zvol **Nová sada**. Otázky můžeš vložit přímo nebo nahrát jako soubor TXT, CSV či JSON.

```text
Která planeta je nejblíže Slunci? | Merkur | Venuše | Mars
Jaká je značka pro kyslík? | O

Které hodnoty jsou prvočísla?
+ 2
- 4
+ 7
- 9
```

Za prvním svislítkem je správná odpověď. Pokud je odpověď jen jedna, aplikace zobrazí textové pole. U bloku s několika možnostmi označ správné pomocí `+` a chybné pomocí `-`. Více správných možností se hodnotí jako celek. V aplikaci najdeš i příklady CSV a JSON.

## Zdroje a licence

Kód aplikace je pod [licencí MIT](LICENSE). Podrobnosti k otázkám, ilustraci a písmům jsou v souboru [NOTICE.md](NOTICE.md).
