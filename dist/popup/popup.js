import{o as u,n as p,F as V,e as w}from"../shared/messaging.js";import{f as y,n as G,v as B,i as T}from"../shared/validation.js";function I(){const e=m();e.innerHTML=`
    <div class="card">
      <h1>Установите PIN</h1>
      <p>PIN из 4 цифр будет использоваться для защиты профиля.</p>
      <form id="pin-setup-form">
        <div class="form-group">
          <label for="pin">PIN (4 цифры)</label>
          <input id="pin" name="pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label for="pin-confirm">Повторите PIN</label>
          <input id="pin-confirm" name="pinConfirm" type="password" inputmode="numeric" maxlength="4" class="pin-input" autocomplete="new-password" />
        </div>
        <div class="error"></div>
        <div class="actions">
          <button type="submit" class="btn">Сохранить</button>
        </div>
      </form>
    </div>
  `;const t=e.querySelector("#pin-setup-form"),s=e.querySelector("#pin"),r=e.querySelector("#pin-confirm"),n=e.querySelector(".error");t.addEventListener("submit",async i=>{i.preventDefault(),n.textContent="";const a=s.value.trim(),c=r.value.trim();H();const o=await u(p.SETUP_PIN,{pin:a,pinConfirm:c});o.success?f("profile"):(I(),m().querySelector(".error").textContent=y(o.error||"",o.error||"Ошибка установки PIN"))})}function x(e){const t=m();t.innerHTML=`
    <div class="card">
      <h1>Разблокировать AccountsHelper</h1>
      <p>Введите PIN, чтобы продолжить.</p>
      <form id="unlock-form">
        <div class="form-group">
          <label for="unlock-pin">PIN</label>
          <input id="unlock-pin" name="pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" autocomplete="current-password" />
        </div>
        <div class="error"></div>
        <div class="actions">
          <button type="submit" class="btn">Разблокировать</button>
        </div>
      </form>
    </div>
  `;const s=t.querySelector("#unlock-form"),r=t.querySelector("#unlock-pin"),n=t.querySelector(".error");e!==void 0&&e<5&&(n.textContent=`Осталось попыток: ${e}`),s.addEventListener("submit",async i=>{i.preventDefault(),n.textContent="";const a=r.value.trim();H();const c=await u(p.UNLOCK,{pin:a});if(c.success)L(c.data),f("profile");else{x(c.attemptsLeft);const o=m().querySelector(".error");o.textContent=y(c.error||"",c.error||"Ошибка разблокировки")}})}const K="modulepreload",z=function(e){return"/"+e},D={},A=function(t,s,r){let n=Promise.resolve();if(s&&s.length>0){document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),c=a?.nonce||a?.getAttribute("nonce");n=Promise.allSettled(s.map(o=>{if(o=z(o),o in D)return;D[o]=!0;const l=o.endsWith(".css"),v=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${o}"]${v}`))return;const d=document.createElement("link");if(d.rel=l?"stylesheet":K,l||(d.as="script"),d.crossOrigin="",d.href=o,c&&d.setAttribute("nonce",c),document.head.appendChild(d),l)return new Promise((S,P)=>{d.addEventListener("load",S),d.addEventListener("error",()=>P(new Error(`Unable to preload CSS for ${o}`)))})}))}function i(a){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=a,window.dispatchEvent(c),!c.defaultPrevented)throw a}return n.then(a=>{for(const c of a||[])c.status==="rejected"&&i(c.reason);return t().catch(i)})};function $(e){const t=m(),s=!!e,r=V.map(v=>`<option value="${v}"${e?.type===v?" selected":""}>${w[v]}</option>`).join("");t.innerHTML=`
    <div class="card">
      <h2>${s?"Редактировать запись":"Новая запись"}</h2>
      <form id="entry-form">
        <input type="hidden" id="entry-id" value="${e?.id||""}" />
        <div class="form-group">
          <label for="entry-type">Тип</label>
          <select id="entry-type" required>${r}</select>
        </div>
        <div class="form-group">
          <label for="entry-value">Значение</label>
          <input id="entry-value" type="text" value="${M(e?.value||"")}" required />
        </div>
        <div class="form-group">
          <label for="entry-label">Псевдоним (необязательно)</label>
          <input id="entry-label" type="text" maxlength="50" value="${M(e?.label||"")}" />
        </div>
        <div class="checkbox-row">
          <input id="entry-default" type="checkbox"${e?.isDefault?" checked":""} />
          <label for="entry-default">По умолчанию для этого типа</label>
        </div>
        <div class="error"></div>
        <div class="actions">
          <button type="button" id="cancel-entry" class="btn secondary">Отмена</button>
          <button type="submit" class="btn">Сохранить</button>
        </div>
      </form>
    </div>
  `;const n=t.querySelector("#entry-form"),i=t.querySelector("#entry-type"),a=t.querySelector("#entry-value"),c=t.querySelector("#entry-label"),o=t.querySelector("#entry-default"),l=t.querySelector(".error");t.querySelector("#cancel-entry")?.addEventListener("click",()=>f("profile")),n.addEventListener("submit",async v=>{v.preventDefault(),l.textContent="";const d=i.value,S=G(d,a.value),P=c.value.trim(),F=o.checked,C=B(d,S,P);if(!C.valid){l.textContent=C.errors.map(E=>E.message).join("; ");return}const U={id:e?.id,type:d,value:S,label:P,isDefault:F,createdAt:e?.createdAt},b=await u(p.SAVE_ENTRY,{entry:U});if(b.success){const E=b.data,q=window.__accountsHelperProfile;if(q){const _=q.entries.filter(g=>g.id!==E.id);E.isDefault&&_.forEach(g=>{g.type===E.type&&(g.isDefault=!1)});const O={...q,updatedAt:new Date().toISOString(),entries:[..._,E].sort((g,Y)=>{const N=Object.keys(w);return N.indexOf(g.type)-N.indexOf(Y.type)})};L(O),window.__accountsHelperProfile=O,f("profile")}else f("profile")}else l.textContent=y(b.error||"",b.error||"Ошибка сохранения"),b.fieldErrors&&(l.textContent+=" "+Object.values(b.fieldErrors).join("; "))})}function M(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function k(e){L(e);const t=m();t.innerHTML=`
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h1>Мой профиль</h1>
        <button id="to-settings" class="btn secondary">⚙️</button>
      </div>
      <button id="add-entry" class="btn">+ Добавить запись</button>
      <ul id="entry-list" class="entry-list"></ul>
    </div>
  `;const s=t.querySelector("#entry-list");if(e.entries.length===0)s.innerHTML='<li class="empty-state">Нет сохранённых записей</li>';else for(const r of J(e.entries)){const n=document.createElement("li");n.innerHTML=`
        <div class="entry-meta">
          <span class="entry-type">${w[r.type]}${r.isDefault?" ★":""}</span>
          <span class="entry-value">${W(r.label||r.value)}</span>
        </div>
        <div class="actions" style="margin-top:0;">
          <button class="btn secondary edit-btn" data-id="${r.id}">✎</button>
          <button class="btn danger delete-btn" data-id="${r.id}">🗑</button>
        </div>
      `,s.appendChild(n)}t.querySelector("#add-entry")?.addEventListener("click",()=>$()),t.querySelector("#to-settings")?.addEventListener("click",()=>f("settings")),t.querySelectorAll(".edit-btn").forEach(r=>{r.addEventListener("click",()=>{const n=r.dataset.id,i=e.entries.find(a=>a.id===n);i&&$(i)})}),t.querySelectorAll(".delete-btn").forEach(r=>{r.addEventListener("click",async()=>{const n=r.dataset.id;if(!confirm("Удалить запись?"))return;const{sendMessage:i}=await A(async()=>{const{sendMessage:o}=await import("../shared/messaging.js").then(l=>l.p);return{sendMessage:o}},[]),{MESSAGE_TYPES:a}=await A(async()=>{const{MESSAGE_TYPES:o}=await import("../shared/messaging.js").then(l=>l.p);return{MESSAGE_TYPES:o}},[]);if((await i(a.DELETE_ENTRY,{id:n})).success){const o={...e,entries:e.entries.filter(l=>l.id!==n)};L(o),k(o)}})})}function J(e){return[...e].sort((t,s)=>{const r=Object.keys(w),n=r.indexOf(t.type),i=r.indexOf(s.type);return n!==i?n-i:t.isDefault!==s.isDefault?t.isDefault?-1:1:new Date(s.updatedAt).getTime()-new Date(t.updatedAt).getTime()})}function W(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function X(){return`
    <div class="card section">
      <h2>Экспорт / Импорт</h2>
      <div class="form-group">
        <button id="export-profile" class="btn">Экспортировать профиль</button>
        <div class="error" id="export-error"></div>
      </div>
      <div class="form-group">
        <label for="import-file">Импорт профиля (JSON)</label>
        <input id="import-file" type="file" accept=".json,application/json" class="file-input" />
        <div id="import-status" class="success"></div>
        <div id="import-error" class="error"></div>
      </div>
    </div>
  `}function Q(){const e=m();e.querySelector("#export-profile")?.addEventListener("click",async()=>{const t=e.querySelector("#export-error");t.textContent="";const s=await u(p.EXPORT_PROFILE,{});if(s.success){const r=new Blob([s.data.json],{type:"application/json"}),n=URL.createObjectURL(r),i=document.createElement("a");i.href=n,i.download=`accounts-helper-export-${new Date().toISOString().slice(0,10)}.json`,i.click(),URL.revokeObjectURL(n)}else t.textContent=y(s.error||"","Ошибка экспорта")}),e.querySelector("#import-file")?.addEventListener("change",async t=>{const s=t.target,r=s.files?.[0],n=e.querySelector("#import-status"),i=e.querySelector("#import-error");if(n.textContent="",i.textContent="",!r)return;const a=prompt("Введите PIN для импорта профиля:");if(a)try{const c=await r.text(),o=await u(p.IMPORT_PROFILE,{json:c,pin:a});o.success?(n.textContent="Профиль импортирован. Перезапустите popup.",s.value=""):i.textContent=y(o.error||"","Ошибка импорта")}catch{i.textContent="Не удалось прочитать файл"}})}function Z(){const e=m();e.innerHTML=`
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h1>Настройки</h1>
        <button id="back-to-profile" class="btn secondary">←</button>
      </div>

      <div class="card section">
        <h2>Сменить PIN</h2>
        <form id="change-pin-form">
          <div class="form-group">
            <label for="old-pin">Текущий PIN</label>
            <input id="old-pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" />
          </div>
          <div class="form-group">
            <label for="new-pin">Новый PIN</label>
            <input id="new-pin" type="password" inputmode="numeric" maxlength="4" class="pin-input" />
          </div>
          <div class="error" id="change-pin-error"></div>
          <button type="submit" class="btn">Сменить PIN</button>
        </form>
      </div>

      ${X()}

      <div class="card section">
        <h2>Безопасность</h2>
        <div class="actions">
          <button id="lock-session" class="btn secondary">Заблокировать</button>
          <button id="clear-all" class="btn danger">Очистить данные</button>
        </div>
        <div class="error" id="settings-error"></div>
      </div>
    </div>
  `,e.querySelector("#back-to-profile")?.addEventListener("click",()=>f("profile")),Q();const t=e.querySelector("#change-pin-form"),s=e.querySelector("#old-pin"),r=e.querySelector("#new-pin"),n=e.querySelector("#change-pin-error");t.addEventListener("submit",async i=>{i.preventDefault(),n.textContent="";const a=s.value.trim(),c=r.value.trim();if(!T(a)||!T(c)){n.textContent=y("E_PIN_INVALID_FORMAT");return}const o=await u(p.CHANGE_PIN,{oldPin:a,newPin:c});o.success?(n.textContent="PIN изменён",n.className="success",s.value="",r.value=""):(n.textContent=y(o.error||"","Ошибка смены PIN"),n.className="error")}),e.querySelector("#lock-session")?.addEventListener("click",async()=>{(await u(p.LOCK)).success&&f("unlock")}),e.querySelector("#clear-all")?.addEventListener("click",async()=>{if(!confirm("Все данные будут удалены без возможности восстановления. Продолжить?"))return;(await u(p.LOCK)).success&&f("setup")})}const R=document.getElementById("app");let h=null;function m(){return R}function L(e){h=e}function ee(){j()}async function j(){const e=await u(p.CHECK_PROFILE);if(!e.success){x();return}const{exists:t}=e.data;if(!t)I();else{const s=await u(p.GET_PROFILE);s.success?(h=s.data,k(h)):x()}}function H(){R.innerHTML='<div class="card"><p>Загрузка...</p></div>'}function f(e){e==="setup"?I():e==="unlock"?x():e==="profile"?h?k(h):j():e==="settings"&&Z()}document.addEventListener("DOMContentLoaded",ee);
//# sourceMappingURL=popup.js.map
