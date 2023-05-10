(()=>{"use strict";function e(e){const t=e.getBoundingClientRect();return t.top<=window.innerHeight&&t.left<=window.innerWidth}function t(e){return"none"===getComputedStyle(e).display||!e.textContent||""===e.textContent.trim()}function s(e){const t=e.childNodes;if(0===t.length)return!1;for(const e of t)if(e.nodeType===Node.TEXT_NODE&&e.nodeValue&&""!==e.nodeValue.trim())return!0;return!1}function n(e){const t=e.children;return!(!t||0===t.length)&&Array.from(t).every((e=>{const t=getComputedStyle(e).display;return e.textContent&&""!==e.textContent.trim()&&"BASE"!==e.tagName&&"LINK"!==e.tagName&&"NOSCRIPT"!==e.tagName&&"SCRIPT"!==e.tagName&&"STYLE"!==e.tagName&&"TEMPLATE"!==e.tagName&&"TITLE"!==e.tagName&&"AUDIO"!==e.tagName&&"CANVAS"!==e.tagName&&"IMG"!==e.tagName&&"MATH"!==e.tagName&&"OBJECT"!==e.tagName&&"PICTURE"!==e.tagName&&"SVG"!==e.tagName&&"VIDEO"!==e.tagName&&"block"!==t&&"flex"!==t&&"table-row"!==t&&"table-cell"!==t&&"none"!==t}))}function r(e,o){for(const a of e){if(t(a))continue;if("NOSCRIPT"===a.nodeName||"svg"===a.nodeName)continue;const e=a.children,i=Array.from(a.childNodes).filter((e=>e.nodeType!==Node.COMMENT_NODE&&(e.nodeType!==Node.TEXT_NODE||e.nodeValue&&e.nodeValue.trim())));s(a)?1===i.length&&e.length>0?r(e,o):o.push(a):n(a)?1===i.length&&e.length>0?r(e,o):o.push(a):0!==e.length&&r(e,o)}}new class{#e=1;#t=void 0;#s=void 0;#n={};#r={};#o=void 0;#a=void 0;#i=!1;#g=!1;#l=!1;constructor(){this.#c()}#c(){this.#d();const e=this.#u();e&&e.remove();const t=document.getElementById("translate-button");t&&t.remove(),this.#o=this.#h(),this.#a=this.#m(),this.#w(),("ontouchstart"in window||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0)&&this.#T()}#d(){const e="__wtdl-global-data",t=document.getElementById(e);if(t){if(t.dataset.wtdlOriginalTexts)try{this.#n=JSON.parse(t.dataset.wtdlOriginalTexts)}catch(e){}}else document.body.insertAdjacentHTML("beforeend",`<div id="${e}" style="display: none;"></div>`)}#f(){const e=document.getElementById("__wtdl-global-data");e&&(e.dataset.wtdlOriginalTexts=JSON.stringify(this.#n))}#w(){browser.runtime.onMessage.addListener((async(e,t,s)=>{if(e)switch(e.method){case"translate":this.#g=!0,await this.#v(e),function(e,t){let s;return function(){return e&&(s=e.apply(t||this,arguments),e=void 0),s}}(function(e){let t,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:200;window.addEventListener("scroll",(function(n){window.clearTimeout(t),t=setTimeout(e,s)}),{once:!1,passive:!0,capture:!0})}((async()=>{this.#g&&await this.#v({sourceLanguage:this.#t,targetLanguage:this.#s})}),500))(),s();break;case"getContentState":this.#i?s({result:{isProcessing:this.#i}}):Object.keys(this.#n).length>0?s({result:{sourceLanguage:this.#t,targetLanguage:this.#s,isShowingOriginal:this.#l}}):s(void 0);break;case"showOriginal":{this.#g=!1,this.#l=!0;const e=document.querySelectorAll('[data-wtdl-translated="true"]');for(const t of e){const e=t.dataset.wtdlUid,s=this.#n[e];void 0!==s&&(t.innerHTML=s,t.dataset.wtdlTranslated="false")}s();break}case"startTranslateSelection":{const e=window.getSelection();let t=this.#b();if(!t&&e.rangeCount){const s=e.getRangeAt(0).getBoundingClientRect();t={x:s.left+window.scrollX,y:s.bottom+window.scrollY+30}}this.#L(t).setAttribute("loading",!0),s();break}case"finishTranslateSelection":{const t=e.result,n=this.#u();if(n){if(t.result&&t.result.texts){const s=t.result.texts.map((e=>e.text)).join("\n");n.setAttribute("result",`${s}`),n.setAttribute("lang",`${e.targetLanguage||""}`)}else if(t.error){const e=browser.i18n.getMessage("error_message_generic_error");n.setAttribute("error",e)}else{const e=browser.i18n.getMessage("error_message_generic_error");n.setAttribute("error",e)}n.setAttribute("loading",!1)}s();break}case"getSelection":{const e=window.getSelection();s({result:e?e.toString():void 0});break}default:s()}})),browser.storage.onChanged.addListener(((e,t)=>{if("local"===t&&"selectedTargetLanguage"in e){const t=this.#u();t&&(t.setAttribute("lang",e.selectedTargetLanguage.newValue),browser.runtime.sendMessage({method:"translateSelection",selectionText:void 0}))}}))}#T(){document.addEventListener("pointerup",(async e=>{e.preventDefault();const t=window.getSelection();if(!t.rangeCount)return;let s=t.getRangeAt(0).cloneRange();const n=t?t.toString().trim():"";n||t.rangeCount?setTimeout((()=>{s=t.rangeCount?t.getRangeAt(0).cloneRange():s,s.collapse(t.anchorOffset>t.focusOffset);const e=s.getBoundingClientRect(),r=e.right+window.scrollX-20,o=e.bottom+window.scrollY+40;{const e=window.getSelection();if(!e||!e.toString().trim())return void this.#p()}browser.storage.local.get(["settingsShowsIconForReading"],(e=>{if(void 0===e.settingsShowsIconForReading||e.settingsShowsIconForReading){const e=this.#y({x:r,y:o});e.addEventListener("tooltipClick",(t=>(t.preventDefault(),t.stopPropagation(),n&&browser.runtime.sendMessage({method:"translateSelection",selectionText:n}),e.remove(),!1)))}}))}),100):this.#p()}))}#y(e){const t="translate-button";{const e=document.getElementById(t);e&&e.remove()}document.body.insertAdjacentHTML("beforeend",`<translate-button id="${t}"></translate-button>`);const s=document.getElementById(t);return s.setAttribute("position",JSON.stringify(e)),document.addEventListener("touchstart",(e=>{e.target.closest(t)||s.remove()}),{once:!0}),s}#p(){const e=document.getElementById("translate-button");e&&e.remove()}#h(){const e="toast-progress",t=document.getElementById(e);return t&&t.remove(),document.body.insertAdjacentHTML("beforeend",`<toast-progress id="${e}"></toast-progress>`),document.getElementById(e)}#m(){const e="toast-error",t=document.getElementById(e);return t&&t.remove(),document.body.insertAdjacentHTML("beforeend",`<toast-error id="${e}"></toast-error>`),document.getElementById(e)}#L(e){const t="translate-popover";{const e=document.getElementById(t);e&&e.remove()}document.body.insertAdjacentHTML("beforeend",`<translate-popover id="${t}"></translate-popover>`);const s=document.getElementById(t);s.setAttribute("position",JSON.stringify(e)),browser.storage.local.get(["selectedTargetLanguage"],(e=>{e&&e.selectedTargetLanguage&&s.setAttribute("lang",e.selectedTargetLanguage)}));const n=e=>{e.target.closest(t)||(s.remove(),document.removeEventListener("click",n))};return document.addEventListener("click",n),s.addEventListener("close",(async()=>{s.remove(),document.removeEventListener("click",n)})),s.addEventListener("change",(async e=>{await browser.storage.local.set({selectedSourceLanguage:void 0,selectedTargetLanguage:e.detail.selectedTargetLanguage})})),s}#u(){return document.getElementById("translate-popover")}#b(){const e=this.#u();if(e){const t=e.shadowRoot.querySelector("#draggable");if(t)return{x:t.offsetLeft,y:t.offsetTop}}}async#v(t){const s=document.querySelectorAll('[data-wtdl-translated="false"]');if(this.#s===t.targetLanguage)for(const e of s){const t=e.dataset.wtdlUid,s=this.#r[t];e.innerHTML=s,e.dataset.wtdlTranslated="true"}const n=await async function(){const t=[];r(document.body.children,t);const s=[];for(const n of t){!e(n)||void 0!==n.dataset.wtdlUid&&"false"!==n.dataset.wtdlTranslated||s.push({element:n,text:n.innerHTML})}return s}();if(0===n.length)return void this.#S();this.#E();const o=n.map((e=>e.text)),a=await browser.runtime.sendMessage({method:"translate",texts:o,sourceLanguage:t.sourceLanguage,targetLanguage:t.targetLanguage}),i=e=>{const t=e||browser.i18n.getMessage("error_message_generic_error");this.#P(t)};if(!a||!a.result)return void i();const g=a.result.result;if(g&&g.texts){{this.#t=g.lang,this.#s=t.targetLanguage;const e=g.texts;if(e.length===n.length){for(let t=0;t<n.length;t++){const s=n[t].element,r=e[t].text,o=s.dataset.wtdlUid||this.#e++;"true"!==s.dataset.wtdlOriginal&&(this.#n[o]=s.innerHTML),this.#r[o]=r,s.innerHTML=r,s.dataset.wtdlUid=`${o}`,s.dataset.wtdlOriginal="true",s.dataset.wtdlTranslated="true"}this.#f()}}this.#x()}else{if(a.result.error){return void i(1045601===a.result.error.code?browser.i18n.getMessage("error_message_quota_has_been_reached"):a.result.error.message)}i()}}#E(){this.#o.setAttribute("show",!0),this.#i=!0,this.#l=!1,browser.runtime.sendMessage({method:"startTranslation"})}#S(){this.#l=!1,browser.runtime.sendMessage({method:"cancelTranslation",result:{sourceLanguage:this.#t,targetLanguage:this.#s}})}#P(e){this.#i=!1,this.#l=!1,this.#o.setAttribute("show",!1),this.#a.setAttribute("show",e),browser.runtime.sendMessage({method:"abortTranslation",message:e})}#x(){this.#i=!1,this.#o.setAttribute("show",!1),browser.runtime.sendMessage({method:"finishTranslation",result:{sourceLanguage:this.#t,targetLanguage:this.#s}})}}})();
//# sourceMappingURL=content.js.map