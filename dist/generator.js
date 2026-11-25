'use strict';

window.generateQuizQuestions = (() => {
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('cs', {granularity:'sentence'}) : null;
  const word = /[\p{L}][\p{L}\p{M}\d-]*/gu;
  const number = /-?(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d+)?/;
  const unit = /(?:\s?(?:%|°[CF]?)|\s+(?:km\/h|km\/s|m\/s|km|cm|mm|m|kg|mg|g|MHz|GHz|kHz|Hz|hPa|kPa|Pa|sekund\p{L}*|minut\p{L}*|hodin\p{L}*|dnů|dní|rok\p{L}*|let|litru|litrů)(?![\p{L}\d]))/;
  const quantity = new RegExp(number.source + unit.source + '?','giu');
  const date = /\b\d{1,2}\.\s+(?:ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)\s+\d{3,4}\b/iu;
  const stopWords = new Set(key('about after also another because before during each first from have into like many more most only other over second some than that their them then there these they this those through under until very well were what when where which while will with would jako jeho jejich jsou nebo není tedy také potom podle pouze právě proto další každá každý které který když dnes roku sebe svoji svou tento tato tyto mezi během může mohou bude byly bylo být velmi znamená mají má is are was means can could be includes').split(' '));

  function key(value) {
    return value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('cs').replace(/\s+/g,' ').trim();
  }
  function clean(value) {
    return value.replace(/\*\*([^*]+)\*\*|__([^_]+)__|\x60([^\x60]+)\x60/g, (_, a, b, c) => a ?? b ?? c)
      .replace(/\s+/g,' ').trim();
  }
  function splitSentences(value) {
    return segmenter ? [...segmenter.segment(value)].map(item => item.segment.trim()) :
      value.split(/(?<=[.!?])\s+(?=[\p{Lu}])/u);
  }
  function definition(line, topic) {
    const match = line.match(/^([^:–—=]{2,75}?)(?::\s+|\s+[–—=]\s+)(.{6,})$/u);
    if (!match) return null;
    const term = match[1].trim();
    const detail = match[2].trim();
    if (!(term.match(word)?.length > 0) || term.split(' ').length > 7 || /[.!?;]$/.test(term) ||
      /^(např|poznámka|příklad|note|example|zdroj)$/i.test(term) || detail.length > 260 || /https?:\/\//.test(detail)) return null;
    return {text:'Který pojem odpovídá popisu? „' + detail + '“',answer:term,topic,kind:'term'};
  }
  function fromSentence(value, topic) {
    const sentence = value.replace(/^[-•]\s+/,'').trim();
    const words = [...sentence.matchAll(word)];
    if (sentence.length < 16 || sentence.length > 400 || words.length < 3 ||
        /[?？]$/.test(sentence) || /https?:\/\//.test(sentence)) return null;
    const quantities = [...sentence.matchAll(quantity)].filter(match =>
      !/[\p{L}\d]/u.test(sentence[match.index - 1] ?? '') &&
      !/[\p{L}\d]/u.test(sentence[match.index + match[0].length] ?? ''));
    const quote = sentence.match(/[„“"«]([^„“"»]{3,65})[“"»]/u);
    const score = match => Math.min(match[0].length, 12) + (match.index > 0 && /\p{Lu}/u.test(match[0][0]) ? 4 : 0) +
      (match.index < sentence.length / 2 ? 3 : 0);
    const unique = match => {
      const rest = sentence.slice(0,match.index) + ' ' + sentence.slice(match.index+match[0].length);
      return !key(rest).includes(key(match[0]));
    };
    const values = quantities.filter(unique);
    const terms = words.filter(match => match[0].length >= 4 && !stopWords.has(key(match[0])) && unique(match))
      .sort((a,b) => score(b)-score(a));
    const dated = sentence.match(date);
    let choice = dated && unique(dated) ? dated : values.find(match => /[\p{L}%°]/u.test(match[0])) || values[0];
    const kind = choice ? choice === dated ? 'value:date' : 'value:' + key(choice[0].replace(number,'')) : '';
    if (!choice && quote) {
      const match = {0:quote[1],index:quote.index+1};
      if (unique(match)) choice = match;
    }
    if (!choice) {
      const subject = sentence.match(/^(?:(?:the|a|an)\s+)?([\p{L}][^,:;!?]{1,59}?)\s+(?:je|jsou|znamená|is|are|means)\s+/iu);
      if (subject && subject[1].split(' ').length <= 5 && !stopWords.has(key(subject[1]))) {
        const match = {0:subject[1],index:subject[0].indexOf(subject[1])};
        if (unique(match)) choice = match;
      }
    }
    choice ||= terms[0];
    if (!choice) return null;
    const answer = choice[0];
    return {text:sentence.slice(0,choice.index) + '____' + sentence.slice(choice.index+answer.length),answer,topic,kind};
  }
  function collect(text) {
    const candidates = [];
    let topic = 'Obecné';
    for (const raw of text.split(/\r?\n/)) {
      const line = clean(raw);
      if (!line || /^[-=_*]{3,}$/.test(line)) continue;
      const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/u) || line.match(/^([^.!?:]{3,80}):$/u);
      if (heading) {
        topic = heading[1].slice(0,100);
        continue;
      }
      const entry = line.replace(/^[-+*•]\s+|^\d+[.)]\s+/u,'');
      for (const sentence of splitSentences(entry)) {
        const q = definition(sentence,topic) || fromSentence(sentence,topic);
        if (q) candidates.push(q);
      }
    }
    return candidates;
  }
  return function generateQuizQuestions(text, limit = 15) {
    const seen = new Set();
    const candidates = collect(text).filter(q => {
      const k = key(q.text + ' ' + q.answer).replace(/[.!?„“"»]+/g,'');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return candidates.slice(0,limit).map((q,i) => {
      const wrong = [];
      if (q.kind) for (const other of candidates) {
        if (wrong.length === 2) break;
        if (other.kind !== q.kind || other.topic !== q.topic) continue;
        const k = key(other.answer);
        if (k === key(q.answer) || key(q.text).includes(k) || wrong.some(value => key(value) === k)) continue;
        wrong.push(other.answer);
      }
      return {id:String(i+1),text:q.text,topic:q.topic,options:[q.answer,...(wrong.length === 2 ? wrong : [])],correct:[0]};
    });
  };
})();
