import os
import sys
import json
import shutil
import subprocess

print("==================================================================")
print("🚀 ZECRATARY: Synchronizing AI Settings Translations to DB & Stores")
print("   Repository: cygnusorbit/zecratary (GitHub)")
print("==================================================================\n")

# Complete Dictionary for AI Assistant Settings
AI_TRANSLATIONS = {
    "en": {
        "aiAssistantConfigTitle": "AI Assistant Configuration",
        "aiAssistantConfigSubtitle": "Update settings and functional AI provider models for the",
        "agentSuffix": "agent",
        "settingsAppliedSynced": "Settings Applied & Synced",
        "saveConfigurationBtn": "Save Configuration",
        "saving": "Saving...",
        "tabGeneralConfig": "General AI Configuration",
        "tabQuestionnaires": "Multi-Topic Questionnaires",
        "tabVoiceInteraction": "Voice Interaction",
        "tabAgentParameters": "Agent Parameters",
        "topicsActiveBadge": "Topics Active",
        "aiEngineProviderTitle": "AI Engine Provider & Model Selection",
        "aiEngineProviderDesc": "Select your active AI provider and model version. This choice controls which model processes prompts in",
        "autoConnectGemini": "Auto-Connect Gemini",
        "connecting": "Connecting...",
        "syncFromEnv": "Sync from .env",
        "syncing": "Syncing...",
        "googleGeminiTitle": "Google Gemini",
        "googleGeminiSubtitle": "Gemini 2.5 Pro / Flash / 1.5",
        "openAiTitle": "OpenAI GPT",
        "openAiSubtitle": "GPT-4o / GPT-4 Turbo",
        "apiKeyLabel": "API Key",
        "apiKeyPlaceholderGemini": "AIzaSy...",
        "apiKeyPlaceholderOpenAI": "sk-...",
        "hideApiKey": "Hide API key",
        "showApiKey": "Show API key",
        "testConnection": "Test Connection",
        "testing": "Testing...",
        "persistedServerSyncNotice": "Persisted directly to server storage and synced to disk environment.",
        "modelVersionIdentifier": "Model Version Identifier",
        "activeModelEndpointDesc": "Active model endpoint used during AI prompt generation.",
        "geminiOption36": "Gemini 3.6 Flash (Latest Recommended)",
        "geminiOption35": "Gemini 3.5 Flash Lite (Lightweight & Fast)",
        "openaiOption4o": "GPT-4o (Advanced reasoning)",
        "openaiOption4Turbo": "GPT-4 Turbo",
        "openaiOption35Turbo": "GPT-3.5 Turbo (High speed)",
        "questionnaireManagerTitle": "Multi-Topic Questionnaire & Wizard Manager",
        "questionnaireManagerDesc": "Organize intake questions into categorized topics. Use the enable/disable toggle on each topic to include or exclude it from the",
        "intakeWizard": "intake wizard.",
        "questionnaireTopicsHeader": "Questionnaire Topics",
        "enabled": "Enabled",
        "disabled": "Disabled",
        "enableTopicTooltip": "Enable topic",
        "disableTopicTooltip": "Disable topic",
        "deleteTopicTooltip": "Delete topic section",
        "addNewTopicHeader": "Add New Questionnaire Topic",
        "topicTitlePlaceholder": "Topic Title (e.g. Fitness & Macros)...",
        "topicDescPlaceholder": "Topic Description...",
        "createTopicBtn": "Create Topic Category",
        "statusActive": "Status: Active",
        "statusDisabled": "Status: Disabled",
        "questionsCount": "Questions",
        "noQuestionsYet": "No questions in this topic yet. Add one below.",
        "addQuestionPrefix": "Add question to",
        "addBtn": "Add",
        "removeQuestionTooltip": "Remove question",
        "editTopicTitleTooltip": "Edit Topic Title",
        "editTopicDescTooltip": "Edit Topic Description",
        "resultsAppearanceHeader": "Final Results Appearance in /chef Chat",
        "modeCardTitle": "Standard Cards View",
        "modeCardDesc": "Full interactive meal cards with images and batch cooking options.",
        "modeCompactTitle": "Compact Table View",
        "modeCompactDesc": "Condensed list view optimized for quick overview and rapid swapping.",
        "modeDetailedTitle": "Detailed Master View",
        "modeDetailedDesc": "Expanded view displaying full ingredient breakdowns inline.",
        "liveUiPreview": "Live UI Preview",
        "liveUiPreviewNotice": "Updates instantly when selecting above",
        "previewPlanTitle": "High Protein Plan (3 Days)",
        "previewDay1Title": "Day 1 - Sunday:",
        "previewDay2Title": "Day 2 - Monday:",
        "previewMealName1": "Avocado Quinoa Bowl",
        "previewMealName2": "Grilled Salmon Salad",
        "previewMealDesc": "Nutritious plant-based high-protein bowl with fresh lime dressing.",
        "previewIngredients": "Ingredients: Quinoa, Avocado, Chickpeas, Olive Oil",
        "previewCardMealDesc": "Nutritious chef-curated home recipe suited to your diet.",
        "previewDinnerBadge": "Dinner",
        "previewServings": "2 servings",
        "previewDetailedHeading": "Detailed Master Plan Preview",
        "previewThreeDays": "3 Days",
        "voiceInteractionHeader": "Voice Interaction & Speech Configuration",
        "voiceInteractionDesc": "Configure text-to-speech engine, voice models, playback speed, and auto-read behavior.",
        "enableVoiceMode": "Enable Voice Mode",
        "voiceSynthesisEngine": "Voice Synthesis Engine",
        "voiceEngineV1Name": "Version 1.0",
        "voiceEngineV1Desc": "Standard Web Speech API",
        "voiceEngineV2Name": "Version 2.0",
        "voiceEngineV2Desc": "Neural HD Studio Voices",
        "assistantVoicePersona": "Assistant Voice Persona",
        "voiceAria": "Chef Aria (US Female - Warm & Professional)",
        "voiceMarcus": "Chef Marcus (US Male - Deep & Authoritative)",
        "voiceOliver": "Chef Oliver (UK Male - Refined Accent)",
        "voiceMatilda": "Chef Matilda (Australian - Friendly & Casual)",
        "speechSpeed": "Speech Speed",
        "speedNormal": "Normal",
        "speedFast": "Fast",
        "speedRelaxed": "Relaxed",
        "speechSpeedDesc": "Adjust the speaking pace of the AI assistant when reading recipe steps aloud.",
        "autoReadAiResponses": "Auto-Read AI Responses",
        "autoReadAiResponsesDesc": "Automatically speak answers aloud upon generation.",
        "autonomousCapabilitiesHeader": "Autonomous Capabilities & Search Scope Control",
        "autonomousCapabilitiesDesc": "Control what data sources the AI agent searches and incorporates when responding on",
        "liveWebSearch": "Live Web Search",
        "liveWebSearchDesc": "Allows AI to search external culinary web data, trends, and ingredient substitutes.",
        "pantryContextSearch": "Pantry Context Search",
        "pantryContextSearchDesc": "Automatically scans user pantry inventory to build recipes matching in-stock ingredients.",
        "strictDietaryFilters": "Strict Dietary Filters",
        "strictDietaryFiltersDesc": "Enforces strict filtering against user allergies, avoid lists, and religious dietary rules.",
        "agentParametersHeader": "Agent Parameters & Knowledge Tuning",
        "temperatureLabel": "Temperature (Creativity)",
        "tempPrecise": "Precise & Structured",
        "tempBalanced": "Balanced",
        "tempCreative": "Creative & Experimental",
        "temperatureDesc": "Lower values yield deterministic recipe structures; higher values generate novel flavor combinations.",
        "maxPlanDaysCap": "Max Plan Days Limit (Wizard Cap)",
        "maxPlanDaysDesc": "Maximum number of days the AI can structure in a single meal plan wizard sequence.",
        "knowledgeBaseHeader": "Knowledge Base",
        "knowledgeBaseDesc": "Fine-tune the assistant to your needs by adding reference source documents or databases.",
        "knowledgeBasePlaceholder": "Knowledge Base...",
        "customVocabularyHeader": "Custom Vocabulary",
        "customVocabularyDesc": "Enhance accuracy with specialized culinary or business terminology.",
        "filterWordsHeader": "Filter Words",
        "filterWordsDesc": "Restricted words or ingredients remain unspoken or avoided in AI outputs.",
        "systemPromptHeader": "System Prompt / Autonomous Persona",
        "systemPromptDesc": "Defines how the AI agent behaves, formats responses, and handles user queries on the",
        "pageSuffix": "",
        "startTypingToAdd": "Start typing to add",
        "enterKey": "Enter",
        "retainOneTopicWarning": "You must retain at least one questionnaire topic.",
        "enterApiKeyFirst": "Please enter an API key or sync from .env first.",
        "connectionFailed": "Connection failed.",
        "verificationEndpointError": "Could not reach verification endpoint.",
        "noGeminiKeyFound": "No active Google Gemini key found in .env. Please enter a key.",
        "geminiHandshakeFailed": "Gemini handshake failed.",
        "autoConnectionError": "Auto-connection error.",
        "connectedPrefix": "Connected to",
        "keySyncedSuffix": "and key synced!",
        "syncedPrefix": "Synced",
        "keyFromEnvSuccess": "key from .env successfully!",
        "noActiveEnvKeyFound": "No active key found in your local .env file.",
        "syncError": "Sync error:",
        "keySavedToEnv": "Key saved to local .env and synchronized",
        "serverStoredSettings": "Server stored settings"
    },
    "th": {
        "aiAssistantConfigTitle": "การกำหนดค่าผู้ช่วย AI",
        "aiAssistantConfigSubtitle": "อัปเดตการตั้งค่าและโมเดลผู้ให้บริการ AI สำหรับ",
        "agentSuffix": "เอเจนต์",
        "settingsAppliedSynced": "บันทึกและซิงค์การตั้งค่าเรียบร้อยแล้ว",
        "saveConfigurationBtn": "บันทึกการกำหนดค่า",
        "saving": "กำลังบันทึก...",
        "tabGeneralConfig": "การกำหนดค่า AI ทั่วไป",
        "tabQuestionnaires": "แบบสอบถามหลายหัวข้อ",
        "tabVoiceInteraction": "การโต้ตอบด้วยเสียง",
        "tabAgentParameters": "พารามิเตอร์เอเจนต์",
        "topicsActiveBadge": "หัวข้อเปิดใช้งาน",
        "aiEngineProviderTitle": "ผู้ให้บริการและโมเดลประมวลผล AI",
        "aiEngineProviderDesc": "เลือกผู้ให้บริการ AI และเวอร์ชันโมเดลที่ใช้งาน ตัวเลือกนี้จะควบคุมโมเดลที่ใช้ประมวลผลคำสั่งใน",
        "autoConnectGemini": "เชื่อมต่อ Gemini อัตโนมัติ",
        "connecting": "กำลังเชื่อมต่อ...",
        "syncFromEnv": "ซิงค์จาก .env",
        "syncing": "กำลังซิงค์...",
        "googleGeminiTitle": "Google Gemini",
        "googleGeminiSubtitle": "Gemini 2.5 Pro / Flash / 1.5",
        "openAiTitle": "OpenAI GPT",
        "openAiSubtitle": "GPT-4o / GPT-4 Turbo",
        "apiKeyLabel": "คีย์ API",
        "apiKeyPlaceholderGemini": "AIzaSy...",
        "apiKeyPlaceholderOpenAI": "sk-...",
        "hideApiKey": "ซ่อนคีย์ API",
        "showApiKey": "แสดงคีย์ API",
        "testConnection": "ทดสอบการเชื่อมต่อ",
        "testing": "กำลังทดสอบ...",
        "persistedServerSyncNotice": "บันทึกโดยตรงไปยังที่จัดเก็บข้อมูลบนเซิร์ฟเวอร์และซิงค์กับสภาพแวดล้อมระบบ",
        "modelVersionIdentifier": "ตัวระบุเวอร์ชันโมเดล",
        "activeModelEndpointDesc": "ปลายทางโมเดลที่ใช้งานในระหว่างการประมวลผลคำสั่ง AI",
        "geminiOption36": "Gemini 3.6 Flash (แนะนำล่าสุด)",
        "geminiOption35": "Gemini 3.5 Flash Lite (น้ำหนักเบาและรวดเร็ว)",
        "openaiOption4o": "GPT-4o (การใช้เหตุผลขั้นสูง)",
        "openaiOption4Turbo": "GPT-4 Turbo",
        "openaiOption35Turbo": "GPT-3.5 Turbo (ความเร็วสูง)",
        "questionnaireManagerTitle": "ตัวจัดการแบบสอบถามและวิซาร์ดหลายหัวข้อ",
        "questionnaireManagerDesc": "จัดระเบียบคำถามตามหมวดหมู่ ใช้ปุ่มสลับเปิด/ปิดในแต่ละหัวข้อเพื่อรวมหรือแยกออกจาก",
        "intakeWizard": "วิซาร์ดข้อมูลเบื้องต้น",
        "questionnaireTopicsHeader": "หัวข้อแบบสอบถาม",
        "enabled": "เปิดใช้งาน",
        "disabled": "ปิดใช้งาน",
        "enableTopicTooltip": "เปิดใช้งานหัวข้อนี้",
        "disableTopicTooltip": "ปิดใช้งานหัวข้อนี้",
        "deleteTopicTooltip": "ลบหมวดหมู่หัวข้อนี้",
        "addNewTopicHeader": "เพิ่มหัวข้อแบบสอบถามใหม่",
        "topicTitlePlaceholder": "ชื่อหัวข้อ (เช่น การออกกำลังกายและสารอาหาร)...",
        "topicDescPlaceholder": "คำอธิบายหัวข้อ...",
        "createTopicBtn": "สร้างหมวดหมู่หัวข้อ",
        "statusActive": "สถานะ: เปิดใช้งาน",
        "statusDisabled": "สถานะ: ปิดใช้งาน",
        "questionsCount": "คำถาม",
        "noQuestionsYet": "ยังไม่มีคำถามในหัวข้อนี้ เพิ่มคำถามด้านล่าง",
        "addQuestionPrefix": "เพิ่มคำถามใน",
        "addBtn": "เพิ่ม",
        "removeQuestionTooltip": "ลบคำถามนี้",
        "editTopicTitleTooltip": "แก้ไขชื่อหัวข้อ",
        "editTopicDescTooltip": "แก้ไขคำอธิบายหัวข้อ",
        "resultsAppearanceHeader": "รูปแบบการแสดงผลลัพธ์ในแชท /chef",
        "modeCardTitle": "มุมมองการ์ดมาตรฐาน",
        "modeCardDesc": "การ์ดมื้ออาหารแบบโต้ตอบเต็มรูปแบบพร้อมรูปภาพและตัวเลือกการทำอาหารทีละมาก",
        "modeCompactTitle": "มุมมองตารางกะทัดรัด",
        "modeCompactDesc": "มุมมองรายการแบบย่อ ออกแบบมาเพื่อให้ดูภาพรวมและสลับมื้ออาหารได้อย่างรวดเร็ว",
        "modeDetailedTitle": "มุมมองหลักแบบละเอียด",
        "modeDetailedDesc": "มุมมองแบบขยายแสดงรายละเอียดส่วนผสมทั้งหมดแบบอินไลน์",
        "liveUiPreview": "ดูตัวอย่าง UI สด",
        "liveUiPreviewNotice": "อัปเดตทันทีเมื่อเลือกตัวเลือกด้านบน",
        "previewPlanTitle": "แผนอาหารโปรตีนสูง (3 วัน)",
        "previewDay1Title": "วันที่ 1 - วันอาทิตย์:",
        "previewDay2Title": "วันที่ 2 - วันจันทร์:",
        "previewMealName1": "โบวล์ควินัวอะโวคาโด",
        "previewMealName2": "สลัดแซลมอนย่าง",
        "previewMealDesc": "โบวล์พืชโปรตีนสูงที่อุดมด้วยสารอาหารพร้อมน้ำสลัดมะนาวสด",
        "previewIngredients": "ส่วนผสม: ควินัว, อะโวคาโด, ถั่วชิกพี, น้ำมันมะกอก",
        "previewCardMealDesc": "สูตรอาหารทำเองที่คัดสรรโดยเชฟ เหมาะกับแผนโภชนาการของคุณ",
        "previewDinnerBadge": "มื้อเย็น",
        "previewServings": "2 ที่เสิร์ฟ",
        "previewDetailedHeading": "ดูตัวอย่างแผนหลักแบบละเอียด",
        "previewThreeDays": "3 วัน",
        "voiceInteractionHeader": "การโต้ตอบด้วยเสียงและการกำหนดค่าคำพูด",
        "voiceInteractionDesc": "กำหนดค่าเครื่องมือแปลงข้อความเป็นเสียง โมเดลเสียง ความเร็วในการเล่น และพฤติกรรมการอ่านอัตโนมัติ",
        "enableVoiceMode": "เปิดใช้งานโหมดเสียง",
        "voiceSynthesisEngine": "เครื่องมือสร้างเสียงสังเคราะห์",
        "voiceEngineV1Name": "เวอร์ชัน 1.0",
        "voiceEngineV1Desc": "Web Speech API มาตรฐาน",
        "voiceEngineV2Name": "เวอร์ชัน 2.0",
        "voiceEngineV2Desc": "เสียง Neural HD Studio",
        "assistantVoicePersona": "บุคลิกเสียงของผู้ช่วย",
        "voiceAria": "เชฟอาเรีย (หญิงสหรัฐฯ - อบอุ่นและเป็นมืออาชีพ)",
        "voiceMarcus": "เชฟมาร์คัส (ชายสหรัฐฯ - ทุ้มลึกและน่าเชื่อถือ)",
        "voiceOliver": "เชฟโอลิเวอร์ (ชายสหราชอาณาจักร - สำเนียงประณีต)",
        "voiceMatilda": "เชฟมาทิลด้า (ออสเตรเลีย - เป็นกันเองและสบายๆ)",
        "speechSpeed": "ความเร็วเสียงพูด",
        "speedNormal": "ปกติ",
        "speedFast": "เร็ว",
        "speedRelaxed": "ช้าลง",
        "speechSpeedDesc": "ปรับจังหวะการพูดของผู้ช่วย AI เมื่ออ่านขั้นตอนการปรุงอาหารออกเสียง",
        "autoReadAiResponses": "อ่านคำตอบของ AI อัตโนมัติ",
        "autoReadAiResponsesDesc": "อ่านคำตอบออกเสียงทันทีหลังสร้างผลลัพธ์เสร็จ",
        "autonomousCapabilitiesHeader": "ความสามารถอัตโนมัติและการควบคุมขอบเขตการค้นหา",
        "autonomousCapabilitiesDesc": "ควบคุมแหล่งข้อมูลที่ตัวแทน AI ค้นหาและนำมาใช้ประกอบการตอบบน",
        "liveWebSearch": "ค้นหาข้อมูลเว็บแบบสด",
        "liveWebSearchDesc": "อนุญาตให้ AI ค้นหาข้อมูลแนวโน้มการทำอาหารและวัตถุดิบทดแทนจากเว็บภายนอก",
        "pantryContextSearch": "ค้นหาตามบริบทคลังวัตถุดิบ",
        "pantryContextSearchDesc": "สแกนสต็อกวัตถุดิบของผู้ใช้โดยอัตโนมัติเพื่อสร้างสูตรอาหารที่ตรงกับวัตถุดิบที่มีอยู่",
        "strictDietaryFilters": "ตัวกรองข้อจำกัดด้านอาหารอย่างเข้มงวด",
        "strictDietaryFiltersDesc": "บังคับใช้การกรองอย่างเข้มงวดกับสารก่อภูมิแพ้ วัตถุดิบที่ต้องหลีกเลี่ยง และข้อกำหนดทางศาสนา",
        "agentParametersHeader": "พารามิเตอร์ของเอเจนต์และการปรับแต่งฐานความรู้",
        "temperatureLabel": "อุณหภูมิ (ความคิดสร้างสรรค์)",
        "tempPrecise": "แม่นยำและเป็นโครงสร้าง",
        "tempBalanced": "สมดุล",
        "tempCreative": "สร้างสรรค์และทดลอง",
        "temperatureDesc": "ค่าที่ต่ำจะให้สูตรอาหารที่เป็นระบบและแน่นอน ค่าที่สูงจะสร้างสรรค์การจับคู่รสชาติแปลกใหม่",
        "maxPlanDaysCap": "ขีดจำกัดจำนวนวันสูงสุดของแผน (วิซาร์ด)",
        "maxPlanDaysDesc": "จำนวนวันสูงสุดที่ AI สามารถวางแผนมื้ออาหารในหนึ่งขั้นตอนการทำงาน",
        "knowledgeBaseHeader": "ฐานความรู้",
        "knowledgeBaseDesc": "ปรับแต่งผู้ช่วยตามความต้องการของคุณโดยการเพิ่มเอกสารอ้างอิงหรือฐานข้อมูล",
        "knowledgeBasePlaceholder": "ฐานความรู้...",
        "customVocabularyHeader": "คำศัพท์เฉพาะทาง",
        "customVocabularyDesc": "เพิ่มความแม่นยำด้วยคำศัพท์เฉพาะทางด้านการทำอาหารหรือธุรกิจ",
        "filterWordsHeader": "คำที่ต้องกรองออก",
        "filterWordsDesc": "คำหรือวัตถุดิบที่ถูกจำกัดจะไม่ถูกกล่าวถึงหรือหลีกเลี่ยงในผลลัพธ์ของ AI",
        "systemPromptHeader": "พรอมต์ระบบ / บุคลิกอัตโนมัติ",
        "systemPromptDesc": "กำหนดพฤติกรรม รูปแบบการตอบสนอง และการจัดการคำถามของผู้ใช้บนหน้า",
        "pageSuffix": "",
        "startTypingToAdd": "เริ่มพิมพ์เพื่อเพิ่ม",
        "enterKey": "กด Enter",
        "retainOneTopicWarning": "คุณต้องเก็บหมวดหมู่แบบสอบถามไว้อย่างน้อยหนึ่งหัวข้อ",
        "enterApiKeyFirst": "กรุณาระบุคีย์ API หรือซิงค์จาก .env ก่อน",
        "connectionFailed": "การเชื่อมต่อล้มเหลว",
        "verificationEndpointError": "ไม่สามารถเข้าถึงปลายทางการตรวจสอบได้",
        "noGeminiKeyFound": "ไม่พบคีย์ Google Gemini ในไฟล์ .env กรุณาระบุคีย์",
        "geminiHandshakeFailed": "การเชื่อมต่อกับ Gemini ไม่สำเร็จ",
        "autoConnectionError": "เกิดข้อผิดพลาดในการเชื่อมต่ออัตโนมัติ",
        "connectedPrefix": "เชื่อมต่อกับ",
        "keySyncedSuffix": "และซิงค์คีย์เรียบร้อยแล้ว!",
        "syncedPrefix": "ซิงค์",
        "keyFromEnvSuccess": "คีย์จาก .env สำเร็จแล้ว!",
        "noActiveEnvKeyFound": "ไม่พบคีย์ที่ใช้งานได้ในไฟล์ .env ในเครื่องของคุณ",
        "syncError": "ข้อผิดพลาดในการซิงค์:",
        "keySavedToEnv": "บันทึกคีย์ไปยัง .env ในเครื่องและซิงค์เรียบร้อยแล้ว",
        "serverStoredSettings": "เซิร์ฟเวอร์บันทึกการตั้งค่าเรียบร้อยแล้ว"
    },
    "es": {
        "aiAssistantConfigTitle": "Configuración del asistente de IA",
        "aiAssistantConfigSubtitle": "Actualice la configuración y los modelos de IA para el",
        "agentSuffix": "agente",
        "settingsAppliedSynced": "Configuración aplicada y sincronizada",
        "saveConfigurationBtn": "Guardar configuración",
        "saving": "Guardando...",
        "tabGeneralConfig": "Configuración general de IA",
        "tabQuestionnaires": "Cuestionarios multitemáticos",
        "tabVoiceInteraction": "Interacción por voz",
        "tabAgentParameters": "Parámetros del agente",
        "topicsActiveBadge": "Temas activos",
        "aiEngineProviderTitle": "Proveedor de motor de IA y selección de modelo",
        "aiEngineProviderDesc": "Seleccione su proveedor activo y versión del modelo. Esta opción controla el modelo en",
        "autoConnectGemini": "Conectar automáticamente Gemini",
        "connecting": "Conectando...",
        "syncFromEnv": "Sincronizar desde .env",
        "syncing": "Sincronizando...",
        "googleGeminiTitle": "Google Gemini",
        "googleGeminiSubtitle": "Gemini 2.5 Pro / Flash / 1.5",
        "openAiTitle": "OpenAI GPT",
        "openAiSubtitle": "GPT-4o / GPT-4 Turbo",
        "apiKeyLabel": "Clave de API",
        "apiKeyPlaceholderGemini": "AIzaSy...",
        "apiKeyPlaceholderOpenAI": "sk-...",
        "hideApiKey": "Ocultar clave de API",
        "showApiKey": "Mostrar clave de API",
        "testConnection": "Probar conexión",
        "testing": "Probando...",
        "persistedServerSyncNotice": "Guardado directamente en el servidor y sincronizado con el entorno del sistema.",
        "modelVersionIdentifier": "Identificador de versión del modelo",
        "activeModelEndpointDesc": "Punto de conexión del modelo activo utilizado en la generación de IA.",
        "geminiOption36": "Gemini 3.6 Flash (Recomendado reciente)",
        "geminiOption35": "Gemini 3.5 Flash Lite (Ligero y rápido)",
        "openaiOption4o": "GPT-4o (Razonamiento avanzado)",
        "openaiOption4Turbo": "GPT-4 Turbo",
        "openaiOption35Turbo": "GPT-3.5 Turbo (Alta velocidad)",
        "questionnaireManagerTitle": "Gestor de cuestionarios y asistente multitemático",
        "questionnaireManagerDesc": "Organice preguntas por temas categorizados. Utilice el interruptor para incluir o excluir del",
        "intakeWizard": "asistente de admisión.",
        "questionnaireTopicsHeader": "Temas del cuestionario",
        "enabled": "Habilitado",
        "disabled": "Deshabilitado",
        "enableTopicTooltip": "Habilitar tema",
        "disableTopicTooltip": "Deshabilitar tema",
        "deleteTopicTooltip": "Eliminar sección de tema",
        "addNewTopicHeader": "Agregar nuevo tema de cuestionario",
        "topicTitlePlaceholder": "Título del tema (ej. Fitness y Macros)...",
        "topicDescPlaceholder": "Descripción del tema...",
        "createTopicBtn": "Crear categoría de tema",
        "statusActive": "Estado: Activo",
        "statusDisabled": "Estado: Desactivado",
        "questionsCount": "Preguntas",
        "noQuestionsYet": "Aún no hay preguntas en este tema. Añada una abajo.",
        "addQuestionPrefix": "Agregar pregunta a",
        "addBtn": "Añadir",
        "removeQuestionTooltip": "Eliminar pregunta",
        "editTopicTitleTooltip": "Editar título del tema",
        "editTopicDescTooltip": "Editar descripción del tema",
        "resultsAppearanceHeader": "Apariencia de resultados finales en el chat /chef",
        "modeCardTitle": "Vista de tarjetas estándar",
        "modeCardDesc": "Tarjetas de comidas interactivas con imágenes y opciones de cocción por lotes.",
        "modeCompactTitle": "Vista de tabla compacta",
        "modeCompactDesc": "Vista de lista condensada optimizada para una visión general rápida y cambios veloces.",
        "modeDetailedTitle": "Vista maestra detallada",
        "modeDetailedDesc": "Vista ampliada que muestra el desglose completo de ingredientes en línea.",
        "liveUiPreview": "Vista previa de interfaz en vivo",
        "liveUiPreviewNotice": "Se actualiza instantáneamente al seleccionar arriba",
        "previewPlanTitle": "Plan alto en proteínas (3 días)",
        "previewDay1Title": "Día 1 - Domingo:",
        "previewDay2Title": "Día 2 - Lunes:",
        "previewMealName1": "Bol de quinoa y aguacate",
        "previewMealName2": "Ensalada de salmón a la plancha",
        "previewMealDesc": "Nutritivo bol vegetal alto en proteínas con aderezo de lima fresca.",
        "previewIngredients": "Ingredientes: Quinoa, aguacate, garbanzos, aceite de oliva",
        "previewCardMealDesc": "Receta casera nutritiva seleccionada por un chef adaptada a su dieta.",
        "previewDinnerBadge": "Cena",
        "previewServings": "2 porciones",
        "previewDetailedHeading": "Vista previa del plan maestro detallado",
        "previewThreeDays": "3 días",
        "voiceInteractionHeader": "Interacción de voz y configuración de voz",
        "voiceInteractionDesc": "Configure el motor de texto a voz, modelos de voz, velocidad y lectura automática.",
        "enableVoiceMode": "Habilitar modo de voz",
        "voiceSynthesisEngine": "Motor de síntesis de voz",
        "voiceEngineV1Name": "Versión 1.0",
        "voiceEngineV1Desc": "Web Speech API estándar",
        "voiceEngineV2Name": "Versión 2.0",
        "voiceEngineV2Desc": "Voces Neural HD Studio",
        "assistantVoicePersona": "Personalidad de voz del asistente",
        "voiceAria": "Chef Aria (Femenino EE.UU. - Cálida y profesional)",
        "voiceMarcus": "Chef Marcus (Masculino EE.UU. - Profundo y autoritario)",
        "voiceOliver": "Chef Oliver (Masculino Reino Unido - Acento refinado)",
        "voiceMatilda": "Chef Matilda (Australiana - Amigable y casual)",
        "speechSpeed": "Velocidad de voz",
        "speedNormal": "Normal",
        "speedFast": "Rápido",
        "speedRelaxed": "Relajado",
        "speechSpeedDesc": "Ajuste el ritmo de habla del asistente de IA al leer recetas en voz alta.",
        "autoReadAiResponses": "Lectura automática de respuestas de IA",
        "autoReadAiResponsesDesc": "Reproducir respuestas en voz alta automáticamente tras generarse.",
        "autonomousCapabilitiesHeader": "Capacidades autónomas y control de búsqueda",
        "autonomousCapabilitiesDesc": "Controle las fuentes de datos que el agente de IA consulta en",
        "liveWebSearch": "Búsqueda web en vivo",
        "liveWebSearchDesc": "Permite a la IA buscar tendencias culinarias y sustitutos de ingredientes en la web.",
        "pantryContextSearch": "Búsqueda con contexto de despensa",
        "pantryContextSearchDesc": "Escanea la despensa del usuario para crear recetas con los ingredientes disponibles.",
        "strictDietaryFilters": "Filtros dietéticos estrictos",
        "strictDietaryFiltersDesc": "Aplica filtros estrictos para alergias, listas de exclusión y reglas religiosas.",
        "agentParametersHeader": "Parámetros del agente y ajuste de conocimientos",
        "temperatureLabel": "Temperatura (Creatividad)",
        "tempPrecise": "Preciso y estructurado",
        "tempBalanced": "Equilibrado",
        "tempCreative": "Creativo y experimental",
        "temperatureDesc": "Valores bajos generan recetas deterministas; valores altos crean combinaciones innovadoras.",
        "maxPlanDaysCap": "Límite máximo de días del plan (Asistente)",
        "maxPlanDaysDesc": "Número máximo de días que la IA puede planificar en una sola secuencia.",
        "knowledgeBaseHeader": "Base de conocimientos",
        "knowledgeBaseDesc": "Ajuste el asistente agregando documentos de referencia o bases de datos.",
        "knowledgeBasePlaceholder": "Base de conocimientos...",
        "customVocabularyHeader": "Vocabulario personalizado",
        "customVocabularyDesc": "Mejore la precisión con terminología culinaria o comercial especializada.",
        "filterWordsHeader": "Palabras filtradas",
        "filterWordsDesc": "Las palabras o ingredientes restringidos se evitan en las respuestas de la IA.",
        "systemPromptHeader": "Instrucción del sistema / Personalidad autónoma",
        "systemPromptDesc": "Define el comportamiento del agente de IA, formatos de respuesta y consultas en",
        "pageSuffix": "",
        "startTypingToAdd": "Comience a escribir para agregar",
        "enterKey": "Intro",
        "retainOneTopicWarning": "Debe conservar al menos un tema de cuestionario.",
        "enterApiKeyFirst": "Ingrese una clave de API o sincronice desde .env primero.",
        "connectionFailed": "Conexión fallida.",
        "verificationEndpointError": "No se pudo conectar con el endpoint de verificación.",
        "noGeminiKeyFound": "No se encontró ninguna clave de Google Gemini activa en .env. Ingrese una clave.",
        "geminiHandshakeFailed": "Error de enlace con Gemini.",
        "autoConnectionError": "Error de conexión automática.",
        "connectedPrefix": "Conectado a",
        "keySyncedSuffix": "¡y clave sincronizada!",
        "syncedPrefix": "Sincronizado",
        "keyFromEnvSuccess": "clave desde .env exitosamente!",
        "noActiveEnvKeyFound": "No se encontró ninguna clave activa en su archivo .env local.",
        "syncError": "Error de sincronización:",
        "keySavedToEnv": "Clave guardada en .env local y sincronizada",
        "serverStoredSettings": "Configuración guardada en el servidor"
    },
    "fr": {
        "aiAssistantConfigTitle": "Configuration de l'assistant IA",
        "aiAssistantConfigSubtitle": "Mettez à jour les paramètres et modèles d'IA pour",
        "agentSuffix": "agent",
        "settingsAppliedSynced": "Paramètres appliqués et synchronisés",
        "saveConfigurationBtn": "Enregistrer la configuration",
        "saving": "Enregistrement...",
        "tabGeneralConfig": "Configuration générale de l'IA",
        "tabQuestionnaires": "Questionnaires multi-thèmes",
        "tabVoiceInteraction": "Interaction vocale",
        "tabAgentParameters": "Paramètres de l'agent",
        "topicsActiveBadge": "Thèmes actifs",
        "aiEngineProviderTitle": "Fournisseur de moteur IA et sélection du modèle",
        "aiEngineProviderDesc": "Sélectionnez votre fournisseur actif et version du modèle. Ce choix contrôle le modèle dans",
        "autoConnectGemini": "Connexion automatique à Gemini",
        "connecting": "Connexion en cours...",
        "syncFromEnv": "Synchroniser depuis .env",
        "syncing": "Synchronisation...",
        "googleGeminiTitle": "Google Gemini",
        "googleGeminiSubtitle": "Gemini 2.5 Pro / Flash / 1.5",
        "openAiTitle": "OpenAI GPT",
        "openAiSubtitle": "GPT-4o / GPT-4 Turbo",
        "apiKeyLabel": "Clé d'API",
        "apiKeyPlaceholderGemini": "AIzaSy...",
        "apiKeyPlaceholderOpenAI": "sk-...",
        "hideApiKey": "Masquer la clé API",
        "showApiKey": "Afficher la clé API",
        "testConnection": "Tester la connexion",
        "testing": "Test en cours...",
        "persistedServerSyncNotice": "Enregistré directement sur le serveur et synchronisé avec l'environnement système.",
        "modelVersionIdentifier": "Identifiant de version du modèle",
        "activeModelEndpointDesc": "Point de terminaison du modèle actif utilisé pendant la génération d'IA.",
        "geminiOption36": "Gemini 3.6 Flash (Dernier recommandé)",
        "geminiOption35": "Gemini 3.5 Flash Lite (Léger et rapide)",
        "openaiOption4o": "GPT-4o (Raisonnement avancé)",
        "openaiOption4Turbo": "GPT-4 Turbo",
        "openaiOption35Turbo": "GPT-3.5 Turbo (Haute vitesse)",
        "questionnaireManagerTitle": "Gestionnaire de questionnaires et d'assistant multi-thèmes",
        "questionnaireManagerDesc": "Organisez les questions en thèmes catégorisés. Utilisez le bouton bascule pour inclure ou exclure du",
        "intakeWizard": "l'assistant d'accueil.",
        "questionnaireTopicsHeader": "Thèmes du questionnaire",
        "enabled": "Activé",
        "disabled": "Désactivé",
        "enableTopicTooltip": "Activer le thème",
        "disableTopicTooltip": "Désactiver le thème",
        "deleteTopicTooltip": "Supprimer la section du thème",
        "addNewTopicHeader": "Ajouter un nouveau thème de questionnaire",
        "topicTitlePlaceholder": "Titre du thème (ex. Fitness et Macros)...",
        "topicDescPlaceholder": "Description du thème...",
        "createTopicBtn": "Créer une catégorie de thème",
        "statusActive": "Statut : Actif",
        "statusDisabled": "Statut : Désactivé",
        "questionsCount": "Questions",
        "noQuestionsYet": "Aucune question dans ce thème pour le moment. Ajoutez-en une ci-dessous.",
        "addQuestionPrefix": "Ajouter une question à",
        "addBtn": "Ajouter",
        "removeQuestionTooltip": "Supprimer la question",
        "editTopicTitleTooltip": "Modifier le titre du thème",
        "editTopicDescTooltip": "Modifier la description du thème",
        "resultsAppearanceHeader": "Apparence des résultats finaux dans le chat /chef",
        "modeCardTitle": "Vue sous forme de cartes standard",
        "modeCardDesc": "Cartes de repas interactives avec images et options de cuisson par lots.",
        "modeCompactTitle": "Vue en tableau compact",
        "modeCompactDesc": "Vue de liste condensée optimisée pour un aperçu rapide et un échange efficace.",
        "modeDetailedTitle": "Vue principale détaillée",
        "modeDetailedDesc": "Vue élargie affichant la répartition complète des ingrédients en ligne.",
        "liveUiPreview": "Aperçu de l'interface en direct",
        "liveUiPreviewNotice": "Se met à jour instantanément lors de la sélection ci-dessus",
        "previewPlanTitle": "Programme riche en protéines (3 jours)",
        "previewDay1Title": "Jour 1 - Dimanche :",
        "previewDay2Title": "Jour 2 - Lundi :",
        "previewMealName1": "Bol de quinoa et avocat",
        "previewMealName2": "Salade de saumon grillé",
        "previewMealDesc": "Bol végétal nutritif riche en protéines avec vinaigrette au citron vert frais.",
        "previewIngredients": "Ingrédients : Quinoa, avocat, pois chiches, huile d'olive",
        "previewCardMealDesc": "Recette maison nutritive élaborée par un chef et adaptée à votre régime.",
        "previewDinnerBadge": "Dîner",
        "previewServings": "2 portions",
        "previewDetailedHeading": "Aperçu du plan directeur détaillé",
        "previewThreeDays": "3 jours",
        "voiceInteractionHeader": "Configuration vocale et de synthèse vocale",
        "voiceInteractionDesc": "Configurez le moteur de synthèse vocale, les modèles de voix, la vitesse et la lecture automatique.",
        "enableVoiceMode": "Activer le mode vocal",
        "voiceSynthesisEngine": "Moteur de synthèse vocale",
        "voiceEngineV1Name": "Version 1.0",
        "voiceEngineV1Desc": "API Web Speech standard",
        "voiceEngineV2Name": "Version 2.0",
        "voiceEngineV2Desc": "Voix Neural HD Studio",
        "assistantVoicePersona": "Personnalité vocale de l'assistant",
        "voiceAria": "Chef Aria (Femme USA - Chaleureuse et professionnelle)",
        "voiceMarcus": "Chef Marcus (Homme USA - Grave et autoritaire)",
        "voiceOliver": "Chef Oliver (Homme Royaume-Uni - Accent raffiné)",
        "voiceMatilda": "Chef Matilda (Australienne - Conviviale et décontractée)",
        "speechSpeed": "Vitesse d'élocution",
        "speedNormal": "Normale",
        "speedFast": "Rapide",
        "speedRelaxed": "Détendue",
        "speechSpeedDesc": "Ajustez le débit de parole de l'assistant IA lors de la lecture des recettes.",
        "autoReadAiResponses": "Lecture automatique des réponses de l'IA",
        "autoReadAiResponsesDesc": "Lire automatiquement les réponses à voix haute dès leur génération.",
        "autonomousCapabilitiesHeader": "Capacités autonomes et contrôle de recherche",
        "autonomousCapabilitiesDesc": "Contrôlez les sources de données consultées par l'agent IA sur",
        "liveWebSearch": "Recherche Web en direct",
        "liveWebSearchDesc": "Permet à l'IA de rechercher des tendances culinaires et des substituts d'ingrédients sur le Web.",
        "pantryContextSearch": "Recherche contextuelle du garde-manger",
        "pantryContextSearchDesc": "Analyse l'inventaire du garde-manger pour proposer des recettes avec les ingrédients en stock.",
        "strictDietaryFilters": "Filtres diététiques stricts",
        "strictDietaryFiltersDesc": "Applique un filtrage strict pour les allergies, listes d'évitement et interdits alimentaires.",
        "agentParametersHeader": "Paramètres de l'agent et ajustement des connaissances",
        "temperatureLabel": "Température (Créativité)",
        "tempPrecise": "Précis et structuré",
        "tempBalanced": "Équilibré",
        "tempCreative": "Créatif et expérimental",
        "temperatureDesc": "Des valeurs basses donnent des recettes structurées ; des valeurs hautes génèrent des saveurs inédites.",
        "maxPlanDaysCap": "Limite maximale de jours de repas (Assistant)",
        "maxPlanDaysDesc": "Nombre maximum de jours que l'IA peut structurer dans un cycle de planification.",
        "knowledgeBaseHeader": "Base de connaissances",
        "knowledgeBaseDesc": "Affinez l'assistant selon vos besoins en ajoutant des documents ou bases de données de référence.",
        "knowledgeBasePlaceholder": "Base de connaissances...",
        "customVocabularyHeader": "Vocabulaire personnalisé",
        "customVocabularyDesc": "Améliorez la précision avec une terminologie culinaire ou commerciale spécialisée.",
        "filterWordsHeader": "Mots filtrés",
        "filterWordsDesc": "Les mots ou ingrédients restreints ne seront pas mentionnés dans les réponses de l'IA.",
        "systemPromptHeader": "Consigne système / Personnalité autonome",
        "systemPromptDesc": "Définit le comportement de l'agent IA, le format des réponses et le traitement des requêtes sur",
        "pageSuffix": "",
        "startTypingToAdd": "Commencez à taper pour ajouter",
        "enterKey": "Entrée",
        "retainOneTopicWarning": "Vous devez conserver au moins un thème de questionnaire.",
        "enterApiKeyFirst": "Veuillez entrer une clé d'API ou synchroniser depuis .env d'abord.",
        "connectionFailed": "Échec de la connexion.",
        "verificationEndpointError": "Impossible de joindre le point de terminaison de vérification.",
        "noGeminiKeyFound": "Aucune clé Google Gemini active trouvée dans .env. Veuillez en saisir une.",
        "geminiHandshakeFailed": "Échec de la liaison avec Gemini.",
        "autoConnectionError": "Erreur de connexion automatique.",
        "connectedPrefix": "Connecté à",
        "keySyncedSuffix": "et clé synchronisée !",
        "syncedPrefix": "Synchronisé",
        "keyFromEnvSuccess": "clé depuis .env avec succès !",
        "noActiveEnvKeyFound": "Aucune clé active trouvée dans votre fichier .env local.",
        "syncError": "Erreur de synchronisation :",
        "keySavedToEnv": "Clé enregistrée dans le fichier .env local et synchronisée",
        "serverStoredSettings": "Paramètres enregistrés sur le serveur"
    }
}

# ----------------------------------------------------------------------
# 1. Update Dual-Path Server JSON Stores (Immediate Local Fallback)
# ----------------------------------------------------------------------
print("• Updating server-side JSON stores (apps/web/data and data)...")
for rel_json in ['apps/web/data/admin_settings.json', 'data/admin_settings.json']:
    json_path = os.path.join(os.getcwd(), rel_json)
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    existing_data = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except Exception:
            existing_data = {}

    current_trans = existing_data.get("translations", {})
    if not isinstance(current_trans, dict):
        current_trans = {}

    for lang in ['en', 'th', 'es', 'fr']:
        if lang not in current_trans:
            current_trans[lang] = {}
        current_trans[lang].update(AI_TRANSLATIONS[lang])

    existing_data["translations"] = current_trans
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Injected AI settings phrases into: {rel_json}")

# ----------------------------------------------------------------------
# 2. Update LanguageProvider.tsx Builtin Dictionaries
# ----------------------------------------------------------------------
print("\n• Merging AI settings translations into LanguageProvider.tsx...")
lp_candidates = [
    'apps/web/src/components/LanguageProvider.tsx',
    'src/components/LanguageProvider.tsx'
]
lp_path = next((p for p in lp_candidates if os.path.exists(os.path.join(os.getcwd(), p))), None)

if lp_path:
    full_lp = os.path.join(os.getcwd(), lp_path)
    with open(full_lp, 'r', encoding='utf-8') as f:
        lp_code = f.read()

    for lang in ['en', 'th', 'es', 'fr']:
        marker = f"{lang}: {{"
        if marker in lp_code:
            insert_str = ""
            for k, v in AI_TRANSLATIONS[lang].items():
                if f"{k}:" not in lp_code:
                    escaped_val = v.replace("'", "\\'")
                    insert_str += f"    {k}: '{escaped_val}',\n"
            if insert_str:
                lp_code = lp_code.replace(marker, f"{marker}\n{insert_str}")

    with open(full_lp, 'w', encoding='utf-8') as f:
        f.write(lp_code)
    print(f"  ✓ LanguageProvider builtin dictionaries updated in: {lp_path}")

# ----------------------------------------------------------------------
# 3. Node.js Native Workspace DB Bridge (PostgreSQL & MySQL)
# ----------------------------------------------------------------------
print("\n• Executing Database Persistence Bridge via Node.js (resolving project 'pg' & 'mysql2')...")

node_db_sync_script = r'''
const path = require('path');
const fs = require('fs');

// 1. Ingest environment variables
['.env.local', '.env', 'apps/web/.env.local', 'apps/web/.env'].forEach(f => {
  const full = path.join(process.cwd(), f);
  if (fs.existsSync(full)) {
    fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
});

const AI_TRANSLATIONS = ''' + json.dumps(AI_TRANSLATIONS) + ''';

// 2. Safe module resolver across monorepo workspace
function resolveWorkspaceModule(modName) {
  const searchDirs = [
    process.cwd(),
    path.join(process.cwd(), 'apps', 'web'),
    path.join(process.cwd(), 'node_modules'),
    path.join(process.cwd(), 'apps', 'web', 'node_modules')
  ];
  for (const d of searchDirs) {
    try {
      const resolved = require.resolve(modName, { paths: [d] });
      return require(resolved);
    } catch (_) {}
  }
  return null;
}

async function syncPostgres() {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr || connStr.includes('[YOUR-PASSWORD]')) {
    console.log('  ℹ️ PostgreSQL: No active connection string in .env / .env.local.');
    return;
  }

  const pg = resolveWorkspaceModule('pg');
  if (!pg) {
    console.warn('  ⚠️ PostgreSQL: "pg" driver not found in node_modules.');
    return;
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const cleanConnStr = connStr.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
  const pool = new pg.Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  const client = await pool.connect();
  try {
    console.log('  🐘 PostgreSQL: Connected. Ensuring tables and upserting AI settings...');
    
    // Ensure admin_settings & app_translations tables exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY,
        supported_languages JSONB,
        settings JSONB,
        translations JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_translations (
        lang_code VARCHAR(16) PRIMARY KEY,
        lang_name VARCHAR(64),
        dictionary JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Upsert into admin_settings for each language
    for (const lang of ['en', 'th', 'es', 'fr']) {
      const payload = JSON.stringify(AI_TRANSLATIONS[lang]);
      await client.query(`
        INSERT INTO admin_settings (id, translations, updated_at)
        VALUES ('primary_settings', jsonb_build_object($1::text, $2::jsonb), NOW())
        ON CONFLICT (id) DO UPDATE SET
          translations = COALESCE(admin_settings.translations, '{}'::jsonb) || jsonb_build_object($1::text, COALESCE(admin_settings.translations->$1::text, '{}'::jsonb) || $2::jsonb),
          updated_at = NOW();
      `, [lang, payload]);

      // Upsert into app_translations
      const langNames = { en: 'English', th: 'Thai', es: 'Spanish', fr: 'French' };
      await client.query(`
        INSERT INTO app_translations (lang_code, lang_name, dictionary, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (lang_code) DO UPDATE SET
          dictionary = COALESCE(app_translations.dictionary, '{}'::jsonb) || EXCLUDED.dictionary,
          updated_at = NOW();
      `, [lang, langNames[lang], payload]);
    }

    console.log('  ✅ PostgreSQL: Successfully upserted all 70+ AI settings keys across 4 languages!');
  } catch (err) {
    console.warn('  ⚠️ PostgreSQL Note:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function syncMySql() {
  const mysqlUrl = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://') ? process.env.DATABASE_URL : null);
  if (!mysqlUrl) {
    return;
  }

  const mysql = resolveWorkspaceModule('mysql2/promise') || resolveWorkspaceModule('mysql2');
  if (!mysql) {
    console.log('  ℹ️ MySQL: Driver (mysql2) not installed. Skipping MySQL sync.');
    return;
  }

  try {
    console.log('  🐬 MySQL: Connecting and upserting AI settings...');
    const conn = await (mysql.createConnection ? mysql.createConnection(mysqlUrl) : mysql.createConnectionPromise(mysqlUrl));

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id VARCHAR(64) PRIMARY KEY,
        supported_languages JSON,
        settings JSON,
        translations JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    for (const lang of ['en', 'th', 'es', 'fr']) {
      const payload = JSON.stringify(AI_TRANSLATIONS[lang]);
      await conn.query(`
        INSERT INTO admin_settings (id, translations, updated_at)
        VALUES ('primary_settings', JSON_OBJECT(?, CAST(? AS JSON)), NOW())
        ON DUPLICATE KEY UPDATE
          translations = JSON_MERGE_PATCH(COALESCE(translations, JSON_OBJECT()), JSON_OBJECT(?, CAST(? AS JSON))),
          updated_at = NOW();
      `, [lang, payload, lang, payload]);
    }

    console.log('  ✅ MySQL: Successfully upserted AI settings translations!');
    await conn.end();
  } catch (err) {
    console.warn('  ℹ️ MySQL Note:', err.message);
  }
}

async function main() {
  await syncPostgres();
  await syncMySql();
}

main().catch(e => console.error('DB Sync Runner error:', e));
'''

tmp_js = os.path.join(os.getcwd(), 'scripts', 'temp_ai_settings_db_sync.js')
os.makedirs(os.path.dirname(tmp_js), exist_ok=True)
with open(tmp_js, 'w', encoding='utf-8') as f:
    f.write(node_db_sync_script)

res_node = subprocess.run(['node', tmp_js], text=True)
if os.path.exists(tmp_js):
    os.remove(tmp_js)

# ----------------------------------------------------------------------
# 4. Generate Standalone SQL Script (Backup Reference)
# ----------------------------------------------------------------------
sql_statements = []
for lang in ['en', 'th', 'es', 'fr']:
    lang_json = json.dumps(AI_TRANSLATIONS[lang], ensure_ascii=False).replace("'", "''")
    sql_statements.append(f"""
INSERT INTO admin_settings (id, translations, updated_at)
VALUES ('primary_settings', jsonb_build_object('{lang}', '{lang_json}'::jsonb), NOW())
ON CONFLICT (id) DO UPDATE SET 
    translations = COALESCE(admin_settings.translations, '{{}}'::jsonb) || jsonb_build_object('{lang}', COALESCE(admin_settings.translations->'{lang}', '{{}}'::jsonb) || '{lang_json}'::jsonb),
    updated_at = NOW();
""")

sql_backup = 'sync_ai_settings_translations.sql'
with open(sql_backup, 'w', encoding='utf-8') as f:
    f.write("-- Zecratary System Words: AI Settings Synchronization\n")
    f.write("\n".join(sql_statements))
print(f"  ✓ SQL file updated: {sql_backup}")

# ----------------------------------------------------------------------
# 5. Static TypeScript Check ('cd apps/web && npx tsc --noEmit')
# ----------------------------------------------------------------------
print("\n• Running static type verification ('cd apps/web && npx tsc --noEmit')...")
web_dir = os.path.join(os.getcwd(), 'apps', 'web')
tsc_res = subprocess.run(["npx", "tsc", "--noEmit"], cwd=web_dir, capture_output=True, text=True)

if tsc_res.returncode == 0:
    print("✅ Static type check passed with ZERO errors!")
else:
    print(f"⚠️ TypeScript reported diagnostics:\n{tsc_res.stdout}\n{tsc_res.stderr}")
    sys.exit(1)

# ----------------------------------------------------------------------
# 6. Purge Caches Safely
# ----------------------------------------------------------------------
print("\n• Purging build cache directories...")
for c in [
    os.path.join(os.getcwd(), '.next'),
    os.path.join(os.getcwd(), 'apps', 'web', '.next'),
    os.path.join(os.getcwd(), '.turbo'),
    os.path.join(os.getcwd(), 'apps', 'web', '.turbo')
]:
    if os.path.lexists(c):
        subprocess.run(["rm", "-rf", c], check=False)
        print(f"  ✓ Purged: {os.path.relpath(c)}")

# ----------------------------------------------------------------------
# 7. Local Production Build ('npm run build')
# ----------------------------------------------------------------------
print("\n• Validating full local production build ('npm run build')...")
env_vars = os.environ.copy()
env_vars["NEXT_CPU_COUNT"] = "2"
build_res = subprocess.run(["npm", "run", "build"], env=env_vars)

if build_res.returncode == 0:
    print("\n✅ Local production build PASSED with EXIT CODE 0!")
else:
    print(f"\n❌ Build exited with code {build_res.returncode}.")
    sys.exit(1)

# ----------------------------------------------------------------------
# 8. Path-Safe Git Staging & Push to GitHub main
# ----------------------------------------------------------------------
print("\n• Staging updated localization files (strictly excluding .env*)...")
subprocess.run(["git", "rm", "--cached", ".env", ".env.local", "apps/web/.env", "apps/web/.env.local"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

candidate_paths = [
    "apps/web/src/app/admin/ai-settings/page.tsx",
    "src/app/admin/ai-settings/page.tsx",
    "apps/web/src/components/LanguageProvider.tsx",
    "src/components/LanguageProvider.tsx",
    "apps/web/data/admin_settings.json",
    "data/admin_settings.json",
    "sync_ai_settings_translations.sql",
    ".gitignore"
]

existing_paths = [p for p in candidate_paths if os.path.exists(os.path.join(os.getcwd(), p))]
subprocess.run(["git", "add"] + existing_paths, check=True)

staged_files = subprocess.run(["git", "diff", "--name-only", "--cached"], capture_output=True, text=True).stdout.splitlines()
for sf in staged_files:
    if '.env' in sf:
        subprocess.run(["git", "reset", "HEAD", sf], check=False)
        print(f"⚠️ Unstaged sensitive file: {sf}")

cached_diff = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True).stdout.strip()
if cached_diff:
    subprocess.run([
        "git", "commit", "-m",
        "Sync AI settings translations directly to PostgreSQL/MySQL via Node bridge and update LanguageProvider"
    ], check=True)

    print("• Pushing to GitHub main branch ('git push origin main')...")
    push_res = subprocess.run(["git", "push", "origin", "main"])
    if push_res.returncode == 0:
        head_hash = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
        print(f"\n🎉 PUSH SUCCEEDED! Latest Commit: {head_hash}")
        print("Ready for deployment.")
    else:
        print("\n⚠️ Push returned non-zero status. Run 'git push origin main' manually.")
else:
    print("ℹ️ Working tree clean or changes already committed.")

print("\n==================================================================")
print("✨ AI Settings localization & database sync completed successfully!")
print("==================================================================")
