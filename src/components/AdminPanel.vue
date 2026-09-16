<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <!-- سربرگ -->
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)]">
            <i class="fas fa-shield-halved text-[#241a05] text-lg"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm leading-tight">پنل مدیریت</div>
            <div class="text-[11px] text-[var(--text-muted)]">{{ user?.name }} — مدیر سیستم</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm" @click="$emit('home')">
            <i class="fas fa-house ml-1"></i> صفحه اصلی
          </button>
          <button class="btn btn-ghost btn-sm" @click="logout">
            <i class="fas fa-right-from-bracket ml-1"></i> خروج
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-5 py-6">
      <!-- آمار -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">کل کاربران</div>
          <div class="font-extrabold text-2xl">{{ stats.users }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">کل کروکی‌ها</div>
          <div class="font-extrabold text-2xl">{{ stats.krokis }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">شارژهای در انتظار</div>
          <div class="font-extrabold text-2xl text-[var(--warning)]">{{ stats.pendingCharges }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">درآمد</div>
          <div class="font-extrabold text-xl text-[var(--success)]" dir="ltr">{{ fmtMoney(stats.revenue) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">کروکی‌های پرداختی</div>
          <div class="font-extrabold text-2xl text-[var(--info)]">{{ stats.paid }}</div>
        </div>
        <div class="card !rounded-2xl p-4">
          <div class="text-[11px] text-[var(--text-muted)] mb-1">مجموع موجودی کیف پول‌ها</div>
          <div class="font-extrabold text-xl text-[var(--accent-soft)]" dir="ltr">{{ fmtMoney(stats.walletTotal) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></div>
        </div>
      </div>

      <!-- تب‌ها -->
      <div class="tabs-container mb-6">
        <div class="tabs-wrapper tabs-scroll">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="tab-icon-wrap">
              <i class="fas" :class="tab.icon"></i>
            </span>
            <span class="tab-label">{{ tab.label }}</span>
            <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
          </button>
        </div>
      </div>

      <!-- درخواست‌های شارژ -->
      <section v-if="activeTab === 'requests'">
        <div class="card !rounded-2xl overflow-hidden mb-6">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>مبلغ</th>
                  <th>شناسه پرداخت</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pendingRequests.length === 0">
                  <td colspan="6" class="text-center text-[var(--text-faint)] py-10">درخواست شارژ در انتظار وجود ندارد</td>
                </tr>
                <tr v-for="r in pendingRequests" :key="r.id">
                  <td>
                    <div class="text-xs font-semibold">{{ r.name || r.username }}</div>
                    <div class="text-[10px] text-[var(--text-muted)]">{{ r.username }}</div>
                  </td>
                  <td class="font-extrabold" dir="ltr">{{ fmtMoney(r.amount) }} <span class="text-[10px] text-[var(--text-muted)]">تومان</span></td>
                  <td class="text-xs" dir="ltr">{{ r.paymentId }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.at) }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--warning-glow)] text-[var(--warning)]">در انتظار</span>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <button class="btn btn-secondary btn-xs" @click="showNote(r)"> جزئیات</button>
                      <button class="btn btn-primary btn-xs" :disabled="busy" @click="approve(r)">
                        <i class="fas fa-check ml-0.5"></i> تأیید
                      </button>
                      <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="reject(r)">
                        <i class="fas fa-xmark ml-0.5"></i> رد
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h3 class="font-bold text-sm mt-8 mb-3">تاریخچه تصمیم‌ها</h3>
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>مبلغ</th>
                  <th>شناسه</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="decidedRequests.length === 0">
                  <td colspan="5" class="text-center text-[var(--text-faint)] py-8">هنوز تصمیمی ثبت نشده است</td>
                </tr>
                <tr v-for="r in decidedRequests" :key="r.id">
                  <td>
                    <div class="text-xs font-semibold">{{ r.name || r.username }}</div>
                    <div class="text-[10px] text-[var(--text-muted)]">{{ r.username }}</div>
                  </td>
                  <td class="font-bold" dir="ltr">{{ fmtMoney(r.amount) }}</td>
                  <td class="text-xs" dir="ltr">{{ r.paymentId }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.at) }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="r.status === 'approved' ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'">
                      {{ r.status === "approved" ? "تأیید شد" : "رد شد" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- مدیریت کاربران -->
      <section v-else-if="activeTab === 'users'">
        <div class="flex items-center gap-2 mb-3">
          <div class="relative flex-1 max-w-xs">
            <i class="fas fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-faint)]"></i>
            <input v-model="q" type="text" class="input !pr-9" placeholder="جستجوی نام کاربری یا نام" />
          </div>
          <span class="text-xs text-[var(--text-muted)]">{{ filteredUsers.length }} کاربر</span>
        </div>

        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>نقش</th>
                  <th>موجودی (تومان)</th>
                  <th>کروکی رایگان</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="usersLoading">
                  <td colspan="6" class="text-center text-[var(--text-faint)] py-10">
                    <i class="fas fa-circle-notch fa-spin ml-1"></i> در حال دریافت کاربران...
                  </td>
                </tr>
                <tr v-else-if="filteredUsers.length === 0">
                  <td colspan="6" class="text-center text-[var(--text-faint)] py-10">کاربری یافت نشد</td>
                </tr>
                <tr v-for="u in filteredUsers" :key="u.id">
                  <td>
                    <div class="text-xs font-semibold">{{ u.name }}</div>
                    <div class="text-[10px] text-[var(--text-muted)]" dir="ltr">{{ u.username }}</div>
                  </td>
                  <td>
                    <select :value="u.role" class="input !py-1.5 !px-2 text-xs w-28" @change="onRole(u, $event)">
                      <option value="user">کاربر</option>
                      <option value="admin">مدیر</option>
                    </select>
                  </td>
                  <td>
                    <div class="field-card wallet-field">
                      <div class="field-icon-wrap wallet-icon">
                        <i class="fas fa-wallet"></i>
                      </div>
                      <div class="field-content">
                        <div class="field-value" dir="ltr">{{ fmtMoney(u.wallet) }}</div>
                        <span class="field-unit">تومان</span>
                      </div>
                      <button class="field-action-btn wallet-action" @click="showAddWallet(u)" title="افزودن مبلغ (شارژ دستی)">
                        <i class="fas fa-plus"></i>
                      </button>
                    </div>
                  </td>
                  <td>
                    <div class="field-card freekroki-field">
                      <div class="field-icon-wrap freekroki-icon">
                        <i class="fas fa-drafting-compass"></i>
                      </div>
                      <div class="field-content">
                        <input :value="u.freeKroki" type="number" min="0" class="field-input" @change="onFree(u, $event)" />
                        <span class="field-unit">عدد</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      class="px-2 py-1 rounded-full text-[10px] font-semibold transition"
                      :class="u.active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
                      :disabled="busy"
                      @click="toggleActive(u)"
                    >
                      {{ u.active ? "فعال" : "غیرفعال" }}
                    </button>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <button class="btn btn-ghost btn-xs" @click="showEditUser(u)" title="تغییر رمز و نام">
                        <i class="fas fa-pen text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- کروکی‌ها -->
      <section v-else-if="activeTab === 'krokis'">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <button
            v-for="s in statusFilters"
            :key="s.value"
            class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
            :class="krokiStatus === s.value ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)]'"
            @click="krokiStatus = s.value"
          >
            {{ s.label }}
          </button>
          <span class="text-xs text-[var(--text-muted)] mr-auto">{{ adminKrokis.length }} کروکی</span>
        </div>

        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کد پیگیری</th>
                  <th>عنوان</th>
                  <th>متقاضی</th>
                  <th>مبلغ پرداختی</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="adminKrokis.length === 0">
                  <td colspan="6" class="text-center text-[var(--text-faint)] py-10">کروکی‌ای یافت نشد</td>
                </tr>
                <tr v-for="k in adminKrokis" :key="k.id">
                  <td class="text-xs font-bold text-[var(--accent-soft)]" dir="ltr">{{ k.tracking_code }}</td>
                  <td class="text-xs font-semibold">{{ k.title }}</td>
                  <td class="text-xs">{{ k.client_name }}</td>
                  <td class="text-xs font-bold" dir="ltr">{{ fmtMoney(k.price_paid) }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(k.created_at) }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="krokiStatusClass(k.status)">
                      {{ krokiStatusLabel(k.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- تراکنش‌ها -->
      <section v-else-if="activeTab === 'transactions'">
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>عنوان</th>
                  <th>مقدار</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="adminTransactions.length === 0">
                  <td colspan="5" class="text-center text-[var(--text-faint)] py-10">تراکنشی ثبت نشده است</td>
                </tr>
                <tr v-for="tx in adminTransactions" :key="tx.id">
                  <td class="text-xs" dir="ltr">{{ tx.user_id }}</td>
                  <td class="text-xs">{{ tx.typeLabel }}</td>
                  <td class="text-xs font-bold" :class="txTypeColor(tx)" dir="ltr">{{ txSign(tx) }} {{ fmtMoney(tx.amount) }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="txStatusClass(tx.status)">
                      {{ txStatusLabel(tx.status) }}
                    </span>
                  </td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(tx.at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- نقش‌ها -->
      <section v-else-if="activeTab === 'roles'">
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>شناسه</th>
                  <th>نام نقش</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="roles.length === 0">
                  <td colspan="2" class="text-center text-[var(--text-faint)] py-10">نقشی ثبت نشده است</td>
                </tr>
                <tr v-for="r in roles" :key="r.id">
                  <td class="text-xs" dir="ltr">{{ r.id }}</td>
                  <td class="text-xs font-semibold">{{ r.name }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- کدهای معرف -->
      <section v-else-if="activeTab === 'referrals'">
        <div class="card !rounded-2xl p-4 mb-4">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-ticket text-[var(--accent)]"></i> ساخت کد معرف جدید
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">کد (خالی = تصادفی)</label>
              <input v-model="referralForm.code" type="text" class="input" dir="ltr" placeholder="A1B2C3" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">کروکی رایگان</label>
              <input v-model.number="referralForm.free_kroki_amount" type="number" min="1" class="input" dir="ltr" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">سقف استفاده</label>
              <input v-model.number="referralForm.max_uses" type="number" min="1" class="input" dir="ltr" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">انقضا</label>
              <input v-model="referralForm.expires_at" type="text" class="input" dir="ltr" placeholder="خالی = بدون انقضا" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-primary btn-sm" :disabled="referralSaving" @click="createReferral">
              <i v-if="referralSaving" class="fas fa-circle-notch fa-spin ml-1"></i>
              <i v-else class="fas fa-plus ml-1"></i>
              ساخت کد
            </button>
            <span v-if="referralMsg" class="text-xs" :class="referralMsgOk ? 'text-[var(--success)]' : 'text-[var(--danger)]'">{{ referralMsg }}</span>
          </div>
        </div>

        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کد</th>
                  <th>کروکی رایگان</th>
                  <th>استفاده شده</th>
                  <th>سقف</th>
                  <th>انقضا</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="referrals.length === 0">
                  <td colspan="7" class="text-center text-[var(--text-faint)] py-10">کد معرفی ثبت نشده است</td>
                </tr>
                <tr v-for="r in referrals" :key="r.id">
                  <td class="text-xs font-bold tracking-widest" dir="ltr">{{ r.code }}</td>
                  <td class="text-xs">{{ r.free_kroki_amount }}</td>
                  <td class="text-xs" dir="ltr">{{ r.used_count }} / {{ r.max_uses }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.expires_at) }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ r.expires_at ? fmtDate(r.expires_at) : "بدون انقضا" }}</td>
                  <td>
                    <button
                      class="px-2 py-1 rounded-full text-[10px] font-semibold transition"
                      :class="r.is_active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
                      :disabled="busy"
                      @click="toggleReferral(r)"
                    >
                      {{ r.is_active ? "فعال" : "غیرفعال" }}
                    </button>
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="removeReferral(r)">
                      <i class="fas fa-trash text-xs"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- شهرها و قیمت‌ها -->
      <section v-else-if="activeTab === 'cities'">
        <div class="card !rounded-2xl p-4 mb-4">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-city text-[var(--accent)]"></i> افزودن شهر جدید
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input v-model="newCity.city" type="text" class="input" placeholder="نام شهر" />
            <input v-model.number="newCity.price" type="number" min="0" class="input" dir="ltr" placeholder="مبلغ هر کروکی (تومان)" />
            <button class="btn btn-primary btn-sm" :disabled="citySaving || !newCity.city" @click="addCity">
              <i class="fas fa-plus ml-1"></i> افزودن
            </button>
          </div>
        </div>

        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>شهر</th>
                  <th>مبلغ هر کروکی</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cityPrices.length === 0">
                  <td colspan="3" class="text-center text-[var(--text-faint)] py-10">شهری ثبت نشده است</td>
                </tr>
                <tr v-for="c in cityPrices" :key="c.city">
                  <td class="text-xs font-semibold">{{ c.city }}</td>
                  <td>
                    <input
                      type="number"
                      class="input !w-32"
                      dir="ltr"
                      :value="cityPriceDrafts[c.city] ?? c.price"
                      @input="cityPriceDrafts[c.city] = $event.target.value"
                    />
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-xs" :disabled="citySaving" @click="saveCityPrice(c)">
                      <i class="fas fa-floppy-disk ml-1"></i> ذخیره
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- درخواست‌های نمایندگی -->
      <section v-else-if="activeTab === 'agencyRequests'">
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>شهر</th>
                  <th>تاریخ</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="agencyRequests.length === 0">
                  <td colspan="4" class="text-center text-[var(--text-faint)] py-10">درخواست نمایندگی در انتظار وجود ندارد</td>
                </tr>
                <tr v-for="r in agencyRequests" :key="r.id">
                  <td class="text-xs font-semibold">{{ r.full_name || r.username }}</td>
                  <td class="text-xs">{{ r.city }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.created_at) }}</td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <button class="btn btn-primary btn-xs" :disabled="busy" @click="decideAgency(r, true)">
                        <i class="fas fa-check ml-0.5"></i> تأیید
                      </button>
                      <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="decideAgency(r, false)">
                        <i class="fas fa-xmark ml-0.5"></i> رد
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- نمایندگان (هرمی) -->
      <section v-else-if="activeTab === 'agents'">
        <div class="flex items-center gap-2 mb-4">
          <input v-model="agentCityFilter" type="text" class="input !max-w-xs" placeholder="فیلتر بر اساس شهر" />
        </div>
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>نماینده</th>
                  <th>شهر</th>
                  <th>کد معرف</th>
                  <th>تعداد زیرمجموعه</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="adminAgents.length === 0">
                  <td colspan="5" class="text-center text-[var(--text-faint)] py-10">نماینده‌ای ثبت نشده است</td>
                </tr>
                <template v-for="a in adminAgents" :key="a.id">
                  <tr class="cursor-pointer" @click="toggleAgent(a)">
                    <td class="text-xs font-semibold">{{ a.full_name || a.name || a.username }}</td>
                    <td class="text-xs">{{ a.city }}</td>
                    <td class="text-xs font-bold tracking-widest" dir="ltr">{{ a.code }}</td>
                    <td class="text-xs" dir="ltr">{{ a.subordinate_count ?? "—" }}</td>
                    <td class="text-xs text-[var(--text-muted)]"><i class="fas" :class="openAgentId === a.id ? 'fa-chevron-up' : 'fa-chevron-down'"></i></td>
                  </tr>
                  <tr v-if="openAgentId === a.id">
                    <td colspan="5" class="!p-0">
                      <div class="p-4 bg-[var(--bg-elevated)]/50">
                        <div v-if="!agentDetail || agentDetail.agentId !== a.id" class="text-xs text-[var(--text-faint)]">در حال دریافت...</div>
                        <template v-else>
                          <div class="font-bold text-sm mb-3">
                            جمع تراکنش‌های زیرمجموعه‌ها:
                            <span class="text-[var(--success)]" dir="ltr">{{ fmtMoney(agentDetail.total) }} تومان</span>
                          </div>
                          <div class="overflow-x-auto">
                            <table>
                              <thead>
                                <tr>
                                  <th>کاربر</th>
                                  <th>مبلغ</th>
                                  <th>تاریخ</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr v-if="agentDetail.items.length === 0">
                                  <td colspan="3" class="text-center text-[var(--text-faint)] py-6">تراکنشی ثبت نشده است</td>
                                </tr>
                                <tr v-for="tx in agentDetail.items" :key="tx.id">
                                  <td class="text-xs">{{ tx.full_name || tx.username }}</td>
                                  <td class="text-xs font-semibold" dir="ltr">{{ fmtMoney(tx.amount) }}</td>
                                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(tx.created_at) }}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </template>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — پنل مدیریتی
    </footer>

    <!-- جزئیات درخواست -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detail" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="detail = null">
          <div class="card !rounded-2xl max-w-md w-full modal">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-sm">جزئیات درخواست شارژ</h3>
              <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]" @click="detail = null">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
            <dl class="space-y-2.5 text-xs">
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">کاربر</dt><dd class="font-semibold">{{ detail.name || detail.username }} ({{ detail.username }})</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">مبلغ</dt><dd class="font-extrabold" dir="ltr">{{ fmtMoney(detail.amount) }} تومان</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">شناسه پرداخت</dt><dd class="font-mono" dir="ltr">{{ detail.paymentId }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">توضیحات</dt><dd>{{ detail.note || "—" }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[var(--text-muted)]">تاریخ درخواست</dt><dd>{{ fmtDate(detail.at) }}</dd></div>
            </dl>
            <div class="flex gap-2 mt-5">
              <button class="btn btn-primary flex-1" :disabled="busy" @click="approve(detail); detail = null">
                <i class="fas fa-check ml-1"></i> تأیید و افزودن به کیف پول
              </button>
              <button class="btn btn-ghost flex-1 !text-[var(--danger)]" :disabled="busy" @click="reject(detail); detail = null">
                <i class="fas fa-xmark ml-1"></i> رد درخواست
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- مودال ویرایش کاربر -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="editModal = null">
          <div class="card !rounded-2xl max-w-md w-full modal">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--info)] to-[var(--info-glow)] flex items-center justify-center">
                  <i class="fas fa-user-pen text-white text-sm"></i>
                </div>
                <h3 class="font-bold text-sm">ویرایش کاربر</h3>
              </div>
              <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]" @click="editModal = null">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">نام کاربر</label>
                <input v-model="editModal.name" type="text" class="input" placeholder="نام کامل" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">رمز عبور جدید</label>
                <input v-model="editModal.password" type="password" class="input" placeholder="خالی = بدون تغییر" />
              </div>
              <div v-if="editModal.error" class="text-xs text-[var(--danger)] bg-[var(--danger-glow)] px-3 py-2 rounded-lg">
                {{ editModal.error }}
              </div>
            </div>
            <div class="flex gap-2 mt-5">
              <button class="btn btn-primary flex-1" :disabled="editModal.saving" @click="saveEditUser">
                <i v-if="editModal.saving" class="fas fa-circle-notch fa-spin ml-1"></i>
                <i v-else class="fas fa-check ml-1"></i>
                {{ editModal.saving ? 'در حال ذخیره...' : 'ذخیره تغییرات' }}
              </button>
              <button class="btn btn-ghost flex-1" @click="editModal = null">انصراف</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- مودال شارژ دستی کیف پول -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="addWalletModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="addWalletModal = null">
          <div class="card !rounded-2xl max-w-sm w-full modal">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--success)] to-[var(--success-glow)] flex items-center justify-center">
                  <i class="fas fa-coins text-white text-sm"></i>
                </div>
                <h3 class="font-bold text-sm">شارژ دستی کیف پول</h3>
              </div>
              <button class="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)]" @click="addWalletModal = null">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
            <p class="text-xs text-[var(--text-muted)] mb-4">
              مبلغی که می‌خواهید به کیف پول <strong class="text-[var(--text)]">{{ addWalletModal.user.name }}</strong> اضافه شود:
            </p>
            <div class="relative">
              <input v-model="addWalletModal.amount" type="number" min="0" step="10000" class="input !text-lg !font-bold !py-3 !pr-4 !pl-20" dir="ltr" placeholder="0" />
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)]">تومان</span>
            </div>
            <p class="text-[10px] text-[var(--text-faint)] mt-2">
              موجودی فعلی: <strong dir="ltr">{{ fmtMoney(addWalletModal.user.wallet) }}</strong> تومان
            </p>
            <div class="flex gap-2 mt-5">
              <button class="btn btn-primary flex-1" :disabled="!addWalletModal.amount || Number(addWalletModal.amount) <= 0 || addWalletModal.saving" @click="confirmAddWallet">
                <i v-if="addWalletModal.saving" class="fas fa-circle-notch fa-spin ml-1"></i>
                <i v-else class="fas fa-plus ml-1"></i>
                افزودن مبلغ
              </button>
              <button class="btn btn-ghost flex-1" @click="addWalletModal = null">انصراف</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- نوتیفیکیشن -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="toast" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.3)" @click.self="toast = null">
          <div class="card !rounded-2xl max-w-xs w-full modal text-center">
            <div class="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" :class="toast.type === 'success' ? 'bg-[var(--success-glow)]' : 'bg-[var(--danger-glow)]'">
              <i class="fas text-xl" :class="toast.type === 'success' ? 'fa-check text-[var(--success)]' : 'fa-xmark text-[var(--danger)]'"></i>
            </div>
            <p class="text-sm font-semibold mb-4">{{ toast.message }}</p>
            <button class="btn btn-primary w-full" @click="toast = null">بستن</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { auth, fmtMoney, fmtDate } from "../stores/auth";

defineEmits(["home"]);

const user = computed(() => auth.state.user);
const activeTab = ref("requests");
const usersLoading = ref(false);
const busy = ref(false);
const q = ref("");
const detail = ref(null);
const editModal = ref(null);
const addWalletModal = ref(null);
const toast = ref(null);

const stats = computed(() => ({
  users: auth.state.stats?.users ?? 0,
  krokis: auth.state.stats?.krokis ?? 0,
  paid: auth.state.stats?.paid ?? 0,
  pendingCharges: auth.state.stats?.pendingCharges ?? 0,
  revenue: auth.state.stats?.revenue ?? 0,
  walletTotal: auth.state.stats?.walletTotal ?? 0,
}));

const tabs = computed(() => [
  { id: "requests", label: "شارژها", icon: "fa-money-bill-wave", badge: stats.value.pendingCharges || null },
  { id: "users", label: "کاربران", icon: "fa-users", badge: null },
  { id: "krokis", label: "کروکی‌ها", icon: "fa-drafting-compass", badge: null },
  { id: "transactions", label: "تراکنش‌ها", icon: "fa-clock-rotate-left", badge: null },
  { id: "roles", label: "نقش‌ها", icon: "fa-user-shield", badge: null },
  { id: "referrals", label: "معرفی", icon: "fa-ticket", badge: null },
  { id: "cities", label: "شهرها", icon: "fa-city", badge: null },
  { id: "agencyRequests", label: "درخواست نمایندگی", icon: "fa-user-clock", badge: pendingAgencyCount.value || null },
  { id: "agents", label: "نمایندگان", icon: "fa-sitemap", badge: null },
]);

const pendingRequests = computed(() => auth.state.requests.filter((r) => r.status === "pending"));
const decidedRequests = computed(() => auth.state.requests.filter((r) => r.status !== "pending").slice(0, 40));
const filteredUsers = computed(() => {
  const needle = q.value.trim().toLowerCase();
  if (!needle) return auth.state.users;
  return auth.state.users.filter((u) => (u.name || "").toLowerCase().includes(needle) || (u.username || "").toLowerCase().includes(needle));
});

const statusFilters = [
  { value: "", label: "همه" },
  { value: "draft", label: "پیش‌نویس" },
  { value: "paid", label: "پرداخت شده" },
  { value: "issued", label: "صادر شده" },
];
const krokiStatus = ref("");
const adminKrokis = computed(() => auth.state.adminKrokis);
const adminTransactions = computed(() => auth.state.adminTransactions);
const roles = computed(() => auth.state.roles);
const referrals = computed(() => auth.state.referrals);

const referralForm = reactive({ code: "", free_kroki_amount: 1, max_uses: 1, expires_at: "" });
const referralSaving = ref(false);
const referralMsg = ref("");
const referralMsgOk = ref(true);

const cityPrices = computed(() => auth.state.cityPrices);
const newCity = reactive({ city: "", price: "" });
const citySaving = ref(false);
const cityPriceDrafts = reactive({});

const agencyRequests = computed(() => auth.state.agencyRequests.filter((r) => r.status === "pending"));
const pendingAgencyCount = computed(() => agencyRequests.value.length);

const agentCityFilter = ref("");
const adminAgents = computed(() => auth.state.adminAgents);
const openAgentId = ref(null);
const agentDetail = computed(() => auth.state.agentDetail);

async function saveCityPrice(row) {
  citySaving.value = true;
  const res = await auth.setCityPrice(row.city, cityPriceDrafts[row.city] ?? row.price);
  citySaving.value = false;
  if (!res.success) showToast(res.error || "خطا در ثبت قیمت", "error");
}

async function addCity() {
  if (!newCity.city.trim()) return;
  citySaving.value = true;
  const res = await auth.setCityPrice(newCity.city, newCity.price);
  citySaving.value = false;
  if (res.success) {
    newCity.city = "";
    newCity.price = "";
  } else {
    showToast(res.error || "خطا در افزودن شهر", "error");
  }
}

async function decideAgency(r, approve) {
  busy.value = true;
  const res = await auth.decideAgencyRequest(r.id, approve);
  busy.value = false;
  if (!res.success) showToast(res.error || "خطا در ثبت تصمیم", "error");
}

function toggleAgent(a) {
  if (openAgentId.value === a.id) {
    openAgentId.value = null;
    return;
  }
  openAgentId.value = a.id;
  auth.loadAgentDetail(a.id);
}

watch(agentCityFilter, (c) => auth.loadAdminAgents(c));

const tabLoaded = reactive({ krokis: false, transactions: false, roles: false, referrals: false, cities: false, agencyRequests: false, agents: false });

function showToast(message, type = "success") {
  toast.value = { message, type };
}

function showNote(r) {
  detail.value = r;
}

async function approve(r) {
  busy.value = true;
  const res = await auth.approveRequest(r.id);
  busy.value = false;
  if (res.success) {
    showToast("شارژ تأیید شد و به کیف پول کاربر افزوده شد.");
  } else {
    showToast(res.error || "خطا در تأیید شارژ", "error");
  }
}

async function reject(r) {
  busy.value = true;
  const res = await auth.rejectRequest(r.id);
  busy.value = false;
  if (!res.success) showToast(res.error || "خطا در رد شارژ", "error");
}

async function onRole(u, e) {
  const res = await auth.setRole(u.id, e.target.value);
  if (!res.success) showToast(res.error || "خطا در تغییر نقش کاربر", "error");
}

async function onFree(u, e) {
  const res = await auth.setFreeKroki(u.id, e.target.value);
  if (!res.success) showToast(res.error || "خطا در تغییر کروکی رایگان", "error");
}

async function toggleActive(u) {
  const res = await auth.toggleActive(u.id);
  if (!res.success) showToast(res.error || "خطا در تغییر وضعیت کاربر", "error");
}

function showAddWallet(u) {
  addWalletModal.value = { user: u, amount: "", saving: false };
}

async function confirmAddWallet() {
  const m = addWalletModal.value;
  const amt = Number(m.amount);
  if (!amt || amt <= 0) return;
  m.saving = true;
  const res = await auth.creditUser(m.user.id, amt);
  m.saving = false;
  if (res.success) {
    showToast(`مبلغ ${fmtMoney(amt)} تومان به کیف پول اضافه شد.`);
    addWalletModal.value = null;
  } else {
    showToast(res.error || "خطا در افزودن مبلغ", "error");
  }
}

function showEditUser(u) {
  editModal.value = { user: u, name: u.name || "", password: "", error: "", saving: false };
}

async function saveEditUser() {
  const m = editModal.value;
  m.error = "";
  m.saving = true;
  const res = await auth.editUser(m.user.id, { name: m.name, password: m.password });
  m.saving = false;
  if (res.success) {
    showToast("اطلاعات کاربر با موفقیت به‌روزرسانی شد.");
    editModal.value = null;
  } else {
    m.error = res.error || "خطا در ویرایش کاربر";
  }
}

async function createReferral() {
  referralMsg.value = "";
  referralSaving.value = true;
  const res = await auth.createReferral({
    code: referralForm.code,
    free_kroki_amount: referralForm.free_kroki_amount,
    max_uses: referralForm.max_uses,
    expires_at: referralForm.expires_at,
  });
  referralSaving.value = false;
  referralMsgOk.value = res.success;
  referralMsg.value = res.success ? "کد معرف ساخته شد." : res.error;
  if (res.success) {
    referralForm.code = "";
    referralForm.free_kroki_amount = 1;
    referralForm.max_uses = 1;
    referralForm.expires_at = "";
  }
}

async function toggleReferral(r) {
  busy.value = true;
  const res = await auth.updateReferral(r.id, { is_active: !r.is_active });
  busy.value = false;
  if (!res.success) showToast(res.error || "خطا در تغییر وضعیت کد", "error");
}

async function removeReferral(r) {
  busy.value = true;
  const res = await auth.deleteReferral(r.id);
  busy.value = false;
  if (res.success) showToast("کد معرف حذف شد.");
  else showToast(res.error || "خطا در حذف کد", "error");
}

function txSign(tx) {
  if (tx.status === "rejected") return "";
  if (tx.type === "spend") return "−";
  return "+";
}
function txTypeColor(tx) {
  if (tx.type === "spend") return "text-[var(--danger)]";
  if (tx.type === "free" || tx.type === "referral") return "text-[var(--info)]";
  return "text-[var(--success)]";
}
function txStatusClass(s) {
  if (s === "success" || s === "approved") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "pending") return "bg-[var(--warning-glow)] text-[var(--warning)]";
  if (s === "rejected") return "bg-[var(--danger-glow)] text-[var(--danger)]";
  return "bg-[var(--surface3)] text-[var(--text-muted)]";
}
function txStatusLabel(s) {
  if (s === "success" || s === "approved") return "موفق";
  if (s === "pending") return "در انتظار";
  if (s === "rejected") return "رد شده";
  return s || "موفق";
}

function krokiStatusClass(s) {
  if (s === "issued") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "paid") return "bg-[var(--info-glow)] text-[var(--info)]";
  return "bg-[var(--warning-glow)] text-[var(--warning)]";
}
function krokiStatusLabel(s) {
  if (s === "issued") return "صادر شده";
  if (s === "paid") return "پرداخت شده";
  return "پیش‌نویس";
}

function logout() {
  auth.logout();
  location.reload();
}

watch(activeTab, (tab) => {
  if (tab === "krokis" && !tabLoaded.krokis) {
    tabLoaded.krokis = true;
    auth.loadAdminKrokis("");
  } else if (tab === "transactions" && !tabLoaded.transactions) {
    tabLoaded.transactions = true;
    auth.loadAdminTransactions();
  } else if (tab === "roles" && !tabLoaded.roles) {
    tabLoaded.roles = true;
    auth.loadRoles();
  } else if (tab === "referrals" && !tabLoaded.referrals) {
    tabLoaded.referrals = true;
    auth.loadAllReferrals();
  } else if (tab === "cities" && !tabLoaded.cities) {
    tabLoaded.cities = true;
    auth.loadCityPrices();
  } else if (tab === "agencyRequests") {
    tabLoaded.agencyRequests = true;
    auth.loadAgencyRequests();
  } else if (tab === "agents" && !tabLoaded.agents) {
    tabLoaded.agents = true;
    auth.loadAdminAgents("");
  }
});

watch(krokiStatus, (s) => auth.loadAdminKrokis(s));

onMounted(() => {
  const pending = auth.state.requests.filter((r) => r.status === "pending").length;
  if (pending) document.title = "پنل مدیریت — " + pending + " شارژ در انتظار";
  auth.loadStats();
  auth.loadAllCharges();
  usersLoading.value = true;
  auth.loadUsers().finally(() => {
    usersLoading.value = false;
  });
});
</script>

<style scoped>
.tabs-container {
  position: relative;
}

.tabs-wrapper {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.tabs-scroll {
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.25s var(--ease-out);
  position: relative;
  user-select: none;
}

.tab-btn:hover:not(.active) {
  color: var(--text);
  background: var(--surface2);
}

.tab-btn.active {
  background: var(--accent);
  color: #241a05;
  box-shadow: 0 4px 16px var(--accent-glow-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.tab-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.tab-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  transition: all 0.25s var(--ease-out);
}

.tab-btn.active .tab-icon-wrap {
  background: rgba(36, 26, 5, 0.15);
}

.tab-label {
  line-height: 1;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  background: var(--danger);
  color: white;
}

.tab-btn.active .tab-badge {
  background: #241a05;
  color: white;
}

/* فیلدهای زیبا */
.field-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 4px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  transition: all 0.2s var(--ease-out);
  min-width: 170px;
}

.field-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.field-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 12px;
  flex-shrink: 0;
}

.wallet-icon {
  background: linear-gradient(135deg, var(--success-glow), rgba(31, 161, 92, 0.05));
  color: var(--success);
}

.freekroki-icon {
  background: linear-gradient(135deg, var(--accent-glow), rgba(224, 123, 57, 0.05));
  color: var(--accent);
}

.field-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.field-value {
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  min-width: 0;
}

.field-input {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  outline: none;
  transition: background 0.15s;
}

.field-input:hover {
  background: var(--surface2);
}

.field-input:focus {
  background: var(--bg-elevated);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.field-unit {
  font-size: 10px;
  color: var(--text-faint);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.field-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  flex-shrink: 0;
  transition: all 0.2s var(--ease-out);
}

.wallet-action:hover {
  background: var(--success-glow);
  color: var(--success);
  border-color: var(--success);
}
</style>