// ---------------------------
// Sample movie dataset
// Replace image & urls with your real content
// ---------------------------
const trendingMovies = [
  {
    id: "bigbuck",
    title: "Big Buck Bunny",
    image: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    id: "flower",
    title: "Flower (short)",
    image: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.jpg",
    streamurl: "https://interactive-examples.mnd.mozilla.net/media/cc0-videos/flower.mp4"
  },
  {  
      id: "sintel",
    title: "Sintel",
    image: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
  }
];

const hollywoodMovies = [
  {
    id: "bunny-small",
    title: "Tropical Sample",
    image: "https://via.placeholder.com/240x320?text=Movie",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
  },
];

// DOM refs
const trendingContainer = document.getElementById("trending-movies");
const hollywoodContainer = document.getElementById("hollywood-movies");
const playerModal = document.getElementById("player-modal");
const videoPlayer = document.getElementById("video-player");
const closePlayerBtn = document.getElementById("close-player");
const playerDownloadBtn = document.getElementById("player-download");
const playerFullscreenBtn = document.getElementById("player-fullscreen");
const bannerDownloadBtn = document.getElementById("banner-download");
const downloadsPanel = document.getElementById("downloads-panel");
const downloadsList = document.getElementById("downloads-list");
const openDownloadsBtn = document.getElementById("open-downloads");
const closeDownloadsBtn = document.getElementById("close-downloads");


// In-memory map of downloads
const downloads = new Map();

// populate UI
function makeMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie";
  card.innerHTML = `
    <img class="card-img" src="${movie.image}" alt="${escapeHtml(movie.title)}">
    <div class="meta">
      <div class="title">${escapeHtml(movie.title)}</div>
      <div class="actions">
        <button class="small-btn btn-stream">▶ Stream</button>
        <button class="small-btn btn-download">⬇ Download</button>
      </div>
</div>
  `;
  // wire buttons
  card.querySelector(".btn-stream").addEventListener("click", () => openPlayer(movie));
  card.querySelector(".btn-download").addEventListener("click", () => startDownload(movie));
  return card;
}

function loadAllMovies() {
  trendingContainer.innerHTML = "";
  hollywoodContainer.innerHTML = "";
  trendingMovies.forEach(m => trendingContainer.appendChild(makeMovieCard(m)));
  hollywoodMovies.forEach(m => hollywoodContainer.appendChild(makeMovieCard(m)));


  // banner uses first trending movie
  const bannerImg = document.getElementById("banner-img");
  bannerImg.src = trendingMovies[0].image;
  bannerDownloadBtn.onclick = () => startDownload(trendingMovies[0]);
}

// open player modal and load source
function openPlayer(movie) {
  playerModal.classList.remove("hidden");
  videoPlayer.src = movie.streamUrl;
  videoPlayer.poster = movie.image || "";
  videoPlayer.play().catch(()=>{ /* play may be blocked until user interacts */ });
  playerDownloadBtn.onclick = () => startDownload(movie);
  playerFullscreenBtn.onclick = () => {
if (videoPlayer.requestFullscreen) videoPlayer.requestFullscreen();
    else if (videoPlayer.webkitEnterFullscreen) videoPlayer.webkitEnterFullscreen();
  };
}

// close player
closePlayerBtn.addEventListener("click", () => {
  videoPlayer.pause();
  videoPlayer.src = "";
  playerModal.classList.add("hidden");
});

// naive search
document.getElementById("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  filterRows(q);
});

function filterRows(query) {
  function filter(container, list) {
    container.innerHTML = "";
    list.filter(m => m.title.toLowerCase().includes(query)).forEach(m => container.appendChild(makeMovieCard(m)));
  }
  filter(trendingContainer, trendingMovies);
  filter(hollywoodContainer, hollywoodMovies);
}

// -------------------------
async function startDownload(movie) {
  const id = movie.id || movie.title;
  if (downloads.has(id)) {
    alert("Download already in progress or completed for: " + movie.title);
    return;
  }

  const dl = {
    id,
    title: movie.title,
    url: movie.streamUrl,
    progress: 0,
    status: "starting",
    controller: new AbortController()
  };
downloads.set(id, dl);
  renderDownloads();

  try {
    dl.status = "connecting";
    renderDownloads();

    const response = await fetch(movie.streamUrl, { signal: dl.controller.signal });
    if (!response.ok) throw new Error("Network response was not ok");

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : null;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

dl.status = "downloading";
    renderDownloads();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) {
        dl.progress = Math.round((received / total) * 100);
      } else {
        // if total unknown do a simple growing progress
        dl.progress = Math.min(99, dl.progress + 5);
      }
      renderDownloads();
    }

    // assemble blob
    dl.status = "finalizing";
    renderDownloads();

    const blob = new Blob(chunks, { type: "video/mp4" });
    const filename = sanitizeFilename(movie.title) + ".mp4";
    triggerSave(blob, filename);

    dl.progress = 100;
    dl.status = "completed";
    renderDownloads();
    alert("Saved: " + filename);
  } catch (err) {
    if (err.name === "AbortError") {
      dl.status = "cancelled";
    } else {
dl.status = "error";
      console.error("Download error", err);
      alert("Download failed: " + (err.message || err));
    }
    renderDownloads();
  }
}

// helper to trigger file save (creates temporary anchor)
function triggerSave(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
a.remove();
  // release URL after short delay
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

// small helpers
function sanitizeFilename(name){
  return name.replace(/[^a-z0-9_\-\. ]/gi,'').trim().replace(/\s+/g,'_');
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}

// render downloads side panel
function renderDownloads(){
  downloadsList.innerHTML = "";
  downloads.forEach(dl => {
    const item = document.createElement("div");
    item.className = "download-item";
    item.innerHTML = `
      <div style="width:52px;height:52px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px">${dl.title[0]||'M'}</div>
      <div style="flex:1">
        <div class="di-title">${escapeHtml(dl.title)}</div>
        <div style="font-size:12px;color:#666">${dl.status} ${dl.progress?("· "+dl.progress+"%"):""}</div>
        <div class="progress-bar"><div class="progress-inner" style="width:${dl.progress||0}%"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-left:8px">
        ${dl.status === 'downloading' ? `<button data-action="cancel" data-id="${dl.id}">Cancel</button>` : ''}
        ${dl.status === 'completed' ? `<button data-action="remove" data-id="${dl.id}">Remove</button>` : ''}
      </div>
    `;
downloadsList.appendChild(item);
  });

  // wire cancel/remove buttons
  downloadsList.querySelectorAll("button").forEach(btn=>{
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    btn.onclick = ()=>{
      if(action === "cancel"){
        const d = downloads.get(id);
        if(d && d.controller) d.controller.abort();
      } else if(action === "remove"){
        downloads.delete(id);
        renderDownloads();
      }
};
  });
}

// open/close downloads panel
openDownloadsBtn.addEventListener("click", ()=> {
  downloadsPanel.style.display = "block";
});
closeDownloadsBtn.addEventListener("click", ()=> {
  downloadsPanel.style.display = "none";
});

// on load
document.addEventListener("DOMContentLoaded", () => {
  loadAllMovies();
  downloadsPanel.style.display = "none"; // hide initially
});

// bottom nav home
document.getElementById("home-btn").addEventListener("click", ()=>{
  window.scrollTo({top:0,behavior:'smooth'});
});

// small sanitize: remove any inline event default usage
document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click", (e)=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    // simple content switch example:
    const name = tab.dataset.tab;
    // you can implement filtering by category here
    // for demo we simply scroll to top and set banner title
    window.scrollTo({top:0,behavior:'smooth'});
  });
});