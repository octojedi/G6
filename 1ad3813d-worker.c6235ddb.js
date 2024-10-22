!function(){var e={vendors_1:"vendors_1-async.77ea34fa.js"},n={vendors_1:"vendors_1-async.1fb74ee7.css"},t={"1ad3813d":0},r="undefined"!=typeof globalThis?globalThis:self,o=function(r,o,i){var u,a,_,f={};function c(e){var n=f[e];if(void 0!==n)return n.exports;var t={id:e,exports:{}};f[e]=t;var o={id:e,module:t,factory:r[e],require:c};return c.requireInterceptors.forEach(function(e){e(o);}),o.factory.call(o.module.exports,o.module,o.module.exports,o.require),t.exports;}c.requireInterceptors=[],c.e=function(e,n){for(var t in n)Object.defineProperty(e,t,{enumerable:!0,get:n[t]});},c.d=Object.defineProperty.bind(Object),c.dr=function(e,n){return function(){var t=n();return t&&("object"==typeof t||"function"==typeof t)&&"function"==typeof t.then?t.then(function(n){return e(n);}):e(t);};},c.chunkEnsures={},c.ensure=function(e){return Promise.all(Object.keys(c.chunkEnsures).reduce(function(n,t){return c.chunkEnsures[t](e,n),n;},[]));},c.jsonpInstalled={},u=c.jsonpInstalled,c.chunkEnsures.jsonp=function(n,t){var r=u[n];if(0!==r){if(r)t.push(r[2]);else{var o=new Promise(function(e,t){r=u[n]=[e,t];});t.push(r[2]=o);var i=c.publicPath+e[n],a=Error();return c.loadScript(i,function(e){if(0!==(r=u[n])&&(u[n]=void 0),r){var t=e&&e.type,o=e&&e.target&&e.target.src;a.message="Loading chunk "+n+" failed. ("+t+" : "+o+")",a.name="ChunkLoadError",a.type=t,r[1](a);}},"chunk-"+n),o;}}},c.cssInstalled=t,c.findStylesheet=function(e){try{a||(a=new URL(c.publicPath.replace(/^(\/\/)/,"https:$1")).pathname);}catch(e){}return Array.from(document.querySelectorAll("link[href][rel=stylesheet]")).find(function(n){var t=n.getAttribute("href").split("?")[0];return t===e||t===c.publicPath+e||a&&t===a+e;});},c.createStylesheet=function(e,n,r,o,i){var u=document.createElement("link");return u.rel="stylesheet",u.type="text/css",u.href=n,u.onerror=u.onload=function(n){if(u.onerror=u.onload=null,"load"===n.type)t[e]=0,o();else{delete t[e];var r=n&&n.type,a=n&&n.target&&n.target.href,_=Error("Loading CSS chunk "+e+" failed.\n("+a+")");_.code="CSS_CHUNK_LOAD_FAILED",_.type=r,_.request=a,u.parentNode.removeChild(u),i(_);}},r?r.parentNode.insertBefore(u,r.nextSibling):document.head.appendChild(u),u;},c.chunkEnsures.css=function(e,r){if(t[e])r.push(t[e]);else if(0!==t[e]&&n[e])return t[e]=new Promise(function(t,r){var o=n[e],i=c.publicPath+o;c.findStylesheet(o)?t():c.createStylesheet(e,i,null,t,r);}),r.push(t[e]),r;},_={},c.loadScript=function(e,n,t){if(!self.document)return importScripts(e),n();if(_[e])return _[e].push(n);var r=document.querySelector('script[src="'+e+'"], script[data-mako="@antv/g6-site:'+t+'"]');r||((r=document.createElement("script")).timeout=120,r.src=e),_[e]=[n];var o=function(n,t){clearTimeout(i);var o=_[e];if(delete _[e],r.parentNode&&r.parentNode.removeChild(r),o&&o.forEach(function(e){return e(t);}),n)return n(t);},i=setTimeout(o.bind(null,void 0,{type:"timeout",target:r}),12e4);r.onerror=o.bind(null,r.onerror),r.onload=o.bind(null,r.onload),document.head.appendChild(r);};var l=function(e){for(var n in e)r[n]=e[n];},b=function(e){var n=c.jsonpInstalled,t=e[0],r=e[1];t.some(function(e){return 0!==n[e];})&&l(r);for(var o=0;o<t.length;o++){var i=t[o];n[i]&&n[i][0](),n[i]=0;}},s=i["makoChunk_@antv/g6-site"]=i["makoChunk_@antv/g6-site"]||[];return s.forEach(b.bind(null)),s.push=(function(e,n){e(n),b(n);}).bind(null,s.push.bind(s)),c.publicPath="/",l({"777fffbe":function(e,n,t){function r(e){return e&&e.__esModule?e:{default:e};}t.d(n,"__esModule",{value:!0}),t.e(n,{_interop_require_default:function(){return r;},_:function(){return r;}});},"852bbaa9":function(e,n,t){function r(e){if("function"!=typeof WeakMap)return null;var n=new WeakMap,t=new WeakMap;return(r=function(e){return e?t:n;})(e);}function o(e,n){if(!n&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var t=r(n);if(t&&t.has(e))return t.get(e);var o={},i=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&Object.prototype.hasOwnProperty.call(e,u)){var a=i?Object.getOwnPropertyDescriptor(e,u):null;a&&(a.get||a.set)?Object.defineProperty(o,u,a):o[u]=e[u];}return o.default=e,t&&t.set(e,o),o;}t.d(n,"__esModule",{value:!0}),t.e(n,{_interop_require_wildcard:function(){return o;},_:function(){return o;}});},d1751d7c:function(e,n,t){function r(e,n){return Object.keys(e).forEach(function(t){"default"===t||Object.prototype.hasOwnProperty.call(n,t)||Object.defineProperty(n,t,{enumerable:!0,get:function(){return e[t];}});}),e;}t.d(n,"__esModule",{value:!0}),t.e(n,{_export_star:function(){return r;},_:function(){return r;}});}}),c._interopreRequireWasm=(e,n,t)=>{let r=fetch(n);return"function"==typeof WebAssembly.instantiateStreaming?WebAssembly.instantiateStreaming(r,t).then(n=>Object.assign(e,n.instance.exports)):r.then(e=>e.arrayBuffer()).then(e=>WebAssembly.instantiate(e,t)).then(n=>Object.assign(e,n.instance.exports));},i.__mako_require_module__=c,i.__mako_chunk_load__=c.ensure,c(o),{requireModule:c,_jsonpCallback:b};}({"1ad3813d":function(e,n,t){"use strict";t.d(n,"__esModule",{value:!0});var r=t("852bbaa9")._(t("d7075eb1"));onmessage=async({data:{module:e,memory:n,receiver:t}})=>{await (0,r.default)(e,n),postMessage(!0),(0,r.wbg_rayon_start_worker)(t);};},d7075eb1:function(e,n,t){"use strict";let r;t.d(n,"__esModule",{value:!0}),t.e(n,{dagre:function(){return S;},default:function(){return U;},force:function(){return A;},initSync:function(){return C;},initThreadPool:function(){return O;},start:function(){return j;},wbg_rayon_PoolBuilder:function(){return P;},wbg_rayon_start_worker:function(){return E;}});var o=t("e559a453");let i=t("dfee965e"),u=Array(128).fill(void 0);u.push(void 0,null,!0,!1);let a=u.length;function _(e){let n=u[e];return e<132||(u[e]=a,a=e),n;}function f(e){a===u.length&&u.push(u.length+1);let n=a;return a=u[n],u[n]=e,n;}function c(e){return null==e;}let l=null,b=null;function s(){return(null===b||b.buffer!==r.memory.buffer)&&(b=new Int32Array(r.memory.buffer)),b;}let d="undefined"!=typeof TextDecoder?new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}):{decode:()=>{throw Error("TextDecoder not available");}};"undefined"!=typeof TextDecoder&&d.decode();let g=null;function w(){return(null===g||g.buffer!==r.memory.buffer)&&(g=new Uint8Array(r.memory.buffer)),g;}function y(e,n){return e>>>=0,d.decode(w().slice(e,e+n));}let p=null,h=0,m="undefined"!=typeof TextEncoder?new TextEncoder("utf-8"):{encode:()=>{throw Error("TextEncoder not available");}},v=function(e,n){let t=m.encode(e);return n.set(t),{read:e.length,written:t.length};};function k(e,n,t){if(void 0===t){let t=m.encode(e),r=n(t.length,1)>>>0;return w().subarray(r,r+t.length).set(t),h=t.length,r;}let r=e.length,o=n(r,1)>>>0,i=w(),u=0;for(;u<r;u++){let n=e.charCodeAt(u);if(n>127)break;i[o+u]=n;}if(u!==r){0!==u&&(e=e.slice(u)),o=t(o,r,r=u+3*e.length,1)>>>0;let n=v(e,w().subarray(o+u,o+r));u+=n.written,o=t(o,r,u,1)>>>0;}return h=u,o;}function j(){r.start();}function A(e){return _(r.force(f(e)));}function S(e){return _(r.dagre(f(e)));}function x(e,n){try{return e.apply(this,n);}catch(e){r.__wbindgen_exn_store(f(e));}}function O(e){return _(r.initThreadPool(e));}function E(e){r.wbg_rayon_start_worker(e);}let W="undefined"==typeof FinalizationRegistry?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>r.__wbg_wbg_rayon_poolbuilder_free(e>>>0));class P{static __wrap(e){e>>>=0;let n=Object.create(P.prototype);return n.__wbg_ptr=e,W.register(n,n.__wbg_ptr,n),n;}__destroy_into_raw(){let e=this.__wbg_ptr;return this.__wbg_ptr=0,W.unregister(this),e;}free(){let e=this.__destroy_into_raw();r.__wbg_wbg_rayon_poolbuilder_free(e);}numThreads(){return r.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr)>>>0;}receiver(){return r.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr)>>>0;}build(){r.wbg_rayon_poolbuilder_build(this.__wbg_ptr);}}async function T(e,n){if("function"==typeof Response&&e instanceof Response){if("function"==typeof WebAssembly.instantiateStreaming)try{return await WebAssembly.instantiateStreaming(e,n);}catch(n){if("application/wasm"!=e.headers.get("Content-Type"))console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",n);else throw n;}let t=await e.arrayBuffer();return await WebAssembly.instantiate(t,n);}{let t=await WebAssembly.instantiate(e,n);return t instanceof WebAssembly.Instance?{instance:t,module:e}:t;}}function I(){let e={};return e.wbg={},e.wbg.__wbindgen_object_drop_ref=function(e){_(e);},e.wbg.__wbindgen_is_object=function(e){let n=u[e];return"object"==typeof n&&null!==n;},e.wbg.__wbg_getwithrefkey_5e6d9547403deab8=function(e,n){return f(u[e][u[n]]);},e.wbg.__wbindgen_is_undefined=function(e){return void 0===u[e];},e.wbg.__wbindgen_in=function(e,n){return u[e]in u[n];},e.wbg.__wbg_new_16b304a2cfa7ff4a=function(){return f([]);},e.wbg.__wbindgen_number_new=function(e){return f(e);},e.wbg.__wbg_push_a5b05aedc7234f9f=function(e,n){return u[e].push(u[n]);},e.wbg.__wbg_new_72fb9a18b5ae2624=function(){return f({});},e.wbg.__wbg_set_d4638f722068f043=function(e,n,t){u[e][n>>>0]=_(t);},e.wbg.__wbg_set_841ac57cff3d672b=function(e,n,t){u[e][_(n)]=_(t);},e.wbg.__wbg_isArray_2ab64d95e09ea0ae=function(e){return Array.isArray(u[e]);},e.wbg.__wbg_length_cd7af8117672b8b8=function(e){return u[e].length;},e.wbg.__wbindgen_is_bigint=function(e){return"bigint"==typeof u[e];},e.wbg.__wbindgen_bigint_get_as_i64=function(e,n){let t=u[n],o="bigint"==typeof t?t:void 0;((null===l||l.buffer!==r.memory.buffer)&&(l=new BigInt64Array(r.memory.buffer)),l)[e/8+1]=c(o)?BigInt(0):o,s()[e/4+0]=!c(o);},e.wbg.__wbindgen_bigint_from_u64=function(e){return f(BigInt.asUintN(64,e));},e.wbg.__wbindgen_jsval_eq=function(e,n){return u[e]===u[n];},e.wbg.__wbindgen_error_new=function(e,n){return f(Error(y(e,n)));},e.wbg.__wbindgen_number_get=function(e,n){let t=u[n],o="number"==typeof t?t:void 0;((null===p||p.buffer!==r.memory.buffer)&&(p=new Float64Array(r.memory.buffer)),p)[e/8+1]=c(o)?0:o,s()[e/4+0]=!c(o);},e.wbg.__wbindgen_boolean_get=function(e){let n=u[e];return"boolean"==typeof n?n?1:0:2;},e.wbg.__wbg_get_bd8e338fbd5f5cc8=function(e,n){return f(u[e][n>>>0]);},e.wbg.__wbindgen_jsval_loose_eq=function(e,n){return u[e]==u[n];},e.wbg.__wbindgen_string_get=function(e,n){let t=u[n],o="string"==typeof t?t:void 0;var i=c(o)?0:k(o,r.__wbindgen_malloc,r.__wbindgen_realloc),a=h;s()[e/4+1]=a,s()[e/4+0]=i;},e.wbg.__wbg_new_abda76e883ba8a5f=function(){return f(Error());},e.wbg.__wbg_stack_658279fe44541cf6=function(e,n){let t=k(u[n].stack,r.__wbindgen_malloc,r.__wbindgen_realloc),o=h;s()[e/4+1]=o,s()[e/4+0]=t;},e.wbg.__wbg_error_f851667af71bcfc6=function(e,n){let t,o;try{t=e,o=n,console.error(y(e,n));}finally{r.__wbindgen_free(t,o,1);}},e.wbg.__wbg_next_196c84450b364254=function(){return x(function(e){return f(u[e].next());},arguments);},e.wbg.__wbg_done_298b57d23c0fc80c=function(e){return u[e].done;},e.wbg.__wbg_value_d93c65011f51a456=function(e){return f(u[e].value);},e.wbg.__wbg_iterator_2cee6dadfd956dfa=function(){return f(Symbol.iterator);},e.wbg.__wbg_get_e3c254076557e348=function(){return x(function(e,n){return f(Reflect.get(u[e],u[n]));},arguments);},e.wbg.__wbindgen_is_function=function(e){return"function"==typeof u[e];},e.wbg.__wbg_next_40fc327bfc8770e6=function(e){return f(u[e].next);},e.wbg.__wbg_call_27c0f87801dedf93=function(){return x(function(e,n){return f(u[e].call(u[n]));},arguments);},e.wbg.__wbg_length_c20a40f15020d68a=function(e){return u[e].length;},e.wbg.__wbindgen_memory=function(){return f(r.memory);},e.wbg.__wbg_buffer_12d079cc21e14bdb=function(e){return f(u[e].buffer);},e.wbg.__wbg_new_63b92bc8671ed464=function(e){return f(new Uint8Array(u[e]));},e.wbg.__wbg_set_a47bac70306a19a7=function(e,n,t){u[e].set(u[n],t>>>0);},e.wbg.__wbg_self_ce0dbfc45cf2f5be=function(){return x(function(){return f(self.self);},arguments);},e.wbg.__wbg_window_c6fb939a7f436783=function(){return x(function(){return f(window.window);},arguments);},e.wbg.__wbg_globalThis_d1e6af4856ba331b=function(){return x(function(){return f(globalThis.globalThis);},arguments);},e.wbg.__wbg_global_207b558942527489=function(){return x(function(){return f(i.global);},arguments);},e.wbg.__wbg_newnoargs_e258087cd0daa0ea=function(e,n){return f(Function(y(e,n)));},e.wbg.__wbg_instanceof_Uint8Array_2b3bbecd033d19f6=function(e){let n;try{n=u[e]instanceof Uint8Array;}catch(e){n=!1;}return n;},e.wbg.__wbg_instanceof_ArrayBuffer_836825be07d4c9d2=function(e){let n;try{n=u[e]instanceof ArrayBuffer;}catch(e){n=!1;}return n;},e.wbg.__wbg_isSafeInteger_f7b04ef02296c4d2=function(e){return Number.isSafeInteger(u[e]);},e.wbg.__wbindgen_string_new=function(e,n){return f(y(e,n));},e.wbg.__wbindgen_object_clone_ref=function(e){return f(u[e]);},e.wbg.__wbindgen_debug_string=function(e,n){let t=k(function e(n){let t;let r=typeof n;if("number"==r||"boolean"==r||null==n)return`${n}`;if("string"==r)return`"${n}"`;if("symbol"==r){let e=n.description;return null==e?"Symbol":`Symbol(${e})`;}if("function"==r){let e=n.name;return"string"==typeof e&&e.length>0?`Function(${e})`:"Function";}if(Array.isArray(n)){let t=n.length,r="[";t>0&&(r+=e(n[0]));for(let o=1;o<t;o++)r+=", "+e(n[o]);return r+"]";}let o=/\[object ([^\]]+)\]/.exec(toString.call(n));if(!(o.length>1))return toString.call(n);if("Object"==(t=o[1]))try{return"Object("+JSON.stringify(n)+")";}catch(e){return"Object";}return n instanceof Error?`${n.name}: ${n.message}
${n.stack}`:t;}(u[n]),r.__wbindgen_malloc,r.__wbindgen_realloc),o=h;s()[e/4+1]=o,s()[e/4+0]=t;},e.wbg.__wbindgen_throw=function(e,n){throw Error(y(e,n));},e.wbg.__wbindgen_module=function(){return f(R.__wbindgen_wasm_module);},e.wbg.__wbg_startWorkers_2ee336a9694dda13=function(e,n,t){return f((0,o.startWorkers)(_(e),_(n),P.__wrap(t)));},e.wbg.__wbg_instanceof_Window_f401953a2cf86220=function(e){let n;try{n=u[e]instanceof Window;}catch(e){n=!1;}return n;},e;}function M(e,n){e.wbg.memory=n||new WebAssembly.Memory({initial:18,maximum:16384,shared:!0});}function q(e,n){return r=e.exports,R.__wbindgen_wasm_module=n,l=null,p=null,b=null,g=null,r.__wbindgen_start(),r;}function C(e,n){if(void 0!==r)return r;let t=I();return M(t,n),e instanceof WebAssembly.Module||(e=new WebAssembly.Module(e)),q(new WebAssembly.Instance(e,t),e);}async function R(e,n){if(void 0!==r)return r;void 0===e&&(e=new URL(t.publicPath+"antv_layout_wasm_bg.fd2ce19b.wasm",document.baseURI||self.location.href));let o=I();("string"==typeof e||"function"==typeof Request&&e instanceof Request||"function"==typeof URL&&e instanceof URL)&&(e=fetch(e)),M(o,n);let{instance:i,module:u}=await T(await e,o);return q(i,u);}var U=R;},dfee965e:function(e,n,t){e.exports=function(){if("object"==typeof globalThis)return globalThis;try{return this||Function("return this")();}catch(e){if("object"==typeof window)return window;}}();}},"1ad3813d",r);r.jsonpCallback=o._jsonpCallback;}();
//# sourceMappingURL=1ad3813d-worker.c6235ddb.js.map