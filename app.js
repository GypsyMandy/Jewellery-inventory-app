
const $=id=>document.getElementById(id);
const CONFIG_KEY="jewelry-vault-config",DEMO_KEY="jewelry-vault-demo-items";
let client=null,user=null,items=[],pendingFiles=[],existingPhotos=[],demoMode=false,activeCategory="";
const categoryNames={N:"Necklace",C:"Chain",B:"Bracelet",E:"Earrings",P:"Pendant",R:"Ring",W:"Watch"};
const fieldMap={
  weightGrams:"weight_grams",storageLocation:"storage_location",
  listingPlatform:"listing_platform",listingUrl:"listing_url",
  listingTitle:"listing_title",listingDescription:"listing_description"
};
const fields=["description","designer","status","material","stones","length","width","weightGrams","hallmarks","price","condition","storageLocation","listingPlatform","listingUrl","notes","listingTitle","listingDescription","keywords"];

function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function getConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||"null")}catch{return null}}
function show(id){["setupPanel","authPanel","appPanel"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function nextNumber(code){return Math.max(0,...items.filter(i=>i.category_code===code).map(i=>Number(i.inventory_number)||0))+1}
function syncCode(){$("inventoryCode").value=`${$("categoryCode").value}${$("inventoryNumber").value||""}`}

async function boot(){
  const c=getConfig();
  if(!c){show("setupPanel");return}
  if(c.demo){demoMode=true;show("appPanel");loadDemo();return}
  client=supabase.createClient(c.url,c.key);
  const {data}=await client.auth.getSession();
  if(data.session){user=data.session.user;show("appPanel");await loadItems()}else show("authPanel");
}
function loadDemo(){items=JSON.parse(localStorage.getItem(DEMO_KEY)||"[]");render()}
async function loadItems(){
  const {data,error}=await client.from("jewelry_items").select("*").order("category_code").order("inventory_number");
  if(error){toast(error.message);return}
  items=data||[];render()
}
function filtered(){
  const q=$("searchInput").value.toLowerCase(),st=$("statusFilter").value;
  return items.filter(i=>(!activeCategory||i.category_code===activeCategory)&&(!st||i.status===st)&&(!q||JSON.stringify(i).toLowerCase().includes(q)))
}
function render(){
  $("totalCount").textContent=items.length;
  $("photoMissingCount").textContent=items.filter(i=>!i.photos?.length).length;
  $("listedCount").textContent=items.filter(i=>i.status==="Listed").length;
  $("soldCount").textContent=items.filter(i=>i.status==="Sold").length;
  const list=filtered();
  $("emptyState").classList.toggle("hidden",list.length>0);
  $("itemGrid").innerHTML="";
  list.forEach(i=>{
    const card=document.createElement("article");card.className="item-card";
    const photo=i.photos?.[0]?.url;
    card.innerHTML=`<div class="item-photo">${photo?`<img src="${esc(photo)}">`:`<span class="placeholder-gem">◇</span>`}</div>
    <div class="card-body"><div class="card-top"><span class="code">${esc(i.inventory_code)}</span><span class="badge">${esc(i.status||"")}</span></div>
    <h3>${esc(i.designer||categoryNames[i.category_code])}</h3>
    <div class="meta">${esc([i.material,i.stones,i.weight_grams?i.weight_grams+" g":""].filter(Boolean).join(" · "))}</div>
    ${i.price?`<div class="price">$${Number(i.price).toLocaleString()}</div>`:""}</div>`;
    card.onclick=()=>openItem(i);
    $("itemGrid").appendChild(card);
  })
}
function clearForm(){
  $("itemForm").reset();$("itemId").value="";
  $("categoryCode").value=activeCategory||"N";
  $("inventoryNumber").value=nextNumber($("categoryCode").value);
  $("status").value="Needs photos";syncCode();
  pendingFiles=[];existingPhotos=[];$("photoPreview").innerHTML="";
  $("deleteBtn").classList.add("hidden");
}
function openNew(){clearForm();$("dialogTitle").textContent="Add piece";$("itemDialog").showModal()}
function openItem(i){
  clearForm();$("dialogTitle").textContent=i.inventory_code;$("itemId").value=i.id;
  $("categoryCode").value=i.category_code;$("inventoryNumber").value=i.inventory_number;syncCode();
  fields.forEach(f=>$(f).value=i[fieldMap[f]||f]??"");
  existingPhotos=i.photos||[];renderPhotos();$("deleteBtn").classList.remove("hidden");$("itemDialog").showModal();
}
function renderPhotos(){
  $("photoPreview").innerHTML="";
  existingPhotos.forEach((p,idx)=>addThumb(p.url,()=>{existingPhotos.splice(idx,1);renderPhotos()}));
  pendingFiles.forEach((f,idx)=>addThumb(URL.createObjectURL(f),()=>{pendingFiles.splice(idx,1);renderPhotos()}));
}
function addThumb(src,remove){
  const d=document.createElement("div");d.className="photo-thumb";
  d.innerHTML=`<img src="${src}"><button type="button">×</button>`;
  d.querySelector("button").onclick=remove;$("photoPreview").appendChild(d);
}
function makePayload(){
  const p={category_code:$("categoryCode").value,inventory_number:Number($("inventoryNumber").value),inventory_code:$("inventoryCode").value,photos:existingPhotos};
  fields.forEach(f=>{
    let v=$(f).value.trim();
    if(["weightGrams","price"].includes(f))v=v?Number(v):null;
    p[fieldMap[f]||f]=v||null;
  });
  return p;
}
async function uploadPhotos(itemId){
  if(demoMode){
    return pendingFiles.map(f=>({name:f.name,url:URL.createObjectURL(f),path:"demo"}));
  }
  const uploaded=[];
  for(const file of pendingFiles){
    const ext=file.name.split(".").pop()||"jpg";
    const path=`${user.id}/${itemId}/${crypto.randomUUID()}.${ext}`;
    const {error}=await client.storage.from("jewelry-photos").upload(path,file);
    if(error)throw error;
    const {data}=client.storage.from("jewelry-photos").getPublicUrl(path);
    uploaded.push({name:file.name,url:data.publicUrl,path});
  }
  return uploaded;
}
async function saveItem(e){
  e.preventDefault();
  const p=makePayload(),id=$("itemId").value;
  if(!p.description){toast("Description is required");$("description").focus();return;}
  if(items.some(i=>i.inventory_code===p.inventory_code&&String(i.id)!==String(id))){toast("That inventory code already exists");return}
  try{
    if(demoMode){
      const record={...p,id:id||crypto.randomUUID()};
      record.photos=[...existingPhotos,...await uploadPhotos(record.id)];
      const idx=items.findIndex(i=>String(i.id)===String(id));
      if(idx>=0)items[idx]=record;else items.push(record);
      localStorage.setItem(DEMO_KEY,JSON.stringify(items));render();$("itemDialog").close();toast("Saved");
      return;
    }
    let itemId=id;
    if(id){
      const {error}=await client.from("jewelry_items").update(p).eq("id",id);if(error)throw error;
    }else{
      p.user_id=user.id;
      const {data,error}=await client.from("jewelry_items").insert(p).select().single();if(error)throw error;itemId=data.id;
    }
    const uploaded=await uploadPhotos(itemId);
    if(uploaded.length){
      const photos=[...existingPhotos,...uploaded];
      const {error}=await client.from("jewelry_items").update({photos}).eq("id",itemId);if(error)throw error;
    }
    await loadItems();$("itemDialog").close();toast("Saved");
  }catch(err){toast(err.message||"Could not save")}
}
async function deleteItem(){
  const id=$("itemId").value;if(!id)return;
  if(!confirm("Delete this jewelry record?"))return;
  if(demoMode){items=items.filter(i=>String(i.id)!==String(id));localStorage.setItem(DEMO_KEY,JSON.stringify(items));render()}
  else{const {error}=await client.from("jewelry_items").delete().eq("id",id);if(error){toast(error.message);return}await loadItems()}
  $("itemDialog").close();toast("Deleted");
}
function generateListing(){
  const code=$("inventoryCode").value;
  const designer=$("designer").value;
  const material=$("material").value;
  const stones=$("stones").value;
  const kind=categoryNames[$("categoryCode").value];
  const description=$("description").value;
  $("listingTitle").value=[designer,material,stones,kind].filter(Boolean).join(" ").slice(0,140);
  $("listingDescription").value=`${description||[designer,material,stones,kind].filter(Boolean).join(" ")}.

Inventory code: ${code}
Designer / maker: ${designer||"Not identified"}
Material: ${material||"Not recorded"}
Stone: ${stones||"None recorded"}
Length: ${$("length").value||"Not recorded"}
Width: ${$("width").value||"Not recorded"}
Weight: ${$("weightGrams").value||"Not recorded"} g
Hallmark: ${$("hallmarks").value||"Not recorded"}
Condition: ${$("condition").value||"See photos and notes"}
Price: ${$("price").value?`$${$("price").value}`:"Not set"}

Special notes: ${$("notes").value||"None"}`.trim();
  $("keywords").value=[designer,material,stones,kind,"vintage jewelry","fine jewelry"].filter(Boolean).join(", ");
}
function exportCSV(){
  const cols=["inventory_code","category_code","inventory_number","description","designer","status","material","stones","length","width","weight_grams","hallmarks","notes","price","condition","storage_location","listing_platform","listing_url"];
  const csv=[cols.join(","),...items.map(i=>cols.map(c=>`"${String(i[c]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="jewelry-inventory.csv";a.click();
}

$("saveConfigBtn").onclick=()=>{localStorage.setItem(CONFIG_KEY,JSON.stringify({url:$("supabaseUrl").value.trim(),key:$("supabaseKey").value.trim()}));location.reload()}
$("demoModeBtn").onclick=()=>{localStorage.setItem(CONFIG_KEY,JSON.stringify({demo:true}));location.reload()}
$("signInBtn").onclick=async()=>{const {error}=await client.auth.signInWithPassword({email:$("emailInput").value,password:$("passwordInput").value});if(error)toast(error.message);else location.reload()}
$("signUpBtn").onclick=async()=>{const {error}=await client.auth.signUp({email:$("emailInput").value,password:$("passwordInput").value});toast(error?error.message:"Account created. Check your email if confirmation is required.")}
$("signOutBtn").onclick=async()=>{if(!demoMode)await client.auth.signOut();location.reload()}
$("settingsBtn").onclick=()=>{localStorage.removeItem(CONFIG_KEY);location.reload()}
$("newItemBtn").onclick=openNew;$("emptyAddBtn").onclick=openNew;
$("closeDialogBtn").onclick=()=>$("itemDialog").close();$("cancelBtn").onclick=()=>$("itemDialog").close();
$("categoryCode").onchange=()=>{$("inventoryNumber").value=nextNumber($("categoryCode").value);syncCode()}
$("inventoryNumber").oninput=syncCode;$("photoInput").onchange=e=>{pendingFiles=[...pendingFiles,...e.target.files];renderPhotos()}
$("itemForm").onsubmit=saveItem;$("deleteBtn").onclick=deleteItem;$("generateListingBtn").onclick=generateListing;
$("searchInput").oninput=render;$("statusFilter").onchange=render;$("exportBtn").onclick=exportCSV;
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeCategory=b.dataset.category;render()});
boot();
