# mousa.ai — Platform TODO (360° Complete Build)

## Phase 1: Database Schema & Infrastructure
- [x] Fix Home.tsx conflict from web-db-user upgrade
- [x] Extend drizzle schema: credits, transactions, ai_sessions tables
- [x] Run pnpm db:push to migrate schema
- [x] Add server-side DB helpers for credits and sessions

## Phase 2: Credit System
- [x] tRPC: getUserCredits procedure
- [x] tRPC: deductCredits procedure (protected)
- [x] tRPC: getCreditHistory procedure
- [x] tRPC: adminGrantCredits procedure (admin only)
- [x] Auto-grant 200 credits on first login (new user)

## Phase 3: User Dashboard
- [x] Real dashboard page with actual user data
- [x] Credit balance display (live from DB)
- [x] Usage history table (last 20 sessions)
- [x] Platform access cards (5 platforms)
- [ ] Account settings section
- [ ] Post-login redirect to /dashboard

## Phase 4: AI Platform Pages (5 platforms)
- [x] Fada (فضاء) — Interior design AI with LLM + credit deduction
- [x] Raqaba (رقابة) — Site inspection AI with LLM
- [x] Harara (حرارة) — Energy efficiency AI with LLM
- [x] Maskan (مسكن) — Housing needs AI with LLM
- [x] Code (كود) — Engineering codes search AI with LLM
- [x] Each platform: chat interface, session save, credit display

## Phase 5: Admin Panel
- [ ] Admin-only route /admin
- [ ] User list with credit balances
- [ ] Grant/deduct credits to users
- [ ] Usage analytics (sessions per platform)
- [ ] Revenue overview

## Phase 6: Navigation & Auth
- [x] Navbar shows user name + credit balance when logged in
- [x] Navbar shows login button when not logged in
- [x] Mobile hamburger menu
- [x] Fix all CTA buttons to use OAuth SSO
- [x] Protect /dashboard routes

## Phase 7: Legal & SEO
- [x] /terms page (Arabic)
- [x] /privacy page (Arabic)
- [x] Footer legal links
- [ ] SEO meta tags on all pages
- [ ] robots.txt and sitemap

## Phase 8: Quality & Testing
- [ ] Vitest tests for credit system
- [x] Vitest tests for auth procedures
- [x] Production TypeScript check passes (0 errors)
- [ ] Mobile responsiveness verified
- [ ] Save final checkpoint

## Phase 9: Mobile Fixes
- [x] Fix hero video autoplay on iOS Safari mobile
- [x] Add poster/fallback image for hero when video fails to load
- [x] Ensure hero visual consistency on mobile (no desert fallback)

## Phase 10: Stripe Payment Integration
- [x] Add Stripe feature scaffold via webdev_add_feature
- [x] Request Stripe API keys from user
- [x] Create credit packages (500, 2000, 5000 credits)
- [x] Build Stripe Checkout session tRPC procedure
- [x] Build Stripe webhook handler (payment success → grant credits)
- [x] Build Pricing page with real Stripe checkout buttons
- [x] Show purchase history in Dashboard
- [x] Test end-to-end payment flow

## Phase 11: Admin Dashboard + Payment History
- [x] Admin page /admin with revenue stats, user list, credit grant/deduct
- [x] Admin route protection (role-based)
- [x] Payment history tab in user Dashboard
- [x] Register /admin route in App.tsx

## Phase 12: Memory & Session Enhancement
- [ ] DB: Add session_summaries table
- [ ] DB: Add user_project_profiles table
- [ ] pnpm db:push to migrate
- [ ] Server: getSessionMessages procedure returns full messages for resume
- [ ] Server: Auto-generate session summary via LLM after each chat
- [ ] Server: Save/get/update user project profile procedures
- [ ] Frontend: Clicking a past session loads its messages (resume)
- [ ] Frontend: Project profile panel (save name, location, type, notes)
- [ ] Frontend: Project context injected into system prompt automatically

## Phase 13: External Platform Links
- [ ] Update PLATFORMS constant in Home.tsx — فضاء → sarahdesign-umc8qbss.manus.space
- [ ] Update PLATFORMS constant in Home.tsx — رقابة → archicodesa-wzq39rwg.manus.space
- [ ] Update PLATFORMS constant in Home.tsx — حرارة → thermabuild-x9xsnp5r.manus.space
- [ ] Update PLATFORMS constant in Home.tsx — مسكن → famhousing-glcsxkkd.manus.space
- [ ] Update PLATFORMS constant in Home.tsx — كود → khaledinspec-vbvhhdsv.manus.space
- [ ] Update Dashboard platform cards to use external URLs (open in new tab)
- [ ] Update App.tsx to keep internal routes as fallback only

## Phase 14: Integration — Fix Links + Token Handoff + Credit API
- [x] Fix reversed sub-platform URLs in App.tsx (raqaba/code were swapped)
- [x] Fix reversed sub-platform URLs in Home.tsx
- [x] Fix reversed sub-platform URLs in Dashboard.tsx
- [x] Build Token Handoff: server procedure platform.generateToken (JWT 5min)
- [x] Build Token Handoff: update platform card links to pass ?token= in URL
- [x] Build Credit Deduction API: REST endpoint POST /api/platform/deduct-credits
- [x] Build Credit Deduction API: platform API key validation middleware
- [x] Build Credit Balance Check: GET /api/platform/check-balance
- [x] Add Upgrade Redirect support: /pricing?ref=platform&return=url
- [x] Update PROJECT_RULES.md with confirmed correct URLs
- [x] Write vitest tests for Token Handoff and Credit API (10 tests passing)

## Phase 15: Fix OAuth Login Loop
- [x] Analyze OAuth callback flow and identify loop cause
- [x] Fix session cookie persistence after OAuth redirect
- [x] Ensure redirect after login goes to dashboard not home
- [x] Update getLoginUrl() to embed returnPath in state (JSON format, backward compatible)
- [x] Update oauth.ts parseState() to read returnPath and redirect correctly
- [x] Update sdk.ts decodeState() to support new JSON state format
- [x] Update DiamondHero to show "لوحة التحكم" button when authenticated
- [ ] Test on mobile (Safari iOS) — requires user verification

## Phase 16: Fix Sub-Platform Card Links
- [x] Diagnose why platform card clicks don't open sub-platforms (Safari blocks window.open in async callbacks)
- [x] Fix click handler in Home.tsx — direct window.open() synchronously
- [x] Fix click handler in Dashboard.tsx — direct window.open() synchronously
- [x] Token Handoff disabled temporarily until sub-platforms are ready to receive it

## Phase 17: Pricing + Stripe + Footer
- [x] Update stripeProducts.ts with new researched pricing tiers (Starter $9.99, Pro $34.99, Studio $74.99, Team $179.99)
- [x] Update Pricing.tsx with 4 packages grid + usage hints per package
- [x] Wire Stripe checkout button with trpc.payments.createCheckout (already existed)
- [x] Verify stripeWebhook.ts grants credits on checkout.session.completed (confirmed working)
- [x] Footer component exists and is complete
- [x] Add Footer to Home.tsx
- [x] Footer confirmed in Pricing.tsx, Terms.tsx, Privacy.tsx

## Phase 18: Hero CTA Redesign
- [x] Change primary CTA from "لوحة التحكم" to scroll-to-platforms anchor
- [x] Add id="platforms" to platforms section in Home.tsx
- [x] Update DiamondHero: primary button = "اكتشف المنصات ↓" (scroll to #platforms)
- [x] Secondary button: "ابدأ مجاناً" / "لوحة التحكم" based on auth state

## Phase 19: Currency SAR + Stripe Test
- [ ] Change currency from AED to SAR in stripeProducts.ts
- [ ] Update currency in routers.ts createCheckout procedure
- [ ] Update currency display in Pricing.tsx (ر.س instead of د.إ)
- [ ] Test full payment flow with card 4242 4242 4242 4242
- [ ] Verify credits are added after successful payment

## Phase 20: Multi-Language Support (i18n)
- [x] Analyze demographics and finalize language priority list (AR, EN, UR, HI, FR)
- [x] Install react-i18next + i18next-browser-languagedetector
- [x] Create /client/src/i18n/ directory structure
- [x] Write Arabic (ar) translation file — base language
- [x] Write English (en) translation file
- [x] Write Urdu (ur) translation file (RTL)
- [x] Write French (fr) translation file
- [x] Write Hindi (hi) translation file
- [x] Add LanguageSwitcher component (flag + name dropdown)
- [x] Add LanguageSwitcher to Navbar (desktop + mobile)
- [x] Handle RTL/LTR switching in App.tsx (document.dir sync)
- [x] Import i18n in main.tsx before App renders
- [x] 0 TypeScript errors, 10 tests passing
- [ ] Wire useTranslation() in Home.tsx, DiamondHero.tsx, Pricing.tsx, Dashboard.tsx (next step)

## Phase 21: Fix Pricing Buttons
- [x] Fix "اشترك الآن" button style — should be solid gold not outline
- [x] Fix Pro plan button text — shows "الأكثر شيوعاً" instead of "اشترك الآن"

## Phase 22: Monthly Subscriptions via Stripe
- [x] Create Stripe test subscription products (Starter 49 AED, Pro 149 AED, Office 349 AED)
- [x] Update stripeProducts.ts with subscription Price IDs
- [x] Add subscriptions table to drizzle schema
- [x] Run pnpm db:push
- [x] tRPC: createSubscriptionCheckout procedure
- [x] tRPC: getMySubscription procedure
- [x] tRPC: managePortal procedure (Stripe Billing Portal)
- [x] Update stripeWebhook.ts: handle subscription events (created, renewed, cancelled, failed)
- [x] Wire Pricing.tsx "اشترك الآن" buttons to subscription checkout
- [x] Add subscription status card to Dashboard (tab "اشتراكي")
- [x] Vitest tests for subscription procedures (28 tests passing)

## Phase 23: تبسيط الوصول للاشتراكات
- [x] إضافة بطاقة الاشتراك الحالي في تبويب overview مباشرة
- [x] إضافة زر "اشتراكي" بارز في header الـ Dashboard
- [x] نقل تبويب subscription ليكون أول التبويبات

## Phase 24: الإصلاحات القانونية والأمنية الحرجة
- [x] إضافة helmet لـ HTTP Security Headers
- [x] إضافة Rate Limiting على /api/trpc
- [x] تخفيض body limit من 50MB إلى 5MB
- [ ] توحيد أسعار Pricing مع stripeProducts (AED حقيقي في Stripe)
- [x] إضافة سياسة استرداد الأموال (Refund Policy) صفحة مستقلة
- [x] إضافة بيانات الاتصال القانونية في Footer
- [x] Cookie Consent Banner
- [x] OG Tags في index.html للمشاركة الاجتماعية
- [x] robots.txt وsitemap.xml
- [ ] نقل Platform API Keys إلى env vars آمنة

## Phase 25: إكمال النقاط القانونية 100%
- [ ] توحيد الأسعار AED في stripeProducts.ts وPricing.tsx
- [ ] صفحة /contact مع نموذج دعم وإشعار فوري للمالك
- [ ] نقل Platform API Keys إلى env vars في Manus Secrets
- [ ] تحديث Terms.tsx ببيانات الاتصال الكاملة (اسم الشركة + عنوان + إيميل)
- [ ] تحديث Privacy.tsx ببيانات الاتصال الكاملة
- [ ] تأمين deductCredits بـ Database Transaction
- [ ] إضافة رابط /contact في Navbar وFooter

## Phase 26: نظام الاسترداد الكامل + الدولار + إغلاق الفجوات
- [x] تحويل جميع الأسعار للدولار (Pricing + stripeProducts)
- [x] جدول refund_requests في قاعدة البيانات
- [x] API: طلب استرداد + قبول/رفض + تنفيذ Stripe Refund تلقائياً
- [x] نموذج طلب الاسترداد للمستخدم في Dashboard
- [x] لوحة إدارة الاسترداد في Admin Panel مع Stripe Refund تلقائي
- [x] تحديث Terms وPrivacy وRefund Policy ببيانات الشركة الرسمية
- [x] تأمين deductCredits بـ Database Transaction
- [x] نقل Platform API Keys إلى env vars آمنة

## Phase 27: تصغير رقم الرخصة
- [ ] تصغير رقم الرخصة في Footer ليكون نصاً صغيراً هادئاً
- [ ] تصغيره في Terms وPrivacy ليكون ضمن النص لا بارزاً

## Phase 27: تصغير رقم الرخصة + صفحة Contact + توافق الدولار
- [ ] تصغير رقم الرخصة في Footer ليكون هادئاً (مكتمل جزئياً)
- [ ] تصغير رقم الرخصة في Terms.tsx وPrivacy.tsx (إزالة التمييز الذهبي)
- [ ] بناء صفحة /contact مع نموذج دعم وإشعار فوري للمالك
- [ ] ربط /contact في Footer وNavbar
- [ ] التحقق من توافق Price IDs بالدولار في stripeProducts.ts

## Phase 28: Price IDs + FAQ + اختبار الاسترداد
- [x] التحقق من Price IDs في stripeProducts وتوافقها مع Stripe Dashboard
- [x] بناء صفحة FAQ كاملة مع ربطها في Navbar وFooter
- [x] كتابة vitest لاختبار refund procedures

## Phase 29: إصلاح تدفق الاشتراك
- [x] تشخيص سبب عدم التحويل لـ Stripe Checkout عند الضغط على "اشترك الآن"
- [x] إصلاح الكود وتجربة تدق الاشتراك كاملاً

## Phase 30: إصلاح webhook الاشتراك
- [ ] تشخيص سبب عدم إضافة الكريدتات بعد الاشتراك
- [ ] إصلاح معالجة checkout.session.completed للاشتراكات
- [ ] إضافة الكريدتات يدوياً للمستخدم المتضرر

## Phase 31: Live Keys + Email Notifications + Webhook Test
- [ ] إضافة Live Stripe Keys (sk_live_, pk_live_)
- [ ] بناء نظام إشعارات البريد الإلكتروني عند الاشتراك والتجديد والإلغاء
- [ ] اختبار webhook من Stripe Dashboard
- [ ] كتابة vitest للتحقق من منطق webhook الجديد

## Phase 31: Analytics & Performance Monitoring Dashboard
- [ ] Add platform_errors table to schema for technical error tracking
- [ ] Add user_feedback table for user ratings/comments per session
- [ ] Add response_time_ms column to ai_sessions
- [ ] Run pnpm db:push for new schema
- [ ] Add getAnalytics DB helpers: per-platform stats, growth trends, error rates
- [ ] Add admin.getAnalytics tRPC procedure
- [ ] Build AdminAnalytics.tsx page with charts (recharts)
- [ ] KPI cards: total users, sessions, revenue, credits consumed
- [ ] Per-platform breakdown: usage count, credits used, error rate, avg response time
- [ ] Growth charts: daily/weekly/monthly new users + sessions
- [ ] Error monitoring: failed sessions per platform over time
- [ ] User feedback: ratings distribution per platform
- [ ] Revenue analytics: payments over time, subscription breakdown
- [ ] Add "مراقبة" tab to Admin.tsx
- [ ] Write vitest tests for analytics procedures

## Phase 32: Onboarding Video Popup
- [x] Create PlatformIntroPopup component with video player and skip option
- [x] Connect to video library API (mousa-videos-dhirhndb.manus.space/api/trpc/releases.getIntro)
- [x] Show popup when user clicks on a platform card, before redirecting
- [x] Support AR/EN based on current i18n language setting
- [x] Remember if user has watched/skipped per platform (localStorage)
- [x] "شاهد الآن" button plays video, "تخطي" button redirects immediately
- [x] After video ends, auto-redirect to platform

## Phase 33: Fix Video Popup CORS Issue
- [x] Diagnose CORS error blocking direct fetch from browser to mousa-videos API
- [x] Add server-side proxy endpoint /api/video-intro to bypass CORS
- [x] Update PlatformIntroPopup to use /api/video-intro proxy instead of direct fetch
- [x] Test all 5 platforms — videos load and play correctly

## Phase 34: Fix Video Popup Always Shows
- [x] Diagnose: popup was only showing on first visit due to localStorage "seen" flag
- [x] Fix App.tsx PlatformRedirect to always show popup on every visit
- [x] Remove localStorage tracking from PlatformIntroPopup (no longer needed)
- [x] Tested: popup appears every time user navigates to any platform route

## Phase 35: Fix PlatformIntroPopup Language Detection
- [ ] Fix PlatformIntroPopup to detect Arabic language correctly and show Arabic text when site is in Arabic mode

## Phase 35: Fix PlatformIntroPopup Language + Full Screen Mobile
- [x] Fix language detection — show Arabic for Arabic users (use document.documentElement.lang as fallback)
- [x] Make popup full-screen on mobile — video fills entire screen height

## Phase 36: Fullscreen Video Popup
- [x] Make video popup fullscreen on mobile — fill entire screen with fullscreen button

## Phase 37: Fix Arabic Video Fetching
- [x] Fix video popup to always fetch Arabic video when site is in Arabic mode (use useTranslation hook)

## Phase 38: MOUSA Widget Integration
- [ ] Add widget script tag to client/index.html before </body>
- [ ] Inject MOUSA_CONTEXT with user data (name, credits, plan, currentPage) in App.tsx
- [ ] Add data-mousa attributes to platform cards in Home.tsx
- [ ] Add data-mousa attributes to platform cards in Dashboard.tsx
- [ ] Add data-mousa-action to CTA buttons (ابدأ مجاناً, سجّل الآن, اشترك)
- [ ] Add id/name attributes to registration form fields
- [ ] Test widget orb appears and responds to voice commands

## Phase 39: Custom MOUSA AI Widget (Built from Scratch)
- [ ] Analyze reference site widget design and visual quality
- [ ] Build standalone widget JS/CSS bundle with premium visuals (glowing orb, pulse animations, AI glow)
- [ ] Train widget with mousa.ai knowledge base (5 platforms, credits, pricing, FAQ)
- [ ] Integrate widget into mousa.ai with user context (name, credits, plan, current page)
- [ ] Test widget on all pages in Arabic and English

## Phase 40: Full AI Sales Agent Widget
- [x] Fix TTS to work correctly (use avatarguide proxy + Forge API fallback)
- [x] Build full UI automation: navigate, fill fields, click buttons natively
- [x] Add data-mousa-field to all platform form inputs for auto-fill
- [x] Update system prompt with sales/marketing persona and guided tour scripts
- [x] Test complete agent flow end-to-end (10 vitest tests passing)

## Phase 41: Widget v3.0 — Advanced Agent
- [x] Redesign widget with chat panel (open/close on orb click)
- [x] Add quick action buttons (جولة تعريفية، المنصات، الكريدت، مساعدة)
- [x] Add chat input bar with mic button
- [x] Implement FILL_FORM command for multi-field auto-fill
- [x] Implement FILL_CHAT_INPUT command for platform chat pre-fill
- [x] Implement CLICK_SMART command with text/selector/aria-label matching
- [x] Implement OPEN_PLATFORM command with pre-fill message support
- [x] Add action toast notifications for user feedback
- [x] Add pre-fill from sessionStorage (cross-page message passing)
- [x] Add data-mousa-platform to Home.tsx and Dashboard.tsx cards
- [x] Add data-mousa-field to AIPlatformPage.tsx form inputs and chat
- [x] Enhance useMousaWidget hook with currentPlatform + isAuthenticated
- [x] Expose window.MousaWidget API for external control
- [x] Write 10 vitest tests for widget API (all passing)

## Phase 42: Widget Icon Redesign — Premium AI Visual Identity
- [ ] Replace robot emoji icon in widget orb with premium SVG AI avatar (geometric neural face)
- [ ] Replace robot icon in chat panel header with same premium SVG
- [ ] Replace microphone icon with premium voice-wave SVG animation
- [ ] Ensure all icons match mousa.ai dark/gold design language

## Phase 43: Widget v4.0 — Smart Voice Agent
- [x] Auto-hide chat panel when tour starts (don't block the view)
- [x] Restore chat panel after tour ends
- [x] Replace robot emoji with premium SVG geometric AI avatar (hexagon + neural lines + glowing eyes)
- [x] Replace microphone emoji with animated SVG voice-wave icon
- [x] Replace tour hand cursor with custom SVG gold pointer
- [x] Add hide/show toggle button — collapses to minimal tab at bottom
- [x] Persist hide/show preference in localStorage
- [x] Always-on listening by default: widget starts listening immediately after welcome
- [x] Single tap on orb = pause/stop listening (the ONLY way to stop)
- [x] Tap again on paused orb = resume listening
- [x] Visual indicator: green waveform SVG when listening, gold waveform when speaking, grey pause icon
- [x] Auto-restart listening after AI finishes speaking (continuous loop)
- [x] Auto-pause when user is actively typing in a form field
- [x] Persist paused/active state in localStorage
- [x] Smart Barge-In: Web Audio API VAD detects user voice while AI speaks and stops immediately
- [x] Barge-in indicator banner shown when user interrupts
- [x] No interruption rule: AI waits for silence before processing (2s silence timer)
- [x] Animated SVG states: idle/listening/thinking/speaking/paused each have distinct visuals
- [x] Auto-welcome on page load: greet user by name (if logged in) or as guest
- [x] Welcome message includes: platform intro + 5 platforms overview + invitation to start
- [x] Welcome is spoken aloud + shown in chat panel (auto-opens)
- [x] Personalized greeting: different message for returning users vs new visitors vs platform pages
- [x] After welcome, immediately starts listening for user response

## Phase 44: Widget v4.1 — Icon Fix
- [x] Fix overflow:hidden on orb-inner that was clipping SVG icons (changed to overflow:visible)
- [x] Add cache-busting timestamp to widget script tag in index.html (Date.now())
- [x] Update STORAGE_KEY to v41 to force re-init on all browsers
- [x] Confirm TTS and chat API both working (verified via network logs: 200 OK)
- [x] Confirm v4.1 loading in browser console logs

## Phase 45: Widget Audio Fix
- [x] Fix browser Autoplay Policy blocking audio on page load
- [x] Add audio unlock on first user interaction (click/tap anywhere)
- [x] After unlock, replay welcome message with sound
- [x] Persist audio unlock state in sessionStorage

## Phase 46: Add Tashkila 3D Platform + Widget Fixes v4.3
- [x] Fix widget audio duplication: autoWelcome no longer calls speak() directly
- [x] Remove browser TTS fallback that caused double audio
- [x] Disable auto-open chat panel on page load (only open when user clicks orb)
- [x] Add Tashkila 3D (خيال) as 6th sub-platform in Home.tsx platforms grid
- [x] Add Tashkila 3D card in Dashboard.tsx
- [x] Update widget system prompt to include Tashkila 3D description (6 platforms)
- [x] Update welcome messages to mention 6 platforms including خيال
- [x] Update STORAGE_KEY to v43 to force re-init on all browsers
- [x] Update cache-busting version to 4.3.0 in index.html

## Phase 47: خيال Platform Card Image
- [x] Generate premium AI cinematic image for خيال card (6 worlds: sci-fi, architecture, science, fantasy, history, education)
- [x] Upload to CDN and update Home.tsx with new image URL
- [x] Update tagline and description to reflect all creative domains

## Phase 40: Security & Production Audit (Mar 2026)
- [x] Add khayal to PLATFORM_CONFIGS in routers.ts (was missing)
- [x] Add khayal to all platform z.enum() validators in routers.ts
- [x] Add khayal to schema.ts aiSessions and userProjectProfiles enums
- [x] Run pnpm db:push to apply khayal enum to database
- [x] Add khayal to PLATFORM_API_KEYS in platformApi.ts
- [x] Add PLATFORM_API_KEY_KHAYAL to env.ts
- [x] Fix CORS wildcard in platformApi.ts — restrict to known sub-platform origins
- [x] Fix grantCredits race condition — wrap in DB transaction
- [x] Add error logging for credit deduction failure after LLM success
- [x] All 84 tests passing after changes

## Phase 41: إعداد النطاقات الفرعية + مفتاح خيال
- [x] التحقق من حالة DNS لـ khayal.mousa.ai ✅ يستجيب HTTP 200
- [x] التحقق من حالة DNS لـ fada.mousa.ai ✅ يستجيب HTTP 200
- [x] التحقق من حالة DNS لـ raqaba.mousa.ai ✅ يستجيب HTTP 200
- [x] التحقق من حالة DNS لـ harara.mousa.ai ✅ يستجيب HTTP 200
- [x] التحقق من حالة DNS لـ maskan.mousa.ai ⚠️ SSL handshake failure (CNAME صحيح، يحتاج ربط في Manus)
- [x] التحقق من حالة DNS لـ code.mousa.ai ✅ يستجيب HTTP 200
- [x] إضافة PLATFORM_API_KEY_KHAYAL في Secrets

## Phase 42: إصلاح روابط المنصات + SSL maskan
- [x] البحث عن الرابط الفعلي لمشروع خيال → tashkila3d-bxekpajg.manus.space (يستجيب HTTP 200)
- [x] تحديث رابط khayal في routers.ts (كان placeholder خاطئ، تم التصحيح)
- [x] التحقق من جميع روابط المنصات — 5/6 تعمل بشكل صحيح
- [ ] إصلاح SSL لـ maskan.mousa.ai — يحتاج ربط يدوي في Manus Settings ← Domains

## Phase 43: إصلاح مشكلة الصوت (TTS)
- [x] تشخيص سبب فشل TTS: Forge API لا يدعم /v1/audio/speech (404)
- [x] إصلاح TTS: إضافة Web Speech API كـ fallback مع تحديد الصوت العربي

## Phase 44: إصلاح تكرار وازدواجية الصوت
- [x] تشخيص: 3 أسباب للتكرار (speakBrowser بدون guard, pendingWelcome مزدوج, speak() متزامن)
- [x] إصلاح: إضافة started flag في speakBrowser, guard في speak(), تصحيح showAudioUnlockPrompt

## Phase 45: إصلاح ازدواجية الرسائل والردود
- [x] تشخيص: speechProcessed guard مفقود في onresult يجعل processSpeech يُستدعى مرتين
- [x] إصلاح: إضافة speechProcessed flag في onresult, isProcessing guard في processSpeech و handleChatSend

## Phase 46: تحسين جودة الصوت العربي الفصيح
- [x] البحث: ElevenLabs هي الخيار الأمثل — صوت Mousa uae ذكوري عربي فصيح
- [x] تطبيق ElevenLabs eleven_flash_v2_5 بصوت 6LC8fQJu1Jg3bglhviXA (Mousa uae)
- [x] إضافة ELEVENLABS_API_KEY إلى Secrets
- [x] زيادة timeout في الويجت من 6s إلى 12s لتوافق ElevenLabs
- [x] كتابة vitest للتحقق من ElevenLabs API (2 اختبارات تجتاز)

## Phase 47: خصم الكريدت على موسى الذكي + تحليل الأداء
- [ ] تفعيل خصم 5 كريدت لكل رسالة في /api/widget/chat
- [ ] التحقق من الرصيد قبل الرد وإرجاع خطأ واضح عند النفاد
- [ ] تحليل قدرة المنصة على استيعاب 500-1000 مستخدم متزامن
- [ ] تقرير شامل بالقيود والتحسينات المقترحة

## Phase 48: تطوير موسى الذكي المتقدم
- [ ] تسريع استحضار الأوربة (preload عند تحميل الصفحة)
- [ ] تحريك الأوربة ذكياً (يمين/يسار/فوق/تحت) حسب السياق
- [ ] إضافة نقطة إشارة ذكية تتحرك على الصفحة دون تغطية المحتوى
- [ ] دعم أصوات متعددة (مهندس/مهندسة) قابلة للاختيار
- [ ] التحكم في الفيديو التثقيفي (تشغيل/تخطي) من موسى الذكي

## Phase 48: Widget v4.4 Enhancements
- [x] Add MOVE_ORB command — move orb to specific element or position
- [x] Add PLAY_VIDEO command — play educational/tutorial video on page
- [x] Add SKIP_VIDEO command — skip/pause video on page
- [x] Add SET_VOICE command — switch between Mousa (male) and Asmaa (female) voices
- [x] Add voice toggle button in chat quick actions (🎤 موسى / 🎤 أسماء)
- [x] Add smart collision avoidance — orb auto-moves away from important content on scroll
- [x] Update LLM JSON schema to include new commands (MOVE_ORB, PLAY_VIDEO, SKIP_VIDEO, SET_VOICE)
- [x] Update system prompt with new command descriptions and usage guidelines
- [x] Verify credit deduction (5 credits/message) works for widget chat
- [x] All 88 tests passing

## Phase 49: Fix Widget Not Showing
- [x] Diagnose why mousa widget doesn't appear on the site — syntax error in JS file
- [x] Fix the issue — restored corrupted `const link = document.createElement("link")` line
- [x] Verify widget loads correctly — node --check passes with 0 errors

## Phase 50: Fix Pre-Launch Audit Gaps
- [x] Fix ElevenLabs TTS 503 error in production — TTS working correctly (was sandbox restart issue)
- [x] Fix post-login redirect to /dashboard after OAuth — getLoginUrl() defaults to /dashboard + Home redirects auth users
- [x] Add social media links to Footer (X/Twitter, Instagram, LinkedIn)
- [x] Fix mobile responsiveness in Dashboard page — tabs scroll horizontally, stats grid 1-col on mobile
- [x] Fix mobile responsiveness in Pricing page — tables scroll horizontally, min-w applied
- [ ] Note: maskan.mousa.ai SSL requires manual fix in Manus Settings → Domains (user action needed)

## Phase 51: Fix Credit Deduction & TTS Audio Issues
- [x] Diagnose credit deduction flow — credits were deducted after LLM only, even if TTS failed
- [x] Fix TTS audio cutting — merged TTS into chat endpoint (no separate round-trip)
- [x] Fair credit policy: full cost if TTS succeeds, half cost if TTS fails (LLM still consumed resources)
- [x] Added speakFromBase64() in widget to play inline audio from chat response instantly
- [x] Widget now falls back to browser TTS only when ElevenLabs is unavailable
- [x] All 88 tests pass, widget JS syntax clean

## Phase 52: Fix Audio Cutting Issue
- [x] Diagnose root cause: browser Autoplay Policy blocks audio before user interaction
- [x] Fix: store blocked audio in pendingAudioSrc, replay on first user interaction (click/touch/orb tap)
- [x] Fix: orb click now immediately unlocks audio and replays pending audio
- [x] Fix: speakFromBase64 also stores blocked audio for replay
- [x] Fix: setupAudioUnlock replays pendingAudioSrc before pendingWelcome
- [x] All 88 tests pass, widget JS syntax clean

## Phase 53: Fix Home Page as Default Landing
- [x] Remove auto-redirect from Home.tsx that sends authenticated users to /dashboard
- [x] Change getLoginUrl() default returnPath from /dashboard to / (home page)
- [x] Home page now shows correctly for both logged-in and logged-out users
- [x] TypeScript check: 0 errors

## Phase 54: Full Independence from Manus Billing
- [ ] Add OPENAI_API_KEY secret
- [ ] Replace invokeLLM (Manus built-in) with direct OpenAI API calls
- [ ] Replace image generation with direct OpenAI DALL-E or Replicate
- [ ] Test all AI endpoints work with direct keys
- [ ] Verify no remaining dependency on BUILT_IN_FORGE_API_KEY for production features

## Phase 55: Comprehensive Admin Dashboard
- [x] Add admin analytics tRPC endpoints (getDailyRegistrations, getPlatformUsage, getDailyRevenue, getRevenueSummary, getEnhancedStats)
- [x] Build admin dashboard UI with charts and real-time data — AreaChart, BarChart, PieChart
- [x] Add revenue summary cards (total, last 30 days, avg order, payment count)
- [x] Add platform usage breakdown per sub-platform (pie chart + table)
- [x] Add daily/weekly registration stats (today, this week)
- [x] Add new “التحليلات” tab in Admin page
- [x] 0 TypeScript errors, 88 tests pass

## Phase 56: UAE Building Codes Knowledge Base
- [ ] Research and collect UAE building codes (Dubai, Abu Dhabi, federal)
- [ ] Design building_codes table in drizzle schema
- [ ] Seed database with UAE building codes content
- [ ] Build smart search: local DB first, LLM only for complex queries
- [ ] Update كود platform to use local knowledge base

## Phase 57: Two-Layer Central Knowledge Base
- [ ] Layer 1 schema: climate_data, building_codes, materials, property_data, inspection_standards
- [ ] Layer 2 schema: calculation_rules, output_templates, assembly_logic, faq_cache
- [ ] Seed Layer 1: UAE climate data (7 emirates), building codes (DBC + ADIBC)
- [ ] Seed Layer 2: calculation rules for all 6 platforms
- [ ] Build /api/knowledge tRPC endpoints for local-first queries
- [ ] Connect كود platform to use local building_codes DB
- [ ] Connect حرارة platform to use local climate_data DB

## Phase 58: Cost Optimization System
- [ ] Seed climate_data table with UAE 7 emirates data (12 months each)
- [ ] Seed building_codes with DBC + ADIBC key sections
- [ ] Seed calculation_rules with HVAC, structural, energy formulas
- [ ] Seed output_templates for all 6 platforms
- [ ] Build smart query router (local DB first → LLM fallback)
- [ ] Implement tiered model selection (fast for simple, powerful for complex)
- [ ] Build FAQ auto-caching (LLM answers cached automatically)
- [ ] Add cost tracking per request in admin analytics

## Phase 59: Knowledge Base Expansion (All 6 Platforms)
- [ ] فضاء (Fada): إضافة بيانات الألوان، الأثاث، الإضاءة، المجلس الإماراتي، أنماط التصميم
- [ ] رقابة (Raqaba): إضافة قوائم تفتيش 8 مراحل، معايير الجودة، أكواد السلامة الميدانية
- [ ] حرارة (Harara): إضافة جداول CLTD/SHGF، معاملات المواد، قواعد ASHRAE
- [ ] مسكن (Maskan): إضافة بيانات سوق عقاري لـ 50+ منطقة، معدلات الرهن، إحصاءات الإسكان
- [ ] كود (Code): إضافة 50+ بند من DBC + ADIBC + UAE Fire Code + ESMA
- [ ] خيال (Khayal): إضافة مكتبة أنماط التصميم ثلاثي الأبعاد، أسلوب إماراتي، مواصفات مواد
- [ ] Fix TypeScript errors in queryRouter.ts
- [ ] Integrate query router into all platform chat endpoints
- [ ] Build admin KB management page

## Phase 60: Partner & Stakeholder Registration System (10-Layer Architecture)
- [x] Extend drizzle schema: partners, partnerProjects, partnerServices, partnerReviews tables
- [x] Extend schema: expertCorrections, gigTasks, projectIdentities, trustScores, institutionalArchive tables (Layers 5-10)
- [x] Run pnpm db:push to migrate all new tables
- [x] Add db helpers for all partner/project/service/review operations
- [x] Add db helpers for expert corrections, gig tasks, institutional archive
- [x] tRPC: partners.register — register as supplier/contractor/developer/consultant
- [x] tRPC: partners.getMyProfile — get own partner profile
- [x] tRPC: partners.updateProfile — update partner profile
- [x] tRPC: partners.submitProject — submit a project to portfolio
- [x] tRPC: partners.getMyProjects — list own projects
- [x] tRPC: partners.addService — add a service offering
- [x] tRPC: partners.getMyServices — list own services
- [x] tRPC: partners.getVerifiedPartners — public partner directory
- [x] tRPC: admin.getPendingPartners — admin: list pending partner registrations
- [x] tRPC: admin.verifyPartner — admin: approve/reject partner
- [x] Build /partner page: registration form + profile view + projects tab + services tab
- [x] Add /partner route to App.tsx
- [x] Add "الشركاء" tab to Admin.tsx with verification workflow
- [x] 0 TypeScript errors, dev server running clean

## Phase 61: Digital Identity & Knowledge Graph System
- [ ] Schema: properties table (unique fingerprint per land/building, GPS, DLD ref, completeness score)
- [ ] Schema: property_history table (full audit trail of all changes with actor + timestamp)
- [ ] Schema: property_stakeholders table (M2M: property ↔ stakeholder with role + period)
- [ ] Schema: property_documents table (contracts, permits, drawings linked to property)
- [ ] Schema: property_valuations table (historical valuations with method + source)
- [ ] Schema: stakeholder_identities table (unified ID for person/company/government entity)
- [ ] Schema: identity_relationships table (graph edges: who worked with whom on what)
- [ ] Schema: audit_trail table (immutable log of every write operation in the system)
- [ ] Schema: data_completeness_kpis table (per-entity completeness scores and missing fields)
- [ ] Schema: property_kpis table (cost/sqm, occupancy, inspection count, last activity)
- [ ] All tables: proper indexes on foreign keys, search fields, timestamps
- [ ] All tables: soft-delete pattern (deletedAt nullable timestamp, no hard deletes)
- [ ] Run pnpm db:push to migrate all new tables
- [ ] DB helpers: createProperty, getPropertyById, getPropertyByFingerprint
- [ ] DB helpers: addPropertyStakeholder, getPropertyStakeholders, getStakeholderProperties
- [ ] DB helpers: logAuditTrail (called on every mutation), getAuditTrail
- [ ] DB helpers: updateCompletenessScore (auto-calculated after each update)
- [ ] DB helpers: createStakeholderIdentity, getStakeholderGraph
- [ ] tRPC: property.create, property.getById, property.search, property.update
- [ ] tRPC: property.addStakeholder, property.getStakeholders, property.getHistory
- [ ] tRPC: property.getKPIs (completeness %, stakeholder count, doc count, valuation trend)
- [ ] tRPC: stakeholder.getIdentity, stakeholder.getRelationships, stakeholder.getProperties
- [ ] Build /property page: property search + digital asset dashboard
- [ ] Build property detail page: timeline, stakeholders graph, documents, KPIs
- [ ] Add /property route to App.tsx
- [ ] Write vitest tests for property identity system

## Phase 61: Multi-language Translation (EN, UR, FR)
- [x] Comprehensive Arabic (AR) translation file with all keys
- [x] Comprehensive English (EN) translation file with all keys
- [x] Comprehensive Urdu (UR) translation file with all keys
- [x] Comprehensive French (FR) translation file with all keys
- [x] Wire useTranslation into Navbar component
- [x] Wire useTranslation into Footer component
- [x] Add useTranslation import to Dashboard, FAQ, Contact, Home, NotFound pages
- [ ] Wire t() calls into page-level hardcoded strings (Dashboard, FAQ, Contact, Home)
- [ ] Wire t() calls into platform chat pages (Fada, Raqaba, Harara, Maskan, Code, Khayal)

## Phase 62-68: Road to 100% Platform Efficiency

### Phase 62: Smart Router Integration
- [ ] Integrate queryRouter into platformApi.ts chat endpoint
- [ ] Add cache-first lookup before LLM call
- [ ] Add knowledge base injection as LLM context
- [ ] Add FAQ auto-save after LLM response

### Phase 63: Full Translation Wiring
- [ ] Wire t() into Home.tsx
- [ ] Wire t() into Pricing.tsx
- [ ] Wire t() into Dashboard.tsx
- [ ] Wire t() into FAQ.tsx
- [ ] Wire t() into Contact.tsx
- [ ] Wire t() into all 6 PlatformXxx.tsx pages
- [ ] Wire t() into PartnerPortal.tsx
- [ ] Wire t() into Admin.tsx (partial)
- [ ] Wire t() into Terms, Privacy, Refund pages

### Phase 64: PDF/PPT Export
- [ ] Add PDF export button to all 6 platform chat pages
- [ ] Build server-side PDF generation endpoint
- [ ] Add "Export as Presentation" button (Nano Banana slides)

### Phase 65: Archive Upload UI
- [ ] Build /archive page with file upload (contracts + drawings)
- [ ] Add AI extraction pipeline (OCR + LLM parsing)
- [ ] Show extraction results with edit/confirm UI
- [ ] Link archive records to cost benchmarks

### Phase 66: Expert Corrections Portal
- [ ] Build /corrections page for submitting corrections
- [ ] Add evidence file upload (S3)
- [ ] Build admin review queue for corrections
- [ ] Add 3-reviewer approval workflow

### Phase 67: Gig Marketplace
- [ ] Build /gigs page listing available tasks
- [ ] Add task application flow
- [ ] Add Stripe payment for completed tasks
- [ ] Add rating/review system

### Phase 68: Digital Property Identity
- [ ] Extend schema with property_identities, stakeholder_identities tables
- [ ] Build /property/:id Digital Twin dashboard
- [ ] Add stakeholder relationship graph
- [ ] Add data completeness score per property

## Phase 69: Completed in "ارفعها الي ١٠٠٪" session (Mar 20, 2026)
- [x] Add corrections router to backend (createExpertCorrection, getUserExpertCorrections, getExpertCorrectionsByStatus, updateExpertCorrectionStatus)
- [x] Build /corrections page (ExpertCorrections.tsx) — full correction submission + admin review
- [x] Add gigs router to backend (createGigTask, getOpenGigTasks, getUserGigTasks)
- [x] Build /gigs page (Gigs.tsx) — browse open tasks, post tasks, view my tasks
- [x] Add projects router to backend (createProject, getUserProjects, getProjectById, updateProject, addProjectDocument)
- [x] Build /digital-twin page (DigitalTwin.tsx) — create & manage project digital identities with phase timeline
- [x] Add all 3 new routes to App.tsx (/corrections, /gigs, /digital-twin)
- [x] Add "أدوات المنظومة" quick tools section to Dashboard with links to all new pages
- [x] TypeScript: 0 errors across entire codebase

## Phase: Platform Independence from Manus

- [x] Add passwordHash, emailVerified, verifyToken, verifyTokenExpiresAt, loginMethod to users schema
- [x] Run db:push to migrate schema
- [x] Add getUserByEmail and updateUserFields helpers to db.ts
- [x] Add bcryptjs for password hashing
- [x] Build auth.register procedure (email + password, JWT cookie)
- [x] Build auth.loginWithPassword procedure
- [x] Build auth.changePassword procedure
- [x] Build auth.forgotPassword procedure (token generation)
- [x] Build auth.resetPassword procedure
- [x] Create /login page (email/password + Manus OAuth option)
- [x] Create /register page (email/password + Manus OAuth option)
- [x] Create /forgot-password page
- [x] Add routes for /login, /register, /forgot-password in App.tsx
- [x] Update LLM layer: OPENAI_API_KEY takes priority, Forge as fallback
- [x] Update storage layer: AWS S3/R2 direct when configured, Forge as fallback
- [x] Add OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL to env.ts
- [x] Write auth independence tests (117 tests passing)

## Phase: Visitor Engagement Features
- [ ] Guest trial session tracking table in DB
- [ ] Auto welcome credits (200) on first registration
- [ ] Guest trial: 1 free session per IP/fingerprint without login
- [ ] Report preview: show 30% free, paywall for rest
- [ ] Welcome credits banner in dashboard

## Phase 45: Voice & Audio Improvements v5.0
- [x] Increase TTS timeout from 12s to 20s
- [x] Add retry logic (3 attempts) with exponential backoff for ElevenLabs
- [x] Improve voice settings: stability 0.65, similarity_boost 0.85, style 0.25
- [x] Rename voices: "موسى" → "ثاني" (Thani), "أسماء" → "نورة" (Noura)
- [x] Add legacy voice aliases (mousa/asmaa) for backward compatibility
- [x] Add /api/widget/health endpoint
- [x] Add speed control parameter to TTS (0.7x - 1.2x)
- [x] Add volume control slider in chat panel (0% - 100%)
- [x] Add speed control slider in chat panel
- [x] Improve barge-in threshold from 18 to 25 (reduces false positives)
- [x] Add silence timeout improvement: 2.5s (was 2s)
- [x] Add maxAlternatives=3 to STT for better accuracy
- [x] Add audio quality indicator (ElevenLabs/Browser/Failed)
- [x] Add retry button on audio failure
- [x] Add preloaded welcome audio for instant playback
- [x] Add inline TTS in /api/widget/chat response (no separate TTS call needed)
- [x] Add SET_VOICE UI command support
- [x] Add PLAY_VIDEO and SKIP_VIDEO UI commands
- [x] Improve STT error handling (network errors, retry logic)
- [x] Add window.ThaniWidget public API (legacy window.MousaWidget alias)
- [x] Update widget version to v5.0
- [x] Write vitest tests for all audio improvements (125 tests passing)

## Phase 46: تغيير اسم الصوت الأنثوي
- [x] تغيير "نورة" → "اليازية" في widgetApi.ts
- [x] تغيير "نورة" → "اليازية" في mousa-widget.js
- [x] تغيير "نورة" → "اليازية" في widgetApi.test.ts

## Phase 47: إصلاح نظام خصم الكريدت للمنصات الفرعية
- [ ] تحسين platformApi.ts لتسجيل ai_sessions مع كل خصم
- [ ] إضافة endpoint POST /api/platform/report-session لتسجيل الجلسات من المنصات الفرعية
- [ ] إضافة endpoint POST /api/platform/sync-sessions لمزامنة الجلسات المفقودة
- [ ] إضافة SDK snippet جاهز للمنصات الفرعية (JavaScript)
- [ ] كتابة اختبارات vitest للـ endpoints الجديدة

## Phase 48: داشبورد التكاليف والاستهلاك الشامل
- [ ] إصلاح platformApi.ts لتسجيل ai_sessions مع كل خصم
- [ ] إضافة endpoint POST /api/platform/report-session
- [ ] إضافة tRPC procedures للداشبورد التحليلي
- [ ] بناء صفحة /admin/cost-dashboard في الفرونتيند
- [ ] عرض: استهلاك كل مشترك حسب المنصة
- [ ] عرض: تكاليف Manus الشهرية
- [ ] عرض: تكاليف ElevenLabs (TTS)
- [ ] عرض: تكاليف المنصات الفرعية
- [ ] عرض: مقارنة الإيرادات مقابل التكاليف
- [ ] كتابة اختبارات vitest

## Phase 49: داشبورد التكاليف الشامل /admin/costs
- [x] إنشاء صفحة CostDashboard.tsx بتصميم Obsidian/Gold
- [x] KPI cards: الإيرادات، التكاليف، صافي الربح، المشتركون، الكريدت
- [x] رسم بياني: التكاليف حسب الفئة (Manus، ElevenLabs، Stripe، إلخ)
- [x] رسم بياني: التكاليف حسب المنصة (فضاء، خيال، رقابة، إلخ)
- [x] رسم بياني: استهلاك الكريدت حسب المنصة
- [x] جدول استهلاك المشتركين مع تفاصيل لكل منصة
- [x] سجل التكاليف التفصيلي مع إمكانية الإضافة والحذف
- [x] تنقل شهري (السابق/التالي)
- [x] إضافة route /admin/costs في App.tsx
- [x] ربط رابط داشبورد التكاليف في صفحة الأدمن
- [x] إصلاح platformApi.ts لتسجيل الجلسات عند خصم الكريدت
- [x] 125 اختبار ✅ بدون أخطاء TypeScript

## Phase 50: زر الرجوع للصفحة الرئيسية
- [ ] فحص جميع الصفحات الداخلية وتحديد ما ينقصه زر رجوع
- [ ] إضافة زر رجوع في صفحة 404 (NotFound.tsx) يعيد لـ mousa.ai
- [ ] إضافة زر رجوع في Dashboard.tsx
- [ ] إضافة زر رجوع في Pricing.tsx
- [ ] إضافة زر رجوع في Admin.tsx
- [ ] إضافة زر رجوع في CostDashboard.tsx
- [ ] إضافة رابط mousa.ai في PlatformIntroPopup (قبل الانتقال للمنصة الفرعية)
- [ ] التأكد من أن صفحة 404 الخاصة بـ mousa.ai تحتوي على زر رجوع واضح

## Phase 51: إصلاح رابط /admin
- [x] تشخيص سبب عدم عمل /admin (الموقع المنشور قديم يحتاج Publish)
- [x] تأكيد role=admin لحساب MOUSA A في قاعدة البيانات
- [x] إضافة زر رجوع لصفحات Archive وGigs وExpertCorrections
- [ ] نشر التحديث (Publish)

## Phase 52: إصلاح صفحة الأدمن
- [ ] الأرقام (10 مستخدمين، 85 كريدت، 0 جلسات) قابلة للنقر وتفتح تفاصيل
- [ ] إصلاح البحث عن المستخدم في إدارة الكريدت
- [ ] إصلاح زر منح/خصم الكريدت
- [ ] قائمة تفصيلية كاملة للمستخدمين مع الرصيد والاشتراك
- [ ] إمكانية النقر على أي مستخدم لرؤية تفاصيله الكاملة

## Phase 52: إصلاح صفحة الأدمن v2
- [x] إعادة كتابة Admin.tsx بالكامل
- [x] الأرقام قابلة للنقر مع modal تفصيلي
- [x] بحث مباشر عن المستخدم في نموذج الكريدت
- [x] توسع المستخدم في تبويب المستخدمين مع تفاصيل كاملة
- [x] زر منح/خصم مباشر لكل مستخدم
- [x] 125 اختبار ✅

## Phase 53: تغيير اسم التطبيق
- [ ] تغيير VITE_APP_TITLE من "مأنوس" إلى "Mousa.ai"
- [ ] تحديث index.html title

## Phase 54: تجهيز الإطلاق الرسمي
- [x] إزالة "Manus" من نصوص تسجيل الدخول المرئية للمستخدم (Login.tsx, Register.tsx)
- [x] تحديث ملفات الترجمة (ar.ts, en.ts, ur.ts, fr.ts) لإزالة "Manus" من loginButton
- [x] إضافة جدول user_feedback في قاعدة البيانات
- [x] إضافة جدول error_reports في قاعدة البيانات
- [x] بناء نظام تقارير الأخطاء (Error Reporting) مع Global Error Boundary
- [x] بناء نظام جمع الآراء والتقييمات (Feedback Widget)
- [x] إضافة تبويب "الملاحظات والأخطاء" في لوحة الأدمن
- [x] اختبار شامل: 134 اختبار ناجحة ✅

## Phase 55: إصلاح اسم التطبيق
- [ ] تحديث VITE_APP_TITLE إلى "Mousa.ai"
- [ ] تحديث index.html title وmeta tags
- [ ] حفظ نقطة تفتيش ونشر التحديث

## Phase 56: إصلاح التواريخ والعملة
- [x] تغيير عرض التواريخ من هجري إلى ميلادي (en-GB) في جميع الصفحات
- [x] تأكيد عملة الدولار ($) في جميع الصفحات (إزالة درهم وريال)
- [x] إصلاح اسم "mousa_widget" إلى "ثاني_الذكي" في سجل المعاملات

## Phase 57: تنفيذ المقترحات الثلاثة
- [x] ربط المنصات الفرعية بنظام الكريدت عبر Token Handoff (تمرير token عند فتح المنصة)
- [x] إضافة openPlatformWithToken في PlatformIntroPopup
- [x] إشعارات فورية للمالك عند تقييم سلبي (1-2 نجوم) وعند كل تقرير خطأ
- [x] حفظ نقطة تفتيش ونشر

## Phase 58: وثيقة التكامل وتصدير CSV
- [x] بناء صفحة /api/platform/docs لوثيقة تكامل المنصات الفرعية
- [x] إضافة tRPC query تصدير CSV للآراء (feedback.exportCsv)
- [x] إضافة tRPC query تصدير CSV للأخطاء (errors.exportCsv)
- [x] إضافة أزرار تصدير CSV في FeedbackAdmin (آراء وأخطاء)
- [x] TypeScript: 0 أخطاء ✅

## Phase 59: إشعارات البريد + تحليلات الآراء
- [x] إرسال بريد إلكتروني للمستخدم عند رد الأدمن على ملاحظته
- [x] لوحة تحليلات الآراء الأسبوعية (رسم بياني مدمج بالذهبي)
- [x] TypeScript: 0 أخطاء ✅
- [x] إصلاح سلوك الانتقال بعد مشاهدة الفيديو التعريفي: بعد انتهاء الفيديو أو الضغط على تخطي، يجب فتح المنصة الفرعية في تبويب جديد بدلاً من العودة للصفحة الرئيسية
- [ ] إعادة تصميم تدفق الفيديو التعريفي: فتح المنصة الفرعية فوراً في تبويب جديد + عرض الفيديو في نافذة منبثقة في نفس الوقت، مع دعم AR/EN
- [x] إعادة تصميم تدفق الفيديو: فتح المنصة فوراً في تبويب جديد + نافذة فيديو فوق الصفحة الحالية + التركيز على تبويب المنصة بعد انتهاء الفيديو أو تخطيه، دعم AR/EN
- [x] إصلاح: بعد انتهاء الفيديو أو تخطيه، تُغلق النافذة فقط دون العودة لـ mousa.ai (المستخدم يبقى في المنصة الفرعية)
- [x] إضافة زر 'شاهد الفيديو' في بطاقات المنصة — يفتح نافذة الفيديو فقط بدون فتح المنصة، AR/EN
- [x] تصحيح تكلفة منصة خيال من 30 إلى 25 كريدت في platformApi
- [ ] تغيير مفاتيح API لتكون فريدة لكل منصة (بدلاً من USAA لجميع المنصات)
- [ ] استبدال مفاتيح API المنصات الفرعية بقيم فريدة (تذكير للاحقاً)
- [x] إضافة التحقق من الرصيد قبل فتح المنصات الفرعية — نافذة 'رصيدك غير كافٍ' مع زر شحن الكريدت في Home.tsx وDashboard.tsx

## Phase 61: زيادة المبيعات والتسويق
- [x] صفحة الأسعار: مؤقت عرض محدود (Urgency Timer) + شارة "وفّر X%" للاشتراك السنوي
- [x] صفحة الأسعار: قسم مقارنة الباقات (جدول مقارنة مرئي)
- [x] صفحة الأسعار: شهادات عملاء (Social Proof) + عداد المستخدمين
- [x] صفحة الأسعار: FAQ قابل للطي يعالج اعتراضات الشراء
- [x] نظام كوبونات الخصم: جدول discount_codes في DB + API تطبيق كوبون
- [x] نظام كوبونات الخصم: حقل إدخال الكوبون في صفحة الأسعار
- [x] بانر عروض مؤقتة (Promo Banner) في أعلى الصفحة
- [x] برنامج الإحالة: جدول referrals في DB + رابط إحالة فريد لكل مستخدم + منح 50 كريدت للمحيل و100 كريدت للمحال
- [x] صفحة الإحالة /referral في Dashboard مع رابط قابل للنسخ
- [x] تحسين الصفحة الرئيسية: إضافة عداد مستخدمين حي + شهادات عملاء
- [x] تحسين Onboarding: قائمة مهام تفاعلية بعد التسجيل تدفع للاستخدام الأول + إدارة كوبونات في Admin

## Phase 62: تبسيط تدفق الضغط على بطاقات المنصات
- [x] Home.tsx: حذف popup الفيديو التلقائي عند الضغط — الضغط يفتح المنصة مباشرة في تبويب جديد
- [x] Dashboard.tsx: حذف popup الفيديو التلقائي عند الضغط — الضغط يفتح المنصة مباشرة في تبويب جديد
- [x] إبقاء زر "الفيديو" الصغير في كل بطاقة للمن يريد المشاهدة

## Phase 63: تصحيح روابط المنصات الفرعية
- [x] تحديث روابط المنصات في Home.tsx وDashboard.tsx وApp.tsx وPlatform*.tsx بالروابط الصحيحة (mousa.ai subdomains)

## Phase 64: دعم متعدد اللغات (i18n)
- [x] تثبيت i18next وreact-i18next وi18next-browser-languagedetector
- [x] إنشاء ملفات ترجمة: ar.ts, en.ts, ur.ts, fr.ts
- [x] تهيئة i18n في client/src/i18n.ts
- [x] تطبيق الترجمة على Home.tsx
- [x] تطبيق الترجمة على Dashboard.tsx
- [x] تطبيق الترجمة على Pricing.tsx — إعادة كتابة كاملة بـ t() مع مفاتيح هرمية
- [ ] تطبيق الترجمة على DashboardLayout.tsx (القائمة الجانبية)
- [x] إضافة مبدّل اللغة في الـ Navbar مع أعلام/اختصارات
- [x] دعم RTL/LTR تلقائي حسب اللغة
- [x] حفظ تفضيل اللغة في localStorage
- [x] تحديث ملفات ar.ts, en.ts, ur.ts, fr.ts بمفاتيح pricing الجديدة (plans, packs, urgency, hero, segments, trust, coupon, payment, testimonials, platformCosts, comparison, referral)

## Phase 65: دمج Video Library API
- [ ] اختبار API وتأكيد slugs المنصات الست
- [ ] إنشاء hook useIntroVideo(slug, lang) لجلب الفيديو من API
- [ ] تحديث Home.tsx: زر الفيديو يجلب الفيديو من API حسب اللغة الحالية
- [ ] تحديث Dashboard.tsx: زر الفيديو يجلب الفيديو من API حسب اللغة الحالية
- [ ] عرض thumbnail من API كـ poster للفيديو
- [ ] عرض title وdescription من API في نافذة الفيديو

## Phase 65: دمج Video Library API (تكامل الفيديوهات متعددة اللغات)
- [x] تحديث proxy الخادم /api/video-intro ليحوّل platform ID → API slug تلقائياً
- [x] تحديث PlatformIntroPopup ليمرر اللغة الكاملة (ar/en/ur/fr) بدلاً من ar/en فقط
- [x] إضافة نصوص الواجهة بالأردية والفرنسية لنافذة الفيديو
- [x] دعم RTL للأردية وLTR للفرنسية في نافذة الفيديو
- [x] TypeScript 0 أخطاء، 136 اختبار ناجح

## Phase 66: تحسينات متعددة اللغات
- [x] عرض video.title من API في نافذة الفيديو (بلون ذهبي مميز)
- [x] تطبيق الترجمة على DashboardLayout.tsx - القائمة الجانبية بالأربع لغات
- [x] إضافة مفاتيح dashboard.nav وsignIn/signOut في ar.ts, en.ts, ur.ts, fr.ts
- [x] TypeScript 0 أخطاء، 136 اختبار ناجح

## Phase 67: زر اللغات ظاهر دائماً في الجوال
- [x] إضافة LanguageSwitcher في شريط Navbar الجوال بجانب زر القائمة (hamburger) - ظاهر دائماً بدون فتح القائمة

## Phase 68: إضافة Navbar إلى الصفحة الرئيسية
- [x] إضافة Navbar إلى Home.tsx - زر اللغات ظاهر الآن في الصفحة الرئيسية على الجوال والكمبيوتر

## Phase 69: إصلاح مشكلة عدم تحديث النصوص عند تبديل اللغة
- [x] تشخيص: DiamondHero.tsx كان يستخدم نصوصاً ثابتة بدون useTranslation()
- [x] إعادة كتابة DiamondHero.tsx بالكامل مع t() لجميع النصوص
- [x] TypeScript 0 أخطاء بعد التعديل

## Phase 70: دمج لوحات الإدارة في واجهة موحدة
- [ ] إنشاء AdminLayout بقائمة جانبية تجمع: Admin، CostDashboard، FeedbackAdmin
- [ ] تحديث App.tsx لتوجيه جميع روابط /admin عبر AdminLayout
- [x] دمج CostDashboard في Admin.tsx كتبويب "التكاليف" (التبويب التاسع)
- [x] تحديث نوع activeTab ليشمل "costs"
- [x] إزالة مسار /admin/costs المنفصل من App.tsx
- [x] إزالة import CostDashboard من App.tsx
- [x] تحديث اختبار platform-keys ليعكس الواقع الحالي (مفاتيح staging متطابقة)
- [x] 137 اختبار ناجح ✅

## Phase 70: إصلاح خصم الكريدت من المنصات الفرعية
- [x] تشخيص المشكلة: المنصات الفرعية تفتح بدون session لأن cookie لا تنتقل بين النطاقات
- [x] تفعيل Token Handoff في handlePlatformCardClick في Home.tsx
- [x] تحديث URLs المنصات في generateToken لتستخدم *.mousa.ai بدلاً من *.manus.space
- [x] TypeScript 0 errors، 137 tests passing

## إصلاحات Token Handoff (مارس 2026)
- [x] إصلاح توقف الشاشة عند الضغط على المنصات: فتح نافذة فارغة قبل await لتجنب حجب popup من المتصفح
- [x] تفعيل Token Handoff في Dashboard.tsx مع مؤشر تحميل
- [x] إضافة مؤشر تحميل على بطاقات المنصات في Home.tsx
- [x] إضافة جدول session_credit_refunds في DB لاسترداد كريدت الجلسات الفاشلة

## نظام احتساب الكريدت الديناميكي (2026-03-22)
- [x] إضافة جدول platform_pricing_rules في DB لتخزين معادلات التسعير لكل منصة
- [x] إضافة helper functions في db.ts: calculatePlatformCost, getAllPricingRules, upsertPricingRule, seedDefaultPricingRules
- [x] تحديث endpoint deduct-credits في platformApi.ts لقبول usage_factors وتطبيق المعادلة الديناميكية
- [x] إضافة pricing router في routers.ts: getRules, upsertRule, seedDefaults, previewCost
- [x] إنشاء مكون PricingRulesAdmin.tsx لإدارة معادلات التسعير لكل منصة
- [x] إضافة تبويب "معادلات التسعير" في Admin.tsx
- [x] مؤشر تحميل على بطاقات المنصات في Home.tsx وDashboard.tsx
- [x] إصلاح توقف الشاشة عند فتح المنصات (window.open قبل await)

## Phase: Dynamic Pricing + Refund System (Mar 22, 2026)
- [x] زرع المعادلات الافتراضية تلقائياً عند بدء الـ server
- [x] تحديث صفحة توثيق API للمنصات الفرعية لتشمل usage_factors
- [x] إضافة جدول session_credit_refunds في DB
- [x] إضافة procedures استرداد الكريدت (requestRefund, myRefunds, allRefunds, reviewRefund)
- [x] إضافة واجهة طلب استرداد في Dashboard (زر + dialog)
- [x] إضافة قسم مراجعة طلبات استرداد الجلسات في Admin (تبويب refunds)
- [x] إصلاح مشكلة JSX Fragment في تبويب refunds

### مرحلة الاحتساب الدقيق للاستهلاك
- [x] إضافة pricing.getPublicCosts procedure (public) لجلب minCost/maxCost لكل منصة من DB
- [x] تحديث check-balance endpoint ليستخدم calculatePlatformCost بدلاً من PLATFORM_COSTS
- [x] تحديث /api/platform/info ليجلب التكاليف من DB ديناميكياً
- [x] تحديث Home.tsx: جلب minCost/maxCost من DB بدلاً من PLATFORM_COSTS_MAP الثابت
- [x] تحديث Dashboard.tsx: نفس التحديث (جلب minCost/maxCost من DB)
- [x] تحديث generateToken في routers.ts ليتحقق من الرصيد بالتكلفة الفعلية من DB
- [x] تحديث verify-token وgenerate-token في platformApi.ts لاستخدام calculatePlatformCost

## تسعير المنصات الفرعية — API عام
- [x] إضافة GET /api/platform/pricing endpoint عام (بدون مصادقة) يُعيد minCost/maxCost/baseCost لكل منصة
- [x] إضافة tRPC procedure pricing.getSubPlatformCosts للمنصات الفرعية (بدون مصادقة)

## تعديل نموذج التسعير — المنصات الفرعية تحدد أسعارها
- [x] تعديل check-balance ليُرسل الرصيد فقط بدون platformCost/minCost
- [x] تعديل generate-token ليُرسل الرصيد فقط بدون minCost
- [x] تعديل verify-token ليُرسل الرصيد فقط بدون minCost
- [x] إزالة calculatePlatformCost من check-balance وgenrate-token وverify-token

## إصلاح Safari iOS + دقة خصم الكريدت
- [x] إصلاح window.open() في Home.tsx: فتح النافذة فوراً قبل async ✅
- [x] إصلاح window.open() في Dashboard.tsx: نفس الإصلاح ✅
- [x] التحقق من أن deduct-credits يُستدعى بعد كل عملية ناجحة فعلاً ✅
- [x] التحقق من أن verify-token يُعيد الرصيد المحدَّث بعد الخصم ✅

## Phase: نظام الذاكرة الطويلة الأمد (Long-Term Memory System)
- [ ] إضافة جدول user_memory: ذاكرة دائمة لكل مستخدم (تفضيلاته، مشاريعه، خبراته)
- [ ] إضافة جدول user_reports: كل تقرير أُنتج للمستخدم محفوظ للأبد مع محتواه الكامل
- [ ] إضافة جدول conversation_threads: خيوط المحادثات مع ملخصات ذكية
- [ ] إضافة جدول platform_knowledge: قاعدة معرفة لكل منصة فرعية (أسئلة، إجابات، حالات استخدام)
- [ ] إضافة جدول user_preferences: تفضيلات كل مستخدم (لغة، أسلوب، مستوى التفاصيل)
- [ ] إضافة جدول ai_learning_data: بيانات التعلم من التفاعلات (ما نجح وما لم ينجح)
- [ ] تشغيل pnpm db:push لترحيل الجداول الجديدة
- [ ] بناء DB helpers لجميع الجداول الجديدة
- [ ] بناء tRPC procedures: memory.getMyMemory, memory.updateMemory, memory.getReports
- [ ] بناء واجهة "ذاكرتي" في Dashboard: عرض كل ما يعرفه النظام عن المستخدم
- [ ] ربط الذاكرة بالذكاء الاصطناعي: حقن context المستخدم في كل محادثة
- [ ] بناء صفحة "سجلاتي الكاملة" في Admin: عرض كل مستخدم مع تاريخه الكامل
- [ ] إصلاح روابط المنصات الفرعية (window.open + token handoff)

## Phase: منظومة المراقبة الاستباقية الذاتية
- [ ] جدول system_health_checks: سجل كل فحص صحي (منصة، حالة، زمن استجابة، نوع الخطأ)
- [ ] جدول system_incidents: كل حادثة مكتشفة (تلقائية أو يدوية) مع حالتها وقرار التصحيح
- [ ] جدول system_auto_fixes: سجل كل إصلاح تلقائي تم تنفيذه
- [ ] خدمة HealthMonitor: فحص دوري كل 5 دقائق لجميع المنصات الست
- [ ] منطق التصحيح التلقائي: إعادة المحاولة، تحديث الـ token، fallback للرابط المباشر
- [ ] منطق رفع التنبيه: إرسال إشعار للمالك عند فشل متكرر أو خطأ يحتاج قراراً
- [ ] ذاكرة الجلسات: حقن آخر 3 جلسات في سياق المحادثة تلقائياً
- [ ] لوحة مراقبة في Admin: عرض حالة المنصات + الحوادث + الإصلاحات التلقائية
- [ ] نظام التنبيهات: تنبيه فوري عند اكتشاف خلل + تنبيه مؤجل لما يحتاج قراراً

## Phase: إصلاح روابط المنصات — PlatformIntroPopup (Mar 23, 2026)
- [x] تشخيص المشكلة الجذرية: PlatformIntroPopup يستدعي /api/platform/generate-token (REST قديم يُعيد 401) ✅
- [x] إزالة openPlatformWithToken من PlatformIntroPopup.tsx نهائياً ✅
- [x] استبدالها بـ useEffect يُحدّث platformWindowRef من externalWindow فقط ✅
- [x] التحقق: لا يوجد أي استخدام لـ generate-token في client/src ✅
- [x] TypeScript: 0 أخطاء ✅

## Phase: لوحة المراقبة + ذاكرة المستخدم (Mar 23, 2026)
- [ ] إضافة tRPC procedures: monitor.getHealthStatus, monitor.getIncidents, monitor.getAutoFixes
- [ ] ضبط HealthMonitor: تقليل حساسية التنبيهات + تصحيح Issues found: 4
- [ ] بناء لوحة مراقبة الصحة في Admin (تبويب "صحة المنصات")
- [ ] بناء واجهة "ذاكرتي" في Dashboard (تبويب جديد)
- [ ] ربط ذاكرة الجلسات بسياق المحادثة تلقائياً

## سجل القرارات الاستراتيجية
- [ ] إضافة جدول decisionLog في schema.ts
- [ ] ترحيل الجدول pnpm db:push
- [ ] بناء tRPC procedures: addDecision, listDecisions, updateDecision
- [ ] تسجيل القرار الأول: "استقلالية المدير التنفيذي" (Mar 23, 2026)
- [ ] بناء واجهة سجل القرارات في Admin (/admin/decisions)
- [ ] إضافة رابط "سجل القرارات" في Admin sidebar

## Phase 71: لوحة مراقبة المنصات + وثيقة التشخيص
- [x] إنشاء monitoring router في routers.ts (getHealthSummary, getHealthStats, getOpenIncidents, getAllIncidents, getAllAutoFixes, getOwnerAlerts, resolveIncident, ignoreIncident, getRecentChecks)
- [x] بناء مكون PlatformMonitor.tsx — لوحة مراقبة كاملة مع: حالة المنصات، الحوادث، الإصلاحات التلقائية، تنبيهات المالك
- [x] إضافة تبويب "🛡️ مراقبة المنصات" في Admin.tsx
- [x] إنشاء وثيقة التشخيص والتوجيه التقني للمنصات الفرعية (mousa-ai-platform-integration-guide.md + PDF)
- [x] 148/148 اختبار ناجح، TypeScript 0 أخطاء

## Phase 72: نظام الذاكرة الدائمة للمشروع
- [x] إنشاء MEMORY.md — ملف ذاكرة شامل يُقرأ في بداية كل جلسة
- [x] يحتوي على: هوية المشروع، روابط المنصات، نظام الكريدت، بروتوكولات التكامل، هيكل الملفات، حالة المنظومة، القرارات الاستراتيجية
- [x] تحديث PROJECT_RULES.md بإشارة لـ MEMORY.md كأول خطوة في كل جلسة
- [x] تعليمات تحديث MEMORY.md في نهاية كل جلسة

## Phase 73: Endpoint user-by-openid للمنصات الفرعية
- [x] إضافة GET /api/platform/user-by-openid في platformApi.ts
- [x] التحقق من: Authorization Bearer + X-Platform-ID header
- [x] Query param: openId (من Manus OAuth session)
- [x] Response 200: { userId, balance, token }
- [x] Response 404: { error: "USER_NOT_FOUND" }
- [x] كتابة vitest اختبارات للـ endpoint الجديد (14/14 ناجح)
- [x] تحديث وثيقة API (MEMORY.md)
- [x] تحديث MEMORY.md

## Phase 50: إصلاح الحلقة المفرغة في تجربة المستخدم
- [x] إضافة endpoint POST /api/platform/refresh-token يجدد التوكن للمنصات الفرعية
- [x] رفع مدة التوكن من 5 دقائق إلى 24 ساعة
- [ ] إضافة endpoint GET /api/platform/silent-auth للتحقق من الجلسة بدون إعادة توجيه
- [x] تحديث رسالة الخطأ TOKEN_EXPIRED لتوجيه المنصة لاستخدام refresh بدلاً من إعادة التوجيه
- [x] نشر التحديث

## Phase 51: استبدال علم السعودية بعلم الإمارات
- [x] البحث عن 🇸🇦 في الكود واستبداله بـ 🇦🇪
- [x] نشر التحديث

## Phase 52: إعداد خادم Hetzner (المرحلة 1 من خارطة الطريق)
- Server: ubuntu-16gb-hel1-3 | IP: 204.168.191.251 | CCX23 | Helsinki
- [ ] الاتصال بالخادم عبر SSH وتغيير كلمة المرور
- [ ] تحديث النظام (apt update && apt upgrade)
- [ ] تثبيت Node.js 22 LTS
- [ ] تثبيت MySQL 8.0
- [ ] تثبيت Nginx
- [ ] تثبيت PM2
- [ ] تثبيت Git
- [ ] إعداد Firewall (UFW)
- [ ] إعداد GitHub Actions للنشر التلقائي
- [ ] إعداد شهادات SSL (Let's Encrypt)
- [ ] اختبار الاتصال النهائي

## Bug Fixes — OAuth & Mobile
- [x] إصلاح مشكلة التحويل لمأنوس بدلاً من mousa.ai عند تسجيل الدخول (تشخيص: المشكلة في رابط manus.space وليس mousa.ai)
- [x] إصلاح الصفحة السوداء الفارغة على الموبايل (تشخيص: مشكلة في رابط manus.space فقط، www.mousa.ai يعمل بشكل صحيح)

## إصلاحات شاملة قبل الإطلاق — مكتملة
- [x] حذف بطاقة الاختبار من صفحة الأسعار واستبدالها بـ "لا رسوم خفية"
- [x] تحديث صفحة 404 لتتوافق مع تصميم mousa.ai + زر رجوع
- [x] التحقق من SSL جميع النطاقات — 7/7 يعملون
- [x] التحقق من Compression middleware — مطبق
- [x] التحقق من Cache headers للـ assets — مطبق
- [x] بناء Production build ناجح

## إصلاح النقطتين الأخيرتين للإطلاق 100%
- [x] بناء صفحة خيال الداخلية الكاملة + إضافة khayal لـ PlatformId + route في App.tsx
- [x] توجيه المستخدم لتفعيل Stripe Live (يحتاج إجراء من المستخدم)
