// MCP Apps view: one self-contained HTML page rendered by claude.ai in a sandboxed iframe.
// One generic kind: "page" { title, sub, chips[], rows[[k,v]], bars[], sections[{heading,empty,items[]}], note }.
// Item: { icon, check, title, sub, badge, url, call, checkCall }. `call` opens another tool's result (with a back stack);
// `checkCall` runs an action from the checkbox and shows the updated card.
// Keep backticks and ${ out of the view code: it lives inside a String.raw template literal.
export const VIEW_URI = "ui://homework-easy-times/card.html";
export const VIEW_MIME = "text/html;profile=mcp-app";
export const VIEW_CSP = { resourceDomains: [] as string[] };

export const VIEW_HTML = /* html */ String.raw`<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#fff;--fg:#1b1d2a;--mut:#6a6f85;--line:#e4e6ef;--accent:#4f46e5;--soft:#eef0ff;--ok:#16a34a;--bad:#dc2626}
:root[data-theme=dark]{--bg:#161822;--fg:#ecedf6;--mut:#9aa0b8;--line:#2f3243;--accent:#9aa5ff;--soft:#23263a;--ok:#4ade80;--bad:#f87171}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 system-ui,"Segoe UI",Arial,sans-serif;background:var(--bg);color:var(--fg)}
.card{padding:14px 16px}h1{margin:0;font-size:18px;color:var(--accent)}.sub{color:var(--mut);margin:2px 0 8px}
.back{background:none;border:0;color:var(--accent);cursor:pointer;padding:0 0 6px;font:inherit}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.chip{background:var(--soft);color:var(--accent);border-radius:999px;padding:2px 10px;font-size:12px}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:6px 0 10px}dt{color:var(--mut)}dd{margin:0}
.bar{margin:8px 0}.bar .l{display:flex;justify-content:space-between;font-size:13px;color:var(--mut)}
.track{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:3px}.fill{height:100%;background:var(--accent)}.fill.over{background:var(--bad)}
h2{font-size:13px;color:var(--mut);margin:14px 0 4px;font-weight:600}
.item{display:flex;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}.item.go{cursor:pointer}
.ic{width:22px;text-align:center}.mid{flex:1;min-width:0}.t{font-weight:600;overflow-wrap:anywhere}.t.done{text-decoration:line-through;color:var(--mut)}.s{color:var(--mut);font-size:13px}
.badge{background:var(--soft);color:var(--accent);border-radius:8px;padding:1px 8px;font-size:12px;white-space:nowrap}
input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent);cursor:pointer}
.empty,.note{color:var(--mut);font-size:12px;margin-top:6px}a{color:var(--accent)}
</style></head><body><div id="root"></div><script>
(function(){
var root=document.getElementById("root"),nextId=2,pending={},stack=[],cur=null;
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function add(p,c){if(c)p.appendChild(c);return p}
function send(m){parent.postMessage(Object.assign({jsonrpc:"2.0"},m),"*")}
function request(method,params){return new Promise(function(res,rej){var id=nextId++;pending[id]={res:res,rej:rej};send({id:id,method:method,params:params})})}
function size(){send({method:"ui/notifications/size-changed",params:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}})}
function theme(ctx){if(ctx&&ctx.theme)document.documentElement.setAttribute("data-theme",ctx.theme)}
function textOf(r){return(r&&r.content||[]).map(function(c){return c.text||""}).join("\n")}
function safeUrl(u){return typeof u==="string"&&/^https?:\/\//i.test(u)}
function item(it){var r=el("div","item");
 if(it.check!==undefined&&it.check!==null){var cb=el("input");cb.type="checkbox";cb.checked=!!it.check;
  if(it.checkCall){cb.addEventListener("click",function(e){e.stopPropagation();act(it.checkCall)})}else cb.disabled=true;add(r,cb)}
 else if(it.icon)add(r,el("div","ic",it.icon));
 var m=el("div","mid");var t=el("div","t"+(it.check?" done":""));
 if(safeUrl(it.url)){var a=el("a",null,it.title||"");a.href=it.url;a.target="_blank";a.rel="noopener noreferrer";add(t,a)}else t.textContent=it.title||"";
 add(m,t);if(it.sub)add(m,el("div","s",it.sub));add(r,m);
 if(it.badge)add(r,el("span","badge",String(it.badge)));
 if(it.call){r.classList.add("go");r.addEventListener("click",function(){nav(it.call)})}
 return r}
function page(d){var c=el("div","card");
 if(stack.length){var b=el("button","back","→ חזרה");b.addEventListener("click",function(){var p=stack.pop();draw(p)});add(c,b)}
 add(c,el("h1",null,d.title||""));if(d.sub)add(c,el("div","sub",d.sub));
 if(d.chips&&d.chips.length){var ch=el("div","chips");d.chips.forEach(function(x){add(ch,el("span","chip",String(x)))});add(c,ch)}
 var dl=el("dl"),n=0;(d.rows||[]).forEach(function(r){if(r[1]==null||r[1]==="")return;n++;add(dl,el("dt",null,r[0]));add(dl,el("dd",null,String(r[1])))});if(n)add(c,dl);
 (d.bars||[]).forEach(function(b){var w=el("div","bar"),l=el("div","l");add(l,el("span",null,b.label||""));add(l,el("span",null,b.text||""));add(w,l);
  var tr=el("div","track"),f=el("div","fill"+(b.over?" over":""));var pc=b.max>0?Math.max(0,Math.min(100,b.value/b.max*100)):0;f.style.width=pc+"%";add(tr,f);add(w,tr);add(c,w)});
 (d.sections||[]).forEach(function(s){if(s.heading)add(c,el("h2",null,s.heading));
  if(!(s.items||[]).length){if(s.empty)add(c,el("div","empty",s.empty))}else s.items.forEach(function(it){add(c,item(it))})});
 if(d.note)add(c,el("div","note",d.note));return c}
function draw(d){cur=d;root.textContent="";
 if(d.kind==="page")add(root,page(d));else add(root,add(el("div","card"),el("div",null,d.text||"אין מידע להצגה.")));size()}
function result(r){var d=r&&r.structuredContent;return d&&!r.isError?d:{kind:"text",text:textOf(r)||"אין תוצאה."}}
function nav(call){request("tools/call",call).then(function(r){if(cur)stack.push(cur);draw(result(r))},function(e){draw({kind:"text",text:"לא הצלחתי לטעון: "+(e&&e.message||"שגיאה")})})}
function act(call){request("tools/call",call).then(function(r){draw(result(r))},function(e){draw({kind:"text",text:"הפעולה נכשלה: "+(e&&e.message||"שגיאה")})})}
window.addEventListener("message",function(e){var m=e.data;if(!m||m.jsonrpc!=="2.0")return;
 if(m.id!=null&&pending[m.id]&&(m.result!==undefined||m.error)){var p=pending[m.id];delete pending[m.id];if(m.error)p.rej(m.error);else p.res(m.result);return}
 if(m.method==="ui/notifications/tool-result"){var r=m.params||{};stack=[];draw(r.structuredContent||{kind:"text",text:textOf(r)||"אין מידע להצגה."})}
 else if(m.method==="ui/notifications/host-context-changed"){theme(m.params)}
 else if(m.method==="ui/resource-teardown"&&m.id!=null){send({id:m.id,result:{}})}
});
if(window.ResizeObserver)new ResizeObserver(size).observe(document.body);
request("ui/initialize",{appInfo:{name:"homework-easy-times-card",version:"1.0.0"},appCapabilities:{},protocolVersion:"2026-01-26"}).then(function(r){if(r)theme(r.hostContext);send({method:"ui/notifications/initialized",params:{}});size()},function(){});
})();
</script></body></html>`;
