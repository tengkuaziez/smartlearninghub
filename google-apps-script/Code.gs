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
 * Handle GET requests (Health Check & Fetch Teaching)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

  if (action === "ping") {
    return createJsonResponse({
      status: "ok",
      service: "Smart Learning Hub & My Journey Unified Google Bridge",
      version: "3.0.0",
      timestamp: new Date().toISOString(),
      message: "API Google Apps Script siap menerima sinkronisasi otomatis Teaching & Berkas."
    });
  }

  if (action === "getTeaching" || action === "getAll") {
    return handleGetTeaching();
  }

  return createJsonResponse({
    status: "ok",
    service: "Smart Learning Hub — Google Drive & Sheets Bridge",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    message: "API Google Apps Script siap menerima berkas dan pencadangan data."
  });
}

/**
 * Handle POST requests (Upload Berkas, Backup Spreadsheet, Sync Teaching)
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

    if (action === "upload_file" || action === "uploadFile") {
      return handleFileUpload(payload);
    } else if (action === "syncTeaching" || action === "sync_teaching") {
      return handleSyncTeaching(payload);
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
 * 3. FUNGSI SINKRONISASI MODUL TEACHING (MY JOURNEY <-> SMART LEARNING HUB)
 */
function handleSyncTeaching(data) {
  var ss = getOrCreateSpreadsheet();
  
  // Sheet 1: Courses
  if (data.courses && data.courses.length > 0) {
    var cSheet = getOrCreateSheet(ss, "Courses");
    cSheet.clear();
    var cHeaders = ["id", "code", "name", "semester", "academicYear", "section", "enrolledCount", "schedule", "room", "status", "description", "credits", "syllabusOverview", "primaryLecturer", "partnerLecturer"];
    var cRows = [cHeaders];
    for (var i = 0; i < data.courses.length; i++) {
      var c = data.courses[i];
      cRows.push([
        c.id, c.code, c.name, c.semester, c.academicYear, c.section,
        c.enrolledCount, c.schedule, c.room, c.status, c.description,
        c.credits, c.syllabusOverview, c.primaryLecturer || "-", c.partnerLecturer || "-"
      ]);
    }
    cSheet.getRange(1, 1, cRows.length, cHeaders.length).setValues(cRows);
    styleHeaderRange(cSheet.getRange(1, 1, 1, cHeaders.length), "#1E2D45");
    cSheet.autoResizeColumns(1, cHeaders.length);
  }

  // Sheet 2: Students
  if (data.students && data.students.length > 0) {
    var sSheet = getOrCreateSheet(ss, "Students");
    sSheet.clear();
    var sHeaders = ["id", "nim", "name", "courseCode", "courseName", "classSection", "academicYear", "email", "attendancePercent"];
    var sRows = [sHeaders];
    for (var j = 0; j < data.students.length; j++) {
      var st = data.students[j];
      sRows.push([
        st.id, st.nim, st.name, st.courseCode, st.courseName,
        st.classSection, st.academicYear, st.email, st.attendancePercent
      ]);
    }
    sSheet.getRange(1, 1, sRows.length, sHeaders.length).setValues(sRows);
    styleHeaderRange(sSheet.getRange(1, 1, 1, sHeaders.length), "#1E2D45");
    sSheet.autoResizeColumns(1, sHeaders.length);
  }

  // Sheet 3: Materials
  if (data.materials && data.materials.length > 0) {
    var mSheet = getOrCreateSheet(ss, "Materials");
    mSheet.clear();
    var mHeaders = ["id", "title", "fileType", "courseId", "courseName", "topic", "uploadDate", "size", "downloadCount", "notes", "fileUrl", "fileName", "storageType"];
    var mRows = [mHeaders];
    for (var k = 0; k < data.materials.length; k++) {
      var m = data.materials[k];
      mRows.push([
        m.id, m.title, m.fileType, m.courseId, m.courseName,
        m.topic, m.uploadDate, m.size, m.downloadCount, m.notes,
        m.fileUrl, m.fileName, m.storageType
      ]);
    }
    mSheet.getRange(1, 1, mRows.length, mHeaders.length).setValues(mRows);
    styleHeaderRange(mSheet.getRange(1, 1, 1, mHeaders.length), "#1E2D45");
    mSheet.autoResizeColumns(1, mHeaders.length);
  }

  // Sheet 4: Rps
  if (data.rps && data.rps.length > 0) {
    var rSheet = getOrCreateSheet(ss, "Rps");
    rSheet.clear();
    var rHeaders = ["id", "courseId", "courseName", "code", "semester", "academicYear", "learningOutcomesJson", "weeklyTopicsJson", "referencesJson", "version", "lastUpdated", "status"];
    var rRows = [rHeaders];
    for (var l = 0; l < data.rps.length; l++) {
      var rp = data.rps[l];
      rRows.push([
        rp.id, rp.courseId, rp.courseName, rp.code, rp.semester, rp.academicYear,
        JSON.stringify(rp.learningOutcomesJson || []),
        JSON.stringify(rp.weeklyTopicsJson || []),
        JSON.stringify(rp.referencesJson || []),
        rp.version, rp.lastUpdated, rp.status
      ]);
    }
    rSheet.getRange(1, 1, rRows.length, rHeaders.length).setValues(rRows);
    styleHeaderRange(rSheet.getRange(1, 1, 1, rHeaders.length), "#1E2D45");
    rSheet.autoResizeColumns(1, rHeaders.length);
  }

  // Sheet 5: Sessions
  if (data.sessions && data.sessions.length > 0) {
    var sesSheet = getOrCreateSheet(ss, "Sessions");
    sesSheet.clear();
    var sesHeaders = ["id", "courseId", "courseName", "code", "section", "topic", "date", "time", "room", "isOnline", "preparationNotes", "status"];
    var sesRows = [sesHeaders];
    for (var mIdx = 0; mIdx < data.sessions.length; mIdx++) {
      var ses = data.sessions[mIdx];
      sesRows.push([
        ses.id, ses.courseId, ses.courseName, ses.code, ses.section, ses.topic,
        ses.date, ses.time, ses.room, ses.isOnline, ses.preparationNotes, ses.status
      ]);
    }
    sesSheet.getRange(1, 1, sesRows.length, sesHeaders.length).setValues(sesRows);
    styleHeaderRange(sesSheet.getRange(1, 1, 1, sesHeaders.length), "#1E2D45");
    sesSheet.autoResizeColumns(1, sesHeaders.length);
  }

  // Sheet 6: Profiles
  if (data.profiles && data.profiles.length > 0) {
    var pSheet = getOrCreateSheet(ss, "Profiles");
    pSheet.clear();
    var pHeaders = ["email", "name", "title", "role", "department", "avatarUrl", "lastSynced"];
    var pRows = [pHeaders];
    for (var p = 0; p < data.profiles.length; p++) {
      var prof = data.profiles[p];
      pRows.push([
        prof.email, prof.name, prof.title, prof.role, prof.department, prof.avatarUrl, new Date().toISOString()
      ]);
    }
    pSheet.getRange(1, 1, pRows.length, pHeaders.length).setValues(pRows);
    styleHeaderRange(pSheet.getRange(1, 1, 1, pHeaders.length), "#1E2D45");
    pSheet.autoResizeColumns(1, pHeaders.length);
  }

  return createJsonResponse({
    status: "success",
    message: "Modul Teaching (Courses, Students, Materials, Rps, Sessions) berhasil disinkronkan ke Google Spreadsheet!",
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    timestamp: new Date().toISOString()
  });
}

/**
 * 4. FUNGSI AMBIL DATA TEACHING UNTUK CLIENT (MY JOURNEY & SMART LEARNING HUB)
 */
function handleGetTeaching() {
  var ss = getOrCreateSpreadsheet();
  var tables = ["Courses", "Students", "Materials", "Rps", "Sessions", "Profiles"];
  var result = {};

  for (var t = 0; t < tables.length; t++) {
    var sheetName = tables[t];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      result[sheetName] = [];
      continue;
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      result[sheetName] = [];
      continue;
    }

    var headers = values[0];
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var rowObj = {};
      for (var c = 0; c < headers.length; c++) {
        rowObj[headers[c]] = values[r][c];
      }
      rows.push(rowObj);
    }
    result[sheetName] = rows;
  }

  return createJsonResponse({
    status: "success",
    data: result,
    timestamp: new Date().toISOString()
  });
}

/**
 * Helper: Ambil atau buat Spreadsheet Utama
 */
function getOrCreateSpreadsheet() {
  var rootFolder = getOrCreateFolder(DEFAULT_FOLDER_NAME);
  var files = rootFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  var newSs = SpreadsheetApp.create(DEFAULT_SPREADSHEET_NAME);
  DriveApp.getFileById(newSs.getId()).moveTo(rootFolder);
  return newSs;
}

/**
 * Helper: Buat HTTP JSON Response dengan header CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
