/**
 * Copyright (c) 2022 - present TinyVue Authors.
 * Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */
import { $props, $setup, $prefix, defineComponent } from '@opentiny/vue-common'
import { iconOperationfaild } from '@opentiny/vue-icon'
import template from 'virtual-template?pc|mobile'

const currentYear = new Date().getFullYear()

const $constants = {
  MonthDay: 32,
  Minutes: 59,
  Hours: 23,
  TotalMonth: 12,
  Max: 'max',
  Min: 'min',
  Hour: 'hour',
  Minute: 'minute',
  CapYear: 'Year',
  CapMonth: 'Month',
  CapDate: 'Date',
  CapHour: 'Hour',
  CapMinute: 'Minute',
  YearMonth: 'year-month',
  DateTime: 'datetime',
  Date: 'date',
  HookMounted: 'hook-mounted',
  Hidden: 'hidden',
  Year: 'year',
  Day: 'day'
}

const validator = (value) => {
  const result =
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    value instanceof String ||
    (Array.isArray(value) &&
      value.length === 2 &&
      value.every((item) => typeof item === 'string' || item instanceof String))

  return result
}

export default defineComponent({
  name: $prefix + 'DatePicker',
  props: {
    ...$props,
    type: {
      type: String,
      default: 'date'
    },
    _constants: {
      type: Object,
      default: () => $constants
    },
    timeArrowControl: Boolean,
    size: String,
    format: String,
    valueFormat: String,
    readonly: Boolean,
    placeholder: String,
    startPlaceholder: String,
    endPlaceholder: String,
    prefixIcon: Object,
    clearIcon: {
      type: Object,
      default() {
        return iconOperationfaild()
      }
    },
    name: {
      default: '',
      validator
    },
    disabled: Boolean,
    clearable: {
      type: Boolean,
      default: true
    },
    id: {
      default: '',
      validator
    },
    popperClass: String,
    editable: {
      type: Boolean,
      default: true
    },
    align: {
      type: String,
      default: 'left'
    },
    modelValue: {},
    defaultValue: {},
    defaultTime: {},
    rangeSeparator: {
      type: [Object, String],
      default: '-'
    },
    pickerOptions: {},
    unlinkPanels: Boolean,
    validateEvent: {
      type: Boolean,
      default: true
    },
    isRange: Boolean,
    arrowControl: Boolean,
    timezoneData: {},
    showTimezone: {
      type: Boolean,
      default: false
    },
    defaultTimezone: {},
    visible: Boolean,
    minDate: {
      type: Date,
      default: () => new Date(currentYear - 10, 0, 1),
      validator: (val: Date) => Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())
    },
    maxDate: {
      type: Date,
      default: () => new Date(currentYear + 10, 11, 31),
      validator: (val: Date) => Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())
    },
    formatter: {
      type: Function,
      default: (type, value) => value
    },
    componentName: { type: String, default: 'DatePicker' }
  },
  setup(props, context) {
    return $setup({ props, context, template })
  }
})
