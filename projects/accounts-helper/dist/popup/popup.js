import{o as u,n as p,F as M,e as L}from"../shared/messaging.js";import{f as y,n as j,v as H,i as I}from"../shared/validation.js";function x(){const e=m();e.innerHTML=`
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
  `;const t=e.querySelector("#pin-setup-form"),s=e.querySelector("#pin"),r=e.querySelector("#pin-confirm"),n=e.querySelector(".error");t.addEventListener("submit",async i=>{i.preventDefault(),n.textContent="";const c=s.value.trim(),a=r.value.trim();O();const o=await u(p.SETUP_PIN,{pin:c,pinConfirm:a});o.success?f("profile"):(x(),m().querySelector(".error").textContent=y(o.error||"",o.error||"Ошибка установки PIN"))})}function h(e){const t=m();t.innerHTML=`
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
  `;const s=t.querySelector("#unlock-form"),r=t.querySelector("#unlock-pin"),n=t.querySelector(".error");e!==void 0&&e<5&&(n.textContent=`Осталось попыток: ${e}`),s.addEventListener("submit",async i=>{i.preventDefault(),n.textContent="";const c=r.value.trim();O();const a=await u(p.UNLOCK,{pin:c});if(a.success)P(a.data),f("profile");else{h(a.attemptsLeft);const o=m().querySelector(".error");o.textContent=y(a.error||"",a.error||"Ошибка разблокировки")}})}const F="modulepreload",U=function(e){return"/"+e},C={},k=function(t,s,r){let n=Promise.resolve();if(s&&s.length>0){document.getElementsByTagName("link");const c=document.querySelector("meta[property=csp-nonce]"),a=c?.nonce||c?.getAttribute("nonce");n=Promise.allSettled(s.map(o=>{if(o=U(o),o in C)return;C[o]=!0;const l=o.endsWith(".css"),v=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${o}"]${v}`))return;const d=document.createElement("link");if(d.rel=l?"stylesheet":F,l||(d.as="script"),d.crossOrigin="",d.href=o,a&&d.setAttribute("nonce",a),document.head.appendChild(d),l)return new Promise((g,S)=>{d.addEventListener("load",g),d.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${o}`)))})}))}function i(c){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=c,window.dispatchEvent(a),!a.defaultPrevented)throw c}return n.then(c=>{for(const a of c||[])a.status==="rejected"&&i(a.reason);return t().catch(i)})};function _(e){const t=m(),s=!!e,r=M.map(v=>`<option value="${v}"${e?.type===v?" selected":""}>${L[v]}</option>`).join("");t.innerHTML=`
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
          <input id="entry-value" type="text" value="${N(e?.value||"")}" required />
        </div>
        <div class="form-group">
          <label for="entry-label">Псевдоним (необязательно)</label>
          <input id="entry-label" type="text" maxlength="50" value="${N(e?.label||"")}" />
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
  `;const n=t.querySelector("#entry-form"),i=t.querySelector("#entry-type"),c=t.querySelector("#entry-value"),a=t.querySelector("#entry-label"),o=t.querySelector("#entry-default"),l=t.querySelector(".error");t.querySelector("#cancel-entry")?.addEventListener("click",()=>f("profile")),n.addEventListener("submit",async v=>{v.preventDefault(),l.textContent="";const d=i.value,g=j(d,c.value),S=a.value.trim(),D=o.checked,q=H(d,g,S);if(!q.valid){l.textContent=q.errors.map(R=>R.message).join("; ");return}const $={id:e?.id,type:d,value:g,label:S,isDefault:D,createdAt:e?.createdAt},b=await u(p.SAVE_ENTRY,{entry:$});b.success?f("profile"):(l.textContent=y(b.error||"",b.error||"Ошибка сохранения"),b.fieldErrors&&(l.textContent+=" "+Object.values(b.fieldErrors).join("; ")))})}function N(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function w(e){P(e);const t=m();t.innerHTML=`
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h1>Мой профиль</h1>
        <button id="to-settings" class="btn secondary">⚙️</button>
      </div>
      <button id="add-entry" class="btn">+ Добавить запись</button>
      <ul id="entry-list" class="entry-list"></ul>
    </div>
  `;const s=t.querySelector("#entry-list");if(e.entries.length===0)s.innerHTML='<li class="empty-state">Нет сохранённых записей</li>';else for(const r of Y(e.entries)){const n=document.createElement("li");n.innerHTML=`
        <div class="entry-meta">
          <span class="entry-type">${L[r.type]}${r.isDefault?" ★":""}</span>
          <span class="entry-value">${V(r.label||r.value)}</span>
        </div>
        <div class="actions" style="margin-top:0;">
          <button class="btn secondary edit-btn" data-id="${r.id}">✎</button>
          <button class="btn danger delete-btn" data-id="${r.id}">🗑</button>
        </div>
      `,s.appendChild(n)}t.querySelector("#add-entry")?.addEventListener("click",()=>_()),t.querySelector("#to-settings")?.addEventListener("click",()=>f("settings")),t.querySelectorAll(".edit-btn").forEach(r=>{r.addEventListener("click",()=>{const n=r.dataset.id,i=e.entries.find(c=>c.id===n);i&&_(i)})}),t.querySelectorAll(".delete-btn").forEach(r=>{r.addEventListener("click",async()=>{const n=r.dataset.id;if(!confirm("Удалить запись?"))return;const{sendMessage:i}=await k(async()=>{const{sendMessage:o}=await import("../shared/messaging.js").then(l=>l.p);return{sendMessage:o}},[]),{MESSAGE_TYPES:c}=await k(async()=>{const{MESSAGE_TYPES:o}=await import("../shared/messaging.js").then(l=>l.p);return{MESSAGE_TYPES:o}},[]);if((await i(c.DELETE_ENTRY,{id:n})).success){const o={...e,entries:e.entries.filter(l=>l.id!==n)};P(o),w(o)}})})}function Y(e){return[...e].sort((t,s)=>{const r=Object.keys(L),n=r.indexOf(t.type),i=r.indexOf(s.type);return n!==i?n-i:t.isDefault!==s.isDefault?t.isDefault?-1:1:new Date(s.updatedAt).getTime()-new Date(t.updatedAt).getTime()})}function V(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function G(){return`
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
  `}function B(){const e=m();e.querySelector("#export-profile")?.addEventListener("click",async()=>{const t=e.querySelector("#export-error");t.textContent="";const s=await u(p.EXPORT_PROFILE,{});if(s.success){const r=new Blob([s.data.json],{type:"application/json"}),n=URL.createObjectURL(r),i=document.createElement("a");i.href=n,i.download=`accounts-helper-export-${new Date().toISOString().slice(0,10)}.json`,i.click(),URL.revokeObjectURL(n)}else t.textContent=y(s.error||"","Ошибка экспорта")}),e.querySelector("#import-file")?.addEventListener("change",async t=>{const s=t.target,r=s.files?.[0],n=e.querySelector("#import-status"),i=e.querySelector("#import-error");if(n.textContent="",i.textContent="",!r)return;const c=prompt("Введите PIN для импорта профиля:");if(c)try{const a=await r.text(),o=await u(p.IMPORT_PROFILE,{json:a,pin:c});o.success?(n.textContent="Профиль импортирован. Перезапустите popup.",s.value=""):i.textContent=y(o.error||"","Ошибка импорта")}catch{i.textContent="Не удалось прочитать файл"}})}function K(){const e=m();e.innerHTML=`
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

      ${G()}

      <div class="card section">
        <h2>Безопасность</h2>
        <div class="actions">
          <button id="lock-session" class="btn secondary">Заблокировать</button>
          <button id="clear-all" class="btn danger">Очистить данные</button>
        </div>
        <div class="error" id="settings-error"></div>
      </div>
    </div>
  `,e.querySelector("#back-to-profile")?.addEventListener("click",()=>f("profile")),B();const t=e.querySelector("#change-pin-form"),s=e.querySelector("#old-pin"),r=e.querySelector("#new-pin"),n=e.querySelector("#change-pin-error");t.addEventListener("submit",async i=>{i.preventDefault(),n.textContent="";const c=s.value.trim(),a=r.value.trim();if(!I(c)||!I(a)){n.textContent=y("E_PIN_INVALID_FORMAT");return}const o=await u(p.CHANGE_PIN,{oldPin:c,newPin:a});o.success?(n.textContent="PIN изменён",n.className="success",s.value="",r.value=""):(n.textContent=y(o.error||"","Ошибка смены PIN"),n.className="error")}),e.querySelector("#lock-session")?.addEventListener("click",async()=>{(await u(p.LOCK)).success&&f("unlock")}),e.querySelector("#clear-all")?.addEventListener("click",async()=>{if(!confirm("Все данные будут удалены без возможности восстановления. Продолжить?"))return;if((await u(p.CLEAR_ALL_DATA)).success){const c=e.querySelector("#settings-error");c.textContent="Данные удалены",c.className="success",f("pinSetup")}})}const T=document.getElementById("app");let E=null;function m(){return T}function P(e){E=e}function z(){A()}async function A(){const e=await u(p.CHECK_PROFILE);if(!e.success){h();return}const{exists:t}=e.data;if(!t)x();else{const s=await u(p.GET_PROFILE);s.success?(E=s.data,w(E)):h()}}function O(){T.innerHTML='<div class="card"><p>Загрузка...</p></div>'}function f(e){e==="setup"||e==="pinSetup"?x():e==="unlock"?h():e==="profile"?E?w(E):A():e==="settings"&&K()}document.addEventListener("DOMContentLoaded",z);
//# sourceMappingURL=popup.js.map
