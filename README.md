Cara Kerja Singkat
	1.	Kamera diaktifkan lewat browser (izin akses diperlukan).
	2.	Model COCO-SSD memproses setiap frame video.
	3.	Jika objek terdeteksi, sistem menampilkan nama objek dan memperkirakan jarak berdasarkan ukuran bounding box.
	4.	Sistem juga bisa memberikan peringatan suara dalam Bahasa Indonesia.
	5.	Semua dijalankan langsung di browser — tanpa server tambahan.


Teknologi yang Digunakan
	•	HTML + CSS → Untuk tampilan dan struktur halaman web
	•	JavaScript (TensorFlow.js + COCO-SSD) → Untuk deteksi objek secara real-time
	•	Voice API (Browser SpeechSynthesis) → Untuk memberikan peringatan suara
	•	GitHub Pages → Untuk men-deploy dan berbagi hasil secara publik

Project ini awalnya saya tulis di VS Code, lalu di-host menggunakan GitHub Pages agar bisa dibuka di berbagai perangkat tanpa instalasi tambahan.
Masih banyak kekurangan dari sisi tampilan, optimasi deteksi, dan suara — tapi project ini jadi langkah awal saya untuk mengenal dunia AI secara nyata.
  
