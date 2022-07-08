// In God We Trust

const crypto = require('crypto');
const fs = require('fs');

const minify = (function(){
  try{
    return require('terser').minify;
  }catch(e){
    return function(str){
      return {code: minifyScript(str)};
    };
  }
})();


const jsReserved = [
  'abstract','arguments','await','boolean','break','byte','case','catch','char','class','const','continue','debugger','default','delete','do','double','else','enum','eval','export','extends','false','final','finally','float','for','function','goto','if','implements','import','in','instanceof','int','interface','let','long','native','new','null','package','private','protected','public','return','short','static','super','switch','synchronized','this','throw','throws','transient','true','try','typeof','var','void','volatile','while','with','yield',
  'log', 'imports', 'exports',
];

const customRegexShortcuts = {
  'c': '(?:-?[0-9]+(?:\\.[0-9]+|)|-?\\.[0-9]+)',
};

function randToken(size){
  return crypto.randomBytes(size).toString('hex').replace(/[^\w]/g, '');
}

function compileScript(script){
  // add padding to string
  script = '\n'+script+'\n';

  // strip comments
  script = script.replace(/(\/\*.*?\*\/|\/\/.*?\r?\n)/gs, '');

  // encode tags
  script = script.replace(/[«»⸨⸩]/g, function(str){
    if(str === '«'){
      return '«tag»';
    }else if(str === '»'){
      return '«/tag»';
    }else if(str === '⸨'){
      return '«par»';
    }else if(str === '⸩'){
      return '«/par»';
    }
    return '';
  });

  // encode js reserved tags
  script = script.replace(new RegExp('([^\\w_\\-.]+)('+jsReserved.join('|')+')([^\\w_\\-.]+)', 'gs'), '$1⸨$2⸩$3');

  // encode strings
  const strings = [[], [], [], []];
  script = script.replace(/(["'`\/])((?:\\\1|.)*?)\1/gs, function(str, q, s){
    if(q === '\''){
      let i = strings[0].push(s.replace(/\r?\n/g, '\\n'));
      return `«str:1:${i}»`;
    }else if(q === '"'){
      let i = strings[1].push(s.replace(/\r?\n/g, '\\n'));
      return `«str:2:${i}»`;
    }else if(q === '`'){
      let i = strings[2].push(s);
      return `«str:3:${i}»`;
    }else if(q === '/'){
      let i = strings[3].push(s.replace(/\r?\n/g, '\\n'));
      return `«str:4:${i}»`;
    }
  });

  // encode objects
  let objGroups = [];
  let objGroupIDs = [];
  objLevel = 0;
  script = script.replace(/[\(\)\{\}\[\]]/g, function(s){
    if(s === '('){
      objGroups.push(1);
      let t = randToken(8);
      objGroupIDs.push(t);
      return `«obj:1:${objLevel++}:${t}»`;
    }else if(s === '{'){
      objGroups.push(2);
      let t = randToken(8);
      objGroupIDs.push(t);
      return `«obj:2:${objLevel++}:${t}»`;
    }else if(s === '['){
      objGroups.push(3);
      let t = randToken(8);
      objGroupIDs.push(t);
      return `«obj:3:${objLevel++}:${t}»`;
    }
    if(s === ')'){
      s = 1;
    }else if(s === '}'){
      s = 2;
    }else if(s === ']'){
      s = 3;
    }
    let result = '';
    while(s !== objGroups[objGroups.length-1] && objGroups.length > 0){
      let g = objGroups.pop();
      let t = objGroupIDs.pop();
      result += `«/obj:${g}:${--objLevel}:${t}»`;
    }
    if(s === objGroups[objGroups.length-1]){
      let g = objGroups.pop();
      let t = objGroupIDs.pop();
      result += `«/obj:${g}:${--objLevel}:${t}»`;
    }
    return result;
  });


  // compile if statements
  script = script.replace(/([?!])\s*(«obj:1:([0-9]+:\w+)»)(.*?)(«\/obj:1:\3»)/gs, (_, type, open, _1, logic, close) => {
    if(type === '!'){
      return `⸨if⸩${open}!${logic}${close}`;
    }
    return `⸨if⸩${open}${logic}${close}`;
  }).replace(/(«\/obj:2:[0-9]+:\w+»)[ \t]*⸨if⸩[ \t]*(«obj:1:[0-9]+:\w+»)/g, '$1⸨else⸩ ⸨if⸩$2')
  .replace(/(«\/obj:2:[0-9]+:\w+»)[ \t]*(«obj:2:[0-9]+:\w+»)/g, '$1else$2');


  // compile functions
  function compFunc(script){
    return script.replace(/((?:⸨?function⸩?|fn|func)\s+|)(⸨?[\w_]*⸩?)\s*«obj:1:([0-9]+:\w+)»(.*?)«\/obj:1:\3»\s*«obj:2:([0-9]+:\w+)»(.*?)«\/obj:2:\5»[ \t]*(«obj:1:([0-9]+:\w+)».*?«\/obj:1:\8»|)/gs, function(str, func, name, o1, attrs, o2, content, run){
      if(name.startsWith('⸨') || name.endsWith('⸩')){
        return str;
      }
      content = compFunc(content);
      let result = 'function';
      if(name && name !== ''){
        result += ' '+name;
        result += `«obj:1:${o1}»${attrs}«/obj:1:${o1}»«obj:2:${o2}»${content}«/obj:2:${o2}»`;
      }else if(!func || func.trim() === ''){
        result = `«obj:1:${o1}»${attrs}«/obj:1:${o1}»=>«obj:2:${o2}»${content}«/obj:2:${o2}»`;
      }else{
        result += `«obj:1:${o1}»${attrs}«/obj:1:${o1}»«obj:2:${o2}»${content}«/obj:2:${o2}»`;
      }
      if(run && run !== ''){
        let t = randToken(8);
        result = `«obj:1:99999:${t}»${result}«/obj:1:99999:${t}»${run}`;
      }
      return result;
    });
  }
  script = compFunc(script);

  // compile regex
  script.replace(/«str:4:([0-9]+)»/g, (str, index) => {
    strings[3][Number(index)-1] = strings[3][Number(index)-1].replace(/(\\+)(.)/gs, (str, b, c) => {
      if(b.length % 2 === 0 || !customRegexShortcuts[c]){
        return str;
      }
      return '\\'.repeat(b.length-1)+customRegexShortcuts[c];
    }).replace(/\(\?#.*?\)/gs, '');
  });

  // compile math
  script = script.replace(/(«obj:1:([0-9]+:\w+)».*?«\/obj:1:\2»|[\w_\-.]+)\s*([\^\\~])(=|)\s*(«obj:1:([0-9]+:\w+)».*?«\/obj:1:\6»|[\w_\-.]+)/g, function(str, n1, _, sign, eq, n2){
    let result = '';
    if(sign === '^'){
      result = `Math.pow(${n1},${n2})`;
    }else if(sign === '\\'){
      if(n2 === '2'){
        result = `Math.sqrt(${n1})`;
      }else if(n2 === '3'){
        result = `Math.cbrt(${n1})`;
      }else{
        result = `Math.pow(${n1}, 1/${n2})`;
      }
    }else if(sign === '~'){
      result = `(Math.round((${n1})*Math.pow(10, ${n2}))/Math.pow(10, ${n2}))`;
    }
    if(eq && eq !== ''){
      return `${n1}=${result}`;
    }
    return result;
  });
  script = script.replace(/\|\s*(«obj:1:([0-9]+:\w+)».*?«\/obj:1:\2»|[\w_\-.]+)\s*\|/g, 'Math.abs($1)');
  script = script.replace(/([^\w_\-.])pi([^\w_\-.])/g, '$1Math.PI$2');

  // enforce triple equal
  script = script.replace(/([=!])==?/g, '$1==');

  // compile typeof
  script = script.replace(/⸨typeof⸩\s*(«obj:1:([0-9]+:\w+)».*?«\/obj:1:\2»|[\w_\-.]+)/g, '(((($1)===null)?\'null\':(Array.isArray($1)?\'array\':((($1)instanceof(RegExp))?\'regex\':undefined)))||typeof($1))');

  // compile log to console.log
  script = script.replace(/⸨log⸩\s*(«obj:1:([0-9]+:\w+)»)(.*?)(«\/obj:1:\2»)/gs, (_, open, _1, str, close) => {
    str.replace(/«str:([1-3]):([0-9]+)»/g, (_, i, index) => {
      strings[Number(i)-1][Number(index)-1] = strings[Number(i)-1][Number(index)-1].replace(/\[(black|red|green|yellow|blue|magenta|purple|cyan|white)\]/g, (_, color) => {
        switch(color){
          case 'black':
            return '\\x1b[30m';
          case 'red':
            return '\\x1b[31m';
          case 'green':
            return '\\x1b[32m';
          case 'yellow':
            return '\\x1b[33m';
          case 'blue':
            return '\\x1b[34m';
          case 'magenta':
          case 'purple':
            return '\\x1b[35m';
          case 'cyan':
            return '\\x1b[36m';
          case 'white':
            return '\\x1b[37m';
          default:
            return '\\x1b[0m';
        }
      });
    });

    let i = strings[0].indexOf('\\x1b[0m');
    if(i === -1){
      i = strings[0].push('\\x1b[0m');
    }

    return `console.log${open}${str},«str:1:${i}»${close}`;
  });
  script = script.replace(/>_\s*(.*?)(?=;|$)/gm, 'console.log($1)');

  // compile function returns
  script = script.replace(/>>\s*/g, 'return ');
  script = script.replace(/&>\s*/g, 'break ');
  script = script.replace(/\|>\s*/g, 'continue ');
  
  // compile boolean replacements
  script = script.replace(/\?0/g, '⸨false⸩');
  script = script.replace(/\?1/g, '⸨true⸩');

  // compile imports
  script = script.replace(/⸨imports?⸩(\s+optional|\*?\?|)\s+(«str:([1-3]:[0-9]+)»|[\w_\-.]+)(?:\s+(from|as)\s+(«str:[1-3]:[0-9]+»|[\w_\-.]+)|)(\s+optional|\*?\?|)/gs, function(str, opt, var1, str1, type, var2, opt2){
    if((opt && opt !== '') || (opt2 && opt2 !== '')){
      opt = true;
    }

    if(opt && type === 'from'){
      return `${var1}=(()=>{try{return require(${var2})}catch(e){return undefined}})()`;
    }else if(opt && type === 'as'){
      return `${var2}=(()=>{try{return require(${var1})}catch(e){return undefined}})()`;
    }else if(opt){
      if(str1 && str1 !== ''){
        str1 = str1.split(':').map(s => Number(s));
        let v = strings[str1[0]-1][str1[1]-1].split(/[\/\\]/g);
        v = v[v.length-1].replace(/^(.*?)\..*$/, '$1').replace(/[^\w_]/g, '');
        return `${v}=(()=>{try{return require(${var1})}catch(e){return undefined}})()`;
      };
      return `${var1}=(()=>{try{return require(\'${var1.replace(/\\?'/g, '\\\'')}\')}catch(e){return undefined}})()`;
    }else if(type === 'from'){
      return `${var1}=require(${var2})`;
    }else if(type === 'as'){
      return `${var2}=require(${var1})`;
    }else{
      if(str1 && str1 !== ''){
        str1 = str1.split(':').map(s => Number(s));
        let v = strings[str1[0]-1][str1[1]-1].split(/[\/\\]/g);
        v = v[v.length-1].replace(/^(.*?)\..*$/, '$1').replace(/[^\w_]/g, '');
        return `${v}=require(${var1})`;
      };
      return `${var1}=require(\'${var1.replace(/\\?'/g, '\\\'')}\')`;
    }
  });

  // compile exports
  script = script.replace(/([^\w_\-.])⸨exports?⸩\s+/gs, '$1module.exports=');


  // decode objects
  script = script.replace(/«(\/|)obj:([0-9]+):[0-9]+:\w+»/g, function(str, close, type){
    type = Number(type);
    if(close && close !== ''){
      switch(type){
        case 1:
          return ')';
        case 2:
          return '}';
        case 3:
          return ']';
        default:
          return '';
      }
    }
    switch(type){
      case 1:
        return '(';
      case 2:
        return '{';
      case 3:
        return '[';
      default:
        return '';
    }
  });

  //decode strings
  script = script.replace(/«str:([0-9]+):([0-9]+)»/g, function(str, type, index){
    type = Number(type);
    index = Number(index);
    switch(type){
      case 1:
        return '\''+strings[0][index-1]+'\'';
      case 2:
        return '"'+strings[1][index-1]+'"';
      case 3:
        return '`'+strings[2][index-1]+'`';
      case 4:
        return '/'+strings[3][index-1]+'/';
      default:
        return '';
    }
  });

  // decode js reserved tags
  script = script.replace(/⸨(.*?)⸩/gs, '$1');

  // decode tags
  script = script.replace(/«(.*?)»/gs, function(str, tag){
    if(tag === 'tag'){
      return '«';
    }else if(tag === '/tag'){
      return '>';
    }else if(tag === 'par'){
      return '⸨';
    }else if(tag === '/par'){
      return '⸩';
    }
    return '';
  });

  return script;
}


function minifyScript(script){
  return script.trim().replace(/^(?:[\t ]*(?:\r?\n|\r))+/gm, '');
}


async function compileScriptAsync(script){
  let result = await minify(compileScript(script));
  if(result.code){
    return result.code;
  }
  return minifyScript(script);
}

function compileScriptSync(script){
  return minifyScript(compileScript(script));
}

async function compileFileAsync(src, dest){
  if(!dest){
    if(src.endsWith('.js')){
      dest = src.replace(/\.js$/, '.min.js');
    }else{
      dest = src+'.min.js';
    }
  }
  fs.readFile(src, (err, data) => {
    if(err){
      console.error(err);
      return;
    }
    compileScriptAsync(data.toString()).then(script => {
      fs.writeFile(dest, script, err => {
        if(err){
          console.error(err);
          return;
        }
        console.log('Output File:', dest);
      });
    });
  });
}

function compileFileSync(src, dest){
  if(!dest){
    if(src.endsWith('.js')){
      dest = src.replace(/\.js$/, '.min.js');
    }else{
      dest = src+'.min.js';
    }
  }
  let script = fs.readFileSync(src).toString();
  script = compileScriptSync(script);
  fs.writeFileSync(dest, script);
  console.log('Output File:', dest);
}

module.exports = (function(){
  const exports = function(src, dest){
    if(fs.existsSync(src)){
      return compileFileAsync(src, dest);
    }
    return compileScriptSync(src);
  }

  exports.scriptSync = compileScriptSync;
  exports.scriptAsync = compileScriptAsync;
  exports.fileSync = compileFileSync;
  exports.fileAsync = compileFileAsync;

  exports.script = (function(){
    const e = compileScriptSync;
    e.sync = compileScriptSync;
    e.async = compileScriptAsync;
    return e;
  })();

  exports.file = (function(){
    const e = compileFileAsync;
    e.sync = compileFileSync;
    e.async = compileFileAsync;
    return e;
  })();

  return exports;
})();
