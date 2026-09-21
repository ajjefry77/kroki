<template>
  <div class="landing min-h-screen flex flex-col overflow-x-clip">
    <!-- هدر چسبان کپسولی (فیکس: همیشه با اسکرول پایین می‌آید) -->
    <header
      class="fixed top-0 right-0 left-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="scrolled ? 'px-3 sm:px-6 pt-3' : 'px-0 pt-0'"
    >
      <div
        ref="headerPill"
        class="header-pill relative mx-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
        :class="
          scrolled
            ? 'max-w-3xl rounded-[999px] border border-[var(--border)] bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(23,43,77,0.14),0_2px_8px_rgba(250,108,4,0.08)]'
            : 'max-w-full rounded-none border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md shadow-none'
        "
      >
        <div
          class="mx-auto grid grid-cols-[1fr_auto_1fr] items-center transition-all duration-500"
          :class="scrolled ? 'max-w-3xl px-4 h-[60px]' : 'max-w-7xl px-5 h-16'"
        >
          <div class="flex items-center gap-3 justify-self-start min-w-0">
            <span class="logo-3d relative shrink-0">
              <img
                src="/favicon.png"
                alt="لوگوی سامانه کروکی"
                class="w-10 h-10 rounded-xl object-contain shadow-lg shadow-[var(--accent-glow-strong)] transition-transform duration-500"
                :class="scrolled ? 'scale-90' : 'scale-100'"
              />
              <span class="logo-ring"></span>
            </span>
            <div
              class="min-w-0 transition-all duration-500 overflow-hidden"
              :class="scrolled ? 'hidden sm:block' : 'block'"
            >
              <div
                class="font-extrabold text-lg leading-tight whitespace-nowrap"
              >
                سامانه کروکی
              </div>
              <div
                class="text-[11px] text-[var(--text-muted)] whitespace-nowrap transition-all duration-500"
                :class="scrolled ? 'opacity-0 h-0' : 'opacity-100'"
              >
                تولید حرفه‌ای کروکی نقشه ملک
              </div>
            </div>
          </div>
          <nav
            class="hidden md:flex items-center gap-5 text-sm text-[var(--text-muted)] justify-self-center"
          >
            <a href="#features" class="nav-link">امکانات</a>
            <a href="#templates" class="nav-link">قالب‌ها</a>
            <button class="nav-link text-sm" @click="$emit('experts')">
              کارشناسان
            </button>
            <a href="#how" class="nav-link">مراحل کار</a>
            <button
              v-if="authed && !isAdmin"
              class="nav-link font-semibold text-sm"
              @click="$emit('agencyRequest')"
            >
              <i class="fas fa-user-tie ml-1"></i> درخواست نمایندگی
            </button>
          </nav>
          <div class="flex items-center gap-2 justify-self-end">
            <button
              v-if="!authed"
              class="btn btn-ghost h-9 !rounded-full transition-all duration-500"
              :class="scrolled ? '!px-4 !text-[13px]' : ''"
              @click="$emit('login')"
            >
              <i class="fas fa-right-to-bracket ml-1"></i>
              <span class="hidden sm:inline">ورود / ثبت‌نام</span
              ><span class="sm:hidden">ورود</span>
            </button>

            <div v-if="authed" class="relative order-last">
              <button
                class="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface2)] hover:bg-[var(--surface3)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition"
                title="حساب کاربری"
                @click.stop="menuOpen = !menuOpen"
              >
                <i class="fas fa-user text-sm"></i>
              </button>

              <Transition name="drop">
                <div
                  v-if="menuOpen"
                  class="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden profile-menu"
                >
                  <div
                    class="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50"
                  >
                    <div class="flex items-center gap-3">
                      <span
                        class="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--accent)]"
                      >
                        <i class="fas fa-user"></i>
                      </span>
                      <div class="min-w-0">
                        <div class="text-sm font-bold truncate">
                          {{ userName }}
                        </div>
                        <div
                          class="text-[11px] text-[var(--text-muted)] mt-0.5"
                        >
                          اعتبار حساب
                        </div>
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div
                        class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2"
                      >
                        <div
                          class="text-[10px] text-[var(--text-muted)] mb-0.5 flex items-center gap-1"
                        >
                          <i class="fas fa-wallet text-[var(--success)]"></i>
                          کیف پول
                        </div>
                        <div
                          class="font-extrabold text-[var(--success)]"
                          dir="ltr"
                        >
                          {{ fmtMoney(wallet) }}
                          <span
                            class="text-[10px] font-medium text-[var(--text-muted)]"
                            >تومان</span
                          >
                        </div>
                      </div>
                      <div
                        class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2"
                      >
                        <div
                          class="text-[10px] text-[var(--text-muted)] mb-0.5 flex items-center gap-1"
                        >
                          <i class="fas fa-gift text-[var(--info)]"></i> رایگان
                        </div>
                        <div class="font-extrabold text-[var(--info)]">
                          {{ free }}
                          <span
                            class="text-[10px] font-medium text-[var(--text-muted)]"
                            >کروکی</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    v-if="!isAdmin"
                    class="menu-item"
                    @click="
                      $emit('profile');
                      menuOpen = false;
                    "
                  >
                    <i class="fas fa-user-gear text-[var(--accent)]"></i>
                    پنل کاربری
                  </button>
                  <button
                    v-if="isAdmin"
                    class="menu-item"
                    @click="
                      $emit('admin');
                      menuOpen = false;
                    "
                  >
                    <i class="fas fa-shield-halved text-[var(--accent)]"></i>
                    پنل مدیریت
                  </button>

                  <div class="border-t border-[var(--border)]"></div>
                  <button
                    class="menu-item !text-[var(--danger)]"
                    @click="$emit('logout')"
                  >
                    <i class="fas fa-right-from-bracket"></i>
                    خروج
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
        <!-- نوار پیشرفت اسکرول داخل کپسول -->
        <div
          class="absolute bottom-0 right-0 left-0 h-[2.5px] bg-transparent overflow-hidden"
          :class="scrolled ? 'rounded-b-[999px]' : ''"
        >
          <div
            class="h-full bg-gradient-to-l from-[var(--accent-soft)] to-[var(--accent)] transition-[width] duration-150 ease-out"
            :style="{ width: scrollProgress + '%' }"
          ></div>
        </div>
      </div>
    </header>
    <!-- فاصله‌گذار برای هدر فیکس تا محتوا زیر آن نرود -->
    <div
      class="shrink-0 transition-all duration-500"
      :class="scrolled ? 'h-[72px]' : 'h-16'"
    ></div>

    <!-- دکمه گزارش (شناور پایین-چپ) -->
    <button
      class="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg hover:bg-[var(--surface3)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition"
      title="گزارش سیستم"
      @click="$emit('toggleLog')"
    >
      <i class="fas fa-bug text-[var(--accent)]"></i>
    </button>

    <!-- هیرو سه‌بعدی -->
    <section
      ref="heroSection"
      class="relative flex-1 flex items-center justify-center py-16 md:py-24 overflow-hidden"
      @mousemove="onHeroMove"
      @mouseleave="resetHero"
    >
      <div class="hero-bg absolute inset-0 pointer-events-none"></div>
      <!-- گرید محو -->
      <div class="absolute inset-0 hero-grid pointer-events-none"></div>
      <!-- گوی‌های شناور واکنش‌گرا -->
      <div ref="orbs" class="absolute inset-0 pointer-events-none">
        <div data-depth="30" class="orb orb-1"></div>
        <div data-depth="55" class="orb orb-2"></div>
        <div data-depth="20" class="orb orb-3"></div>
        <div data-depth="70" class="float-chip chip-1">
          <i class="fas fa-location-dot"></i>
        </div>
        <div data-depth="90" class="float-chip chip-2">
          <i class="fas fa-ruler-combined"></i>
        </div>
        <div data-depth="45" class="float-chip chip-3">
          <i class="fas fa-compass-drafting"></i>
        </div>
        <div data-depth="60" class="float-ring ring-1"></div>
        <div data-depth="40" class="float-ring ring-2"></div>
      </div>

      <div class="relative max-w-7xl mx-auto px-5 text-center w-full">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-glow)] text-[var(--accent-soft)] text-xs font-medium mb-6 reveal badge-3d"
        >
          <i class="fas fa-certificate"></i>
          رسمی، سازمانی و با استانداردهای فنی
        </div>

        <h1
          class="text-4xl md:text-6xl font-black leading-tight mb-5 reveal hero-title"
        >
          کروکی نقشه ملک خود را
          <span
            class="title-3d text-transparent bg-clip-text bg-gradient-to-l from-[var(--accent-soft)] to-[var(--accent)]"
            >حرفه‌ای</span
          >
          بسازید
        </h1>

        <p
          class="max-w-2xl mx-auto text-base md:text-lg text-[var(--text-muted)] leading-8 mb-8 reveal"
        >
          از روی نقشه هوایی، مرز ملک خود را ترسیم کنید، اطلاعات فنی و قالب
          موردنظر را انتخاب نمایید و خروجی استاندارد کروکی با مختصات UTM، طول
          ضلع‌ها و مساحت را در چند مرحله ساده دریافت کنید.
        </p>

        <div
          class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 reveal"
        >
          <button
            class="btn btn-primary !px-8 !py-3 !text-base !rounded-xl"
            @click="$emit('start')"
          >
            <i class="fas fa-drafting-compass ml-2"></i>
            ساخت کروکی
          </button>
          <a
            href="#how"
            class="btn btn-ghost !px-8 !py-3 !text-base !rounded-xl !bg-white/60 !backdrop-blur"
          >
            مشاهده مراحل
            <i class="fas fa-chevron-down mr-1"></i>
          </a>
        </div>

        <!-- موکاپ سه‌بعدی واکنش‌گرا -->
        <div
          class="scene relative mx-auto max-w-3xl reveal"
          @mousemove="onMockupMove"
          @mouseleave="resetMockup"
        >
          <div
            class="absolute -inset-6 bg-[var(--accent-glow)] blur-3xl rounded-full pointer-events-none"
          ></div>
          <div
            ref="mockupInner"
            class="tilt-card relative bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden will-change-transform"
          >
            <div
              class="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)]"
            >
              <span class="w-3 h-3 rounded-full bg-[var(--danger)]/70"></span>
              <span class="w-3 h-3 rounded-full bg-[var(--warning)]/70"></span>
              <span class="w-3 h-3 rounded-full bg-[var(--success)]/70"></span>
              <span class="mx-auto text-[11px] text-[var(--text-muted)]"
                >پیش‌نمایش کروکی —
                <span class="text-[var(--accent)] font-bold"
                  >نمای سه‌بعدی تعاملی</span
                ></span
              >
            </div>
            <div class="p-6 bg-white relative">
              <svg viewBox="0 0 900 520" class="w-full relative z-10">
                <rect
                  x="8"
                  y="8"
                  width="884"
                  height="504"
                  fill="none"
                  stroke="#1d3a6e"
                  stroke-width="3"
                />
                <rect
                  x="16"
                  y="16"
                  width="868"
                  height="496"
                  fill="none"
                  stroke="#1d3a6e"
                  stroke-width="1"
                />
                <rect x="0" y="0" width="900" height="42" fill="#1d3a6e" />
                <text
                  x="450"
                  y="27"
                  text-anchor="middle"
                  fill="#fff"
                  font-size="15"
                  font-weight="700"
                  font-family="Vazirmatn, Tahoma"
                >
                  سازمان ثبت اسناد و املاک کشور — کروکی ثبتی
                </text>
                <g>
                  <polygon
                    points="300,140 520,110 560,300 360,350 250,250"
                    fill="rgba(29,78,216,0.12)"
                    stroke="#1d4ed8"
                    stroke-width="2.5"
                  />
                  <circle cx="300" cy="140" r="4" fill="#1d4ed8" />
                  <circle cx="520" cy="110" r="4" fill="#1d4ed8" />
                  <circle cx="560" cy="300" r="4" fill="#1d4ed8" />
                  <circle cx="360" cy="350" r="4" fill="#1d4ed8" />
                  <circle cx="250" cy="250" r="4" fill="#1d4ed8" />
                  <text
                    x="292"
                    y="128"
                    fill="#111"
                    font-size="14"
                    font-weight="700"
                    font-family="Tahoma"
                  >
                    A
                  </text>
                  <text
                    x="514"
                    y="98"
                    fill="#111"
                    font-size="14"
                    font-weight="700"
                    font-family="Tahoma"
                  >
                    B
                  </text>
                  <text
                    x="556"
                    y="290"
                    fill="#111"
                    font-size="14"
                    font-weight="700"
                    font-family="Tahoma"
                  >
                    C
                  </text>
                  <text
                    x="352"
                    y="362"
                    fill="#111"
                    font-size="14"
                    font-weight="700"
                    font-family="Tahoma"
                  >
                    D
                  </text>
                  <text
                    x="240"
                    y="262"
                    fill="#111"
                    font-size="14"
                    font-weight="700"
                    font-family="Tahoma"
                  >
                    E
                  </text>
                </g>
                <g stroke="#7a7a7a" stroke-width="1.4" opacity="0.35">
                  <line x1="90" y1="180" x2="840" y2="180" />
                  <line x1="90" y1="220" x2="840" y2="220" />
                  <line x1="90" y1="260" x2="840" y2="260" />
                  <line x1="90" y1="300" x2="840" y2="300" />
                  <line x1="140" y1="90" x2="140" y2="390" />
                  <line x1="240" y1="90" x2="240" y2="390" />
                  <line x1="340" y1="90" x2="340" y2="390" />
                  <line x1="440" y1="90" x2="440" y2="390" />
                  <line x1="540" y1="90" x2="540" y2="390" />
                  <line x1="640" y1="90" x2="640" y2="390" />
                  <line x1="740" y1="90" x2="740" y2="390" />
                </g>
                <g stroke="#333" stroke-width="2">
                  <line x1="830" y1="70" x2="830" y2="116" />
                  <path
                    d="M830 112 L824 124 L836 124 Z"
                    fill="#333"
                    stroke="none"
                  />
                </g>
                <text
                  x="830"
                  y="140"
                  fill="#333"
                  font-size="13"
                  font-weight="700"
                  font-family="Tahoma"
                  text-anchor="middle"
                >
                  N
                </text>
                <g stroke="#333" stroke-width="2">
                  <line x1="70" y1="360" x2="210" y2="360" />
                  <line x1="70" y1="355" x2="70" y2="365" />
                  <line x1="210" y1="355" x2="210" y2="365" />
                </g>
                <text
                  x="140"
                  y="352"
                  fill="#333"
                  font-size="12"
                  font-family="Tahoma"
                  text-anchor="middle"
                >
                  50 m
                </text>
                <rect
                  x="70"
                  y="410"
                  width="760"
                  height="78"
                  fill="none"
                  stroke="#1d3a6e"
                  stroke-width="1.5"
                />
                <rect x="70" y="410" width="760" height="22" fill="#1d3a6e" />
                <text
                  x="820"
                  y="425"
                  fill="#fff"
                  font-size="11"
                  font-family="Vazirmatn, Tahoma"
                  text-anchor="start"
                >
                  متقاضی: مثال
                </text>
                <text
                  x="450"
                  y="425"
                  fill="#fff"
                  font-size="11"
                  font-family="Vazirmatn, Tahoma"
                  text-anchor="middle"
                >
                  مقیاس: ۱:۵۰۰
                </text>
                <text
                  x="80"
                  y="425"
                  fill="#fff"
                  font-size="11"
                  font-family="Vazirmatn, Tahoma"
                  text-anchor="end"
                >
                  تاریخ: ۱۴۰۳
                </text>
                <text
                  x="820"
                  y="450"
                  fill="#333"
                  font-size="10"
                  font-family="Vazirmatn, Tahoma"
                  text-anchor="start"
                >
                  سیستم مختصات: WGS84 / UTM
                </text>
                <text
                  x="450"
                  y="450"
                  fill="#333"
                  font-size="10"
                  font-family="Vazirmatn, Tahoma"
                  text-anchor="middle"
                >
                  مساحت: ۱۲۵۴٫۳۵ متر مربع
                </text>
                <text
                  x="80"
                  y="450"
                  fill="#333"
                  font-size="10"
                  font-family="Vazirmatn, Tahoma"
                  text-anchor="end"
                >
                  کارشناس: ______
                </text>
              </svg>
              <!-- برق واکنش‌گرا -->
              <div ref="glare" class="glare"></div>
            </div>
          </div>
          <!-- بج‌های شناور سه‌بعدی -->
          <div class="float-badge badge-top">
            <span class="dot dot-green"></span>
            مختصات UTM دقیق
            <i class="fas fa-crosshairs text-[var(--success)]"></i>
          </div>
          <div class="float-badge badge-right">
            <span class="dot dot-orange"></span>
            مساحت خودکار
            <bdi class="font-extrabold text-[var(--accent)]">۱۲۵۴ م²</bdi>
          </div>
          <div class="float-badge badge-left">
            <i class="fas fa-file-arrow-down text-[var(--info)]"></i>
            خروجی PDF / PNG
          </div>
        </div>
        <p class="mt-4 text-[11px] text-[var(--text-faint)] reveal">
          نشانگر موس را روی پیش‌نمایش حرکت دهید — کارت به‌صورت سه‌بعدی می‌چرخد
        </p>
      </div>
    </section>

    <!-- امکانات سه‌بعدی -->
    <!-- <section
      id="features"
      class="py-16 md:py-20 border-t border-[var(--border)] bg-[var(--bg-elevated)]/50 relative overflow-hidden"
    >
      <div class="absolute inset-0 section-glow pointer-events-none"></div>
      <div class="relative max-w-7xl mx-auto px-5">
        <div class="text-center mb-12 reveal">
          <div class="text-xs text-[var(--accent-soft)] font-semibold mb-2">
            امکانات سامانه
          </div>
          <h2 class="text-2xl md:text-4xl font-extrabold">
            همه‌چیز برای یک کروکی دقیق
          </h2>
        </div>

        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          style="perspective: 1200px"
        >
          <div
            v-for="f in features"
            :key="f.title"
            class="feature-card feature-3d reveal"
            @mousemove="onCardTilt"
            @mouseleave="resetCardTilt"
          >
            <div class="card-shine"></div>
            <div class="card-inner">
              <div
                class="icon-3d w-12 h-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mb-4"
              >
                <i class="fas" :class="f.icon + ' text-[var(--accent)]'"></i>
              </div>
              <h3 class="font-bold mb-2">{{ f.title }}</h3>
              <p class="text-sm text-[var(--text-muted)] leading-6">
                {{ f.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section> -->

    <!-- قالب‌ها -->
    <!-- <section
      id="templates"
      class="py-16 md:py-20 border-t border-[var(--border)] relative overflow-hidden"
    >
      <div class="relative max-w-7xl mx-auto px-5">
        <div class="text-center mb-12 reveal">
          <div class="text-xs text-[var(--accent-soft)] font-semibold mb-2">
            قالب‌های آماده
          </div>
          <h2 class="text-2xl md:text-4xl font-extrabold">
            قالب استاندارد کروکی را انتخاب کنید
          </h2>
        </div>
        <div
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          style="perspective: 1000px"
        >
          <div
            v-for="t in customCards"
            :key="t.id"
            class="template-3d rounded-xl border-2 p-4 text-center transition reveal"
            :style="{ borderColor: t.headerColor + '66' }"
            title="قالب شخصی شما"
            @mousemove="onCardTilt"
            @mouseleave="resetCardTilt"
          >
            <div
              class="w-10 h-10 mx-auto rounded-lg mb-3 flex items-center justify-center pop-3d"
              style="background: rgba(250, 108, 4, 0.14); color: var(--accent)"
            >
              <i class="fas fa-crown"></i>
            </div>
            <div class="text-sm font-bold">{{ t.name }}</div>
            <div class="text-[10px] text-[var(--text-muted)] mt-1">
              {{ t.subtitle }}
            </div>
          </div>
          <div
            v-for="t in templates"
            :key="t.id"
            class="template-3d rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center hover:border-[var(--accent)]/50 transition reveal"
            @mousemove="onCardTilt"
            @mouseleave="resetCardTilt"
          >
            <div
              class="w-10 h-10 mx-auto rounded-lg mb-3 flex items-center justify-center pop-3d"
              :style="{
                background: 'rgba(' + hexToRgb(t.headerColor) + ',0.14)',
                color: t.headerColor,
              }"
            >
              <i class="fas" :class="t.icon"></i>
            </div>
            <div class="text-sm font-bold">{{ t.name }}</div>
            <div class="text-[10px] text-[var(--text-muted)] mt-1">
              {{ t.subtitle }}
            </div>
          </div>
        </div>
      </div>
    </section> -->

    <!-- مراحل -->
    <section
      id="how"
      class="py-16 md:py-20 border-t border-[var(--border)] bg-[var(--bg-elevated)]/50 relative overflow-hidden"
    >
      <div class="relative max-w-7xl mx-auto px-5">
        <div class="text-center mb-12 reveal">
          <div class="text-xs text-[var(--accent-soft)] font-semibold mb-2">
            مراحل کار
          </div>
          <h2 class="text-2xl md:text-4xl font-extrabold">در ۵ گام ساده</h2>
        </div>
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          style="perspective: 1000px"
        >
          <div
            v-for="(s, i) in steps"
            :key="s.title"
            class="relative reveal step-3d"
            @mousemove="onCardTilt"
            @mouseleave="resetCardTilt"
          >
            <div
              class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-full relative overflow-hidden"
            >
              <div class="step-glow"></div>
              <div
                class="num-3d w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] text-[#241a05] font-extrabold flex items-center justify-center mb-3 shadow-md shadow-[var(--accent-glow)]"
              >
                {{ i + 1 }}
              </div>
              <div class="font-bold text-sm mb-1.5">{{ s.title }}</div>
              <p class="text-xs text-[var(--text-muted)] leading-5">
                {{ s.desc }}
              </p>
            </div>
            <i
              v-if="i < steps.length - 1"
              class="fas fa-arrow-left absolute -left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] text-sm hidden lg:block"
            ></i>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA پایانی -->
    <section
      class="py-16 md:py-24 border-t border-[var(--border)] relative overflow-hidden"
    >
      <div class="absolute inset-0 hero-bg pointer-events-none"></div>
      <div
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div class="cta-ring"></div>
        <div class="cta-ring cta-ring-2"></div>
      </div>
      <div class="relative max-w-7xl mx-auto px-5 text-center reveal">
        <h2 class="text-2xl md:text-4xl font-extrabold mb-4">
          آماده ساخت کروکی هستید؟
        </h2>
        <p class="text-[var(--text-muted)] mb-8">
          همین حالا شروع کنید و در چند دقیقه کروکی استاندارد خود را دریافت کنید.
        </p>
        <button
          class="btn btn-primary !px-10 !py-3.5 !text-lg !rounded-xl"
          @click="$emit('start')"
        >
          <i class="fas fa-play ml-2"></i>
          شروع ساخت کروکی
        </button>
      </div>
    </section>

    <footer
      class="border-t border-[var(--border)] py-6 bg-[var(--bg-elevated)]/70"
    >
      <div
        class="max-w-7xl mx-auto px-5 text-center text-sm md:text-base font-semibold text-[var(--text-muted)]"
      >
        کلیه حقوق مادی و معنوی متعلق به شرکت ساج گستر کاسپین می‌باشد
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import {
  SKETCH_TEMPLATES,
  TEMPLATE_ICONS,
  getUserTemplates,
} from "../utils/templates";
import { fmtMoney, auth } from "../stores/auth";

const props = defineProps({
  authed: { type: Boolean, default: false },
  userName: { type: String, default: "" },
  isAdmin: { type: Boolean, default: false },
  wallet: { type: Number, default: 0 },
  free: { type: Number, default: 0 },
});

defineEmits([
  "start",
  "toggleLog",
  "login",
  "admin",
  "logout",
  "profile",
  "agencyRequest",
  "experts",
]);

const features = [
  {
    icon: "fa-map-marked-alt",
    title: "ترسیم تعاملی روی نقشه",
    desc: "خط، پلی‌گان، دایره و نقاط چندگانه را مستقیم روی تصویر ماهواره‌ای ترسیم کنید.",
  },
  {
    icon: "fa-file-import",
    title: "آپلود KML / KMZ",
    desc: "فایل KML یا KMZ خود را بارگذاری کنید و بلافاصله روی نقشه مشاهده نمایید.",
  },
  {
    icon: "fa-ruler-combined",
    title: "اندازه‌گیری دقیق",
    desc: "طول ضلع‌ها، مساحت و مختصات UTM به‌صورت خودکار محاسبه می‌شود.",
  },
  {
    icon: "fa-layers",
    title: "قالب‌های استاندارد",
    desc: "بین قالب‌های فنی، ثبتی، شهرداری، بنیاد مسکن و بیمه انتخاب کنید.",
  },
  {
    icon: "fa-eye",
    title: "پیش‌نمایش زنده",
    desc: "پیش از پرداخت، خروجی کروکی و تصویر نقشه را به‌طور کامل بررسی کنید.",
  },
  {
    icon: "fa-file-download",
    title: "دانلود PNG و PDF",
    desc: "خروجی نهایی را با کیفیت بالا به صورت تصویر یا PDF دریافت کنید.",
  },
];

const steps = [
  {
    title: "ترسیم نقشه",
    desc: "مرز ملک را روی نقشه هوایی رسم کنید یا فایل KML بارگذاری کنید.",
  },
  {
    title: "ثبت اطلاعات",
    desc: "مشخصات ملک، متقاضی و قالب کروکی را وارد کنید.",
  },
  {
    title: "پیش‌نمایش",
    desc: "خروجی نهایی را بررسی و ویرایش مجاورت‌ها را انجام دهید.",
  },
  { title: "پرداخت", desc: "به‌صورت امن و آنی هزینه سرویس را پرداخت کنید." },
  { title: "دانلود", desc: "فایل کروکی را در قالب PNG یا PDF دانلود کنید." },
];

const templates = SKETCH_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  subtitle: t.subtitle,
  headerColor: t.headerColor,
  icon: TEMPLATE_ICONS[t.id] || "fa-drafting-compass",
}));

const customCards = computed(() => getUserTemplates());

const menuOpen = ref(false);
// هدر کپسولی
const scrolled = ref(false);
const scrollProgress = ref(0);
const heroSection = ref(null);
const mockupInner = ref(null);
const glare = ref(null);
const orbs = ref(null);
let io = null;
let rafId = 0;

function onDocClick() {
  menuOpen.value = false;
}
function onEscape(e) {
  if (e.key === "Escape") menuOpen.value = false;
}

function onScroll() {
  const y = window.scrollY || 0;
  scrolled.value = y > 24;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.value = h > 0 ? Math.min(100, Math.max(0, (y / h) * 100)) : 0;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// --- سه‌بعدی: هیرو پارالاکس ---
function onHeroMove(e) {
  if (!orbs.value) return;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    orbs.value.querySelectorAll("[data-depth]").forEach((el) => {
      const depth = parseFloat(el.getAttribute("data-depth") || "30");
      el.style.translate = `${-dx * depth}px ${-dy * depth}px`;
    });
  });
}
function resetHero() {
  if (!orbs.value) return;
  orbs.value.querySelectorAll("[data-depth]").forEach((el) => {
    el.style.translate = "0px 0px";
  });
}

// --- سه‌بعدی: موکاپ ---
function onMockupMove(e) {
  const el = mockupInner.value;
  if (!el) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  // RTL: جهت X معکوس حس بهتری می‌دهد
  const ry = px * -14;
  const rx = py * 12;
  el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  el.style.boxShadow = `${-px * 30}px ${24 + Math.abs(py) * 20}px 70px rgba(23,43,77,0.18), 0 8px 28px rgba(250,108,4,0.12)`;
  if (glare.value) {
    glare.value.style.opacity = "1";
    glare.value.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.35), transparent 55%)`;
  }
}
function resetMockup() {
  const el = mockupInner.value;
  if (!el) return;
  el.style.transform = "rotateX(0deg) rotateY(0deg)";
  el.style.boxShadow = "";
  if (glare.value) glare.value.style.opacity = "0";
}

// --- سه‌بعدی: کارت‌ها ---
function onCardTilt(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  el.style.transform = `perspective(900px) rotateX(${py * -8}deg) rotateY(${px * 10}deg) translateY(-5px)`;
  el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
  el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
}
function resetCardTilt(e) {
  const el = e.currentTarget;
  el.style.transform = "";
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onEscape);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onEscape);
  window.removeEventListener("scroll", onScroll);
  if (io) io.disconnect();
  cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.hero-bg {
  background:
    radial-gradient(circle at 20% 20%, rgba(250, 108, 4, 0.1), transparent 45%),
    radial-gradient(
      circle at 80% 30%,
      rgba(29, 58, 110, 0.07),
      transparent 50%
    ),
    radial-gradient(circle at 50% 90%, rgba(250, 108, 4, 0.07), transparent 45%);
}
.hero-grid {
  background-image:
    linear-gradient(rgba(29, 58, 110, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(29, 58, 110, 0.06) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(
    ellipse 70% 60% at 50% 40%,
    black 30%,
    transparent 75%
  );
  -webkit-mask-image: radial-gradient(
    ellipse 70% 60% at 50% 40%,
    black 30%,
    transparent 75%
  );
}
.section-glow {
  background: radial-gradient(
    ellipse 60% 50% at 50% 0%,
    rgba(250, 108, 4, 0.06),
    transparent 70%
  );
}

/* هدر کپسولی */
.header-pill {
  will-change: max-width, border-radius, background-color, box-shadow, padding;
}
section[id] {
  scroll-margin-top: 88px;
}
.nav-link {
  position: relative;
  transition: color 0.2s ease;
}
.nav-link::after {
  content: "";
  position: absolute;
  bottom: -4px;
  right: 0;
  width: 0;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(-90deg, var(--accent), var(--accent-soft));
  transition: width 0.3s var(--ease-out);
}
.nav-link:hover {
  color: var(--text);
}
.nav-link:hover::after {
  width: 100%;
}
.logo-3d {
  transform-style: preserve-3d;
}
.logo-ring {
  position: absolute;
  inset: -4px;
  border-radius: 16px;
  border: 1.5px solid rgba(250, 108, 4, 0.35);
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;
  pointer-events: none;
}
.logo-3d:hover .logo-ring {
  opacity: 1;
  transform: scale(1.05) rotate(-2deg);
}

/* سه‌بعدی عمومی */
.scene {
  perspective: 1400px;
}
.tilt-card {
  transform-style: preserve-3d;
  transition:
    transform 0.18s ease-out,
    box-shadow 0.3s ease;
}
.glare {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 20;
}
.hero-title {
  text-wrap: balance;
}
.title-3d {
  display: inline-block;
  filter: drop-shadow(0 6px 18px rgba(250, 108, 4, 0.35));
  transform: translateZ(0);
}
.badge-3d {
  box-shadow:
    0 6px 20px rgba(250, 108, 4, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transform: translateZ(30px);
}
/* دکمه‌های اصلی ثابت هستند (بدون حرکت مگنتیک/شناور) */
.btn-static {
  box-shadow:
    0 10px 28px rgba(250, 108, 4, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

/* گوی‌ها و چیپ‌های شناور */
.orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(60px);
  opacity: 0.55;
  transition: translate 0.35s ease-out;
  will-change: translate;
}
.orb-1 {
  width: 340px;
  height: 340px;
  top: -60px;
  right: 6%;
  background: radial-gradient(circle, rgba(250, 108, 4, 0.28), transparent 70%);
  animation: drift 9s ease-in-out infinite;
}
.orb-2 {
  width: 300px;
  height: 300px;
  bottom: 8%;
  left: 4%;
  background: radial-gradient(
    circle,
    rgba(47, 111, 208, 0.22),
    transparent 70%
  );
  animation: drift 11s ease-in-out infinite reverse;
}
.orb-3 {
  width: 180px;
  height: 180px;
  top: 32%;
  left: 44%;
  background: radial-gradient(circle, rgba(250, 108, 4, 0.16), transparent 70%);
  animation: drift 7s ease-in-out infinite;
}
.float-chip {
  position: absolute;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 12px 32px rgba(23, 43, 77, 0.14);
  color: var(--accent);
  font-size: 20px;
  transition: translate 0.35s ease-out;
  will-change: translate;
}
.chip-1 {
  top: 14%;
  right: 12%;
  animation: floatY 5s ease-in-out infinite;
}
.chip-2 {
  top: 46%;
  left: 7%;
  animation: floatY 6s ease-in-out infinite 0.6s;
  color: var(--info);
}
.chip-3 {
  bottom: 18%;
  right: 8%;
  animation: floatY 5.5s ease-in-out infinite 1.1s;
  color: #1d3a6e;
}
.float-ring {
  position: absolute;
  border-radius: 999px;
  border: 1.5px dashed rgba(250, 108, 4, 0.35);
  transition: translate 0.35s ease-out;
}
.ring-1 {
  width: 120px;
  height: 120px;
  top: 20%;
  left: 14%;
  animation: spinSlow 22s linear infinite;
}
.ring-2 {
  width: 70px;
  height: 70px;
  bottom: 26%;
  left: 20%;
  animation: spinSlow 16s linear infinite reverse;
  border-color: rgba(47, 111, 208, 0.3);
}

/* بج‌های شناور دور موکاپ */
.float-badge {
  position: absolute;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 14px 36px rgba(23, 43, 77, 0.16);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transform: translateZ(50px);
}
.badge-top {
  top: -18px;
  right: 8%;
  animation: floatY 4.5s ease-in-out infinite;
}
.badge-right {
  bottom: 32%;
  right: -24px;
  animation: floatY 5.2s ease-in-out infinite 0.5s;
}
.badge-left {
  bottom: 12%;
  left: -14px;
  animation: floatY 4.8s ease-in-out infinite 1s;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}
.dot-green {
  background: #1fa15c;
  box-shadow: 0 0 0 4px rgba(31, 161, 92, 0.15);
  animation: pulse 2s infinite;
}
.dot-orange {
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(250, 108, 4, 0.15);
  animation: pulse 2s infinite;
}
@media (max-width: 640px) {
  .badge-right {
    right: 4px;
  }
  .badge-left {
    left: 4px;
  }
  .float-chip {
    display: none;
  }
}

/* کارت‌های سه‌بعدی */
.feature-card {
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition:
    transform 0.18s ease-out,
    border-color 0.25s,
    box-shadow 0.25s;
  transform-style: preserve-3d;
  position: relative;
  overflow: hidden;
  will-change: transform;
}
.feature-card:hover {
  border-color: rgb(var(--accent-rgb) / 0.45);
  box-shadow:
    0 18px 48px rgba(23, 43, 77, 0.12),
    0 4px 14px rgba(250, 108, 4, 0.1);
}
.card-shine {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    420px circle at var(--mx, 50%) var(--my, 50%),
    rgba(250, 108, 4, 0.1),
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}
.feature-card:hover .card-shine {
  opacity: 1;
}
.card-inner {
  transform: translateZ(24px);
  transform-style: preserve-3d;
}
.icon-3d {
  transform: translateZ(36px);
  box-shadow:
    0 8px 20px rgba(250, 108, 4, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: transform 0.25s var(--ease-out);
}
.feature-card:hover .icon-3d {
  transform: translateZ(48px) rotate(-6deg) scale(1.05);
}
.pop-3d {
  transform: translateZ(30px);
  box-shadow: 0 8px 18px rgba(23, 43, 77, 0.1);
}
.template-3d {
  transform-style: preserve-3d;
  transition:
    transform 0.18s ease-out,
    box-shadow 0.25s,
    border-color 0.25s !important;
  will-change: transform;
  background: var(--surface);
}
.template-3d:hover {
  box-shadow: 0 16px 40px rgba(23, 43, 77, 0.12);
}
.step-3d {
  transform-style: preserve-3d;
}
.step-3d > div {
  transition:
    transform 0.18s ease-out,
    box-shadow 0.25s,
    border-color 0.25s;
  will-change: transform;
}
.step-glow {
  position: absolute;
  inset: auto -20% -40% -20%;
  height: 120px;
  background: radial-gradient(
    ellipse at center,
    rgba(250, 108, 4, 0.12),
    transparent 70%
  );
  pointer-events: none;
}
.num-3d {
  transform: translateZ(28px);
}

.cta-ring {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 999px;
  border: 1px solid rgba(250, 108, 4, 0.18);
  animation: ringPulse 4s ease-out infinite;
}
.cta-ring-2 {
  animation-delay: 2s;
  width: 620px;
  height: 620px;
}

.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.7s var(--ease-out),
    transform 0.7s var(--ease-out);
}
.reveal.visible {
  opacity: 1;
  transform: none;
}

.landing {
  animation: pageIn 0.4s var(--ease-out);
}

@keyframes pageIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes floatY {
  0%,
  100% {
    margin-top: 0;
  }
  50% {
    margin-top: -12px;
  }
}
@keyframes drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-18px, 16px) scale(1.06);
  }
}
@keyframes spinSlow {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.25);
  }
}
@keyframes ringPulse {
  0% {
    transform: scale(0.7);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.15);
    opacity: 0;
  }
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  text-align: right;
}
.menu-item i {
  width: 1rem;
  text-align: center;
}
.menu-item:hover {
  background: var(--surface2);
}

.profile-menu {
  animation: menu-in 0.18s var(--ease-out);
}
@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.drop-enter-active {
  animation: menu-in 0.18s var(--ease-out);
}
.drop-leave-active {
  animation: menu-out 0.15s ease-in;
}
@keyframes menu-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb,
  .float-chip,
  .float-badge,
  .cta-ring,
  .float-ring {
    animation: none !important;
  }
  .tilt-card,
  .feature-card,
  .template-3d {
    transition: none !important;
  }
}
</style>
