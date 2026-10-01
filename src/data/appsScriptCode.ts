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
    } else if (action === "getSubscribers") {
      var subscribers = getSubscribersFromSheet();
      outputData = {
        success: true,
        subscribers: subscribers
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
      var rawContents = String(e.postData.contents).trim();
      if (rawContents.slice(-1) === "=") {
        rawContents = rawContents.slice(0, -1).trim();
      }
      try {
        postData = JSON.parse(rawContents);
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

    // ج) حفظ وتحديث أسئلة ورقة RegistrationQuestions من لوحة الإدارة
    if (action === "saveFormQuestions" || action === "saveQuestions") {
      var saveResult = saveFormQuestionsToSheet(postData.questions);
      return ContentService.createTextOutput(JSON.stringify(saveResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // د) تحديث صف مشترك في ورقة (المشتركين) - النقاط، الإجابات (|||)، تحليل الذكاء الاصطناعي
    if (action === "updateSubscriberRow") {
      var rowUpdateRes = updateSubscriberRowInSheet(postData);
      return ContentService.createTextOutput(JSON.stringify(rowUpdateRes))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // هـ) حفظ ومزامنة قائمة المشتركين في ورقة (المشتركين)
    if (action === "saveSubscribers") {
      var subSaveRes = saveSubscribersListToSheet(postData.subscribers);
      return ContentService.createTextOutput(JSON.stringify(subSaveRes))
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

// دالة استخراج النقاط الرقمية من إجابة خيارات نقاط (اختيارات 2)
function extractScoreFromAnswer(ansStr) {
  if (ansStr === undefined || ansStr === null || ansStr === "") return 0;
  var s = ansStr.toString().trim();

  // 1. نمط: رقم متبوع بفاصل مثل: "4 - ممتاز" أو "4-ممتاز" أو "4: نعم" أو "4. خيار" أو "4) موافق"
  var m1 = s.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*[-—–ـ:.)/]/);
  if (m1 && m1[1]) {
    var v1 = parseFloat(m1[1]);
    if (!isNaN(v1)) return v1;
  }

  // 2. نمط: أرقام بين أقواس مثل "(4)" أو "[4]"
  var m2 = s.match(/[(\[]\s*(\d+(?:\.\d+)?)\s*[)\]]/);
  if (m2 && m2[1]) {
    var v2 = parseFloat(m2[1]);
    if (!isNaN(v2)) return v2;
  }

  // 3. نمط: رقم في بداية النص أو نص رقمي مجرد: "4" أو "4 خيار"
  var m3 = s.match(/^\s*(\d+(?:\.\d+)?)/);
  if (m3 && m3[1]) {
    var v3 = parseFloat(m3[1]);
    if (!isNaN(v3)) return v3;
  }

  // 4. أي رقم مستقل داخل النص
  var m4 = s.match(/\b(\d+(?:\.\d+)?)\b/);
  if (m4 && m4[1]) {
    var v4 = parseFloat(m4[1]);
    if (!isNaN(v4)) return v4;
  }

  return 0;
}

// دالة فحص هل نوع السؤال هو من نوع اختيارات نقاط (اختيارات 2)
function isScoredQuestionType(typeStr) {
  if (!typeStr) return false;
  var t = typeStr.toString().toLowerCase().trim();
  // اختيارات 3 (اختيار متعدد / Checkboxes) ليست لحساب النقاط
  if (
    t.indexOf("3") !== -1 ||
    t.indexOf("متعدد") !== -1 ||
    t.indexOf("checkbox") !== -1 ||
    t.indexOf("multi") !== -1
  ) {
    return false;
  }
  return (
    t.indexOf("اختيارات 2") !== -1 ||
    t.indexOf("اختيار 2") !== -1 ||
    t.indexOf("اختيارات2") !== -1 ||
    t.indexOf("خيارات 2") !== -1 ||
    t.indexOf("خيارات2") !== -1 ||
    t.indexOf("choice2") !== -1 ||
    t.indexOf("choice 2") !== -1 ||
    t.indexOf("scored") !== -1 ||
    t.indexOf("نقاط") !== -1 ||
    t.indexOf("درجات") !== -1 ||
    t.indexOf("تقييم") !== -1
  );
}

// دالة فحص هل العمود هو عمود مجموع النقاط
function isTotalScoreHeader(headerStr) {
  if (!headerStr) return false;
  var norm = normalizeQuestionKey(headerStr);
  return (
    norm === "مجموع النقاط" ||
    norm === "المجموع" ||
    norm === "الدرجة" ||
    norm === "النقاط" ||
    norm === "مجموع الدرجات" ||
    norm === "التقييم" ||
    norm === "total score" ||
    norm === "score" ||
    norm === "total"
  );
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

// دالة استخراج القيمة الدقيقة للعمود من الإجابات المستلمة بدون أي افتراضات سابقة
function findAnswerForColumn(colHeader, answersMap, data, qIdx) {
  if (!colHeader && (qIdx === undefined || qIdx < 0)) return "";
  var normCol = normalizeQuestionKey(colHeader);

  // 1. مطابقة مباشرة بالاسم الدقيق للسؤال
  if (colHeader && answersMap[colHeader] !== undefined && answersMap[colHeader] !== null && answersMap[colHeader] !== "") {
    return answersMap[colHeader];
  }

  // 2. مطابقة عبر المفاتيح المنظفة
  if (normCol) {
    for (var key in answersMap) {
      if (normalizeQuestionKey(key) === normCol && answersMap[key] !== undefined && answersMap[key] !== "") {
        return answersMap[key];
      }
    }
  }

  // 3. مطابقة ترتيبية من مصفوفة الإجابات المرسلة من النموذج
  if (data && data.answers && Array.isArray(data.answers)) {
    // أ) عبر رقم الترتيب الدقيق للسؤال
    if (qIdx !== undefined && qIdx >= 0 && qIdx < data.answers.length) {
      var item = data.answers[qIdx];
      if (item && item.answer !== undefined && item.answer !== null && item.answer !== "") {
        return item.answer;
      }
    }

    // ب) عبر مطابقة عنوان السؤال في المصفوفة
    if (normCol) {
      for (var ai = 0; ai < data.answers.length; ai++) {
        var itm = data.answers[ai];
        if (itm && itm.question && normalizeQuestionKey(itm.question) === normCol) {
          if (itm.answer !== undefined && itm.answer !== null && itm.answer !== "") {
            return itm.answer;
          }
        }
      }
    }
  }

  // 4. فحص المرفقات في حال كان الحقل لرفع الملفات
  if (data.attachment && normCol && (normCol.indexOf("ملف") !== -1 || normCol.indexOf("مرفق") !== -1 || normCol.indexOf("صوره") !== -1)) {
    return data.attachment;
  }

  return "";
}

// 3. دالة تسجيل وحفظ الاستمارة في ورقة RegistrationAnswers
function submitRegistrationToSheet(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "RegistrationAnswers";
    var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("طلبات التسجيل") || ss.getSheetByName("إجابات التسجيل");
    
    // إنشاء الورقة إذا لم تكن موجودة
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // تنسيق التاريخ والوقت
    var timestamp = Utilities.formatDate(new Date(), "GMT+3", "yyyy/MM/dd - hh:mm a");

    // اعتماد رقم المشترك الحقيقي والاسم الكامل
    var registrationId = String(data.registrationId || data.subscriberId || data.studentId || "").trim();
    var displayName = String(data.name || data.studentName || data.nameArabic || "").trim();
    if (!registrationId && displayName) {
      registrationId = displayName;
    }

    // حماية صارمة: منع إضافة أي صف فارغ إذا كانت بيانات المشترك والإجابات فارغة
    if (!registrationId && !displayName) {
      return {
        success: false,
        error: "بيانات المشترك فارغة، تم تجاهل الطلب لمنع إنشاء صفوف فارغة."
      };
    }

    // دالة مساعدة لضمان عدم تجاوز الحد الأقصى لخلية قوقل شيت (50,000 حرف)
    function safeCellText(strVal) {
      if (strVal === undefined || strVal === null) return "";
      var s = String(strVal);
      if (s.indexOf("data:") === 0 || s.indexOf("base64,") !== -1) {
        return "[صورة مرفقة]";
      }
      if (s.length > 45000) {
        return s.substring(0, 45000) + "...";
      }
      return s;
    }

    // تجميع الإجابات في كائن ميسر + رفع أي صورة Base64 إلى قوقل درايف وتحديث المصفوفة مباشرة
    var answersMap = {};
    var targetFolderId = data.driveFolderId || "1tae6n3-tjB9vVtxr2GbK572SRtWxZ3f7";
    var lastUploadedUrl = "";

    if (data.answers && Array.isArray(data.answers)) {
      for (var i = 0; i < data.answers.length; i++) {
        var item = data.answers[i];
        if (!item) continue;
        var qText = (item.question || "").toString().trim();
        var qAns = (item.answer !== undefined && item.answer !== null) ? item.answer.toString().trim() : "";

        // إذا كانت الإجابة عبارة عن ملف أو صورة Base64، نرفعها فوراً إلى قوقل درايف ونستبدلها بالرابط القصير
        if (qAns && (qAns.indexOf("data:") === 0 || qAns.indexOf("base64,") !== -1)) {
          var finalFileUrl = "[صورة مرفقة]";
          try {
            var mimeMatch = qAns.match(/data:([^;]+);/);
            var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
            var safeName = (displayName || "student").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
            var fileName = safeName + "_" + registrationId + "_" + Utilities.formatDate(new Date(), "GMT+3", "yyyyMMdd_HHmm") + ".jpg";
            var upRes = uploadFileToDrive(qAns, fileName, mime, targetFolderId);
            if (upRes && upRes.success && (upRes.fileUrl || upRes.viewUrl || upRes.downloadUrl)) {
              finalFileUrl = upRes.fileUrl || upRes.viewUrl || upRes.downloadUrl;
              lastUploadedUrl = finalFileUrl;
            }
          } catch (upErr) {
            Logger.log("Drive upload error: " + upErr.message);
          }
          qAns = finalFileUrl;
          data.answers[i].answer = finalFileUrl;
        }

        if (qText) answersMap[qText] = qAns;
      }
    }

    if (data.attachment) {
      var attStr = String(data.attachment).trim();
      if (attStr.indexOf("data:") === 0 || attStr.indexOf("base64,") !== -1) {
        if (lastUploadedUrl) {
          data.attachment = lastUploadedUrl;
        } else {
          try {
            var attMimeMatch = attStr.match(/data:([^;]+);/);
            var attMime = attMimeMatch ? attMimeMatch[1] : "image/jpeg";
            var attSafeName = (displayName || "student").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
            var attFileName = attSafeName + "_" + registrationId + "_" + Utilities.formatDate(new Date(), "GMT+3", "yyyyMMdd_HHmm") + ".jpg";
            var attUpRes = uploadFileToDrive(attStr, attFileName, attMime, targetFolderId);
            if (attUpRes && attUpRes.success && (attUpRes.fileUrl || attUpRes.viewUrl || attUpRes.downloadUrl)) {
              data.attachment = attUpRes.fileUrl || attUpRes.viewUrl || attUpRes.downloadUrl;
              lastUploadedUrl = data.attachment;
            } else {
              data.attachment = "[صورة مرفقة]";
            }
          } catch (e) {
            data.attachment = "[صورة مرفقة]";
          }
        }
      }
      if (!answersMap["رفع ملف"]) {
        answersMap["رفع ملف"] = data.attachment;
      }
    }

    // قراءة أسئلة ورقة RegistrationQuestions لتحديد الأعمدة النشطة بدقة وبدون أي أثر للنظام القديم
    var activeQuestions = [];
    var scoredQuestionsMap = {};
    var hasScoredQuestions = (data.hasScoredQuestions === true);

    try {
      var qSheetObj = ss.getSheetByName("RegistrationQuestions") || ss.getSheetByName("أسئلة التسجيل");
      if (qSheetObj) {
        var qData = qSheetObj.getDataRange().getValues();
        for (var qi = 0; qi < qData.length; qi++) {
          var qRow = qData[qi];
          if (!qRow || !qRow[0]) continue;
          var qTitle = String(qRow[0]).trim();
          var qTypeVal = qRow[2] ? String(qRow[2]).trim().toLowerCase() : "text";

          // تجاوز الترويسة إن وجدت
          if (qTitle === "السؤال" || qTitle === "عنوان الحقل" || qTitle === "Question" || qTitle === "نص السؤال") continue;

          // تجاوز عناصر العرض فقط التي لا تتطلب إجابة
          if (
            qTitle === "صورة" ||
            qTypeVal === "صورة" ||
            qTypeVal.indexOf("عرض صورة") !== -1 ||
            qTypeVal.indexOf("عنوان زر") !== -1 ||
            qTypeVal === "زر" ||
            qTypeVal === "button"
          ) {
            continue;
          }

          // تجاوز أسئلة الاسم ورقم المشترك إذا وُجدت لأنها مسجلة سلفاً في العمودين B و C
          var normQT = normalizeQuestionKey(qTitle);
          if (
            normQT === "الاسم" ||
            normQT === "اسم المشترك" ||
            normQT === "الاسم الكامل" ||
            normQT === "رقم المشترك" ||
            normQT === "رقم التسجيل" ||
            normQT === "id"
          ) {
            continue;
          }

          activeQuestions.push({
            title: qTitle,
            type: qTypeVal
          });

          if (isScoredQuestionType(qTypeVal)) {
            scoredQuestionsMap[normQT] = true;
            hasScoredQuestions = true;
          }
        }
      }
    } catch (qErr) {
      Logger.log("Notice: Could not read RegistrationQuestions: " + qErr.message);
    }

    // إذا تعذر قراءة ورقة الأسئلة مباشرة، نعتمد على الأسئلة الواردة من واجهة المستخدم
    if (activeQuestions.length === 0 && data.answers && Array.isArray(data.answers)) {
      for (var di = 0; di < data.answers.length; di++) {
        var dItem = data.answers[di];
        if (!dItem || !dItem.question) continue;
        var dQT = String(dItem.question).trim();
        var normDQT = normalizeQuestionKey(dQT);
        if (
          normDQT === "الاسم" ||
          normDQT === "اسم المشترك" ||
          normDQT === "الاسم الكامل" ||
          normDQT === "رقم المشترك" ||
          normDQT === "رقم التسجيل" ||
          normDQT === "id"
        ) {
          continue;
        }
        var dType = dItem.type || "text";
        activeQuestions.push({
          title: dQT,
          type: dType
        });
        if (isScoredQuestionType(dType)) {
          scoredQuestionsMap[normDQT] = true;
          hasScoredQuestions = true;
        }
      }
    }

    // حساب مجموع نقاط أسئلة (اختيارات 2 / scored_choice)
    var totalScore = 0;
    if (data.answers && Array.isArray(data.answers)) {
      for (var ai = 0; ai < data.answers.length; ai++) {
        var aItem = data.answers[ai];
        if (!aItem) continue;
        var aType = (aItem.type || "").toString().toLowerCase().trim();
        var aQ = (aItem.question || "").toString().trim();
        var isScoredType = (
          isScoredQuestionType(aType) ||
          scoredQuestionsMap[normalizeQuestionKey(aQ)] === true ||
          aItem.score !== undefined
        );

        if (isScoredType) {
          hasScoredQuestions = true;
          var scoreNum = extractScoreFromAnswer(aItem.answer);
          if (scoreNum === 0 && aItem.score !== undefined && aItem.score !== null) {
            scoreNum = Number(aItem.score) || 0;
          }
          totalScore += scoreNum;
        }
      }
    }

    // إذا تم تمرير مجموع النقاط جاهزاً من الواجهة
    if (totalScore === 0 && data.totalScore !== undefined && data.totalScore !== null && !isNaN(Number(data.totalScore))) {
      totalScore = Number(data.totalScore);
      if (totalScore > 0) hasScoredQuestions = true;
    }

    // بناء نص تجميع كل الإجابات في خلية واحدة مفصولة بـ ( ||| ) للعمود الخامس في ورقة المشتركين
    // نعتمد على الإجابات المنظفة بعد تحويل أي صورة مرفوعة إلى رابط قوقل درايف قصير
    var combinedAnswersStr = "";
    if (data.answers && Array.isArray(data.answers) && data.answers.length > 0) {
      var ansParts = [];
      for (var cai = 0; cai < data.answers.length; cai++) {
        var cItem = data.answers[cai];
        if (!cItem) continue;
        var cAns = (cItem.answer !== undefined && cItem.answer !== null) ? String(cItem.answer).trim() : "";
        if (cAns && (cAns.indexOf("data:") === 0 || cAns.indexOf("base64,") !== -1)) {
          cAns = answersMap[cItem.question] || lastUploadedUrl || "[صورة مرفقة]";
        }
        ansParts.push(safeCellText(cAns) || "-");
      }
      combinedAnswersStr = ansParts.join(" ||| ");
    } else if (data.combinedAnswers) {
      combinedAnswersStr = String(data.combinedAnswers).replace(/data:[^|]+/g, lastUploadedUrl || "[صورة مرفقة]");
    }

    var aiAnalysisStr = safeCellText(data.aiAnalysis || "");

    // =========================================================================
    // أولاً: التسجيل المباشر في نفس صف المشترك داخل ورقة (المشتركين)
    // العمود 1 (A): رقم تسلسل
    // العمود 2 (B): Student ID
    // العمود 3 (C): Student Name
    // العمود 4 (D): عدد مجموع النقاط
    // العمود 5 (E): تجميع كل الإجابات (|||)
    // العمود 6 (F): تحليل الذكاء الاصطناعي
    // =========================================================================
    try {
      updateSubscriberRowInSheet({
        studentId: registrationId,
        studentName: displayName,
        totalScore: totalScore,
        combinedAnswers: combinedAnswersStr,
        aiAnalysis: aiAnalysisStr
      });
    } catch (subSheetErr) {
      Logger.log("Subscribers sheet update notice: " + subSheetErr.toString());
    }

    // بناء الترويسة القياسية الصارمة والمطلوبة:
    // العمود A: التاريخ والوقت
    // العمود B: رقم التسجيل (رقم المشترك الفعلي)
    // العمود C: الاسم الكامل للمشترك
    // الأعمدة اللاحقة: أسئلة الاستمارة الفعالة بالترتيب الدقيق
    // العمود الأخير دائماً: مجموع النقاط
    var expectedHeaders = [
      "التاريخ والوقت",
      "رقم التسجيل",
      "الاسم الكامل للمشترك"
    ];
    for (var aq = 0; aq < activeQuestions.length; aq++) {
      expectedHeaders.push(activeQuestions[aq].title);
    }
    // وضع عنوان العمود الأخير تلقائياً باسم: مجموع النقاط
    expectedHeaders.push("مجموع النقاط");

    // قراءة ترويسة الأعمدة الحالية في ورقة RegistrationAnswers
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = [];

    if (lastRow > 0 && lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return (h || "").toString().trim();
      });
      while (headers.length > 0 && !headers[headers.length - 1]) {
        headers.pop();
      }
    }

    // التحقق مما إذا كانت الترويسة بحاجة لتحديث فوري لمطابقة الهيكل الجديد
    var needHeaderUpdate = false;
    if (headers.length !== expectedHeaders.length) {
      needHeaderUpdate = true;
    } else if (!isTotalScoreHeader(headers[headers.length - 1])) {
      needHeaderUpdate = true;
    } else if (
      headers[0] !== "التاريخ والوقت" ||
      headers[1] !== "رقم التسجيل" ||
      headers[2] !== "الاسم الكامل للمشترك"
    ) {
      needHeaderUpdate = true;
    } else {
      for (var hi = 0; hi < expectedHeaders.length; hi++) {
        if (normalizeQuestionKey(headers[hi]) !== normalizeQuestionKey(expectedHeaders[hi])) {
          needHeaderUpdate = true;
          break;
        }
      }
    }

    // إذا كانت الترويسة بحاجة لتحديث، نطبق الهيكل النظيف والجديد فوراً
    if (needHeaderUpdate && expectedHeaders.length >= 3) {
      var maxClearCols = Math.max(headers.length, expectedHeaders.length, lastCol || 0, 50);
      sheet.getRange(1, 1, 1, maxClearCols).clearContent();
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      
      // التنسيق العام لترويسة الأعمدة
      sheet.getRange(1, 1, 1, expectedHeaders.length)
        .setFontWeight("bold")
        .setBackground("#1E293B")
        .setFontColor("#F8FAFC")
        .setHorizontalAlignment("center");

      // تمييز عمود مجموع النقاط الأخير بلون مميز
      sheet.getRange(1, expectedHeaders.length)
        .setFontWeight("bold")
        .setBackground("#047857")
        .setFontColor("#FFFFFF")
        .setHorizontalAlignment("center");

      sheet.setFrozenRows(1);
      headers = expectedHeaders;
    }

    // بناء صف الإدخال الجديد بالترتيب الصارم:
    // العمود 0 (A): التاريخ والوقت
    // العمود 1 (B): رقم التسجيل
    // العمود 2 (C): الاسم الكامل للمشترك
    // العمود 3 فما بعد (D+): إجابات الأسئلة بالترتيب الدقيق
    // العمود الأخير: مجموع النقاط
    var newRow = [];
    var totalScoreColIndex = headers.length - 1;

    for (var c = 0; c < headers.length; c++) {
      var hName = headers[c];

      // 1. العمود الأول (A): التاريخ والوقت حصراً
      if (c === 0) {
        newRow.push(timestamp);
      } 
      // 2. العمود الثاني (B): رقم التسجيل حصراً
      else if (c === 1) {
        newRow.push(registrationId);
      } 
      // 3. العمود الثالث (C): الاسم الكامل للمشترك حصراً
      else if (c === 2) {
        newRow.push(displayName);
      } 
      // 4. العمود الأخير: مجموع النقاط
      else if (c === totalScoreColIndex || (c > 2 && isTotalScoreHeader(hName))) {
        newRow.push(hasScoredQuestions || totalScore > 0 ? totalScore : (hasScoredQuestions ? 0 : ""));
      } 
      // 5. جميع الأعمدة الأخرى (من D إلى ما قبل الأخير): إجابات أسئلة الاستمارة
      else {
        var qIdx = c - 3;
        var ans = findAnswerForColumn(hName, answersMap, data, qIdx);
        // حفظ الإجابة كنص صريح وآمن دون تجاوز حد الخلية
        var ansStr = safeCellText(ans);
        newRow.push(ansStr);
      }
    }

    // تنظيف أي صفوف فارغة سابقة (بدون رقم تسجيل وبدون اسم) في ورقة RegistrationAnswers
    try {
      var currentLastRow = sheet.getLastRow();
      if (currentLastRow > 1) {
        var checkRange = sheet.getRange(2, 2, currentLastRow - 1, 2).getValues();
        for (var delIdx = checkRange.length - 1; delIdx >= 0; delIdx--) {
          var checkId = checkRange[delIdx][0] ? String(checkRange[delIdx][0]).trim() : "";
          var checkName = checkRange[delIdx][1] ? String(checkRange[delIdx][1]).trim() : "";
          if (!checkId && !checkName) {
            sheet.deleteRow(delIdx + 2);
          }
        }
      }
      lastRow = sheet.getLastRow();
    } catch (cleanErr) {}

    // فحص منع التكرار: البحث عن رقم المشترك في العمود B
    var regIdColIdx = 2; // العمود B دائماً
    var existingRowIdx = -1;
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, regIdColIdx, lastRow - 1, 1).getValues();
      for (var r = 0; r < idValues.length; r++) {
        var cellVal = idValues[r][0] ? idValues[r][0].toString().trim() : "";
        if (cellVal && cellVal === registrationId) {
          existingRowIdx = r + 2;
          break;
        }
      }
    }

    if (existingRowIdx !== -1) {
      // تحديث بيانات المشترك نفسه
      sheet.getRange(existingRowIdx, 1, 1, newRow.length).setValues([newRow]);
      if (newRow.length > 3) {
        var qColsCount = (totalScoreColIndex > 3) ? (totalScoreColIndex - 3) : (newRow.length - 3);
        if (qColsCount > 0) {
          sheet.getRange(existingRowIdx, 4, 1, qColsCount).setNumberFormat("@");
        }
      }
      return {
        success: true,
        registrationId: registrationId,
        timestamp: timestamp,
        isUpdated: true,
        message: "تم تحديث بيانات التسجيل للرقم (" + registrationId + ") بنجاح!"
      };
    } else {
      // إضافة صف جديد
      sheet.appendRow(newRow);
      var newLastRow = sheet.getLastRow();
      if (newLastRow > 1) {
        sheet.getRange(newLastRow, 1, 1, newRow.length).setVerticalAlignment("middle");
        sheet.getRange(newLastRow, 1).setHorizontalAlignment("center");
        sheet.getRange(newLastRow, 2).setHorizontalAlignment("center").setFontWeight("bold");
        if (newRow.length > 3) {
          var qColsCount = (totalScoreColIndex > 3) ? (totalScoreColIndex - 3) : (newRow.length - 3);
          if (qColsCount > 0) {
            sheet.getRange(newLastRow, 4, 1, qColsCount).setNumberFormat("@");
          }
          sheet.getRange(newLastRow, newRow.length).setHorizontalAlignment("center").setFontWeight("bold");
        }
      }
    }

    return {
      success: true,
      registrationId: registrationId,
      timestamp: timestamp,
      message: "تم حفظ طلب التسجيل بنجاح بالرقم المرجعي (" + registrationId + ") في جدول البيانات!"
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
      } else if (rawType.indexOf("اختيارات 3") !== -1 || rawType.indexOf("اختيار 3") !== -1 || rawType.indexOf("اختيارات3") !== -1 || rawType.indexOf("متعدد") !== -1 || rawType.indexOf("checkbox") !== -1 || rawType.indexOf("multiple_choice") !== -1) {
        fieldType = "multiple_choice";
      } else if (rawType.indexOf("اختيارات 2") !== -1 || rawType.indexOf("اختيار 2") !== -1 || rawType.indexOf("اختيارات2") !== -1 || rawType.indexOf("choice2") !== -1 || rawType.indexOf("scored_choice") !== -1 || rawType.indexOf("نقاط") !== -1) {
        fieldType = "scored_choice";
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

// 6. جلب السجلات المسجلة من ورقة RegistrationAnswers
function getRegistrationAnswersRecords() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("RegistrationAnswers") || ss.getSheetByName("طلبات التسجيل") || ss.getSheetByName("إجابات التسجيل");
    if (!sheet) return { headers: [], records: [] };
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) return { headers: values[0] || [], records: [] };
    var headers = values[0].map(function(h) { return (h || "").toString().trim(); });
    var records = [];
    for (var r = values.length - 1; r >= 1; r--) {
      var row = values[r];
      var rec = { rowIndex: r + 1, rowData: {} };
      for (var c = 0; c < headers.length; c++) {
        var hName = headers[c] || ("Column_" + (c + 1));
        var val = (row[c] !== undefined && row[c] !== null) ? row[c] : "";
        rec.rowData[hName] = val;
      }
      records.push(rec);
    }
    return { headers: headers, records: records };
  } catch(e) {
    return { headers: [], records: [], error: e.toString() };
  }
}

// 7. حفظ وتحديث أسئلة ورقة RegistrationQuestions من لوحة الإدارة
function saveFormQuestionsToSheet(questions) {
  try {
    if (!questions || !Array.isArray(questions)) {
      return { success: false, error: "قائمة الأسئلة غير صالحة" };
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "RegistrationQuestions";
    var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName("أسئلة التسجيل");
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    var headers = [
      "نص السؤال",
      "الوصف التوضيحي",
      "نوع العنصر",
      "الخيارات المتاحة",
      "هل الحقل إجباري؟",
      "رابط الصورة المعروضة",
      "رابط خارجي أو ملف PDF"
    ];

    sheet.clearContents();
    var rows = [headers];

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q) continue;

      var optStr = "";
      if (Array.isArray(q.options)) {
        optStr = q.options.join("|||");
      } else if (q.options) {
        optStr = String(q.options);
      }

      var reqStr = (q.required === true || q.required === "نعم") ? "نعم" : "لا";
      
      var rawT = (q.type || "text").toString().toLowerCase().trim();
      var typeAr = "نص";
      if (rawT === "choice" || (rawT.indexOf("اختيار") !== -1 && rawT.indexOf("2") === -1 && rawT.indexOf("3") === -1)) {
        typeAr = "اختيارات";
      } else if (rawT === "scored_choice" || rawT.indexOf("2") !== -1 || rawT.indexOf("نقاط") !== -1) {
        typeAr = "اختيارات 2";
      } else if (rawT === "multiple_choice" || rawT.indexOf("3") !== -1 || rawT.indexOf("متعدد") !== -1 || rawT.indexOf("checkbox") !== -1) {
        typeAr = "اختيارات 3";
      } else if (rawT === "file" || rawT.indexOf("ملف") !== -1 || rawT.indexOf("رفع") !== -1) {
        typeAr = "رفع ملف";
      } else if (rawT === "phone" || rawT.indexOf("هاتف") !== -1) {
        typeAr = "رقم هاتف";
      } else if (rawT === "email" || rawT.indexOf("ايميل") !== -1 || rawT.indexOf("بريد") !== -1) {
        typeAr = "ايميل";
      } else if (rawT === "number" || rawT.indexOf("رقم") !== -1) {
        typeAr = "رقم";
      } else if (rawT === "image_display" || rawT === "صورة" || rawT.indexOf("عرض صورة") !== -1) {
        typeAr = "صورة";
      } else if (rawT === "button_title" || rawT.indexOf("زر") !== -1) {
        typeAr = "عنوان زر";
      }

      rows.push([
        q.question || "",
        q.description || "",
        typeAr,
        optStr,
        reqStr,
        q.imageUrl || "",
        q.externalLink || ""
      ]);
    }

    sheet.getRange(1, 1, rows.length, 7).setValues(rows);
    sheet.getRange(1, 1, 1, 7)
      .setFontWeight("bold")
      .setBackground("#1E293B")
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    return {
      success: true,
      count: questions.length,
      message: "تم حفظ وتحديث " + questions.length + " سؤال في ورقة RegistrationQuestions بنجاح!"
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString(),
      message: "فشل حفظ الأسئلة: " + err.toString()
    };
  }
}

// =========================================================================
// 8. دوال إدارة ورقة (المشتركين) — التحقق من الدخول وتسجيل النتائج في نفس الصف
// هيكل ورقة (المشتركين):
// العمود A (1): التسلسل
// العمود B (2): Student ID
// العمود C (3): Student Name
// العمود D (4): مجموع النقاط
// العمود E (5): الإجابات (|||)
// العمود F (6): تحليل الذكاء الاصطناعي
// =========================================================================

function getOrCreateSubscribersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("المشتركين") || ss.getSheetByName("Subscribers");
  if (!sheet) {
    sheet = ss.insertSheet("المشتركين");
    var headers = [
      "التسلسل",
      "Student ID",
      "Student Name",
      "مجموع النقاط",
      "الإجابات (|||)",
      "تحليل الذكاء الاصطناعي"
    ];
    sheet.getRange(1, 1, 1, 6).setValues([headers]);
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#1E293B")
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  } else {
    // التأكد من وجود عناوين الأعمدة الـ 6 في الصف الأول إذا كانت فارغة
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      var initHeaders = [
        "التسلسل",
        "Student ID",
        "Student Name",
        "مجموع النقاط",
        "الإجابات (|||)",
        "تحليل الذكاء الاصطناعي"
      ];
      sheet.getRange(1, 1, 1, 6).setValues([initHeaders]);
      sheet.setFrozenRows(1);
    } else {
      var row1 = sheet.getRange(1, 1, 1, 6).getValues()[0];
      if (!row1[3]) sheet.getRange(1, 4).setValue("مجموع النقاط");
      if (!row1[4]) sheet.getRange(1, 5).setValue("الإجابات (|||)");
      if (!row1[5]) sheet.getRange(1, 6).setValue("تحليل الذكاء الاصطناعي");
    }
  }
  return sheet;
}

function getSubscribersFromSheet() {
  try {
    var sheet = getOrCreateSubscribersSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    var data = sheet.getRange(1, 1, lastRow, Math.max(6, sheet.getLastColumn())).getValues();
    var list = [];
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var seq = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : "";
      var stuId = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : "";
      var stuName = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : "";
      var score = row[3] !== undefined && row[3] !== null ? row[3] : "";
      var combinedAns = row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : "";
      var aiAnal = row[5] !== undefined && row[5] !== null ? String(row[5]).trim() : "";

      if (!stuId && !stuName) continue;

      list.push({
        rowIndex: r + 1,
        sequence: seq || r,
        studentId: stuId,
        studentName: stuName,
        totalScore: score,
        combinedAnswers: combinedAns,
        aiAnalysis: aiAnal,
        hasAnswered: Boolean(combinedAns && combinedAns !== "-")
      });
    }
    return list;
  } catch (e) {
    return [];
  }
}

function normalizeSubIdKey(val) {
  if (val === undefined || val === null) return "";
  return String(val)
    .trim()
    .replace(/[٠-٩]/g, function(d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
    .replace(/[۰-۹]/g, function(d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); })
    .replace(/^#/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function updateSubscriberRowInSheet(postData) {
  try {
    var sheet = getOrCreateSubscribersSheet();
    var stuId = String(postData.studentId || postData.registrationId || "").trim();
    var stuName = String(postData.studentName || postData.name || "").trim();

    // منع إضافة أي صف فارغ بدون رقم مشترك أو اسم
    if (!stuId && !stuName) {
      return {
        success: false,
        error: "Empty studentId and studentName"
      };
    }

    var scoreVal = postData.clearAnswer ? "" : (postData.totalScore !== undefined ? postData.totalScore : "");
    var rawCombined = postData.clearAnswer ? "" : String(postData.combinedAnswers || "");
    if (rawCombined.indexOf("data:") === 0 || rawCombined.indexOf("base64,") !== -1) {
      rawCombined = rawCombined.replace(/data:[^|]+/g, "[صورة مرفقة]");
    }
    if (rawCombined.length > 45000) {
      rawCombined = rawCombined.substring(0, 45000) + "...";
    }
    var combinedAns = rawCombined;

    var rawAi = postData.clearAnswer ? "" : String(postData.aiAnalysis || "");
    if (rawAi.length > 45000) {
      rawAi = rawAi.substring(0, 45000) + "...";
    }
    var aiAnal = rawAi;

    // تنظيف أي صفوف فارغة سابقة في ورقة المشتركين (التي لا تحتوي على Student ID ولا Student Name)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      try {
        var checkSubRows = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
        for (var dIdx = checkSubRows.length - 1; dIdx >= 0; dIdx--) {
          var cId = checkSubRows[dIdx][0] !== undefined && checkSubRows[dIdx][0] !== null ? String(checkSubRows[dIdx][0]).trim() : "";
          var cName = checkSubRows[dIdx][1] !== undefined && checkSubRows[dIdx][1] !== null ? String(checkSubRows[dIdx][1]).trim() : "";
          if (!cId && !cName) {
            sheet.deleteRow(dIdx + 2);
          }
        }
        lastRow = sheet.getLastRow();
      } catch (e) {}
    }

    var targetRow = -1;
    var normTargetId = normalizeSubIdKey(stuId);

    if (lastRow >= 1) {
      var values = sheet.getRange(1, 1, lastRow, 6).getValues();
      for (var r = 0; r < values.length; r++) {
        var rowId = values[r][1] !== undefined && values[r][1] !== null ? String(values[r][1]).trim() : "";
        var rowName = values[r][2] !== undefined && values[r][2] !== null ? String(values[r][2]).trim() : "";
        if (normTargetId && rowId && normalizeSubIdKey(rowId) === normTargetId) {
          targetRow = r + 1;
          break;
        }
        if (!normTargetId && stuName && rowName && normalizeQuestionKey(rowName) === normalizeQuestionKey(stuName)) {
          targetRow = r + 1;
          break;
        }
      }
    }

    if (targetRow !== -1) {
      // إذا كان عمود التسلسل (A) فارغاً في صف المشترك، نضع رقم التسلسل تلقائياً
      try {
        var currentSeq = sheet.getRange(targetRow, 1).getValue();
        if (currentSeq === "" || currentSeq === null || currentSeq === undefined) {
          sheet.getRange(targetRow, 1).setValue(targetRow > 1 ? targetRow - 1 : 1);
        }
      } catch (e) {}

      // كتابة النتائج في نفس صف المشترك تماماً وبشكل مستقل لكل خلية:
      // العمود الرابع (4): عدد مجموع النقاط
      // العمود الخامس (5): تجميع كل الإجابات بفاصل (|||)
      // العمود السادس (6): تحليل الذكاء الاصطناعي
      try { sheet.getRange(targetRow, 4).setValue(scoreVal); } catch (e4) {}
      try { sheet.getRange(targetRow, 5).setNumberFormat("@").setValue(combinedAns); } catch (e5) {}
      try { sheet.getRange(targetRow, 6).setValue(aiAnal); } catch (e6) {}

      return {
        success: true,
        rowIndex: targetRow,
        studentId: stuId,
        message: "تم تسجيل النتائج في نفس صف المشترك رقم (" + stuId + ") في ورقة المشتركين بنجاح!"
      };
    } else {
      // إذا لم يكن المشترك مضافاً بعد، نضيف له صفاً جديداً في ورقة المشتركين
      var newSeq = lastRow > 0 ? lastRow : 1;
      sheet.appendRow([newSeq, stuId, stuName, scoreVal, combinedAns, aiAnal]);
      var appendedRow = sheet.getLastRow();
      try { sheet.getRange(appendedRow, 5).setNumberFormat("@"); } catch (e) {}
      return {
        success: true,
        rowIndex: appendedRow,
        studentId: stuId,
        message: "تمت إضافة صف المشترك وتسجيل نتائجه في ورقة المشتركين بنجاح!"
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}

function saveSubscribersListToSheet(subscribers) {
  try {
    if (!subscribers || !Array.isArray(subscribers)) {
      return { success: false, error: "Invalid subscribers array" };
    }
    var sheet = getOrCreateSubscribersSheet();
    var headers = [
      "التسلسل",
      "Student ID",
      "Student Name",
      "مجموع النقاط",
      "الإجابات (|||)",
      "تحليل الذكاء الاصطناعي"
    ];
    sheet.clearContents();
    var rows = [headers];
    for (var i = 0; i < subscribers.length; i++) {
      var s = subscribers[i];
      if (!s) continue;
      rows.push([
        s.sequence || (i + 1),
        s.studentId || "",
        s.studentName || "",
        s.totalScore !== undefined ? s.totalScore : "",
        s.combinedAnswers || "",
        s.aiAnalysis || ""
      ]);
    }
    sheet.getRange(1, 1, rows.length, 6).setValues(rows);
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#1E293B")
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    return {
      success: true,
      count: subscribers.length,
      message: "تم تحديث ورقة المشتركين بنجاح!"
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}
`;
