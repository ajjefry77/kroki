<template>
  <section>
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
</template>

<script setup>
import { computed } from "vue";
import { auth } from "../../stores/auth";

const roles = computed(() => auth.state.roles);
</script>
