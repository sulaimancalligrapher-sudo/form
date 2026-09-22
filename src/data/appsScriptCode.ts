/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Apps Script Backend Code
 * Complete, standalone Apps Script code for Google Sheets integration.
 * Paste this directly into Google Sheets -> Extensions -> Apps Script.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * كود تطبيق نص برمجي (Google Apps Script) المتكامل للاستمارة وقوقل شيت
 * =========================================================================
 * 
 * طريقة التثبيت في 3 خطوات بسيطة:
 * 1. افتح جدول بيانات قوقل شيت (Google Sheets) الخاص بك.
 * 2. من القائمة العلوية اختر: الإضافات (Extensions) > تطبيقات سكريبت (Apps Script).
 * 3. امسح أي كود موجود، والصق هذا الكود بالكامل، ثم انقر على (نشر / Deploy) > (نشر جديد / New deployment).
 * 4. اختر النوع: تطبيق ويب (Web app)، واجعل الوصول: (أي شخص / Anyone)، ثم انسخ رابط الـ Web App وضعه في إعدادات الفورم!
 */

// 1. استقبال طلبات GET (فحص الاتصال وجلب الأسئلة وقراءة المسجلين)
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
    var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : "";
    var outputData = null;
    
    if (action === "ping" || action === "test") {
      outputData = {
        success: true,
        message: "Google Apps Script Web App is connected and running successfully!",
        timestamp: new Date().toISOString()
      };
    } else if (action === "getFormQuestions") {
      var questions = getFormQuestionsFromSheet();
      outputData = {
        success: true,
        questions: questions
      };
    } else if (action === "getRegistrationAnswers" || action === "getAnswers") {
      var records = getRegistrationAnswersRecords();
      outputData = {
        success: true,
        records: records
      };
    } else if (action === "translate") {
      var textToTrans = (e && e.parameter && e.parameter.text) ? e.parameter.text : "";
      var toLang = (e && e.parameter && e.parameter.targetLang) ? e.parameter.targetLang : "en";
      var transResult = "";
      try {
        if (textToTrans) {
          transResult = LanguageApp.translate(textToTrans, "ar", toLang);
        }
      } catch (tErr) {
        transResult = textToTrans;
      }
      outputData = {
        success: true,
        translation: transResult
      };
    } else {
      outputData = {
        success: true,
        status: "ready",
        timestamp: new Date().toISOString()
      };
    }

    var jsonStr = JSON.stringify(outputData);
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + jsonStr + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errObj = { success: false, error: err.toString() };
    var errStr = JSON.stringify(errObj);
    if (e && e.parameter && e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + "(" + errStr + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(errStr)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. استقبال طلبات POST (تسجيل مشترك جديد، رفع ملف لدرايف، حفظ الإعدادات)
function doPost(e) {
  try {
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // Handle URL-encoded or raw form-data fallback
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }
    
    // إذا كانت البيانات مرسلة عبر hidden input باسم يحتوي على الـ JSON
    if (typeof postData === "object" && !postData.action) {
      for (var key in postData) {
        if (key.indexOf('{"') === 0 || key.indexOf("{'") === 0) {
          try {
            var inner = JSON.parse(key);
            if (inner && inner.action) {
              postData = inner;
              break;
            }
          } catch(e) {}
        }
      }
    }

    var action = postData.action || "submitRegistration";

    // أ) تسجيل استمارة جديدة
    if (action === "submitRegistration") {
      var regResult = submitRegistrationToSheet(postData);
      return ContentService.createTextOutput(JSON.stringify(regResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ب) رفع ملف أو صورة إلى مجلد قوقل درايف
    if (action === "uploadFile") {
      var upResult = uploadFileToDrive(
        postData.base64Data,
        postData.fileName,
        postData.mimeType,
        postData.folderId
      );
      return ContentService.createTextOutput(JSON.stringify(upResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      action: action,
      message: "تم استلام الطلب بنجاح"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// دالة تنظيف ومطابقة عناوين الأعمدة والأسئلة (تتجاهل الفروقات الإملائية مثل انواع وانوان والهمزات والمسافات)
function normalizeQuestionKey(str) {
  if (!str) return "";
  return str.toString()
    .trim()
    .toLowerCase()
    .replace(/[؟?!\-_.:]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/انوان/g, "انواع"); // مطابقة كلمة انوان مع انواع
}

// دالة استخراج القيمة الدقيقة للعمود من الإجابات المستلمة
function findAnswerForColumn(colHeader, answersMap, data) {
  var normCol = normalizeQuestionKey(colHeader);
  if (!normCol) return "";

  // 1. مطابقة مباشرة
  if (answersMap[colHeader] !== undefined && answersMap[colHeader] !== "") {
    return answersMap[colHeader];
  }

  // 2. مطابقة عبر المفاتيح المنظفة
  for (var key in answersMap) {
    if (normalizeQuestionKey(key) === normCol) {
      return answersMap[key];
    }
  }

  // 3. مطابقة الحقول الأساسية والمرادفات الشائعة
  if (normCol === "الاسم" || normCol === "الاسم الكامل" || normCol === "الاسم الكامل لك" || normCol === "اسمك" || normCol === "full name" || normCol === "name") {
    return answersMap["الاسم"] || answersMap["الاسم الكامل"] || data.name || "";
  }
  if (normCol === "الاسم بالعربي" || normCol === "الاسم باللغه العربيه" || normCol === "arabic name" || normCol === "name in arabic") {
    return answersMap["الاسم بالعربي"] || data.nameArabic || "";
  }
  if (normCol === "العمر" || normCol === "عمر المشترك" || normCol === "age") {
    return answersMap["العمر"] || data.age || "";
  }
  if (normCol === "رقم الهاتف" || normCol === "الهاتف" || normCol === "رقم الجوال" || normCol === "الموبايل" || normCol === "phone" || normCol === "whatsapp") {
    return answersMap["رقم الهاتف"] || data.phone || "";
  }
  if (normCol === "ايميل" || normCol === "البريد الالكتروني" || normCol === "الايميل" || normCol === "email") {
    return answersMap["ايميل"] || answersMap["البريد الإلكتروني"] || data.email || "";
  }
  if (normCol === "id line" || normCol === "line id" || normCol === "معرف لاين" || normCol === "لاين") {
    return answersMap["ID Line"] || data.lineId || "";
  }
  if (normCol === "فيس بوك" || normCol === "فيسبوك" || normCol === "facebook") {
    return answersMap["فيس بوك"] || data.facebook || "";
  }
  if (normCol.indexOf("استاذك") !== -1 || normCol.indexOf("معلمك") !== -1) {
    for (var k1 in answersMap) {
      if (k1.indexOf("استاذك") !== -1 || k1.indexOf("معلمك") !== -1) return answersMap[k1];
    }
  }
  if (normCol.indexOf("تحب الخط") !== -1) {
    for (var k2 in answersMap) {
      if (k2.indexOf("تحب الخط") !== -1) return answersMap[k2];
    }
  }
  if (normCol.indexOf("انواع الخط") !== -1 || normCol.indexOf("انوان الخط") !== -1) {
    for (var k3 in answersMap) {
      if (k3.indexOf("انواع الخط") !== -1 || k3.indexOf("انوان الخط") !== -1) return answersMap[k3];
    }
  }
  if (normCol.indexOf("تحب الفن") !== -1) {
    for (var k4 in answersMap) {
      if (k4.indexOf("تحب الفن") !== -1) return answersMap[k4];
    }
  }
  if (normCol.indexOf("رفع") !== -1 || normCol.indexOf("ملف") !== -1 || normCol.indexOf("مرفق") !== -1 || normCol.indexOf("drive") !== -1) {
    return answersMap["رفع ملف"] || answersMap["ملف المرفقات"] || data.attachment || "";
  }

  return "";
}

// 3. دالة تسجيل وحفظ الاستمارة في ورقة RegistrationAnswers
function submitRegistrationToSheet(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "RegistrationAnswers";
    var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("طلبات التسجيل") || ss.getSheetByName("إجابات التسجيل");
    
    // إنشاء الورقة وترويسة الأعمدة تلقائياً إذا لم تكن موجودة
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // تنسيق التاريخ والوقت
    var timestamp = Utilities.formatDate(new Date(), "GMT+3", "yyyy/MM/dd - hh:mm a");

    // توليد أو اعتماد رقم التسجيل المرجعي
    var nowObj = new Date();
    var regYear = nowObj.getFullYear().toString();
    var regMonth = (nowObj.getMonth() + 1).toString();
    var regRand = Math.floor(1000 + Math.random() * 9000).toString();
    var autoRegId = regYear + regMonth + regRand;
    var registrationId = (data.registrationId && String(data.registrationId).trim().length >= 6)
      ? String(data.registrationId).trim()
      : autoRegId;

    var displayName = data.name || data.nameArabic || "مشترك جديد";

    // تجميع الإجابات في كائن ميسر
    var answersMap = {};
    if (data.answers && Array.isArray(data.answers)) {
      for (var i = 0; i < data.answers.length; i++) {
        var item = data.answers[i];
        if (!item) continue;
        var qText = (item.question || "").toString().trim();
        var qAns = (item.answer !== undefined && item.answer !== null) ? item.answer.toString().trim() : "";
        if (qText) answersMap[qText] = qAns;
      }
    }

    // مطابقة الحقول الأساسية
    if (data.name && !answersMap["الاسم"]) answersMap["الاسم"] = data.name;
    if (data.nameArabic && !answersMap["الاسم بالعربي"]) answersMap["الاسم بالعربي"] = data.nameArabic;
    if (data.age && !answersMap["العمر"]) answersMap["العمر"] = data.age;
    if (data.phone && !answersMap["رقم الهاتف"]) answersMap["رقم الهاتف"] = data.phone;
    if (data.email && !answersMap["ايميل"]) answersMap["ايميل"] = data.email;
    if (data.lineId && !answersMap["ID Line"]) answersMap["ID Line"] = data.lineId;
    if (data.facebook && !answersMap["فيس بوك"]) answersMap["فيس بوك"] = data.facebook;
    if (data.attachment && !answersMap["رفع ملف"]) answersMap["رفع ملف"] = data.attachment;

    // رفع أي صور أو ملفات Base64 إلى قوقل درايف تلقائياً
    var targetFolderId = data.driveFolderId || "1tae6n3-tjB9vVtxr2GbK572SRtWxZ3f7";
    for (var key in answersMap) {
      var val = answersMap[key];
      if (typeof val === "string" && (val.indexOf("data:") === 0 || val.indexOf("base64,") !== -1)) {
        try {
          var mimeMatch = val.match(/data:([^;]+);/);
          var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
          var safeName = displayName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
          var fileName = safeName + "_" + registrationId + "_" + Utilities.formatDate(new Date(), "GMT+3", "yyyyMMdd_HHmm") + ".jpg";
          var upRes = uploadFileToDrive(val, fileName, mime, targetFolderId);
          if (upRes && upRes.success && (upRes.fileUrl || upRes.downloadUrl)) {
            answersMap[key] = upRes.fileUrl || upRes.downloadUrl;
          }
        } catch (upErr) {
          Logger.log("Drive upload error: " + upErr.message);
        }
      }
    }

    // قراءة ترويسة الأعمدة الحالية في الورقة
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = [];

    if (lastRow > 0 && lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return (h || "").toString().trim();
      });
      // إزالة الأعمدة الفارغة في النهاية
      while (headers.length > 0 && !headers[headers.length - 1]) {
        headers.pop();
      }
    }

    // إذا كانت الورقة فارغة تماماً، نؤسس الترويسة القياسية لمرة واحدة فقط
    if (headers.length === 0 || !headers[0]) {
      headers = [
        "التاريخ والوقت",
        "رقم التسجيل",
        "الاسم",
        "الاسم بالعربي",
        "العمر",
        "رقم الهاتف",
        "ايميل",
        "ID Line",
        "فيس بوك",
        "هل تحب الخط العربي؟",
        "ما اسم استاذك الذي علمك الخط؟",
        "هل تعرفين انوان الخط",
        "هل تحب الفن",
        "رفع ملف"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1E293B").setFontColor("#F8FAFC").setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // ملاحظة أمان: لا نضيف أي أعمدة إضافية إذا كانت الأعمدة موجودة بالفعل
    // وذلك لمنع تشويه الورقة بزيادة أعمدة عشوائية

    // بناء صف الإدخال الجديد بمطابقة ذكية لكل عمود في الترويسة
    var newRow = [];
    for (var c = 0; c < headers.length; c++) {
      var hName = headers[c];
      var normH = normalizeQuestionKey(hName);

      if (normH === "التاريخ والوقت" || normH.indexOf("وقت") !== -1 || normH.indexOf("تاريخ") !== -1) {
        newRow.push(timestamp);
      } else if (normH === "رقم التسجيل" || normH.indexOf("تسجيل") !== -1 || normH.indexOf("رقم القيد") !== -1) {
        newRow.push(registrationId);
      } else {
        var ans = findAnswerForColumn(hName, answersMap, data);
        newRow.push(ans);
      }
    }

    // فحص منع التكرار: البحث عن رقم التسجيل في الجدول
    var regIdColIdx = 2; // العمود B افتراضياً
    for (var h = 0; h < headers.length; h++) {
      var headNorm = normalizeQuestionKey(headers[h]);
      if (headNorm === "رقم التسجيل" || headNorm.indexOf("تسجيل") !== -1) {
        regIdColIdx = h + 1;
        break;
      }
    }

    var existingRowIdx = -1;
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, regIdColIdx, lastRow - 1, 1).getValues();
      for (var r = 0; r < idValues.length; r++) {
        var cellVal = idValues[r][0] ? idValues[r][0].toString().trim() : "";
        if (cellVal && cellVal === registrationId) {
          existingRowIdx = r + 2; // رقم الصف في قوقل شيت (1-based)
          break;
        }
      }
    }

    if (existingRowIdx !== -1) {
      // تم العثور على نفس رقم التسجيل: نقوم بتحديث الصف دون إضافة صف مكرر
      sheet.getRange(existingRowIdx, 1, 1, newRow.length).setValues([newRow]);
      return {
        success: true,
        registrationId: registrationId,
        timestamp: timestamp,
        isUpdated: true,
        message: "تم تحديث بيانات التسجيل للرقم المرجعي (" + registrationId + ") بنجاح دون تكرار!"
      };
    } else {
      // صف جديد لأول مرة
      sheet.appendRow(newRow);
      var newLastRow = sheet.getLastRow();
      if (newLastRow > 1) {
        sheet.getRange(newLastRow, 1, 1, newRow.length).setVerticalAlignment("middle");
        sheet.getRange(newLastRow, 1).setHorizontalAlignment("center");
        sheet.getRange(newLastRow, 2).setHorizontalAlignment("center").setFontWeight("bold");
      }
    }

    return {
      success: true,
      registrationId: registrationId,
      timestamp: timestamp,
      message: "تم استلام وحفظ طلب التسجيل بنجاح بالرقم المرجعي (" + registrationId + ") في جدول البيانات!"
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: "حدث خطأ أثناء الحفظ في قوقل شيت: " + error.toString()
    };
  }
}

// 4. رفع الملفات والصور إلى قوقل درايف
function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    if (!base64Data) return { success: false, error: "No base64 data provided" };
    var cleanBase64 = base64Data;
    if (cleanBase64.indexOf("base64,") !== -1) {
      cleanBase64 = cleanBase64.split("base64,")[1];
    }
    
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, mimeType || "image/jpeg", fileName || "attachment.jpg");
    
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch(fErr) {
      folder = DriveApp.getRootFolder();
    }
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    var downloadUrl = file.getDownloadUrl();
    
    return {
      success: true,
      fileId: file.getId(),
      fileUrl: fileUrl,
      downloadUrl: downloadUrl,
      viewUrl: file.getUrl()
    };
  } catch (upErr) {
    return {
      success: false,
      error: upErr.toString()
    };
  }
}

// 5. جلب الأسئلة من ورقة RegistrationQuestions إن وجدت
function getFormQuestionsFromSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var qSheet = ss.getSheetByName("RegistrationQuestions") || ss.getSheetByName("أسئلة التسجيل");
    if (!qSheet) return [];
    var data = qSheet.getDataRange().getValues();
    var questions = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var qText = String(row[0]).trim();
      var qDesc = row[1] ? String(row[1]).trim() : "";
      var rawType = row[2] ? String(row[2]).trim().toLowerCase() : "text";
      var optStr = row[3] ? String(row[3]).trim() : "";
      var reqVal = row[4] ? String(row[4]).trim() : "";
      var imgUrl = row[5] ? String(row[5]).trim() : "";
      var extLink = row[6] ? String(row[6]).trim() : "";

      // تحديد نوع العنصر
      var fieldType = "text";
      if (qText === "صورة" || rawType === "صورة" || rawType === "image" || rawType.indexOf("عرض صورة") !== -1 || (rawType.indexOf("رابط") !== -1 && imgUrl && (!extLink || extLink === "-"))) {
        fieldType = "image_display";
      } else if (rawType.indexOf("عنوان زر") !== -1 || rawType.indexOf("زر") !== -1 || rawType.indexOf("button") !== -1) {
        fieldType = "button_title";
      } else if (rawType.indexOf("رفع") !== -1 || rawType.indexOf("ملف") !== -1 || rawType.indexOf("file") !== -1) {
        fieldType = "file";
      } else if (rawType.indexOf("هاتف") !== -1 || rawType.indexOf("phone") !== -1) {
        fieldType = "phone";
      } else if (rawType.indexOf("رقم") !== -1 || rawType.indexOf("number") !== -1) {
        fieldType = "number";
      } else if (rawType.indexOf("ايميل") !== -1 || rawType.indexOf("بريد") !== -1 || rawType.indexOf("email") !== -1) {
        fieldType = "email";
      } else if (rawType.indexOf("اختيار") !== -1 || rawType.indexOf("choice") !== -1 || rawType.indexOf("select") !== -1) {
        fieldType = "choice";
      }

      // تحليل الخيارات المتاحة
      var options = [];
      if (optStr) {
        if (optStr.indexOf("|||") !== -1) {
          options = optStr.split("|||").map(function(s) { return s.trim(); });
        } else if (optStr.indexOf(String.fromCharCode(10)) !== -1) {
          options = optStr.split(String.fromCharCode(10)).map(function(s) { return s.trim(); });
        } else {
          options = optStr.split(",").map(function(s) { return s.trim(); });
        }
      }

      var isReq = reqVal === "نعم" || reqVal.toLowerCase() === "true" || reqVal.toLowerCase() === "yes" || reqVal === "1";

      questions.push({
        id: i,
        question: qText,
        description: qDesc,
        type: fieldType,
        options: options,
        required: isReq,
        imageUrl: imgUrl,
        externalLink: extLink
      });
    }
    return questions;
  } catch(e) {
    return [];
  }
}

// 6. جلب أحدث السجلات المسجلة
function getRegistrationAnswersRecords() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("RegistrationAnswers") || ss.getSheetByName("طلبات التسجيل");
    if (!sheet) return [];
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    var headers = values[0];
    var records = [];
    for (var r = values.length - 1; r >= Math.max(1, values.length - 30); r--) {
      var row = values[r];
      var rec = { rowIndex: r + 1 };
      for (var c = 0; c < headers.length; c++) {
        rec[headers[c]] = row[c];
      }
      records.push(rec);
    }
    return records;
  } catch(e) {
    return [];
  }
}
`;
