'use strict';

window.EXAM_CATALOG = (() => {
  const banks = window.EXAM_BANKS;
  const sizes = window.EXAM_BANK_SIZES;
  const scripts = new Map();
  function loadBank(name) {
    if (!scripts.has(name)) scripts.set(name,new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'banks/' + name + '.js';
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        scripts.delete(name);
        reject(new Error('Sadu se nepodařilo načíst.'));
      };
      document.head.append(script);
    }));
    return scripts.get(name);
  }
  function bundle(id, name = id) {
    return {questionCount:sizes[id], load:() => loadBank(name).then(() => banks[id])};
  }
  const ctu = 'https://ctu.gov.cz/sites/default/files/obsah/';
  const airTopics = {
    A:'Radiokomunikační předpisy',
    B:'Radiokomunikační provoz',
    C:'Elektrotechnika a radiotechnika',
  };
  const aviation = ['OFL','VFL'].map(label => {
    const id = label.toLowerCase();
    return {
      id,
      shortTitle:label,
      title:label + ' · Radiotelefonista',
      heading:label + ' · Letecká radiotelefonie',
      description:label === 'OFL' ? 'Omezený průkaz radiotelefonisty letecké pohyblivé služby.' :
        'Všeobecný průkaz radiotelefonisty letecké pohyblivé služby včetně anglické frazeologie.',
      illustration:true,
      sources:[{label:'ČTÚ · oficiální otázky ' + label + ' (09/2025)',url:ctu + '2025_09_' + label + '_otazky.pdf'}],
      sourceNote:'Otázky a správné odpovědi vycházejí z banky ČTÚ. Chybné možnosti jsou doplněné pro trénink.',
      ...(id === 'ofl' ? {questions:window.OFL_ROWS.map(([id,text,correct,...wrong]) => ({
        id,text,topic:airTopics[id[0]],options:[correct,...wrong],correct:[0],
      }))} : bundle('vfl')),
      simulation:{
        label:'Simulace ' + label,
        description:'80 otázek · 60 min · alespoň 90 % v každém okruhu',
        minutes:60,
        topicMinimum:90,
        sections:Object.values(airTopics).map((topic,index) => ({topic,count:[20,40,20][index]})),
      },
    };
  });
  const navigation = [
    ['m','M / M20','Motorová plavidla','M+2015',35,30,30],
    ['s','S / S20','Plachetnice','S+2015',14,10,11],
    ['c','Oblast C','Pobřežní plavba','C',28,25,24],
  ].map(([code,shortTitle,description,suffix,count,minutes,minimumPoints]) => ({
    id:'vmp-' + code,
    shortTitle,
    title:'VMP · ' + shortTitle,
    description:description + ' · příprava na teoretickou zkoušku vůdce malého nebo rekreačního plavidla.',
    ...bundle('vmp-' + code,'vmp'),
    sources:[
      {label:'SPS · otázky a odpovědi pro ' + shortTitle,url:'https://www.spspraha.cz/zkousky/otazky.asp?zp=' + suffix},
      {label:'SPS · pravidla teoretického testu',url:'https://sps.gov.cz/dok-os/zkousky'},
    ],
    sourceNote:'Otázky, odpovědi i ilustrace pocházejí ze Státní plavební správy.',
    simulation:{
      label:'Trénink na čas',
      description:count + ' otázek · ' + minutes + ' min · alespoň ' + minimumPoints + ' bodů',
      count,minutes,minimumPoints,
    },
  }));
  const bulletin = {label:'Ministerstvo dopravy · Elektronický věstník (08. 10. 2026)',url:'https://etesty.md.gov.cz/ro/Bulletin'};
  const drivers = Object.entries(window.DRIVER_VARIANTS).map(([group,{count,sections}]) => {
    const name = group.length === 2 ? group[0] + '+' + group[1] : group;
    return {
      id:'drivers-' + group.toLowerCase(),
      shortTitle:'Skupina ' + name,
      title:'Autoškola · skupina ' + name,
      description:'Otázky z oficiálních cvičných testů pro řidičské oprávnění skupiny ' + name + '.',
      questionCount:count,
      load:() => loadBank('drivers').then(() => {
        const membership = new Set(window.DRIVER_IDS[group]);
        return banks.drivers.filter(q => membership.has(q.id));
      }),
      sources:[
        {...bulletin},
        {label:'eTesty · cvičný test skupiny ' + name,url:'https://etesty.md.gov.cz/co/DLTest/SampleTest/' + group},
      ],
      sourceNote:'Výběr otázek doložených ve vzorových testech této skupiny. Obrázky a videa se načítají z eTestů.',
      simulation:{
        label:'Cvičný test skupiny ' + name,
        description:'25 otázek · 30 min · alespoň 43 z 50 bodů',
        minutes:30,minimumPoints:43,sections,
      },
    };
  });
  drivers.push({
    id:'drivers-all',
    shortTitle:'Celý věstník',
    title:'Autoškola · celý věstník',
    description:'Banka otázek Ministerstva dopravy napříč skupinami. Vhodná pro hledání a dril podle okruhů.',
    ...bundle('drivers'),
    sources:[bulletin],
    sourceNote:'Obrázky a videa se načítají z eTestů.',
  });
  const cnb = 'https://www.cnb.cz/cs/dohled-financni-trh/vykon-dohledu/povolovaci-a-schvalovaci-rizeni/';
  const finance = [
    ['credit','Distribuce spotřebitelských úvěrů','20. 2. 2025',
      'povolovaci-a-schvalovaci-rizeni-podle-zakona-o-spotrebitelskem-uveru/zkousky-dle-zakona-c.-257-2016-sb.-o-spotrebitelskem-uveru/',
      '878 znalostních otázek a 69 případových studií.'],
    ['insurance','Distribuce pojištění a zajištění','20. 8. 2026',
      'povolovaci-a-schvalovaci-rizeni-pojistovaci-zprostredkovatele/Zkousky-dle-zakona-c.-170_2018-Sb.-o-distribuci-pojisteni-a-zajisteni/',
      '1 549 znalostních otázek a 94 případových studií.'],
  ].map(([id,title,version,path,description]) => ({
    id,
    title,
    shortTitle:id === 'credit' ? 'Spotřebitelské úvěry' : 'Pojištění a zajištění',
    description,
    ...bundle(id),
    sources:[
      {label:'ČNB · zkoušková sada z ' + version,url:cnb + path},
      {label:'ČNB · exporty IS SPOT (XML)',url:'https://apl.cnb.cz/spt/r/spot/spot/home'},
    ],
    sourceNote:'Znění otázek, řešení a dostupná odůvodnění pocházejí z exportu ČNB. Jednotlivé úlohy z případových studií mají připojené společné zadání.',
  }));
  return [
    {title:'Letecká radiotelefonie',authority:'Český telekomunikační úřad',icon:'plane',color:'green',sets:aviation},
    {title:'Vůdce malého plavidla',authority:'Státní plavební správa',icon:'book',color:'blue',sets:navigation},
    {title:'Autoškola',authority:'Ministerstvo dopravy',icon:'file',color:'orange',sets:drivers},
    {title:'Finanční distribuce',authority:'Česká národní banka',icon:'chart',color:'green',sets:finance},
  ];
})();
