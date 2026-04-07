const r="http://localhost:5000".replace(/\/+$/,""),s=t=>t?t.startsWith("http://")||t.startsWith("https://")?t:`${r}${t.startsWith("/")?t:`/${t}`}`:r;export{s as b};
