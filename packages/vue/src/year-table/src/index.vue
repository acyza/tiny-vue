<!--
 * Copyright (c) 2022 - present TinyVue Authors.
 * Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 -->

<template>
  <table @click="handleYearTableClick" class="tiny-year-table">
    <tbody>
      <tr>
        <td class="available" :class="getCellStyle(state.startYear + 0)">
          <a class="cell">{{ state.startYear }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 1)">
          <a class="cell">{{ state.startYear + 1 }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 2)">
          <a class="cell">{{ state.startYear + 2 }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 3)">
          <a class="cell">{{ state.startYear + 3 }}</a>
        </td>
      </tr>
      <tr>
        <td class="available" :class="getCellStyle(state.startYear + 4)">
          <a class="cell">{{ state.startYear + 4 }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 5)">
          <a class="cell">{{ state.startYear + 5 }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 6)">
          <a class="cell">{{ state.startYear + 6 }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 7)">
          <a class="cell">{{ state.startYear + 7 }}</a>
        </td>
      </tr>
      <tr>
        <td class="available" :class="getCellStyle(state.startYear + 8)">
          <a class="cell">{{ state.startYear + 8 }}</a>
        </td>
        <td class="available" :class="getCellStyle(state.startYear + 9)">
          <a class="cell">{{ state.startYear + 9 }}</a>
        </td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="tsx">
import { renderless, api } from '@opentiny/vue-renderless/year-table/vue'
import { isDate } from '@opentiny/vue-renderless/common/deps/date-util'
import { $prefix, setup, defineComponent } from '@opentiny/vue-common'

export default defineComponent({
  name: $prefix + 'YearTable',
  emits: ['pick'],
  props: {
    disabledDate: {},
    value: {},
    defaultValue: {
      validator(val) {
        // null or valid Date Object
        return val === null || (val instanceof Date && isDate(val))
      }
    },
    date: {}
  },
  setup(props, context) {
    return setup({ props, context, renderless, api, mono: true })
  }
})
</script>
