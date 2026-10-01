import { QuestionTranslation } from "../types";

/**
 * Built-in dictionary for individual choice options (Arabic -> English & Thai).
 * Matches both scored options ("1 - ...") and clean option texts so any question
 * using these options translates 100% on all devices immediately.
 */
export const DEFAULT_OPTION_TRANSLATIONS: Record<string, { en: string; th: string }> = {
  // General options
  "نعم": { en: "Yes", th: "ใช่" },
  "لا": { en: "No", th: "ไม่" },
  "✅ نعم = سبق لي": { en: "✅ Yes = Ever", th: "✅ ใช่ = เคย" },
  "❌ لا = لم يسبق لي": { en: "❌ No = Never", th: "❌ ไม่ = ไม่เคย" },
  "خيار 1": { en: "Option 1", th: "ตัวเลือกที่ 1" },
  "خيار 2": { en: "Option 2", th: "ตัวเลือกที่ 2" },
  "لا أعرف بعد": { en: "I don't know yet", th: "ยังไม่แน่ใจ" },
  "غير ذلك": { en: "Other", th: "อื่นๆ" },
  "استفادة ممتازة وتقدم واضح": { en: "Excellent benefit and clear progress", th: "ได้รับประโยชน์อย่างยอดเยี่ยมและมีความก้าวหน้าชัดเจน" },
  "استفادة جيدة جداً": { en: "Very good benefit", th: "ได้รับประโยชน์ดีมาก" },
  "استفادة متوسطة": { en: "Moderate benefit", th: "ได้รับประโยชน์ปานกลาง" },
  "أحتاج لمزيد من التدريب": { en: "I need more practice", th: "ฉันต้องการการฝึกฝนเพิ่มเติม" },
  "التزام يومي كامل ودقيق": { en: "Full and accurate daily commitment", th: "มีความมุ่งมั่นและฝึกฝนทุกวันอย่างครบถ้วน" },
  "التزام غالبية الأيام": { en: "Committed on most days", th: "ฝึกฝนเป็นส่วนใหญ่" },
  "التزام متقطع": { en: "Intermittent commitment", th: "ฝึกฝนเป็นบางครั้ง" },
  "واجهت صعوبة في الالتزام": { en: "I faced difficulty staying committed", th: "ประสบปัญหาในการฝึกฝนอย่างต่อเนื่อง" },

  // Q3: هل سبق لك تعلم الخط العربي؟
  "لم أتعلمه من قبل": { en: "I have never learned it before", th: "ไม่เคยเรียนมาก่อน" },
  "تعلمت بشكل بسيط": { en: "I learned a little bit", th: "เคยเรียนพื้นฐานเล็กน้อย" },
  "تعلمت في دورة أو برنامج": { en: "I learned in a course or program", th: "เคยเรียนในหลักสูตรหรือโปรแกรม" },
  "تعلمت مع معلم": { en: "I learned with a teacher", th: "เคยเรียนกับครูผู้สอน" },
  "تعلمت بشكل مستمر": { en: "I have been learning continuously", th: "เรียนรู้อย่างต่อเนื่อง" },

  // Q4: هل لديك تجربة سابقة في الرسم أو أي مجال فني؟
  "تجربة بسيطة": { en: "Basic / slight experience", th: "มีประสบการณ์เล็กน้อย" },
  "تعلمت لفترة": { en: "I learned for a period of time", th: "เคยเรียนมาระยะหนึ่ง" },
  "لدي ممارسة مستمرة": { en: "I practice continuously", th: "ฝึกฝนอย่างต่อเนื่อง" },
  "مجال آخر: ______": { en: "Another field: ______", th: "สาขาอื่นๆ: ______" },

  // Q5: من الذي اقترح عليك تعلم الخط العربي؟
  "أنا اخترت ذلك بنفسي": { en: "I chose it myself", th: "ฉันเลือกเรียนด้วยตัวเอง" },
  "الوالد": { en: "Father", th: "บิดา (พ่อ)" },
  "الوالدة": { en: "Mother", th: "มารดา (แม่)" },
  "أحد أفراد الأسرة": { en: "A family member", th: "สมาชิกในครอบครัว" },
  "المعلم": { en: "Teacher", th: "ครู / อาจารย์" },
  "صديق أو شخص آخر": { en: "A friend or someone else", th: "เพื่อนหรือบุคคลอื่น" },
  "جهة تعليمية": { en: "An educational institution", th: "สถาบันการศึกษา" },

  // Q6: لو لم يقترح عليك أحد تعلم الخط العربي، إلى أي درجة كنت ستختار تعلمه بنفسك؟
  "بالتأكيد لن أختاره": { en: "I would definitely not choose it", th: "ไม่เลือกเรียนอย่างแน่นอน" },
  "غالبًا لن أختاره": { en: "I would probably not choose it", th: "อาจจะไม่เลือกเรียน" },
  "ربما أختاره": { en: "I might choose it", th: "อาจจะเลือกเรียน" },
  "غالبًا سأختاره": { en: "I would probably choose it", th: "มีแนวโน้มว่าจะเลือกเรียน" },
  "بالتأكيد سأختاره": { en: "I would definitely choose it", th: "เลือกเรียนอย่างแน่นอน" },

  // Q7: ما مدى رغبتك الحالية في البدء بتعلم الخط العربي؟
  "لا توجد لدي رغبة حقيقية": { en: "I have no real desire", th: "ไม่มีความต้องการที่แท้จริง" },
  "رغبتي ضعيفة": { en: "My desire is weak", th: "มีความต้องการน้อย" },
  "رغبتي متوسطة": { en: "My desire is moderate", th: "มีความต้องการปานกลาง" },
  "لدي رغبة واضحة": { en: "I have a clear desire", th: "มีความต้องการอย่างชัดเจน" },
  "لدي رغبة قوية جدًا وحماس للبدء": { en: "I have a very strong desire and enthusiasm to start", th: "มีความต้องการอย่างยิ่งและกระตือรือร้นที่จะเริ่มต้น" },

  // Q8: ما السبب الأقرب لرغبتك في تعلم الخط العربي؟
  "أحب جمال الخط العربي": { en: "I love the beauty of Arabic calligraphy", th: "ฉันหลงใหลในความงามของอักษรวิจิตรอาหรับ" },
  "أحب الفن والأعمال اليدوية": { en: "I love art and handicrafts", th: "ฉันชอบงานศิลปะและงานฝีมือ" },
  "أريد تعلم مهارة جديدة": { en: "I want to learn a new skill", th: "ฉันต้องการเรียนรู้ทักษะใหม่" },
  "أريد تحسين كتابتي": { en: "I want to improve my handwriting", th: "ฉันต้องการพัฒนาลายมือของตัวเอง" },
  "أريد كتابة القرآن أو الآيات أو الأحاديث والعبارات الجميلة": {
    en: "I want to write the Quran, verses, Hadiths, and beautiful phrases",
    th: "ฉันต้องการเขียนอัลกุรอาน โองการ หะดีษ และข้อความที่สวยงาม"
  },
  "أريد استخدام الخط في عملي أو دراستي": {
    en: "I want to use calligraphy in my work or studies",
    th: "ฉันต้องการใช้อักษรวิจิตรในการทำงานหรือการเรียน"
  },
  "أريد أن أصبح خطاطًا": { en: "I want to become a calligrapher", th: "ฉันต้องการเป็นนักเขียนอักษรวิจิตร (ช่างเขียน خط)" },
  "شجعني شخص آخر على تعلمه": { en: "Someone else encouraged me to learn it", th: "มีคนอื่นแนะนำและสนับสนุนให้ฉันเรียน" },
  "أريد المشاركة في المسابقات أو المعارض": {
    en: "I want to participate in competitions or exhibitions",
    th: "ฉันต้องการเข้าร่วมการแข่งขันหรือนิทรรศการ"
  },
  "سبب آخر: ______": { en: "Another reason: ______", th: "เหตุผลอื่นๆ: ______" },

  // Q9: عندما ترى عملًا فنيًا جميلًا، إلى أي درجة تنتبه إلى تفاصيله؟
  "لا أنتبه للتفاصيل غالبًا": { en: "I rarely pay attention to details", th: "มักจะไม่ค่อยสังเกตรายละเอียด" },
  "أنتبه إلى التفاصيل بشكل قليل": { en: "I pay a little attention to details", th: "สังเกตรายละเอียดเพียงเล็กน้อย" },
  "أنتبه إلى بعض التفاصيل": { en: "I notice some details", th: "สังเกตรายละเอียดบางส่วน" },
  "أنتبه إلى معظم التفاصيل": { en: "I notice most details", th: "สังเกตรายละเอียดส่วนใหญ่" },
  "أركز على التفاصيل الدقيقة": { en: "I focus closely on fine details", th: "มุ่งเน้นและใส่ใจในรายละเอียดที่ประณีตอย่างลึกซึ้ง" },

  // Q10: عندما ترى خطًا عربيًا جميلًا، إلى أي درجة تلاحظ شكل الحروف وتفاصيلها؟
  "لا أهتم بالتفاصيل": { en: "I don't care about the details", th: "ไม่สนใจรายละเอียด" },
  "ألاحظها قليلًا": { en: "I notice them slightly", th: "สังเกตเห็นเพียงเล็กน้อย" },
  "ألاحظ بعض التفاصيل": { en: "I notice some details", th: "สังเกตเห็นรายละเอียดบางส่วน" },
  "ألاحظ معظم التفاصيل": { en: "I notice most details", th: "สังเกตเห็นรายละเอียดส่วนใหญ่" },
  "أركز كثيرًا على تفاصيل الحروف وشكلها": {
    en: "I focus heavily on the details and shapes of the letters",
    th: "ให้ความสำคัญอย่างมากกับรายละเอียดและรูปทรงของตัวอักษร"
  },

  // Q11: عندما تقوم بعمل يحتاج إلى دقة وتفاصيل، كيف تتعامل معه عادة؟
  "أفضل تجنب الأعمال الدقيقة": { en: "I prefer to avoid detailed work", th: "มักจะหลีกเลี่ยงงานที่ต้องใช้ความละเอียด" },
  "أجد صعوبة كبيرة في التعامل معها": { en: "I find it very difficult to handle", th: "รู้สึกยากลำบากมากในการจัดการกับงานละเอียด" },
  "أستطيع التعامل معها بدرجة متوسطة": { en: "I can handle it moderately well", th: "สามารถจัดการได้ในระดับปานกลาง" },
  "أتعامل معها بشكل جيد": { en: "I handle it well", th: "สามารถจัดการและทำได้ดี" },
  "أحب الأعمال التي تحتاج إلى دقة": { en: "I love work that requires precision", th: "ชื่นชอบงานที่ต้องใช้ความประณีตและความแม่นยำ" },

  // Q12: إذا لم تنجح في شيء من المحاولة الأولى، ماذا تفعل عادة؟
  "أتركه غالبًا": { en: "I usually give it up", th: "มักจะเลิกทำ" },
  "أحاول قليلًا ثم أتوقف": { en: "I try a little and then stop", th: "พยายามเล็กน้อยแล้วหยุด" },
  "أحاول عدة مرات حسب صعوبة الأمر": { en: "I try several times depending on the difficulty", th: "พยายามหลายครั้งตามระดับความยาก" },
  "أستمر في المحاولة حتى أتحسن": { en: "I keep trying until I improve", th: "พยายามต่อไปจนกว่าจะดีขึ้น" },
  "أكرر المحاولة حتى أصل إلى النتيجة المطلوبة": {
    en: "I repeat the attempt until I reach the desired result",
    th: "พยายามซ้ำๆ จนกว่าจะบรรลุผลลัพธ์ที่ต้องการ"
  },

  // Q13: إذا كان تعلم مهارة جديدة يحتاج إلى تكرار نفس التدريب مرات كثيرة، كيف تتعامل مع ذلك؟
  "أشعر بالملل وأتوقف سريعًا": { en: "I get bored and stop quickly", th: "รู้สึกเบื่อและหยุดทำอย่างรวดเร็ว" },
  "أجد صعوبة في الاستمرار": { en: "I find it hard to continue", th: "รู้สึกยากที่จะทำอย่างต่อเนื่อง" },
  "أستطيع الاستمرار لفترة": { en: "I can continue for a while", th: "สามารถทำต่อเนื่องได้ระยะหนึ่ง" },
  "أستطيع الاستمرار بشكل جيد": { en: "I can continue well", th: "สามารถทำอย่างต่อเนื่องได้ดี" },
  "لا أمانع التكرار وأستمر حتى أتحسن": {
    en: "I don't mind repetition and keep going until I improve",
    th: "ไม่รังเกียจการฝึกซ้ำและทำต่อไปจนกว่าจะพัฒนาขึ้น"
  },

  // Q14: إذا وجدت تمرينًا أصعب مما توقعت، ماذا تفعل عادة؟
  "أترك التمرين": { en: "I leave the exercise", th: "เลิกทำแบบฝึกหัดนั้น" },
  "أتوقف إذا لم أجد نتيجة سريعة": { en: "I stop if I don't see quick results", th: "หยุดทำหากไม่เห็นผลลัพธ์ที่รวดเร็ว" },
  "أحاول ثم أطلب المساعدة": { en: "I try and then ask for help", th: "ลองทำดูก่อนแล้วจึงขอความช่วยเหลือ" },
  "أحاول وأستفيد من التوجيه": { en: "I try and benefit from guidance", th: "พยายามทำและนำคำแนะนำมาปรับใช้" },
  "أواصل المحاولة وأبحث عن طريقة للتحسن": {
    en: "I keep trying and look for ways to improve",
    th: "พยายามต่อไปและค้นหาวิธีพัฒนาตัวเองให้ดีขึ้น"
  },

  // Q15: عندما تبدأ شيئًا جديدًا، كيف يكون التزامك عادة؟
  "أبدأ ثم أتركه غالبًا": { en: "I start and usually leave it", th: "เริ่มต้นแต่มักจะเลิกกลางคัน" },
  "أستمر لفترة قصيرة": { en: "I continue for a short period", th: "ทำต่อเนื่องได้เพียงช่วงสั้นๆ" },
  "أستمر أحيانًا وأتوقف أحيانًا": { en: "I continue sometimes and stop sometimes", th: "ทำบ้างหยุดบ้างเป็นบางครั้ง" },
  "ألتزم به في معظم الأحيان": { en: "I stay committed most of the time", th: "มีความมุ่งมั่นและทำอย่างสม่ำเสมอเป็นส่วนใหญ่" },
  "أحرص على الاستمرار حتى النهاية": { en: "I make sure to continue until the end", th: "ตั้งใจทำอย่างต่อเนื่องจนจบ" },

  // Q16: كم من الوقت تستطيع تخصيصه للتدريب على الخط العربي أسبوعيًا؟
  "أقل من ساعة": { en: "Less than 1 hour", th: "น้อยกว่า 1 ชั่วโมง" },
  "1–2 ساعة": { en: "1–2 hours", th: "1–2 ชั่วโมง" },
  "3–4 ساعات": { en: "3–4 hours", th: "3–4 ชั่วโมง" },
  "5–7 ساعات": { en: "5–7 hours", th: "5–7 ชั่วโมง" },
  "أكثر من 7 ساعات": { en: "More than 7 hours", th: "มากกว่า 7 ชั่วโมง" },

  // Q17: عندما يكون لديك تدريب أو مهمة يجب إنجازها خلال فترة محددة، كيف تتعامل معها عادة؟
  "غالبًا لا أنجزها": { en: "I usually don't complete it", th: "มักจะทำไม่สำเร็จตามกำหนด" },
  "أنجزها أحيانًا فقط": { en: "I only complete it sometimes", th: "ทำสำเร็จเป็นบางครั้งเท่านั้น" },
  "أنجزها إذا كان لدي وقت كافٍ": { en: "I complete it if I have enough time", th: "ทำสำเร็จหากมีเวลาเพียงพอ" },
  "أحرص على إنجازها في الوقت المحدد": { en: "I make sure to complete it on time", th: "ตั้งใจทำให้เสร็จตามเวลาที่กำหนด" },
  "أرتب وقتي وأحرص على إنجازها في موعدها": {
    en: "I organize my time and ensure it gets done on schedule",
    th: "จัดสรรเวลาและทำให้สำเร็จตรงตามกำหนดเสมอ"
  },

  // Q18: إلى أي درجة تعرف ما الذي تريد الوصول إليه من تعلم الخط العربي؟
  "لا أعرف ما أريد": { en: "I don't know what I want", th: "ยังไม่รู้ว่าต้องการอะไร" },
  "لدي فكرة بسيطة": { en: "I have a basic idea", th: "มีแนวคิดคร่าวๆ เล็กน้อย" },
  "لدي هدف عام": { en: "I have a general goal", th: "มีเป้าหมายโดยรวมกว้างๆ" },
  "لدي هدف واضح": { en: "I have a clear goal", th: "มีเป้าหมายที่ชัดเจน" },
  "لدي هدف واضح وأعرف ما أريد تحقيقه": {
    en: "I have a clear goal and know exactly what I want to achieve",
    th: "มีเป้าหมายที่ชัดเจนและรู้ว่าต้องการบรรลุสิ่งใด"
  },

  // Q21: عندما تتعلم مهارة جديدة، أي طريقة تناسبك أكثر؟
  "شرح المعلم ثم التطبيق": { en: "Teacher's explanation then practice", th: "ฟังครูอธิบายแล้วจึงลงมือปฏิบัติ" },
  "مشاهدة المعلم ثم تقليده": { en: "Watching the teacher then imitating", th: "ดูครูสาธิตแล้วฝึกทำตาม" },
  "التدريب العملي مباشرة": { en: "Direct hands-on practice", th: "ลงมือฝึกปฏิบัติจริงโดยตรง" },
  "التكرار والتدريب الكثير": { en: "Repetition and extensive practice", th: "การฝึกซ้ำๆ และฝึกฝนอย่างหนัก" },
  "التعلم من خلال الصور أو الفيديو": { en: "Learning through images or videos", th: "เรียนรู้ผ่านรูปภาพหรือวิดีโอ" },
  "أحتاج إلى متابعة مباشرة من المعلم": { en: "I need direct follow-up from the teacher", th: "ต้องการการดูแลและแนะนำอย่างใกล้ชิดจากครู" },

  // Q22: إذا أخبرك المعلم أن الطريقة التي تستخدمها تحتاج إلى تغيير، كيف تتعامل مع ذلك؟
  "أرفض تغيير طريقتي": { en: "I refuse to change my method", th: "ปฏิเสธที่จะเปลี่ยนวิธีการของตัวเอง" },
  "أجد صعوبة كبيرة في قبول التغيير": { en: "I find it very difficult to accept change", th: "รู้สึกยากมากที่จะยอมรับการเปลี่ยนแปลง" },
  "أقبل التغيير بعد فهم السبب": { en: "I accept the change after understanding the reason", th: "ยอมรับการเปลี่ยนแปลงหลังจากเข้าใจเหตุผล" },
  "أحاول تطبيق الطريقة الجديدة": { en: "I try to apply the new method", th: "พยายามนำวิธีการใหม่มาใช้" },
  "أرحب بالتوجيه وأحاول تطبيقه بدقة": {
    en: "I welcome the guidance and try to apply it accurately",
    th: "ยินดีรับคำแนะนำและพยายามนำไปปฏิบัติอย่างถูกต้องแม่นยำ"
  },

  // Q23: إذا لم تفهم تعليمات المعلم، ماذا تفعل؟
  "لا أسأل وأكمل بطريقتي": { en: "I don't ask and continue my own way", th: "ไม่ถามและทำต่อตามวิธีของตัวเอง" },
  "أحاول وحدي وقد أتوقف": { en: "I try on my own and might stop", th: "ลองทำเองคนเดียวและอาจจะหยุดทำ" },
  "أسأل إذا لم أستطع الحل": { en: "I ask if I can't figure it out", th: "ถามเมื่อไม่สามารถแก้ไขปัญหาเองได้" },
  "أطلب التوضيح وأحاول مرة أخرى": { en: "I ask for clarification and try again", th: "ขอคำอธิบายเพิ่มเติมและลองใหม่อีกครั้ง" },
  "أحرص على الفهم ثم أطبق التعليمات": {
    en: "I make sure to understand and then apply the instructions",
    th: "ทำความเข้าใจให้ชัดเจนแล้วจึงปฏิบัติตามคำแนะนำ"
  },

  // Q24: عندما يخبرك شخص بتصحيح خطأ قمت به، كيف تتعامل عادة مع ذلك؟
  "أشعر بالضيق وأرفض التصحيح": { en: "I feel upset and reject the correction", th: "รู้สึกไม่พอใจและปฏิเสธการแก้ไข" },
  "أجد صعوبة في تقبل التصحيح": { en: "I find it hard to accept correction", th: "รู้สึกยากที่จะยอมรับการแก้ไข" },
  "أستمع إلى التصحيح وأحاول مرة أخرى": { en: "I listen to the correction and try again", th: "รับฟังการแก้ไขและลองทำใหม่อีกครั้ง" },
  "أستفيد من التصحيح وأحاول تحسين العمل": {
    en: "I benefit from the correction and try to improve my work",
    th: "นำคำแนะนำไปใช้ประโยชน์และพยายามปรับปรุงผลงานให้ดีขึ้น"
  },
  "أبحث عن سبب الخطأ وأحرص على عدم تكراره": {
    en: "I look for the cause of the mistake and make sure not to repeat it",
    th: "ค้นหาสาเหตุของข้อผิดพลาดและระมัดระวังไม่ให้เกิดขึ้นซ้ำ"
  },

  // Q25: إذا كان لديك رأي مختلف عن طريقة المعلم، ماذا تفعل؟
  "أصر على طريقتي": { en: "I insist on my own way", th: "ยืนกรานในวิธีการของตัวเอง" },
  "أجد صعوبة في تغيير رأيي": { en: "I find it difficult to change my mind", th: "รู้สึกยากที่จะเปลี่ยนความคิดเห็นของตัวเอง" },
  "أستمع إلى شرح المعلم": { en: "I listen to the teacher's explanation", th: "รับฟังคำอธิบายของครู" },
  "أناقش الأمر باحترام وأجرب الطريقة المقترحة": {
    en: "I discuss it respectfully and try the suggested method",
    th: "พูดคุยแลกเปลี่ยนอย่างสุภาพและทดลองใช้วิธีที่ครูแนะนำ"
  },
  "أستمع وأجرب وأقارن النتيجة قبل اتخاذ موقف": {
    en: "I listen, try, and compare the result before taking a stance",
    th: "รับฟัง ทดลองทำ และเปรียบเทียบผลลัพธ์ก่อนตัดสินใจ"
  },

  // Q26: عندما تقوم بعمل يحتاج إلى تركيز لفترة طويلة، كيف يكون حالك عادة؟
  "أفقد التركيز بسرعة": { en: "I lose focus quickly", th: "เสียสมาธิอย่างรวดเร็ว" },
  "يصعب عليّ الاستمرار في التركيز": { en: "It is hard for me to stay focused", th: "ยากที่จะรักษาสมาธิอย่างต่อเนื่อง" },
  "أستطيع التركيز لفترة متوسطة": { en: "I can focus for a moderate period", th: "สามารถมีสมาธิได้ในระยะเวลาปานกลาง" },
  "أستطيع التركيز بشكل جيد": { en: "I can focus well", th: "สามารถมีสมาธิจดจ่อได้ดี" },
  "أستطيع المحافظة على تركيزي حتى إتمام العمل": {
    en: "I can maintain my focus until the work is completed",
    th: "สามารถรักษาสมาธิได้อย่างต่อเนื่องจนกว่างานจะสำเร็จ"
  },

  // Q27: عندما تخطئ في عمل تقوم به، ماذا تفعل عادة؟
  "أتجاهل الخطأ": { en: "I ignore the mistake", th: "เพิกเฉยต่อข้อผิดพลาด" },
  "أترك العمل أحيانًا بسبب الخطأ": { en: "I sometimes quit the work because of the mistake", th: "บางครั้งก็เลิกทำงานนั้นเพราะข้อผิดพลาด" },
  "أحاول إصلاح الخطأ": { en: "I try to fix the mistake", th: "พยายามแก้ไขข้อผิดพลาด" },
  "أبحث عن سبب الخطأ وأصححه": { en: "I find the cause of the mistake and fix it", th: "ค้นหาสาเหตุของข้อผิดพลาดและแก้ไขให้ถูกต้อง" },
  "أراجع عملي وأتعلم من الخطأ حتى لا أكرره": {
    en: "I review my work and learn from the mistake so I don't repeat it",
    th: "ทบทวนผลงานและเรียนรู้จากข้อผิดพลาดเพื่อไม่ให้ทำผิดซ้ำ"
  },

  // Q28: إذا كنت في مجموعة وكان المعلم يشرح لشخص آخر، ماذا تفعل؟
  "أقاطع الشرح باستمرار": { en: "I constantly interrupt the explanation", th: "ขัดจังหวะการอธิบายอยู่เสมอ" },
  "أجد صعوبة في الانتظار": { en: "I find it difficult to wait", th: "รู้สึกยากที่จะรอคอย" },
  "أنتظر وأتابع قدر استطاعتي": { en: "I wait and follow along as much as I can", th: "รอคอยและติดตามฟังเท่าที่ทำได้" },
  "أنتظر بهدوء وأستفيد من الشرح": { en: "I wait quietly and benefit from the explanation", th: "รออย่างสงบและเก็บเกี่ยวความรู้จากการอธิบายนั้น" },
  "أحترم وقت الآخرين وأستفيد من الشرح حتى يأتي دوري": {
    en: "I respect others' time and benefit from the explanation until my turn comes",
    th: "เคารพเวลาของผู้อื่นและเรียนรู้จากการอธิบายจนกว่าจะถึงคิวของตัวเอง"
  },

  // Q29: إذا رأيت مشتركًا آخر يواجه صعوبة في تمرين، ماذا تفعل؟
  "لا أهتم": { en: "I don't care", th: "ไม่สนใจ" },
  "أفضل عدم التدخل": { en: "I prefer not to interfere", th: "เลือกที่จะไม่เข้าไปยุ่งเกี่ยว" },
  "أساعد إذا طلب مني": { en: "I help if asked", th: "ช่วยเหลือหากเขาขอความช่วยเหลือ" },
  "أحاول مساعدته بطريقة مناسبة": { en: "I try to help them in an appropriate way", th: "พยายามช่วยเหลือเขาด้วยวิธีที่เหมาะสม" },
  "أشجعه وأساعده دون أن أؤثر على عمل المعلم": {
    en: "I encourage and help them without disrupting the teacher's work",
    th: "ให้กำลังใจและช่วยเหลือโดยไม่รบกวนการสอนของครู"
  },

  // Q30: إذا اختلفت مع المعلم في شيء أثناء الدرس، كيف تتصرف؟
  "أرفض كلامه أو أجادله بشدة": { en: "I reject what they say or argue strongly", th: "ปฏิเสธคำพูดของครูหรือโต้เถียงอย่างรุนแรง" },
  "أجد صعوبة في تقبل رأيه": { en: "I find it hard to accept their opinion", th: "รู้สึกยากที่จะยอมรับความคิดเห็นของครู" },
  "أستمع إلى رأيه وأناقش الأمر": { en: "I listen to their opinion and discuss the matter", th: "รับฟังความคิดเห็นและพูดคุยแลกเปลี่ยนกัน" },
  "أناقش الأمر باحترام وأتقبل التوضيح": {
    en: "I discuss the matter respectfully and accept clarification",
    th: "พูดคุยอย่างสุภาพด้วยความเคารพและเปิดรับคำอธิบาย"
  },
  "أستمع وأفهم السبب وأجرب ما يوجهني إليه": {
    en: "I listen, understand the reason, and try what they guide me to do",
    th: "รับฟัง ทำความเข้าใจเหตุผล และทดลองทำตามที่ครูแนะนำ"
  }
};

/**
 * Default translations map for standard and survey registration questions.
 * Includes all 32 Arabic Calligraphy Assessment & Registration questions + options
 * so translations appear immediately on ALL devices (Vercel, GitHub, mobile, desktop)
 * without needing localStorage setup.
 */
export const DEFAULT_FORM_TRANSLATIONS: Record<string, QuestionTranslation> = {
  // Basic Identity & Classic Fields
  "الاسم": {
    questionEn: "Full Name",
    questionTh: "ชื่อ-นามสกุล",
    descriptionEn: "Please write your full name as shown on your ID",
    descriptionTh: "กรุณาระบุชื่อ-นามสกุลเต็มตามที่ปรากฏบนบัตรประจำตัว"
  },
  "1. ما اسمك الكامل؟": {
    questionEn: "1. What is your full name?",
    questionTh: "1. ชื่อ-นามสกุลเต็มของคุณคืออะไร?"
  },
  "ما اسمك الكامل؟": {
    questionEn: "What is your full name?",
    questionTh: "ชื่อ-นามสกุลเต็มของคุณคืออะไร?"
  },
  "الاسم بالعربي": {
    questionEn: "Name in Arabic",
    questionTh: "ชื่อภาษาอาหรับ",
    descriptionEn: "Your name in Arabic (if any)",
    descriptionTh: "ชื่อของคุณเป็นภาษาอาหรับ (ถ้ามี)"
  },
  "العمر": {
    questionEn: "Age",
    questionTh: "อายุ",
    descriptionEn: "Age in years (numbers only)",
    descriptionTh: "อายุเป็นปี (ตัวเลขเท่านั้น)"
  },
  "عمر المشترك": {
    questionEn: "Age",
    questionTh: "อายุ",
    descriptionEn: "Age in years (numbers only)",
    descriptionTh: "อายุเป็นปี (ตัวเลขเท่านั้น)"
  },
  "رقم الهاتف": {
    questionEn: "Phone Number",
    questionTh: "หมายเลขโทรศัพท์",
    descriptionEn: "Phone or WhatsApp number with country code",
    descriptionTh: "เบอร์โทรศัพท์หรือ WhatsApp พร้อมรหัสประเทศ"
  },
  "ايميل": {
    questionEn: "Email",
    questionTh: "อีเมล",
    descriptionEn: "Your approved email to receive notifications",
    descriptionTh: "อีเมลที่ใช้สำหรับรับการแจ้งเตือน"
  },
  "البريد الالكتروني": {
    questionEn: "Email",
    questionTh: "อีเมล",
    descriptionEn: "Your approved email to receive notifications",
    descriptionTh: "อีเมลที่ใช้สำหรับรับการแจ้งเตือน"
  },
  "ID Line": {
    questionEn: "Line ID",
    questionTh: "LINE ID",
    descriptionEn: "Your Line ID for quick communication",
    descriptionTh: "LINE ID ของคุณสำหรับการติดต่ออย่างรวดเร็ว"
  },
  "افتح ملف بي دي اف": {
    questionEn: "Open PDF File",
    questionTh: "เปิดไฟล์ PDF",
    descriptionEn: "Click to open the PDF document",
    descriptionTh: "คลิกเพื่อเปิดเอกสาร PDF",
    buttonTitleEn: "Open PDF Document",
    buttonTitleTh: "เปิดดูเอกสาร PDF"
  },
  "فيس بوك": {
    questionEn: "Facebook",
    questionTh: "Facebook",
    descriptionEn: "Link or name of your Facebook account",
    descriptionTh: "ลิงก์หรือชื่อบัญชี Facebook ของคุณ"
  },
  "هل تحب الخط العربي؟": {
    questionEn: "Do you like Arabic calligraphy?",
    questionTh: "คุณชอบศิลปะการเขียนตัวอักษรอาหรับหรือไม่?",
    descriptionEn: "Choose the answer suitable for your level",
    descriptionTh: "เลือกคำตอบที่ตรงกับระดับความรู้ของคุณ",
    optionsEn: ["✅ Yes = Ever", "❌ No = Never"],
    optionsTh: ["✅ ใช่ = เคย", "❌ ไม่ = ไม่เคย"]
  },
  "ما اسم استاذك الذي علمك الخط؟": {
    questionEn: "What is the name of your calligraphy teacher?",
    questionTh: "อาจารย์ผู้สอนการเขียนตัวอักษรอาหรับให้คุณชื่ออะไร?",
    descriptionEn: "Name of the calligrapher or teacher who taught you",
    descriptionTh: "ชื่อของครูหรือผู้เชี่ยวชาญที่สอนคุณ"
  },
  "هل تعرفين انواع الخط": {
    questionEn: "Do you know the types of calligraphy scripts?",
    questionTh: "คุณรู้จักประเภทของลายมือ/ฟอนต์อาหรับหรือไม่?",
    descriptionEn: "Types of Arabic calligraphy scripts",
    descriptionTh: "ประเภทและรูปแบบของอักษรวิจิตรอาหรับ",
    optionsEn: ["✅ Yes = Ever", "❌ No = Never"],
    optionsTh: ["✅ ใช่ = เคย", "❌ ไม่ = ไม่เคย"]
  },
  "هل تعرفين انوان الخط": {
    questionEn: "Do you know the types of calligraphy scripts?",
    questionTh: "คุณรู้จักประเภทของลายมือ/ฟอนต์อาหรับหรือไม่?",
    descriptionEn: "Types of Arabic calligraphy scripts",
    descriptionTh: "ประเภทและรูปแบบของอักษรวิจิตรอาหรับ",
    optionsEn: ["✅ Yes = Ever", "❌ No = Never"],
    optionsTh: ["✅ ใช่ = เคย", "❌ ไม่ = ไม่เคย"]
  },
  "هل تحب الفن": {
    questionEn: "Do you love art?",
    questionTh: "คุณรักศิลปะหรือไม่?",
    descriptionEn: "General artistic interest",
    descriptionTh: "ความสนใจด้านศิลปะทั่วไป"
  },
  "صورة": {
    questionEn: "Image",
    questionTh: "รูปภาพ",
    descriptionEn: "Displayed image",
    descriptionTh: "รูปภาพที่แสดง"
  },
  "رفع ملف": {
    questionEn: "Upload File / Document",
    questionTh: "อัปโหลดไฟล์ / เอกสาร",
    descriptionEn: "Attach your file, artwork or ID",
    descriptionTh: "แนบไฟล์ ผลงาน หรือเอกสารของคุณ"
  },

  // ============================================================================
  // Comprehensive 32 Survey Questions & Options (RegistrationQuestions Sheet)
  // ============================================================================

  "2. كم عمرك ؟": {
    questionEn: "2. How old are you?",
    questionTh: "2. คุณอายุเท่าไหร่?"
  },
  "2. كم عمرك؟": {
    questionEn: "2. How old are you?",
    questionTh: "2. คุณอายุเท่าไหร่?"
  },
  "3. هل سبق لك تعلم الخط العربي؟": {
    questionEn: "3. Have you ever learned Arabic calligraphy before?",
    questionTh: "3. คุณเคยเรียนศิลปะการเขียนอักษรวิจิตรอาหรับมาก่อนหรือไม่?",
    optionsEn: [
      "I have never learned it before",
      "I learned a little bit",
      "I learned in a course or program",
      "I learned with a teacher",
      "I have been learning continuously"
    ],
    optionsTh: [
      "ไม่เคยเรียนมาก่อน",
      "เคยเรียนพื้นฐานเล็กน้อย",
      "เคยเรียนในหลักสูตรหรือโปรแกรม",
      "เคยเรียนกับครูผู้สอน",
      "เรียนรู้อย่างต่อเนื่อง"
    ]
  },
  "4. هل لديك تجربة سابقة في الرسم أو أي مجال فني؟": {
    questionEn: "4. Do you have previous experience in drawing or any artistic field?",
    questionTh: "4. คุณมีประสบการณ์ในการวาดภาพหรืองานศิลปะด้านอื่นมาก่อนหรือไม่?",
    optionsEn: [
      "No",
      "Basic / slight experience",
      "I learned for a period of time",
      "I practice continuously",
      "Another field: ______"
    ],
    optionsTh: [
      "ไม่เคย",
      "มีประสบการณ์เล็กน้อย",
      "เคยเรียนมาระยะหนึ่ง",
      "ฝึกฝนอย่างต่อเนื่อง",
      "สาขาอื่นๆ: ______"
    ]
  },
  "5. من الذي اقترح عليك تعلم الخط العربي؟": {
    questionEn: "5. Who suggested that you learn Arabic calligraphy?",
    questionTh: "5. ใครเป็นผู้แนะนำให้คุณเรียนอักษรวิจิตรอาหรับ?",
    optionsEn: [
      "I chose it myself",
      "Father",
      "Mother",
      "A family member",
      "Teacher",
      "A friend or someone else",
      "An educational institution",
      "Other"
    ],
    optionsTh: [
      "ฉันเลือกเรียนด้วยตัวเอง",
      "บิดา (พ่อ)",
      "มารดา (แม่)",
      "สมาชิกในครอบครัว",
      "ครู / อาจารย์",
      "เพื่อนหรือบุคคลอื่น",
      "สถาบันการศึกษา",
      "อื่นๆ"
    ]
  },
  "6. لو لم يقترح عليك أحد تعلم الخط العربي، إلى أي درجة كنت ستختار تعلمه بنفسك؟": {
    questionEn: "6. If no one had suggested learning Arabic calligraphy to you, to what extent would you have chosen to learn it on your own?",
    questionTh: "6. หากไม่มีใครแนะนำ คุณคิดว่าจะเลือกเรียนอักษรวิจิตรอาหรับด้วยตัวเองมากน้อยเพียงใด?",
    optionsEn: [
      "I would definitely not choose it",
      "I would probably not choose it",
      "I might choose it",
      "I would probably choose it",
      "I would definitely choose it"
    ],
    optionsTh: [
      "ไม่เลือกเรียนอย่างแน่นอน",
      "อาจจะไม่เลือกเรียน",
      "อาจจะเลือกเรียน",
      "มีแนวโน้มว่าจะเลือกเรียน",
      "เลือกเรียนอย่างแน่นอน"
    ]
  },
  "7. ما مدى رغبتك الحالية في البدء بتعلم الخط العربي؟": {
    questionEn: "7. How strong is your current desire to start learning Arabic calligraphy?",
    questionTh: "7. ปัจจุบันคุณมีความต้องการที่จะเริ่มเรียนอักษรวิจิตรอาหรับมากน้อยเพียงใด?",
    optionsEn: [
      "I have no real desire",
      "My desire is weak",
      "My desire is moderate",
      "I have a clear desire",
      "I have a very strong desire and enthusiasm to start"
    ],
    optionsTh: [
      "ไม่มีความต้องการที่แท้จริง",
      "มีความต้องการน้อย",
      "มีความต้องการปานกลาง",
      "มีความต้องการอย่างชัดเจน",
      "มีความต้องการอย่างยิ่งและกระตือรือร้นที่จะเริ่มต้น"
    ]
  },
  "8. ما السبب الأقرب لرغبتك في تعلم الخط العربي؟": {
    questionEn: "8. What is the main reason for your desire to learn Arabic calligraphy?",
    questionTh: "8. เหตุผลสำคัญที่สุดที่ทำให้คุณอยากเรียนอักษรวิจิตรอาหรับคืออะไร?",
    optionsEn: [
      "I love the beauty of Arabic calligraphy",
      "I love art and handicrafts",
      "I want to learn a new skill",
      "I want to improve my handwriting",
      "I want to write the Quran, verses, Hadiths, and beautiful phrases",
      "I want to use calligraphy in my work or studies",
      "I want to become a calligrapher",
      "Someone else encouraged me to learn it",
      "I want to participate in competitions or exhibitions",
      "Another reason: ______"
    ],
    optionsTh: [
      "ฉันหลงใหลในความงามของอักษรวิจิตรอาหรับ",
      "ฉันชอบงานศิลปะและงานฝีมือ",
      "ฉันต้องการเรียนรู้ทักษะใหม่",
      "ฉันต้องการพัฒนาลายมือของตัวเอง",
      "ฉันต้องการเขียนอัลกุรอาน โองการ หะดีษ และข้อความที่สวยงาม",
      "ฉันต้องการใช้อักษรวิจิตรในการทำงานหรือการเรียน",
      "ฉันต้องการเป็นนักเขียนอักษรวิจิตร (ช่างเขียน خط)",
      "มีคนอื่นแนะนำและสนับสนุนให้ฉันเรียน",
      "ฉันต้องการเข้าร่วมการแข่งขันหรือนิทรรศการ",
      "เหตุผลอื่นๆ: ______"
    ]
  },
  "9. عندما ترى عملًا فنيًا جميلًا، إلى أي درجة تنتبه إلى تفاصيله؟": {
    questionEn: "9. When you see a beautiful artwork, to what extent do you pay attention to its details?",
    questionTh: "9. เมื่อคุณเห็นงานศิลปะที่สวยงาม คุณสังเกตรายละเอียดของงานนั้นมากน้อยเพียงใด?",
    optionsEn: [
      "I rarely pay attention to details",
      "I pay a little attention to details",
      "I notice some details",
      "I notice most details",
      "I focus closely on fine details"
    ],
    optionsTh: [
      "มักจะไม่ค่อยสังเกตรายละเอียด",
      "สังเกตรายละเอียดเพียงเล็กน้อย",
      "สังเกตรายละเอียดบางส่วน",
      "สังเกตรายละเอียดส่วนใหญ่",
      "มุ่งเน้นและใส่ใจในรายละเอียดที่ประณีตอย่างลึกซึ้ง"
    ]
  },
  "10. عندما ترى خطًا عربيًا جميلًا، إلى أي درجة تلاحظ شكل الحروف وتفاصيلها؟": {
    questionEn: "10. When you see beautiful Arabic calligraphy, to what extent do you notice the letter shapes and details?",
    questionTh: "10. เมื่อคุณเห็นอักษรวิจิตรอาหรับที่สวยงาม คุณสังเกตรูปทรงและรายละเอียดของตัวอักษรมากน้อยเพียงใด?",
    optionsEn: [
      "I don't care about the details",
      "I notice them slightly",
      "I notice some details",
      "I notice most details",
      "I focus heavily on the details and shapes of the letters"
    ],
    optionsTh: [
      "ไม่สนใจรายละเอียด",
      "สังเกตเห็นเพียงเล็กน้อย",
      "สังเกตเห็นรายละเอียดบางส่วน",
      "สังเกตเห็นรายละเอียดส่วนใหญ่",
      "ให้ความสำคัญอย่างมากกับรายละเอียดและรูปทรงของตัวอักษร"
    ]
  },
  "11. عندما تقوم بعمل يحتاج إلى دقة وتفاصيل، كيف تتعامل معه عادة؟": {
    questionEn: "11. When doing work that requires precision and detail, how do you usually handle it?",
    questionTh: "11. เมื่อต้องทำงานที่ต้องใช้ความละเอียดและแม่นยำ ปกติคุณรับมือกับมันอย่างไร?",
    optionsEn: [
      "I prefer to avoid detailed work",
      "I find it very difficult to handle",
      "I can handle it moderately well",
      "I handle it well",
      "I love work that requires precision"
    ],
    optionsTh: [
      "มักจะหลีกเลี่ยงงานที่ต้องใช้ความละเอียด",
      "รู้สึกยากลำบากมากในการจัดการกับงานละเอียด",
      "สามารถจัดการได้ในระดับปานกลาง",
      "สามารถจัดการและทำได้ดี",
      "ชื่นชอบงานที่ต้องใช้ความประณีตและความแม่นยำ"
    ]
  },
  "12. إذا لم تنجح في شيء من المحاولة الأولى، ماذا تفعل عادة؟": {
    questionEn: "12. If you do not succeed at something on the first try, what do you usually do?",
    questionTh: "12. หากคุณทำสิ่งใดไม่สำเร็จในครั้งแรก ปกติคุณจะทำอย่างไร?",
    optionsEn: [
      "I usually give it up",
      "I try a little and then stop",
      "I try several times depending on the difficulty",
      "I keep trying until I improve",
      "I repeat the attempt until I reach the desired result"
    ],
    optionsTh: [
      "มักจะเลิกทำ",
      "พยายามเล็กน้อยแล้วหยุด",
      "พยายามหลายครั้งตามระดับความยาก",
      "พยายามต่อไปจนกว่าจะดีขึ้น",
      "พยายามซ้ำๆ จนกว่าจะบรรลุผลลัพธ์ที่ต้องการ"
    ]
  },
  "13. إذا كان تعلم مهارة جديدة يحتاج إلى تكرار نفس التدريب مرات كثيرة، كيف تتعامل مع ذلك؟": {
    questionEn: "13. If learning a new skill requires repeating the same exercise many times, how do you deal with that?",
    questionTh: "13. หากการเรียนรู้ทักษะใหม่ต้องฝึกซ้ำๆ หลายครั้ง คุณมีท่าทีต่อสิ่งนี้อย่างไร?",
    optionsEn: [
      "I get bored and stop quickly",
      "I find it hard to continue",
      "I can continue for a while",
      "I can continue well",
      "I don't mind repetition and keep going until I improve"
    ],
    optionsTh: [
      "รู้สึกเบื่อและหยุดทำอย่างรวดเร็ว",
      "รู้สึกยากที่จะทำอย่างต่อเนื่อง",
      "สามารถทำต่อเนื่องได้ระยะหนึ่ง",
      "สามารถทำอย่างต่อเนื่องได้ดี",
      "ไม่รังเกียจการฝึกซ้ำและทำต่อไปจนกว่าจะพัฒนาขึ้น"
    ]
  },
  "14. إذا وجدت تمرينًا أصعب مما توقعت، ماذا تفعل عادة؟": {
    questionEn: "14. If you find an exercise harder than you expected, what do you usually do?",
    questionTh: "14. หากคุณพบว่าแบบฝึกหัดยากกว่าที่คิดไว้ ปกติคุณจะทำอย่างไร?",
    optionsEn: [
      "I leave the exercise",
      "I stop if I don't see quick results",
      "I try and then ask for help",
      "I try and benefit from guidance",
      "I keep trying and look for ways to improve"
    ],
    optionsTh: [
      "เลิกทำแบบฝึกหัดนั้น",
      "หยุดทำหากไม่เห็นผลลัพธ์ที่รวดเร็ว",
      "ลองทำดูก่อนแล้วจึงขอความช่วยเหลือ",
      "พยายามทำและนำคำแนะนำมาปรับใช้",
      "พยายามต่อไปและค้นหาวิธีพัฒนาตัวเองให้ดีขึ้น"
    ]
  },
  "15. عندما تبدأ شيئًا جديدًا، كيف يكون التزامك عادة؟": {
    questionEn: "15. When you start something new, how is your commitment usually?",
    questionTh: "15. เมื่อคุณเริ่มต้นทำสิ่งใหม่ๆ ปกติความมุ่งมั่นต่อเนื่องของคุณเป็นอย่างไร?",
    optionsEn: [
      "I start and usually leave it",
      "I continue for a short period",
      "I continue sometimes and stop sometimes",
      "I stay committed most of the time",
      "I make sure to continue until the end"
    ],
    optionsTh: [
      "เริ่มต้นแต่มักจะเลิกกลางคัน",
      "ทำต่อเนื่องได้เพียงช่วงสั้นๆ",
      "ทำบ้างหยุดบ้างเป็นบางครั้ง",
      "มีความมุ่งมั่นและทำอย่างสม่ำเสมอเป็นส่วนใหญ่",
      "ตั้งใจทำอย่างต่อเนื่องจนจบ"
    ]
  },
  "16. كم من الوقت تستطيع تخصيصه للتدريب على الخط العربي أسبوعيًا؟": {
    questionEn: "16. How much time can you dedicate to practicing Arabic calligraphy weekly?",
    questionTh: "16. คุณสามารถจัดสรรเวลาเพื่อฝึกฝนอักษรวิจิตรอาหรับได้สัปดาห์ละเท่าไหร่?",
    optionsEn: [
      "Less than 1 hour",
      "1–2 hours",
      "3–4 hours",
      "5–7 hours",
      "More than 7 hours",
      "I don't know yet"
    ],
    optionsTh: [
      "น้อยกว่า 1 ชั่วโมง",
      "1–2 ชั่วโมง",
      "3–4 ชั่วโมง",
      "5–7 ชั่วโมง",
      "มากกว่า 7 ชั่วโมง",
      "ยังไม่แน่ใจ"
    ]
  },
  "17. عندما يكون لديك تدريب أو مهمة يجب إنجازها خلال فترة محددة، كيف تتعامل معها عادة؟": {
    questionEn: "17. When you have a practice or task to complete within a specific time, how do you usually handle it?",
    questionTh: "17. เมื่อคุณมีงานฝึกหรือภารกิจที่ต้องทำให้เสร็จภายในเวลาที่กำหนด ปกติคุณจัดการอย่างไร?",
    optionsEn: [
      "I usually don't complete it",
      "I only complete it sometimes",
      "I complete it if I have enough time",
      "I make sure to complete it on time",
      "I organize my time and ensure it gets done on schedule"
    ],
    optionsTh: [
      "มักจะทำไม่สำเร็จตามกำหนด",
      "ทำสำเร็จเป็นบางครั้งเท่านั้น",
      "ทำสำเร็จหากมีเวลาเพียงพอ",
      "ตั้งใจทำให้เสร็จตามเวลาที่กำหนด",
      "จัดสรรเวลาและทำให้สำเร็จตรงตามกำหนดเสมอ"
    ]
  },
  "18. إلى أي درجة تعرف ما الذي تريد الوصول إليه من تعلم الخط العربي؟": {
    questionEn: "18. To what extent do you know what you want to achieve from learning Arabic calligraphy?",
    questionTh: "18. คุณรู้ชัดเจนเพียงใดว่าต้องการบรรลุเป้าหมายใดจากการเรียนอักษรวิจิตรอาหรับ?",
    optionsEn: [
      "I don't know what I want",
      "I have a basic idea",
      "I have a general goal",
      "I have a clear goal",
      "I have a clear goal and know exactly what I want to achieve"
    ],
    optionsTh: [
      "ยังไม่รู้ว่าต้องการอะไร",
      "มีแนวคิดคร่าวๆ เล็กน้อย",
      "มีเป้าหมายโดยรวมกว้างๆ",
      "มีเป้าหมายที่ชัดเจน",
      "มีเป้าหมายที่ชัดเจนและรู้ว่าต้องการบรรลุสิ่งใด"
    ]
  },
  "19. ما هدفك من تعلم الخط العربي؟": {
    questionEn: "19. What is your goal in learning Arabic calligraphy?",
    questionTh: "19. เป้าหมายของคุณในการเรียนอักษรวิจิตรอาหรับคืออะไร?"
  },
  "20. ماذا تتوقع أن تتعلم أو تحقق من أول برنامج تعليمي؟": {
    questionEn: "20. What do you expect to learn or achieve from your first educational program?",
    questionTh: "20. คุณคาดหวังว่าจะได้เรียนรู้หรือบรรลุสิ่งใดจากโปรแกรมการเรียนครั้งแรก?"
  },
  "21. عندما تتعلم مهارة جديدة، أي طريقة تناسبك أكثر؟": {
    questionEn: "21. When learning a new skill, which method suits you best?",
    questionTh: "21. เมื่อเรียนรู้ทักษะใหม่ วิธีใดเหมาะสมกับคุณมากที่สุด?",
    optionsEn: [
      "Teacher's explanation then practice",
      "Watching the teacher then imitating",
      "Direct hands-on practice",
      "Repetition and extensive practice",
      "Learning through images or videos",
      "I need direct follow-up from the teacher",
      "I don't know yet"
    ],
    optionsTh: [
      "ฟังครูอธิบายแล้วจึงลงมือปฏิบัติ",
      "ดูครูสาธิตแล้วฝึกทำตาม",
      "ลงมือฝึกปฏิบัติจริงโดยตรง",
      "การฝึกซ้ำๆ และฝึกฝนอย่างหนัก",
      "เรียนรู้ผ่านรูปภาพหรือวิดีโอ",
      "ต้องการการดูแลและแนะนำอย่างใกล้ชิดจากครู",
      "ยังไม่แน่ใจ"
    ]
  },
  "22. إذا أخبرك المعلم أن الطريقة التي تستخدمها تحتاج إلى تغيير، كيف تتعامل مع ذلك؟": {
    questionEn: "22. If the teacher tells you that the method you are using needs to be changed, how do you handle that?",
    questionTh: "22. หากครูบอกคุณว่าวิธีที่คุณใช้อยู่จำเป็นต้องปรับเปลี่ยน คุณจะรับมืออย่างไร?",
    optionsEn: [
      "I refuse to change my method",
      "I find it very difficult to accept change",
      "I accept the change after understanding the reason",
      "I try to apply the new method",
      "I welcome the guidance and try to apply it accurately"
    ],
    optionsTh: [
      "ปฏิเสธที่จะเปลี่ยนวิธีการของตัวเอง",
      "รู้สึกยากมากที่จะยอมรับการเปลี่ยนแปลง",
      "ยอมรับการเปลี่ยนแปลงหลังจากเข้าใจเหตุผล",
      "พยายามนำวิธีการใหม่มาใช้",
      "ยินดีรับคำแนะนำและพยายามนำไปปฏิบัติอย่างถูกต้องแม่นยำ"
    ]
  },
  "23. إذا لم تفهم تعليمات المعلم، ماذا تفعل؟": {
    questionEn: "23. If you do not understand the teacher's instructions, what do you do?",
    questionTh: "23. หากคุณไม่เข้าใจคำแนะนำของครู คุณจะทำอย่างไร?",
    optionsEn: [
      "I don't ask and continue my own way",
      "I try on my own and might stop",
      "I ask if I can't figure it out",
      "I ask for clarification and try again",
      "I make sure to understand and then apply the instructions"
    ],
    optionsTh: [
      "ไม่ถามและทำต่อตามวิธีของตัวเอง",
      "ลองทำเองคนเดียวและอาจจะหยุดทำ",
      "ถามเมื่อไม่สามารถแก้ไขปัญหาเองได้",
      "ขอคำอธิบายเพิ่มเติมและลองใหม่อีกครั้ง",
      "ทำความเข้าใจให้ชัดเจนแล้วจึงปฏิบัติตามคำแนะนำ"
    ]
  },
  "24. عندما يخبرك شخص بتصحيح خطأ قمت به، كيف تتعامل عادة مع ذلك؟": {
    questionEn: "24. When someone corrects a mistake you made, how do you usually react?",
    questionTh: "24. เมื่อมีคนช่วยชี้แนะและแก้ไขข้อผิดพลาดที่คุณทำ ปกติคุณมีท่าทีอย่างไร?",
    optionsEn: [
      "I feel upset and reject the correction",
      "I find it hard to accept correction",
      "I listen to the correction and try again",
      "I benefit from the correction and try to improve my work",
      "I look for the cause of the mistake and make sure not to repeat it"
    ],
    optionsTh: [
      "รู้สึกไม่พอใจและปฏิเสธการแก้ไข",
      "รู้สึกยากที่จะยอมรับการแก้ไข",
      "รับฟังการแก้ไขและลองทำใหม่อีกครั้ง",
      "นำคำแนะนำไปใช้ประโยชน์และพยายามปรับปรุงผลงานให้ดีขึ้น",
      "ค้นหาสาเหตุของข้อผิดพลาดและระมัดระวังไม่ให้เกิดขึ้นซ้ำ"
    ]
  },
  "25. إذا كان لديك رأي مختلف عن طريقة المعلم، ماذا تفعل؟": {
    questionEn: "25. If you have a different opinion from the teacher's method, what do you do?",
    questionTh: "25. หากคุณมีความคิดเห็นที่ต่างจากวิธีการของครู คุณจะทำอย่างไร?",
    optionsEn: [
      "I insist on my own way",
      "I find it difficult to change my mind",
      "I listen to the teacher's explanation",
      "I discuss it respectfully and try the suggested method",
      "I listen, try, and compare the result before taking a stance"
    ],
    optionsTh: [
      "ยืนกรานในวิธีการของตัวเอง",
      "รู้สึกยากที่จะเปลี่ยนความคิดเห็นของตัวเอง",
      "รับฟังคำอธิบายของครู",
      "พูดคุยแลกเปลี่ยนอย่างสุภาพและทดลองใช้วิธีที่ครูแนะนำ",
      "รับฟัง ทดลองทำ และเปรียบเทียบผลลัพธ์ก่อนตัดสินใจ"
    ]
  },
  "26. عندما تقوم بعمل يحتاج إلى تركيز لفترة طويلة، كيف يكون حالك عادة؟": {
    questionEn: "26. When doing work that requires focus for a long time, how are you usually?",
    questionTh: "26. เมื่อต้องทำงานที่ต้องใช้สมาธิเป็นเวลานาน ปกติคุณเป็นอย่างไร?",
    optionsEn: [
      "I lose focus quickly",
      "It is hard for me to stay focused",
      "I can focus for a moderate period",
      "I can focus well",
      "I can maintain my focus until the work is completed"
    ],
    optionsTh: [
      "เสียสมาธิอย่างรวดเร็ว",
      "ยากที่จะรักษาสมาธิอย่างต่อเนื่อง",
      "สามารถมีสมาธิได้ในระยะเวลาปานกลาง",
      "สามารถมีสมาธิจดจ่อได้ดี",
      "สามารถรักษาสมาธิได้อย่างต่อเนื่องจนกว่างานจะสำเร็จ"
    ]
  },
  "27. عندما تخطئ في عمل تقوم به، ماذا تفعل عادة؟": {
    questionEn: "27. When you make a mistake in your work, what do you usually do?",
    questionTh: "27. เมื่อคุณทำผิดพลาดในงานที่กำลังทำ ปกติคุณจะทำอย่างไร?",
    optionsEn: [
      "I ignore the mistake",
      "I sometimes quit the work because of the mistake",
      "I try to fix the mistake",
      "I find the cause of the mistake and fix it",
      "I review my work and learn from the mistake so I don't repeat it"
    ],
    optionsTh: [
      "เพิกเฉยต่อข้อผิดพลาด",
      "บางครั้งก็เลิกทำงานนั้นเพราะข้อผิดพลาด",
      "พยายามแก้ไขข้อผิดพลาด",
      "ค้นหาสาเหตุของข้อผิดพลาดและแก้ไขให้ถูกต้อง",
      "ทบทวนผลงานและเรียนรู้จากข้อผิดพลาดเพื่อไม่ให้ทำผิดซ้ำ"
    ]
  },
  "28. إذا كنت في مجموعة وكان المعلم يشرح لشخص آخر، ماذا تفعل؟": {
    questionEn: "28. If you are in a group and the teacher is explaining to someone else, what do you do?",
    questionTh: "28. หากคุณอยู่ในกลุ่มเรียนและครูยังอธิบายให้คนอื่นฟังอยู่ คุณจะทำอย่างไร?",
    optionsEn: [
      "I constantly interrupt the explanation",
      "I find it difficult to wait",
      "I wait and follow along as much as I can",
      "I wait quietly and benefit from the explanation",
      "I respect others' time and benefit from the explanation until my turn comes"
    ],
    optionsTh: [
      "ขัดจังหวะการอธิบายอยู่เสมอ",
      "รู้สึกยากที่จะรอคอย",
      "รอคอยและติดตามฟังเท่าที่ทำได้",
      "รออย่างสงบและเก็บเกี่ยวความรู้จากการอธิบายนั้น",
      "เคารพเวลาของผู้อื่นและเรียนรู้จากการอธิบายจนกว่าจะถึงคิวของตัวเอง"
    ]
  },
  "29. إذا رأيت مشتركًا آخر يواجه صعوبة في تمرين، ماذا تفعل؟": {
    questionEn: "29. If you see another participant struggling with an exercise, what do you do?",
    questionTh: "29. หากคุณเห็นผู้เรียนคนอื่นกำลังประสบปัญหาในการทำแบบฝึกหัด คุณจะทำอย่างไร?",
    optionsEn: [
      "I don't care",
      "I prefer not to interfere",
      "I help if asked",
      "I try to help them in an appropriate way",
      "I encourage and help them without disrupting the teacher's work"
    ],
    optionsTh: [
      "ไม่สนใจ",
      "เลือกที่จะไม่เข้าไปยุ่งเกี่ยว",
      "ช่วยเหลือหากเขาขอความช่วยเหลือ",
      "พยายามช่วยเหลือเขาด้วยวิธีที่เหมาะสม",
      "ให้กำลังใจและช่วยเหลือโดยไม่รบกวนการสอนของครู"
    ]
  },
  "30. إذا اختلفت مع المعلم في شيء أثناء الدرس، كيف تتصرف؟": {
    questionEn: "30. If you disagree with the teacher on something during the lesson, how do you act?",
    questionTh: "30. หากคุณมีความเห็นไม่ตรงกับครูในบางเรื่องระหว่างบทเรียน คุณจะปฏิบัติตัวอย่างไร?",
    optionsEn: [
      "I reject what they say or argue strongly",
      "I find it hard to accept their opinion",
      "I listen to their opinion and discuss the matter",
      "I discuss the matter respectfully and accept clarification",
      "I listen, understand the reason, and try what they guide me to do"
    ],
    optionsTh: [
      "ปฏิเสธคำพูดของครูหรือโต้เถียงอย่างรุนแรง",
      "รู้สึกยากที่จะยอมรับความคิดเห็นของครู",
      "รับฟังความคิดเห็นและพูดคุยแลกเปลี่ยนกัน",
      "พูดคุยอย่างสุภาพด้วยความเคารพและเปิดรับคำอธิบาย",
      "รับฟัง ทำความเข้าใจเหตุผล และทดลองทำตามที่ครูแนะนำ"
    ]
  },
  "31. ما الشيء الذي تتمنى أن تصل إليه من خلال تعلم الخط العربي؟": {
    questionEn: "31. What do you hope to achieve through learning Arabic calligraphy?",
    questionTh: "31. สิ่งที่คุณหวังว่าจะได้รับหรือไปถึงจากการเรียนอักษรวิจิตรอาหรับคืออะไร?"
  },
  "ارفع صورة كتابتك الان": {
    questionEn: "Upload a photo of your handwriting / calligraphy now",
    questionTh: "อัปโหลดรูปภาพลายมือหรือการเขียนของคุณตอนนี้",
    descriptionEn: "Please take a photo or attach an image of your writing",
    descriptionTh: "กรุณาถ่ายภาพหรือแนบรูปภาพตัวอย่างการเขียนของคุณ",
    optionsEn: ["Option 1", "Option 2"],
    optionsTh: ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2"]
  },
  "1. كيف تقيّم مدى استفادتك وتقدمك في هذه المرحلة التدريبية؟": {
    questionEn: "1. How do you rate your benefit and progress in this training stage?",
    questionTh: "1. คุณประเมินประโยชน์และความก้าวหน้าของคุณในขั้นตอนการฝึกอบรมนี้อย่างไร?",
    optionsEn: [
      "Excellent benefit and clear progress",
      "Very good benefit",
      "Moderate benefit",
      "I need more practice"
    ],
    optionsTh: [
      "ได้รับประโยชน์อย่างยอดเยี่ยมและมีความก้าวหน้าชัดเจน",
      "ได้รับประโยชน์ดีมาก",
      "ได้รับประโยชน์ปานกลาง",
      "ฉันต้องการการฝึกฝนเพิ่มเติม"
    ]
  },
  "2. ما مدى التزامك بالتدريب اليومي وتطبيق ملاحظات المعلم؟": {
    questionEn: "2. How committed were you to daily practice and applying the teacher's feedback?",
    questionTh: "2. คุณมีความมุ่งมั่นในการฝึกฝนประจำวันและนำคำแนะนำของครูไปใช้มากน้อยเพียงใด?",
    optionsEn: [
      "Full and accurate daily commitment",
      "Committed on most days",
      "Intermittent commitment",
      "I faced difficulty staying committed"
    ],
    optionsTh: [
      "มีความมุ่งมั่นและฝึกฝนทุกวันอย่างครบถ้วน",
      "ฝึกฝนเป็นส่วนใหญ่",
      "ฝึกฝนเป็นบางครั้ง",
      "ประสบปัญหาในการฝึกฝนอย่างต่อเนื่อง"
    ]
  },
  "3. ما هي أبرز المهارات أو الحروف التي شعرت بتحسن واضح فيها؟": {
    questionEn: "3. What are the main skills or letters where you felt a clear improvement?",
    questionTh: "3. ทักษะหรือตัวอักษรใดที่คุณรู้สึกว่าพัฒนาขึ้นอย่างชัดเจน?"
  },
  "4. هل لديك أي صعوبات أو ملاحظات تود مشاركتها مع المعلم والإدارة؟": {
    questionEn: "4. Do you have any difficulties or notes you would like to share with the teacher and administration?",
    questionTh: "4. คุณมีปัญหาหรือข้อเสนอแนะใดๆ ที่ต้องการแบ่งปันกับครูและฝ่ายบริหารหรือไม่?"
  }
};
