/**
 * =========================================================================
 * SMART LEARNING HUB — GOOGLE APPS SCRIPT API
 * Google Drive Upload Handler & Supabase-to-Google Spreadsheet Backup
 * =========================================================================
 * 
 * Petunjuk Singkat:
 * 1. Buka https://script.google.com
 * 2. Buat "New project", beri nama "Smart Learning Hub API"
 * 3. Hapus kode default di Code.gs, lalu paste seluruh isi file ini
 * 4. (Opsional) Masukkan ID Folder Drive & ID Spreadsheet di variabel di bawah
 * 5. Klik "Deploy" -> "New deployment" -> Pilih tipe "Web app"
 * 6. Set "Execute as: Me" dan "Who has access: Anyone"
 * 7. Salin URL Web App yang dihasilkan (akhiran /exec) dan tempel di portal!
 */

// Konfigurasi Standar (Bisa dikosongkan, script akan otomatis membuat folder/spreadsheet baru jika belum ada)
var DEFAULT_FOLDER_NAME = "SmartLearningHub_Uploads";
var DEFAULT_SPREADSHEET_NAME = "Smart_Learning_Hub_Backup_Akademik";

/**
 * Handle GET requests (Health Check)
 */
function doGet(e) {
  var response = {
    status: "ok",
    service: "Smart Learning Hub — Google Drive & Sheets Bridge",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    message: "API Google Apps Script siap menerima berkas dan pencadangan data."
  };
  return createJsonResponse(response);
}

/**
 * Handle POST requests (Upload Berkas & Backup Spreadsheet)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        message: "Payload kosong. Pastikan mengirim data JSON yang valid."
      });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === "upload_file") {
      return handleFileUpload(payload);
    } else if (action === "backup_to_sheets") {
      return handleBackupToSheets(payload);
    } else if (action === "ping") {
      return createJsonResponse({
        success: true,
        message: "Koneksi ke Google Apps Script berhasil terverifikasi!",
        timestamp: new Date().toISOString()
      });
    } else {
      return createJsonResponse({
        success: false,
        message: "Aksi tidak dikenali: " + action
      });
    }
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString(),
      message: "Terjadi kesalahan pada server Google Apps Script: " + err.message
    });
  }
}

/**
 * 1. FUNGSI UPLOAD BERKAS KE GOOGLE DRIVE
 */
function handleFileUpload(data) {
  var fileName = data.fileName || ("Berkas_" + new Date().getTime());
  var mimeType = data.mimeType || "application/octet-stream";
  var base64Data = data.base64Data;
  var courseCode = data.courseCode || "UMUM";
  var category = data.category || "Tugas";
  var uploaderEmail = data.uploaderEmail || "anonim@mhs.ac.id";

  if (!base64Data) {
    return createJsonResponse({
      success: false,
      message: "Data berkas base64Data tidak ditemukan."
    });
  }

  // Bersihkan header Data URL jika ada (misal: "data:application/pdf;base64,...")
  if (base64Data.indexOf("base64,") !== -1) {
    base64Data = base64Data.split("base64,")[1];
  }

  // Dapatkan atau buat folder utama di Google Drive
  var rootFolder = getOrCreateFolder(DEFAULT_FOLDER_NAME);
  
  // Buat subfolder per mata kuliah & kategori agar Drive dosen tetap rapi
  var courseFolder = getOrCreateSubFolder(rootFolder, courseCode);
  var targetFolder = getOrCreateSubFolder(courseFolder, category);

  // Buat file dari base64 decode
  var decodedBytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
  var file = targetFolder.createFile(blob);

  // Set izin file agar bisa dilihat oleh Dosen & Mahasiswa via link
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Tambahkan keterangan/metadata pada file
  file.setDescription(
    "Diunggah melalui Smart Learning Hub\n" +
    "Pengunggah: " + uploaderEmail + "\n" +
    "Mata Kuliah: " + courseCode + "\n" +
    "Kategori: " + category + "\n" +
    "Waktu: " + new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
  );

  var viewUrl = file.getUrl();
  var downloadUrl = file.getDownloadUrl();

  return createJsonResponse({
    success: true,
    message: "Berkas berhasil diunggah ke Google Drive!",
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: viewUrl,
    downloadUrl: downloadUrl,
    sizeBytes: file.getSize(),
    folderName: targetFolder.getName(),
    uploadedAt: new Date().toISOString()
  });
}

/**
 * 2. FUNGSI BACKUP DATA KE GOOGLE SPREADSHEET
 */
function handleBackupToSheets(data) {
  var spreadsheetId = data.spreadsheetId;
  var ss;

  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    // Buat spreadsheet baru di root folder Drive
    ss = SpreadsheetApp.create(DEFAULT_SPREADSHEET_NAME + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss"));
    var rootFolder = getOrCreateFolder(DEFAULT_FOLDER_NAME);
    var driveFile = DriveApp.getFileById(ss.getId());
    driveFile.moveTo(rootFolder);
  }

  var timestampStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  // TAB 1: REKAP PRESENSI 16 PERTEMUAN
  if (data.attendanceRecap && data.attendanceRecap.length > 0) {
    var attSheet = getOrCreateSheet(ss, "Rekap Presensi");
    attSheet.clear();

    var attHeaders = [
      "No", "NIM", "Nama Mahasiswa", "Email", "Mata Kuliah",
      "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8 (UTS)",
      "P9", "P10", "P11", "P12", "P13", "P14", "P15", "P16 (UAS)",
      "Total Hadir", "Persentase (%)", "Status Kelayakan UAS"
    ];

    var attRows = [attHeaders];
    for (var i = 0; i < data.attendanceRecap.length; i++) {
      var item = data.attendanceRecap[i];
      var row = [
        i + 1,
        item.nim || "-",
        item.studentName || "-",
        item.studentEmail || "-",
        item.courseCode || "-",
        item.p1 || "-", item.p2 || "-", item.p3 || "-", item.p4 || "-",
        item.p5 || "-", item.p6 || "-", item.p7 || "-", item.p8 || "-",
        item.p9 || "-", item.p10 || "-", item.p11 || "-", item.p12 || "-",
        item.p13 || "-", item.p14 || "-", item.p15 || "-", item.p16 || "-",
        item.totalHadir || 0,
        (item.percentage || 0) + "%",
        (item.percentage >= 75) ? "LAYAK (>=75%)" : "PERINGATAN (<75%)"
      ];
      attRows.push(row);
    }

    attSheet.getRange(1, 1, attRows.length, attHeaders.length).setValues(attRows);
    styleHeaderRange(attSheet.getRange(1, 1, 1, attHeaders.length), "#1e3a8a");
    attSheet.autoResizeColumns(1, attHeaders.length);
  }

  // TAB 2: REKAP NILAI & SUBMISI TUGAS
  if (data.submissionsRecap && data.submissionsRecap.length > 0) {
    var subSheet = getOrCreateSheet(ss, "Rekap Nilai Tugas");
    subSheet.clear();

    var subHeaders = [
      "No", "Nama Mahasiswa", "Email", "Mata Kuliah", "Judul Tugas",
      "Waktu Pengumpulan", "Status Keterlambatan", "Nilai (0-100)",
      "Catatan / Umpan Balik Dosen", "Link Berkas Google Drive"
    ];

    var subRows = [subHeaders];
    for (var j = 0; j < data.submissionsRecap.length; j++) {
      var s = data.submissionsRecap[j];
      var sRow = [
        j + 1,
        s.studentName || "-",
        s.studentEmail || "-",
        s.courseCode || "-",
        s.assignmentTitle || "-",
        s.submittedAt || "-",
        s.isLate ? "TERLAMBAT" : "TEPAT WAKTU",
        s.grade !== undefined && s.grade !== null ? s.grade : "Belum Dinilai",
        s.feedback || "-",
        s.fileUrl || "-"
      ];
      subRows.push(sRow);
    }

    subSheet.getRange(1, 1, subRows.length, subHeaders.length).setValues(subRows);
    styleHeaderRange(subSheet.getRange(1, 1, 1, subHeaders.length), "#065f46");
    subSheet.autoResizeColumns(1, subHeaders.length);
  }

  // TAB 3: DAFTAR MAHASISWA TERDAFTAR (WHITELIST)
  if (data.studentsList && data.studentsList.length > 0) {
    var stdSheet = getOrCreateSheet(ss, "Daftar Mahasiswa");
    stdSheet.clear();

    var stdHeaders = ["No", "NIM", "Nama Lengkap", "Email Resmi Mahasiswa", "Kelas / Mata Kuliah", "Status Akun"];
    var stdRows = [stdHeaders];

    for (var k = 0; k < data.studentsList.length; k++) {
      var std = data.studentsList[k];
      stdRows.push([
        k + 1,
        std.nim || "-",
        std.name || "-",
        std.email || "-",
        std.enrolledCourses || "-",
        std.isRegistered ? "Terdaftar & Aktif" : "Menunggu Registrasi Akun"
      ]);
    }

    stdSheet.getRange(1, 1, stdRows.length, stdHeaders.length).setValues(stdRows);
    styleHeaderRange(stdSheet.getRange(1, 1, 1, stdHeaders.length), "#4338ca");
    stdSheet.autoResizeColumns(1, stdHeaders.length);
  }

  // TAB 4: LOG RIWAYAT PENCADANGAN
  var logSheet = getOrCreateSheet(ss, "Riwayat Cadangan");
  var logHeaders = ["Waktu Backup (WIB)", "Dilakukan Oleh", "Jumlah Presensi Dicadangkan", "Jumlah Tugas Dicadangkan", "Catatan"];
  
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(logHeaders);
    styleHeaderRange(logSheet.getRange(1, 1, 1, logHeaders.length), "#334155");
  }

  logSheet.appendRow([
    timestampStr,
    data.backupBy || "Dosen Pengampu",
    (data.attendanceRecap ? data.attendanceRecap.length : 0) + " data mahasiswa",
    (data.submissionsRecap ? data.submissionsRecap.length : 0) + " submisi tugas",
    data.note || "Sinkronisasi otomatis Smart Learning Hub"
  ]);
  logSheet.autoResizeColumns(1, logHeaders.length);

  return createJsonResponse({
    success: true,
    message: "Data akademik berhasil dicadangkan ke Google Spreadsheet!",
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    timestamp: timestampStr
  });
}

/**
 * Helper: Styling Header Google Spreadsheet
 */
function styleHeaderRange(range, hexColor) {
  range.setBackground(hexColor);
  range.setFontColor("#ffffff");
  range.setFontWeight("bold");
  range.setHorizontalAlignment("center");
}

/**
 * Helper: Ambil atau buat Sheet dalam Spreadsheet
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Helper: Ambil atau buat folder di Drive root
 */
function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * Helper: Ambil atau buat subfolder di dalam folder induk
 */
function getOrCreateSubFolder(parentFolder, subFolderName) {
  var folders = parentFolder.getFoldersByName(subFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subFolderName);
}

/**
 * Helper: Buat HTTP JSON Response dengan header CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
