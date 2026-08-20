<template>
  <div>
    <!-- پنل جستجو -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        class="fixed top-0 left-0 w-full h-full z-[1000]"
        @click="closePanel"
      >
        <div
          class="fixed top-0 right-0 w-[340px] h-full bg-[var(--surface)] shadow-2xl z-50 overflow-y-auto border-l border-[var(--border)]"
          dir="rtl"
          @click.stop
        >
          <div class="p-5">
            <div class="flex justify-between items-center mb-5 pb-4 border-b border-[var(--border)]">
              <h2 class="text-base font-bold text-[var(--text)] flex items-center gap-2">
                <i class="fas fa-search text-[var(--accent)]"></i>
                جستجو
              </h2>
              <button @click="closePanel" class="text-[var(--text-muted)] hover:text-[var(--text)] text-lg leading-none">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <!-- تب‌ها -->
            <div class="mb-4 flex gap-1 bg-[var(--surface2)] rounded-lg p-1 border border-[var(--border)]">
              <button
                @click="activeTab = 'address'"
                :class="[
                  'flex-1 py-2 text-sm rounded-md transition font-medium',
                  activeTab === 'address'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                ]"
              >
                آدرس
              </button>
              <button
                @click="activeTab = 'coords'"
                :class="[
                  'flex-1 py-2 text-sm rounded-md transition font-medium',
                  activeTab === 'coords'
                    ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                ]"
              >
                مختصات
              </button>
              <button
                disabled
                class="flex-1 py-2 text-sm rounded-md bg-white/60 text-[var(--text-faint)] opacity-60 cursor-not-allowed"
                title="به‌زودی"
              >
                کد نوسازی
              </button>
            </div>

            <!-- ═══ تب آدرس ═══ -->
            <div v-if="activeTab === 'address'">
              <div class="mb-4">
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <input
                      type="text"
                      v-model="searchText"
                      @keyup.enter="performSearch"
                      placeholder="متن جستجو را وارد کنید..."
                      class="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm"
                      :disabled="loading"
                    />
                    <div v-if="searchText && !loading" class="absolute left-2 top-2.5">
                      <button @click="clearSearch" class="text-[var(--text-faint)] hover:text-[var(--text)]">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  <button
                    @click="performSearch"
                    :disabled="loading"
                    class="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i v-if="loading" class="fas fa-spinner fa-spin"></i>
                    <i v-else class="fas fa-search"></i>
                  </button>
                </div>
              </div>

              <details class="mb-4">
                <summary class="cursor-pointer text-xs text-[var(--accent)] font-medium">فیلترهای پیشرفته</summary>
                <div class="mt-3 space-y-3 bg-[var(--surface2)] p-3 rounded-lg border border-[var(--border)]">
                  <div>
                    <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">فیلتر شهر:</label>
                    <input
                      v-model="filters.city"
                      placeholder="مثال: تهران"
                      class="w-full px-2 py-1 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">نوع جستجو:</label>
                    <select
                      v-model="filters.select"
                      class="w-full px-2 py-1 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option value="">همه موارد</option>
                      <option value="address">آدرس‌ها</option>
                      <option value="poi">نقاط دیدنی</option>
                      <option value="address,poi">آدرس‌ها و نقاط دیدنی</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">تعداد نتایج:</label>
                    <select
                      v-model="filters.top"
                      class="w-full px-2 py-1 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    >
                      <option :value="10">۱۰ نتیجه</option>
                      <option :value="20">۲۰ نتیجه</option>
                      <option :value="50">۵۰ نتیجه</option>
                    </select>
                  </div>
                </div>
              </details>

              <div v-if="error" class="mb-4 p-3 bg-[var(--danger-glow)] border border-[var(--danger)]/30 rounded-lg">
                <div class="flex items-center gap-2 text-[var(--danger)] text-sm">
                  <i class="fas fa-circle-exclamation"></i>
                  <span>{{ error }}</span>
                </div>
              </div>

              <div v-if="results.length > 0" class="mt-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="text-sm font-semibold text-[var(--text)]">نتایج ({{ results.length }})</h3>
                  <button @click="clearResults" class="text-xs text-[var(--danger)] hover:text-[var(--danger)]">
                    پاک کردن
                  </button>
                </div>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  <div
                    v-for="(item, index) in results"
                    :key="index"
                    @click="flyToLocation(item)"
                    class="p-3 bg-[var(--surface2)] rounded-lg hover:bg-[var(--accent-glow)]/50 transition-colors cursor-pointer border border-[var(--border)] hover:border-[var(--accent)]"
                  >
                    <div class="flex items-start gap-2">
                      <div class="shrink-0 mt-1">
                        <div class="w-6 h-6 bg-[var(--accent-glow)] rounded-full flex items-center justify-center">
                          <i class="fas fa-location-dot text-xs text-[var(--accent)]"></i>
                        </div>
                      </div>
                      <div class="flex-1">
                        <h4 class="font-medium text-[var(--text)] text-sm">{{ item.title || 'بدون عنوان' }}</h4>
                        <p class="text-xs text-[var(--text-muted)] mt-1 leading-5">{{ item.address || 'بدون آدرس' }}</p>
                        <div v-if="item.geom" class="mt-2 flex flex-wrap gap-3 text-[11px]">
                          <span class="text-[var(--text-muted)]">Lat: {{ formatCoordinate(item.geom.coordinates[0]) }}</span>
                          <span class="text-[var(--text-muted)]">Lng: {{ formatCoordinate(item.geom.coordinates[1]) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="loading" class="flex flex-col items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
                <p class="mt-2 text-sm text-[var(--text-muted)]">در حال جستجو...</p>
              </div>

              <div
                v-if="!loading && !error && searched && results.length === 0"
                class="text-center py-8"
              >
                <i class="fas fa-map-marked text-4xl text-[var(--text-faint)]"></i>
                <p class="mt-2 text-sm text-[var(--text-muted)]">نتیجه‌ای یافت نشد</p>
              </div>
            </div>

            <!-- ═══ تب مختصات ═══ -->
            <div v-else class="space-y-3">
              <p class="text-[11px] text-[var(--text-muted)] leading-relaxed">
                مختصات جغرافیایی را وارد کنید تا آدرس (شهر، خیابان و …) نمایش داده شود.
              </p>

              <div class="flex gap-1 text-[11px]">
                <button
                  type="button"
                  @click="coordSystem = 'latlon'"
                  :class="coordSystem === 'latlon' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface2)] text-[var(--text-muted)]'"
                  class="px-2 py-0.5 rounded border border-[var(--border)]"
                >Lat/Lon</button>
                <button
                  type="button"
                  @click="coordSystem = 'utm'"
                  :class="coordSystem === 'utm' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface2)] text-[var(--text-muted)]'"
                  class="px-2 py-0.5 rounded border border-[var(--border)]"
                >UTM</button>
              </div>

              <template v-if="coordSystem === 'latlon'">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] text-[var(--text-muted)] mb-1">عرض جغرافیایی (lat)</label>
                    <input v-model="manual.lat" type="text" dir="ltr" class="w-full border border-[var(--border)] rounded px-2 py-1 text-xs font-mono" placeholder="35.6892" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-[var(--text-muted)] mb-1">طول جغرافیایی (lon)</label>
                    <input v-model="manual.lon" type="text" dir="ltr" class="w-full border border-[var(--border)] rounded px-2 py-1 text-xs font-mono" placeholder="51.3890" />
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] text-[var(--text-muted)] mb-1">Easting</label>
                    <input v-model="manual.easting" type="text" dir="ltr" class="w-full border border-[var(--border)] rounded px-1 py-1 text-xs font-mono" placeholder="364512" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-[var(--text-muted)] mb-1">Northing</label>
                    <input v-model="manual.northing" type="text" dir="ltr" class="w-full border border-[var(--border)] rounded px-1 py-1 text-xs font-mono" placeholder="4021553" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-[var(--text-muted)] mb-1">Zone</label>
                    <input v-model.number="manual.zone" type="number" min="1" max="60" dir="ltr" class="w-full border border-[var(--border)] rounded px-1 py-1 text-xs font-mono" />
                  </div>
                </div>
              </template>

              <button
                type="button"
                @click="performCoordSearch"
                :disabled="loading"
                class="w-full py-2 bg-[var(--accent)] text-white rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {{ loading ? 'در حال دریافت…' : 'یافتن آدرس' }}
              </button>

              <div v-if="coordError" class="p-3 bg-[var(--danger-glow)] border border-[var(--danger)]/30 rounded-lg">
                <div class="flex items-center gap-2 text-[var(--danger)] text-sm">
                  <i class="fas fa-circle-exclamation"></i>
                  <span>{{ coordError }}</span>
                </div>
              </div>

              <div v-if="coordAddress" class="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-3 space-y-1.5 text-[11px]">
                <div class="font-medium text-[var(--text)] text-sm mb-1">{{ coordAddress.display }}</div>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[var(--text-muted)]">
                  <span v-if="coordAddress.country"><b>کشور:</b> {{ coordAddress.country }}</span>
                  <span v-if="coordAddress.province"><b>استان:</b> {{ coordAddress.province }}</span>
                  <span v-if="coordAddress.city"><b>شهر:</b> {{ coordAddress.city }}</span>
                  <span v-if="coordAddress.district"><b>منطقه:</b> {{ coordAddress.district }}</span>
                  <span v-if="coordAddress.neighbourhood" class="col-span-2"><b>محله:</b> {{ coordAddress.neighbourhood }}</span>
                  <span v-if="coordAddress.road" class="col-span-2"><b>خیابان:</b> {{ coordAddress.road }}</span>
                  <span v-if="coordAddress.house_number"><b>پلاک:</b> {{ coordAddress.house_number }}</span>
                  <span v-if="coordAddress.postcode"><b>کدپستی:</b> {{ coordAddress.postcode }}</span>
                </div>
                <div v-if="lastCoord" class="text-[var(--text-faint)] font-mono pt-1 border-t border-[var(--border)]" dir="ltr">
                  {{ lastCoord.lat.toFixed(6) }}, {{ lastCoord.lon.toFixed(6) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onUnmounted } from "vue";
import mapboxgl from "mapbox-gl";
import proj4 from "proj4";

const props = defineProps({
  map: { type: Object, default: null },
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["update:open", "close"]);

const isOpen = ref(false);
watch(
  () => props.open,
  (v) => {
    isOpen.value = v;
    if (v) {
      searchText.value = "";
      results.value = [];
      error.value = null;
      searched.value = false;
    }
  },
);

const searchText = ref("");
const loading = ref(false);
const results = ref([]);
const error = ref(null);
const searched = ref(false);
let searchMarker = null;

const activeTab = ref("address");
const coordSystem = ref("latlon");
const manual = reactive({
  lat: "",
  lon: "",
  easting: "",
  northing: "",
  zone: 39,
});
const coordError = ref("");
const coordAddress = ref(null);
const lastCoord = ref(null);
let coordMarker = null;

const filters = ref({ city: "", select: "", top: 20 });

const token = () => import.meta.env.VITE_MAPBOX_TOKEN || "";
const IR_BBOX = "44.0,25.0,63.3,39.8";

const formatCoordinate = (coord) => (coord != null ? Number(coord).toFixed(6) : "نامشخص");

function waitMapReady() {
  return new Promise((resolve) => {
    if (props.map?.loaded?.()) return resolve(true);
    props.map?.once?.("load", () => resolve(true));
    setTimeout(() => resolve(!!props.map), 3000);
  });
}

async function geocode(q, params) {
  const p = new URLSearchParams({
    access_token: token(),
    language: "fa",
    country: "ir",
    bbox: IR_BBOX,
    ...params,
  });
  const res = await fetch(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURIComponent(q) + ".json?" + p,
  );
  if (!res.ok) throw new Error("خطای سرویس جستجو (" + res.status + ")");
  return res.json();
}

async function performSearch() {
  if (!searchText.value.trim()) {
    error.value = "لطفا متن جستجو را وارد کنید";
    return;
  }
  loading.value = true;
  error.value = null;
  searched.value = true;
  try {
    let q = searchText.value.trim();
    if (filters.value.city) q = q + (q ? " " : "") + filters.value.city;
    const params = { limit: filters.value.top ?? 20, autocomplete: false };
    if (filters.value.select) params.types = filters.value.select;
    if (props.map) {
      const c = props.map.getCenter();
      params.proximity = c.lng + "," + c.lat;
    }
    const data = await geocode(q, params);
    const feats = data.features || [];
    results.value = feats.map((f) => ({
      title: f.text || f.place_name,
      address: f.place_name || "",
      geom: { type: "Point", coordinates: f.center },
      type: (f.place_type || [])[0] || "",
    }));
    if (!results.value.length) error.value = "نتیجه‌ای یافت نشد";
  } catch (err) {
    error.value = err.message || "خطا در ارتباط با سرور";
    results.value = [];
  } finally {
    loading.value = false;
  }
}

const flyToLocation = (item) => {
  if (!props.map || !item.geom) return;
  const [lng, lat] = item.geom.coordinates;
  props.map.flyTo({ center: [lng, lat], zoom: 16, essential: true });
  if (searchMarker) searchMarker.remove();
  searchMarker = new mapboxgl.Marker({ color: "#e07b39" })
    .setLngLat([lng, lat])
    .setPopup(new mapboxgl.Popup().setText(item.title || "مکان انتخاب شده"))
    .addTo(props.map);
};

const closePanel = () => emit("update:open", false);
const clearSearch = () => {
  searchText.value = "";
  results.value = [];
  searched.value = false;
  error.value = null;
};
const clearResults = () => {
  results.value = [];
  searched.value = false;
  error.value = null;
};

function placeCoordMarker(lon, lat) {
  if (!props.map) return;
  if (coordMarker) coordMarker.remove();
  coordMarker = new mapboxgl.Marker({ color: "#ea580c" })
    .setLngLat([lon, lat])
    .addTo(props.map);
  props.map.flyTo({ center: [lon, lat], zoom: Math.max(props.map.getZoom(), 15), essential: true });
}

function performCoordSearch() {
  coordError.value = "";
  coordAddress.value = null;
  let lat, lon;
  if (coordSystem.value === "latlon") {
    lat = parseFloat(String(manual.lat).replace(",", "."));
    lon = parseFloat(String(manual.lon).replace(",", "."));
    if (!isFinite(lat) || !isFinite(lon)) {
      coordError.value = "مختصات معتبر نیست";
      return;
    }
  } else {
    const e = parseFloat(String(manual.easting).replace(",", "."));
    const n = parseFloat(String(manual.northing).replace(",", "."));
    const z = Number(manual.zone) || 39;
    if (!isFinite(e) || !isFinite(n)) {
      coordError.value = "مختصات UTM معتبر نیست";
      return;
    }
    try {
      [lon, lat] = proj4(
        `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`,
        "EPSG:4326",
        [e, n],
      );
    } catch (err) {
      coordError.value = "تبدیل UTM ناموفق بود";
      return;
    }
  }
  reverseLookup(lat, lon);
}

async function reverseLookup(lat, lon) {
  loading.value = true;
  coordError.value = "";
  coordAddress.value = null;
  lastCoord.value = { lat, lon };
  placeCoordMarker(lon, lat);
  try {
    const data = await geocode(lon + "," + lat, { limit: 1 });
    const f = (data.features || [])[0];
    if (!f) {
      coordError.value = "آدرسی یافت نشد";
      return;
    }
    const ctx = {};
    for (const c of f.context || []) ctx[c.id.split(".")[0]] = c.text;
    const addressText = f.place_type[0] === "address" ? f.text : "";
    coordAddress.value = {
      display: f.place_name,
      country: ctx.country || ctx.country_code || "",
      province: ctx.region || "",
      city: ctx.place || ctx.locality || "",
      district: ctx.district || "",
      neighbourhood: ctx.neighborhood || "",
      road: addressText || ctx.address || "",
      house_number: f.address || "",
      postcode: ctx.postcode || "",
    };
  } catch (err) {
    coordError.value = err.message || "دریافت آدرس ناموفق بود";
  } finally {
    loading.value = false;
  }
}

onUnmounted(() => {
  if (searchMarker) searchMarker.remove();
  if (coordMarker) coordMarker.remove();
});
</script>