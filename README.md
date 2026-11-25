# Kvízovna

Česká webová aplikace na vytváření kvízů, testování a dril na libovolné téma. Vlož učební text, poznámky nebo už připravené otázky, zkontroluj návrh a spusť kvíz.

- **Z podkladů** aplikace sestaví až 15 doplňovacích otázek a otázek na pojmy. Když najde vhodné možnosti ve stejném okruhu, nabídne výběr z odpovědí. Text se zpracovává přímo v prohlížeči.
- **Hotové otázky** můžeš vložit nebo nahrát jako TXT, CSV či JSON. Podporují i více správných odpovědí a volný text.
- **Návrh** umožňuje přepsat otázky a odpovědi, přidat či odebrat možnosti a vyřadit celé otázky.
- **Test a dril** používají libovolnou uloženou sadu. Výsledek testu uvidíš po odevzdání. Dril dává zpětnou vazbu průběžně a umí zopakovat chyby.

## Spuštění

Otevři [`dist/index.html`](dist/index.html) v prohlížeči nebo spusť z kořene repozitáře místní HTTP server.

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Pak otevři [localhost:8000](http://localhost:8000). Aplikace používá statické HTML, CSS a JavaScript bez sestavování. Při použití místního serveru nebo hostované verze se sady, pokrok a rozpracovaný test ukládají v prohlížeči pro danou adresu.

## Příklady vstupu

Pro vytvoření kvízu z podkladů fungují věty, odrážky a dvojice pojem a definice. Nadpisy v Markdownu určí okruhy.

```text
# Sluneční soustava
Merkur: planeta, která obíhá nejblíže Slunci.
Země oběhne Slunce za přibližně 365 dní.
```

Připravené otázky lze vložit třeba takto.

```text
Která planeta je nejblíže Slunci? | Merkur | Venuše | Mars
Jaká je značka pro kyslík? | O

Které hodnoty jsou prvočísla?
+ 2
- 4
+ 7
- 9
```

Za prvním svislítkem je správná odpověď. Pokud je odpověď jen jedna, aplikace zobrazí textové pole. V bloku možností označ správné pomocí `+` a chybné pomocí `-`. Více správných možností se hodnotí jako celek. V aplikaci najdeš i příklady CSV a JSON.

## Připravená sada OFL

Součástí aplikace je sada 149 otázek k omezenému průkazu radiotelefonisty letecké pohyblivé služby. Simulace vybírá 20 otázek z předpisů, 40 z provozu a 20 z elektrotechniky a radiotechniky. Na vypracování je 60 minut a hranice úspěchu je 90 % v každém okruhu.

## Zdroje a licence

Kód aplikace je pod [licencí MIT](LICENSE). Podrobnosti k otázkám OFL, ilustraci a písmům jsou v souboru [NOTICE.md](NOTICE.md).
