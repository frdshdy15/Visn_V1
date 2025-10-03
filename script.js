// ===============================
// [VISN_V1 CORE SCRIPT]
// Fungsi: 1. Sidebar Toggle, 2. AI Vision (COCO-SSD), 3. Speech Synthesis, 4. Motivasi, 5. Reveal on Scroll.
// ===============================

/* -------------------------------------
   [1. SIDEBAR & NAVIGATION]
   Mengatur interaksi menu toggle dan animasi reveal saat scroll.
   ------------------------------------- */

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const navLinks = document.querySelectorAll('#sidebar nav a');

// KETERANGAN FUNGSI: Toggle Sidebar
menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("active");
  // Optional: Getar haptic feedback (Mobile only)
  if ('vibrate' in navigator) navigator.vibrate(50);
});

// KETERANGAN FUNGSI: Tutup Sidebar saat Link diklik
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        // Cek jika sidebar aktif, tutup setelah navigasi
        if (sidebar.classList.contains('active')) {
            // Berikan sedikit delay agar transisi scroll terlihat
            setTimeout(() => {
                sidebar.classList.remove('active');
            }, 300);
        }
    });
});


// KETERANGAN FUNGSI: Reveal on Scroll (Animasi saat elemen masuk viewport)
function revealOnScroll() {
    const reveals = document.querySelectorAll(".reveal");
    
    for (let i = 0; i < reveals.length; i++) {
        const windowHeight = window.innerHeight;
        // Jarak dari atas (top) viewport
        const elementTop = reveals[i].getBoundingClientRect().top;
        const revealPoint = 150; // Jarak trigger (150px dari bawah viewport)

        if (elementTop < windowHeight - revealPoint) {
            reveals[i].classList.add("active");
        } else {
            // Opsional: Hapus kelas 'active' saat elemen keluar viewport
            reveals[i].classList.remove("active");
        }
    }
}
window.addEventListener("scroll", revealOnScroll);
// Jalankan sekali saat load untuk elemen di awal
window.addEventListener("load", revealOnScroll);


/* -------------------------------------
   [2. CORE AI VISION: COCO-SSD & SPEECH]
   Semua logika AI (deteksi, kamera, speech) dipertahankan 100% dari prototipe.
   ------------------------------------- */

// Elemen DOM
const video = document.getElementById("video");
const output = document.getElementById("output");
const distanceEl = document.getElementById("distance");
const toggleCameraBtn = document.getElementById("toggleCamera");
const switchCameraBtn = document.getElementById("switchCamera");

// Label COCO -> Bahasa Indonesia (SAMA PERSIS)
const labelMap = {
  "person":"manusia","bicycle":"sepeda","car":"mobil","motorcycle":"motor","bus":"bus","train":"kereta",
  "truck":"truk","boat":"perahu","traffic light":"lampu lalu lintas","stop sign":"rambu berhenti","parking meter":"meter parkir","bench":"bangku",
  "bird":"burung","cat":"kucing","dog":"anjing","horse":"kuda","sheep":"domba","cow":"sapi","elephant":"gajah","bear":"beruang","zebra":"zebra","giraffe":"jerapah",
  "chair":"kursi","couch":"sofa","potted plant":"tanaman hias","bed":"tempat tidur","dining table":"meja makan","toilet":"toilet","desk":"meja","wardrobe":"lemari","cabinet":"lemari kabinet","bookshelf":"rak buku","lamp":"lampu",
  "tv":"TV","laptop":"laptop","mouse":"mouse","remote":"remote","keyboard":"keyboard","cell phone":"telepon genggam","microwave":"microwave","oven":"oven","toaster":"pemanggang roti","sink":"wastafel","refrigerator":"kulkas","fan":"kipas","hair drier":"pengering rambut","toothbrush":"sikat gigi",
  "bottle":"botol","wine glass":"gelas anggur","cup":"cangkir","fork":"garpu","knife":"pisau","spoon":"sendok","bowl":"mangkuk","banana":"pisang","apple":"apel","sandwich":"roti lapis","orange":"jeruk","broccoli":"brokoli","carrot":"wortel","hot dog":"hotdog","pizza":"pizza","donut":"donat","cake":"kue",
  "frisbee":"frisbee","skis":"ski","snowboard":"snowboard","sports ball":"bola","kite":"layang-layang","baseball bat":"tongkat baseball","baseball glove":"sarung tangan baseball","skateboard":"skateboard","surfboard":"papan selancar","tennis racket":"raket tenis",
  "backpack":"tas ransel","umbrella":"payung","handbag":"tas tangan","tie":"dasi","suitcase":"koper","teddy bear":"boneka beruang","book":"buku"
};

// State kamera & model
let stream = null;
let model = null;
let detectionRunning = false;
let lastDetectTime = 0;
const DETECT_INTERVAL = 1000; // ms - throttle deteksi (1 detik)
let useBackCamera = true; // default: kamera belakang

// Speech handling (Dipertahankan 100% untuk menghindari spam suara)
let isSpeaking = false;
let pendingUtteranceText = null;
let lastSpokenText = "";
let lastSpokenTime = 0;

// KETERANGAN FUNGSI: Konversi Angka ke Teks (untuk pembacaan jarak)
function angkaKeTeks(angka) {
  const satuan = ["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan"];
  const belasan = ["sepuluh","sebelas","dua belas","tiga belas","empat belas","lima belas","enam belas","tujuh belas","delapan belas","sembilan belas"];
  const puluhan = ["","","dua puluh","tiga puluh","empat puluh","lima puluh","enam puluh","tujuh puluh","delapan puluh","sembilan puluh"];
  if (angka < 10) return satuan[angka];
  else if (angka < 20) return belasan[angka - 10];
  else if (angka < 100) {
    let sisa = angka % 10;
    return puluhan[Math.floor(angka / 10)] + (sisa ? " " + satuan[sisa] : "");
  } else {
    let sisa = angka % 100;
    return satuan[Math.floor(angka / 100)] + " ratus" + (sisa ? " " + angkaKeTeks(sisa) : "");
  }
}

// KETERANGAN FUNGSI: Fungsi Bicara dengan Queue (Tidak memotong suara yang sedang aktif)
function speakQueued(text) {
  const now = Date.now();
  if (text === lastSpokenText && (now - lastSpokenTime) < 3000) return;
  if (!("speechSynthesis" in window)) return;
  if (isSpeaking) {
    pendingUtteranceText = text;
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "id-ID";
  u.rate = 1.0;
  u.pitch = 1.0;
  u.onstart = () => { isSpeaking = true; };
  u.onend = () => {
    isSpeaking = false;
    lastSpokenText = text;
    lastSpokenTime = Date.now();
    if (pendingUtteranceText) {
      const next = pendingUtteranceText;
      pendingUtteranceText = null;
      setTimeout(() => speakQueued(next), 300);
    }
  };
  window.speechSynthesis.speak(u);
}

// KETERANGAN FUNGSI: Helper untuk getUserMedia (kamera)
function getUserMediaCompat(constraints) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }
  const older = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (older) {
    return new Promise((resolve, reject) => older.call(navigator, constraints, resolve, reject));
  }
  return Promise.reject(new Error("getUserMedia tidak tersedia (butuh HTTPS di mobile)."));
}

// KETERANGAN FUNGSI: Memulai Kamera
async function startCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      output.innerText = "Browser tidak mendukung kamera (butuh HTTPS di mobile).";
      return;
    }
    const facing = useBackCamera ? "environment" : "user";
    const constraints = { video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false };
    
    try {
      stream = await getUserMediaCompat(constraints);
    } catch (e) {
      // Fallback untuk perangkat yang menolak constraints kompleks
      stream = await getUserMediaCompat({ video: { facingMode: facing, width: 640, height: 480 } });
    }

    video.srcObject = stream;
    video.playsInline = true;
    await video.play();

    output.innerText = "Kamera aktif. Arahkan ke objek.";
    if (model && !detectionRunning) {
      detectionRunning = true;
      requestAnimationFrame(detectLoop);
    }
  } catch (err) {
    console.error("startCamera error:", err);
    output.innerText = "Kamera tidak bisa dibuka: " + (err && err.message ? err.message : "Izin ditolak atau tidak ada kamera.");
  }
}

// KETERANGAN FUNGSI: Menghentikan Kamera
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  if (video) {
    video.srcObject = null;
  }
  detectionRunning = false;
  output.innerText = "Kamera dimatikan.";
  if (distanceEl) distanceEl.innerText = "";
}

// KETERANGAN FUNGSI: Listener Toggle Kamera
if (toggleCameraBtn) {
  toggleCameraBtn.addEventListener("click", () => {
    if (stream) {
      stopCamera();
      toggleCameraBtn.innerText = "Nyalakan Kamera";
    } else {
      startCamera();
      toggleCameraBtn.innerText = "Matikan Kamera";
    }
  });
}

// KETERANGAN FUNGSI: Listener Switch Kamera (Depan/Belakang)
if (switchCameraBtn) {
  switchCameraBtn.addEventListener("click", async () => {
    useBackCamera = !useBackCamera;
    if (stream) {
      stopCamera();
      setTimeout(() => {
        startCamera();
        toggleCameraBtn && (toggleCameraBtn.innerText = "Matikan Kamera");
      }, 250);
    }
    switchCameraBtn.innerText = useBackCamera ? "Kamera Belakang" : "Kamera Depan";
    // Optional: Getar haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(100);
  });
  // Update label saat load
  switchCameraBtn.innerText = useBackCamera ? "Kamera Belakang" : "Kamera Depan";
}

// KETERANGAN FUNGSI: Memuat Model COCO-SSD
cocoSsd.load().then(m => {
  model = m;
  output.innerText = "Model AI siap. Tekan 'Nyalakan Kamera'.";
  if (stream && !detectionRunning) {
    detectionRunning = true;
    requestAnimationFrame(detectLoop);
  }
}).catch(err => {
  console.error("Gagal memuat model:", err);
  output.innerText = "Gagal memuat model AI: Cek koneksi internet.";
});

// KETERANGAN FUNGSI: Loop Deteksi (Throttled)
async function detectLoop() {
  if (!detectionRunning) return;
  if (!model) {
    requestAnimationFrame(detectLoop);
    return;
  }
  const now = Date.now();
  // Throttling deteksi
  if (now - lastDetectTime < DETECT_INTERVAL) {
    requestAnimationFrame(detectLoop);
    return;
  }
  lastDetectTime = now;

  try {
    if (!video || !video.srcObject || video.paused || video.ended) {
      requestAnimationFrame(detectLoop);
      return;
    }

    const predictions = await model.detect(video);

    if (predictions && predictions.length > 0) {
      const obj = predictions[0];
      const namaObj = labelMap[obj.class] || obj.class;
      const persen = Math.round(obj.score * 100);

      // Estimasi Jarak (Algoritma sederhana)
      const tinggi = obj.bbox[3] || 0;
      let jarakCm = tinggi > 0 ? Math.round(490 / tinggi) : 0;
      if (jarakCm <= 0) jarakCm = 1;

      // Update Teks
      if (output) output.innerText = "👁‍ Terdeteksi: " + namaObj + " (" + persen + "%)";
      if (distanceEl) distanceEl.innerText = "📡 Perkiraan jarak: " + jarakCm + " LANGKAH";

      // Bicara
      if (obj.score > 0.5) {
        const jarakText = angkaKeTeks(Math.min(jarakCm, 999));
        const teks = "Ada " + namaObj + " di depan, jaraknya sekitar " + jarakText + " langkah";
        speakQueued(teks);
      }
    } else {
      if (output) output.innerText = "Tidak ada objek terdeteksi";
      if (distanceEl) distanceEl.innerText = "";
    }
  } catch (err) {
    console.error("Error detect:", err);
  }

  requestAnimationFrame(detectLoop);
}


/* -------------------------------------
   [3. FUNGSI HIBURAN/MOTIVASI]
   Fungsi acak untuk section "Fun".
   ------------------------------------- */

const motivasiList = [
    "Jalan seribu langkah dimulai dari langkah pertama. AI ini adalah langkah menuju kesejahteraan.",
    "Keterbatasan bukanlah penghalang, tapi tantangan untuk berinovasi.",
    "Di balik setiap error, ada harapan. Jangan pernah berhenti percaya pada potensi diri Anda.",
    "Inovasi eknologi dibuat untuk melampaui apa yang orang lain anggap mustahil.",
    "Bukan hanya melihat dunia, tapi merasakannya. Itulah esensi dari inovasi yang sesungguhnya.",
    "Kegagalan hari ini adalah data pelatihan untuk kesuksesan hari esok. Tetap semangat!",
    "Visn_v1 hanyalah alat; Kekuatan sejati ada pada fahry bot.",
    "Udah yappingnya?."
];

// KETERANGAN FUNGSI: Menampilkan Motivasi Acak
window.showMotivation = function() {
    const motivasiEl = document.getElementById("motivation");
    if (motivasiEl) {
        // Hapus kelas 'active' untuk reset animasi
        motivasiEl.classList.remove('fade-in-motivation');
        // Tambahkan kembali setelah delay untuk memicu ulang animasi CSS
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * motivasiList.length);
            motivasiEl.innerText = motivasiList[randomIndex];
            motivasiEl.classList.add('fade-in-motivation');
            
             // Optional: Bicara motivasi
            speakQueued(motivasiList[randomIndex]);
        }, 10);
    }
}


/* -------------------------------------
   [4. EFEK PARTIKEL DI HERO SECTION]
   Memberikan efek visual 3D yang lebih dinamis.
   ------------------------------------- */
try {
  const canvas = document.getElementById("hero-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      // Ambil tinggi section hero
      canvas.height = document.getElementById("home").offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let partikel = [];
    // 200 partikel untuk efek yang lebih padat
    for (let i = 0; i < 200; i++) {
      partikel.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 4 + 1, // Radius lebih besar
        dx: (Math.random() - 0.5) * 1, // Kecepatan lebih tinggi
        dy: (Math.random() - 0.5) * 1,
        opacity: Math.random() * 0.4 + 0.1,
        color: i % 2 === 0 ? "rgba(56,221,248," : "rgba(255,0,255," // Warna bergantian
      });
    }

    function animasiPartikel() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      partikel.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Gunakan warna bergantian dengan opacity dinamis
        ctx.fillStyle = p.color + p.opacity + ")";
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color + "0.8)";
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        // Pindah ke sisi lain jika keluar batas
        if (p.x > canvas.width + p.r) p.x = -p.r;
        if (p.x < -p.r) p.x = canvas.width + p.r;
        if (p.y > canvas.height + p.r) p.y = -p.r;
        if (p.y < -p.r) p.y = canvas.height + p.r;
      });
      requestAnimationFrame(animasiPartikel);
    }
    animasiPartikel();
  }
} catch (e) {
  console.error("Partikel Hero Error:", e);
}

/* -------------------------------------
   [BARU: INTRO SCREEN LOGIC]
   Menutup intro screen dengan klik/tap
   ------------------------------------- */
const introScreen = document.getElementById('introScreen');
let introReady = false;
let userInteracted = false;

// KETERANGAN FUNGSI: Waktu tunggu setelah animasi loading (4.5s)
// Setelah waktu ini, intro siap ditutup.
setTimeout(() => {
    introReady = true;
    document.querySelector('.tap-start').style.opacity = '1';
    // Jika user sudah berinteraksi sebelum ready, tutup segera.
    if (userInteracted) {
        hideIntro();
    }
}, 4500); 

// KETERANGAN FUNGSI: Fungsi untuk menyembunyikan intro screen
function hideIntro() {
    // Hanya tutup jika sudah 'ready'
    if (introReady) {
        introScreen.classList.add('fade-out');
        // Hapus listener setelah fade-out selesai (1.5s + 500ms buffer)
        setTimeout(() => {
            introScreen.removeEventListener('click', handleInteraction);
            introScreen.removeEventListener('touchstart', handleInteraction);
            if (introScreen.parentNode) {
                introScreen.parentNode.removeChild(introScreen);
            }
        }, 2000); 
    }
}

// KETERANGAN FUNGSI: Handler untuk interaksi user
function handleInteraction() {
    userInteracted = true;
    if (introReady) {
        // Jika sudah ready, langsung panggil hideIntro
        hideIntro();
    }
    // Jika belum ready, userInteracted akan membuat intro segera tertutup setelah ready.
}

// KETERANGAN FUNGSI: Tambahkan listener untuk click (desktop) dan touchstart (mobile)
// Listener dipasang segera, tapi hideIntro hanya berjalan jika introReady=true
introScreen.addEventListener('click', handleInteraction);
introScreen.addEventListener('touchstart', handleInteraction);


// ... (Lanjutkan dengan kode JavaScript lainnya seperti startCamera, detectLoop, dll.)
// ===============================
// [AKHIR FILE SCRIPT.JS]
// ===============================
