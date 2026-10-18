import { getDrawTypeName } from "../utils/useDrawingHelpers";
import { clearDraft } from "../utils/sessionPersist";
import { createDrawingCore, DRAFT_COLOR, DONE_COLOR, MAP_TEXT_FONT } from "./drawingCore";
import { createDrawingLayers } from "./drawingLayers";
import { createDrawingModes } from "./drawingModes";

// رنگ ترسیم: قرمز هنگام در حال ترسیم، سبز پس از پایان
export { DRAFT_COLOR, DONE_COLOR, MAP_TEXT_FONT };

/**
 * کامپوزبل اصلی ترسیم روی نقشه.
 * از سه ماژول drawingCore، drawingLayers و drawingModes تشکیل شده است
 * که وضعیت مشترک را روی یک ctx مشترک مدیریت می‌کنند.
 */
export function useDrawing(map, pins) {
  const ctx = {};

  // ۱. ایجاد state و توابع اصلی
  createDrawingCore(ctx, map, pins);

  // ۲. ایجاد توابع مدیریت لایه‌ها (به state و توابع core دسترسی دارند)
  createDrawingLayers(ctx);

  // ۳. ایجاد توابع حالت ترسیم (به state و توابع core/layers دسترسی دارند)
  createDrawingModes(ctx);

  // بازگرداندن API عمومی — دقیقاً همان ساختار قبلی
  return {
    // state
    loading: ctx.loading,
    drawMode: ctx.drawMode,
    color: ctx.color,
    measureActive: ctx.measureActive,
    positions: ctx.positions,
    placingPoint: ctx.placingPoint,
    formData: ctx.formData,
    showForm: ctx.showForm,
    shape: ctx.shape,
    activeTab: ctx.activeTab,
    coordinateSystem: ctx.coordinateSystem,
    nameError: ctx.nameError,

    // computed
    livePoints: ctx.livePoints,
    displayPoints: ctx.displayPoints,
    livePointCount: ctx.livePointCount,
    liveTotalLength: ctx.liveTotalLength,
    liveArea: ctx.liveArea,
    canFinishDrawing: ctx.canFinishDrawing,
    isSaveEnabled: ctx.isSaveEnabled,

    // توابع حالت ترسیم
    toggleMeasure: ctx.toggleMeasure,
    setDrawMode: ctx.setDrawMode,
    cancelForm: ctx.cancelForm,
    handleSave: ctx.handleSave,
    finishCurrentDrawing: ctx.finishCurrentDrawing,
    getDrawTypeName: () =>
      getDrawTypeName(ctx.shape.value?.type || ctx.drawMode.value, false),

    // توابع ویرایش پیش‌نویس
    inactiveDrawing: ctx.inactiveDrawing,
    updateDraftPoint: ctx.updateDraftPoint,
    removeDraftPoint: ctx.removeDraftPoint,
    addDraftPoint: ctx.addDraftPoint,
    armAddPoint: ctx.armAddPoint,
    disarmAddPoint: ctx.disarmAddPoint,
    renderDraftLayers: ctx.renderDraftLayers,

    // توابع ویرایش شکل موجود
    editExistingPin: ctx.editExistingPin,
    exitPinEdit: ctx.exitPinEdit,
    isEditingPin: ctx.isEditingPin,
    editingPin: () => ctx.__getEditingPin(),

    // توابع مجاورت و لیبل
    draftEdgeCount: ctx.draftEdgeCount,
    draftEdgeNames: ctx.draftEdgeNames,
    syncAdjacents: ctx.syncAdjacents,
    refreshAdjacencyLabels: ctx.refreshAdjacencyLabels,

    // ماندگاری پیش‌نویس
    persistDraftNow: ctx.persistDraftNow,
    restoreDraftFromStorage: ctx.restoreDraftFromStorage,
    clearDraftStored: () => clearDraft(),
  };
}
