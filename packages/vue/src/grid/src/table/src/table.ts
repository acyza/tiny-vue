/**
 * MIT License
 *
 * Copyright (c) 2019 Xu Liangzhan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
import { h, hooks, $prefix } from '@opentiny/vue-common'
import Tooltip from '@opentiny/vue-tooltip'
import { extend } from '@opentiny/vue-renderless/common/object'
import { isEmptyObject, isObject, isNull } from '@opentiny/vue-renderless/common/type'
import { uniqueId, template, toNumber, isBoolean } from '@opentiny/vue-renderless/grid/static/'
import { getRowkey, GlobalEvent, hasChildrenList, getListeners } from '@opentiny/vue-renderless/grid/utils'
import TINYGrid from '../../adapter'
import GridHeader from '../../header'
import GridFooter from '../../footer'
import GridBody from '../../body'
import GridFilter from '../../filter'
import GridMenu from '../../menu'
import GridLoading from '../../loading'
import methods from './methods'
import GlobalConfig from '../../config'
import { error } from '../../tools'
import { clearOnTableUnmount } from './strategy'

function verifyConfig(_vm) {
  if (!getRowkey(_vm)) {
    error('ui.grid.error.rowIdEmpty')
  }

  if (!TINYGrid._edit && _vm.editConfig) {
    throw new Error(template(error('ui.grid.error.reqModule'), { name: 'Edit' }))
  }

  if (!TINYGrid._valid && _vm.editRules) {
    throw new Error(template(error('ui.grid.error.reqModule'), { name: 'Validator' }))
  }

  if (!TINYGrid._keyboard && (_vm.keyboardConfig || _vm.mouseConfig)) {
    throw new Error(template(error('ui.grid.error.reqModule'), { name: 'Keyboard' }))
  }

  if (!TINYGrid._resize && _vm.autoResize) {
    throw new Error(template(error('ui.grid.error.reqModule'), { name: 'Resize' }))
  }
}

function mergeScrollDirStore(scrollDir, scrollDirStore) {
  if (scrollDir) {
    Object.assign(scrollDirStore, {
      startIndex: 0,
      visibleIndex: 0,
      adaptive: isBoolean(scrollDir.adaptive) ? scrollDir.adaptive : true,
      renderSize: toNumber(scrollDir.rSize),
      offsetSize: toNumber(scrollDir.oSize)
    })
  }
}

function loadStatic(data, _vm) {
  // 此段代码与 watch(data) 功能重复，只在配置了 data 属性后生效
  if (data && data.length > 0) {
    _vm.loadTableData(data, true).then(() => {
      _vm.handleDefault()
      _vm.updateStyle()
    })
  }
}

function mergeTreeConfig(_vm) {
  if (_vm.treeConfig) {
    const { ordered } = _vm.treeConfig

    if (isNull(ordered)) {
      _vm.treeConfig.ordered = true
    }
  }
}

function initDrop(_vm) {
  const dropConfig = _vm.dropConfig

  if (dropConfig) {
    const { plugin, column = true, row = true } = dropConfig

    if (plugin) {
      column && _vm.columnDrop()
      row && _vm.rowDrop()
    }
  }
}

const renderEmptyPartFn = (opt) => {
  const { _vm, tableData, $slots, renderEmpty } = opt
  return () => {
    let emptyPartVnode = null

    if (_vm.isCenterEmpty && !tableData.length) {
      let emptyVnodes

      if ($slots.empty) {
        emptyVnodes = $slots.empty.call(_vm, h)
      } else if (renderEmpty) {
        emptyVnodes = [renderEmpty(h, _vm)]
      } else {
        emptyVnodes = [h('p', { class: 'tiny-grid__empty-img' }), h('span', { class: 'tiny-grid__empty-text' }, GlobalConfig.i18n('ui.grid.emptyText'))]
      }

      emptyPartVnode = h('div', { class: 'empty-center-block' }, emptyVnodes)
    }

    return emptyPartVnode
  }
}

const renderFooterFn = (opt) => {
  const { showFooter, footerData, footerMethod, tableColumn, visibleColumn, vSize } = opt
  return () => {
    let tableFooterVnode = [null]

    if (showFooter) {
      tableFooterVnode = h(GridFooter, {
        props: { footerData, footerMethod, tableColumn, visibleColumn, size: vSize },
        ref: 'tableFooter'
      })
    }

    return tableFooterVnode
  }
}

/**
 * 渲染浮固定列
 */
function renderFixed(h, $table, fixedType) {
  let { collectColumn, columnStore, footerData, isGroup, showFooter, showHeader, tableColumn, tableData, vSize, visibleColumn } = $table
  let fixedColumn = columnStore[`${fixedType}List`]

  const props = { fixedType, tableData, tableColumn, visibleColumn, collectColumn, size: vSize, fixedColumn, isGroup }

  // prettier-ignore
  return h(
    'div',
    {
      class: `tiny-grid__fixed-${fixedType}-wrapper`,
      ref: `${fixedType}Container`
    },
    [
      showHeader ? h(GridHeader, { props, ref: `${fixedType}Header` }) : null,
      h(GridBody, { props, ref: `${fixedType}Body` }),
      showFooter
        ? h(GridFooter, {
          props: { fixedType, footerData, tableColumn, visibleColumn, size: vSize, fixedColumn },
          ref: `${fixedType}Footer`
        })
        : null
    ]
  )
}

const renderResizeBarFn = (opt) => {
  const { isResizable, overflowX, scrollbarHeight } = opt
  return () => {
    let resizeBarVnode = [null]

    if (isResizable) {
      resizeBarVnode = h('div', {
        class: 'tiny-grid__resizable-bar',
        style: overflowX ? { 'padding-bottom': `${scrollbarHeight}px` } : null,
        ref: 'resizeBar',
        key: 'tinyGridResizeBar'
      })
    }

    return resizeBarVnode
  }
}

const renderPluginWrapperFn = (opt) => {
  const { hasFilter, optimizeOpts, filterStore, isCtxMenu, ctxMenuStore, hasTip, tooltipContentOpts } = opt
  const { editRules, validOpts, height, tableData, vaildTipOpts, id, _vm } = opt
  return () => {
    let filterVnode = [null]
    let ctxMenuVnode = [null]
    let tooltipVnode = [null]
    let errorTooltipVnode = [null]

    if (hasFilter) {
      filterVnode = h(GridFilter, {
        props: { optimizeOpts, filterStore },
        ref: 'filterWrapper'
      })
    }

    if (isCtxMenu) {
      ctxMenuVnode = h(GridMenu, { props: { ctxMenuStore }, ref: 'ctxWrapper' })
    }
    if (hasTip) {
      tooltipVnode = h(Tooltip, { ref: 'tooltip', props: tooltipContentOpts })
    }

    if (hasTip && editRules && (validOpts.message === 'default' ? !height : validOpts.message === 'tooltip')) {
      errorTooltipVnode = h(Tooltip, {
        class: 'tiny-grid__valid-error',
        props: validOpts.message === 'tooltip' || tableData.length === 1 ? vaildTipOpts : null,
        ref: 'validTip'
      })
    }

    return h(
      'div',
      {
        class: `tiny-grid${id}-wrapper ${_vm.$attrs.staticClass || ''}`,
        ref: 'tableWrapper'
      },
      [
        // 筛选
        filterVnode,
        // 快捷菜单
        ctxMenuVnode,
        // Ellipsis tooltip
        tooltipVnode,
        // valid error tooltip
        errorTooltipVnode
      ]
    )
  }
}

const renderSelectToolbarFn = (opt) => {
  const { selectToolbar, selectToolbarStore, renderedToolbar } = opt
  return () => {
    let selectToolbarVnode = [null]

    if (selectToolbar) {
      selectToolbarVnode = h(
        'div',
        {
          ref: 'selectToolbar',
          class: 'tiny-grid__select-toolbar',
          style: [
            selectToolbarStore.layout,
            {
              visibility: selectToolbarStore.visible ? 'visible' : 'hidden'
            }
          ]
        },
        renderedToolbar || [null]
      )
    }

    return selectToolbarVnode
  }
}

function getRenderer(opt) {
  const { $slots, _vm, leftList, optimizeOpts, overflowX, props, rightList, showFooter, showHeader, tableColumn, tableData, vSize, visibleColumn } = opt
  const { $grid, ctxMenuStore, editRules, filterStore, footerData, footerMethod, hasFilter, hasTip, height, id } = _vm
  const { isCtxMenu, isResizable, renderEmpty, scrollbarHeight, selectToolbarStore, tooltipContentOpts, vaildTipOpts, validOpts } = _vm
  const { selectToolbar, renderedToolbar } = $grid

  const renderHeader = () => (showHeader ? h(GridHeader, { ref: 'tableHeader', props }) : [null])
  const renderEmptyPart = renderEmptyPartFn({ _vm, tableData, $slots, renderEmpty })
  const renderFooter = renderFooterFn({ showFooter, footerData, footerMethod, tableColumn, visibleColumn, vSize })

  const renderFixedLeft = () => (leftList && leftList.length && overflowX ? renderFixed(h, _vm, 'left') : [null])
  const renderFixedRight = () => (rightList && rightList.length && overflowX ? renderFixed(h, _vm, 'right') : [null])

  const renderResizeBar = renderResizeBarFn({ isResizable, overflowX, scrollbarHeight })

  const arg1 = { hasFilter, optimizeOpts, filterStore, isCtxMenu, ctxMenuStore, hasTip, tooltipContentOpts }
  const arg2 = { editRules, validOpts, height, tableData, vaildTipOpts, id, _vm }
  const renderPluginWrapper = renderPluginWrapperFn(Object.assign(arg1, arg2))

  const renderSelectToolbar = renderSelectToolbarFn({ selectToolbar, selectToolbarStore, renderedToolbar })

  return {
    renderHeader,
    renderEmptyPart,
    renderFooter,
    renderFixedLeft,
    renderFixedRight,
    renderResizeBar,
    renderPluginWrapper,
    renderSelectToolbar
  }
}

function getTableAttrs(args) {
  let { vSize, editConfig, showHeader, showFooter, overflowY, overflowX, leftList, rightList, showOverflow } = args
  let { showHeaderOverflow, highlightCell, optimizeOpts, stripe, border, isGroup, mouseConfig } = args
  let { loading, highlightHoverRow, highlightHoverColumn } = args

  const map = {
    showHeader: 'show__head',
    showFooter: 'show__foot',
    overflowY: 'scroll__y',
    overflowX: 'scroll__x',
    fixedLeft: 'fixed__left',
    fixedRight: 'fixed__right',
    loading: 'is__loading',
    highlightHoverRow: 'row__highlight',
    highlightHoverColumn: 'column__highlight'
  }

  return {
    class: {
      'tiny-grid': 1,
      [`size__${vSize}`]: vSize,
      'tiny-grid-editable': editConfig,
      [map.showHeader]: showHeader,
      [map.showFooter]: showFooter,
      [map.overflowY]: overflowY,
      [map.overflowX]: overflowX,
      [map.fixedLeft]: leftList.length,
      [map.fixedRight]: rightList.length,
      'all-overflow': showOverflow,
      'all-head-overflow': showHeaderOverflow,
      'tiny-grid-cell__highlight': highlightCell,
      'tiny-grid__animat': optimizeOpts.animat,
      'tiny-grid__stripe': stripe,
      'tiny-grid__border': border || isGroup,
      'tiny-grid__checked': mouseConfig.checked,
      'mark-insert': editConfig && editConfig.markInsert,
      'edit__no-border': editConfig && editConfig.showBorder === false,
      [map.loading]: loading,
      [map.highlightHoverRow]: highlightHoverRow,
      [map.highlightHoverColumn]: highlightHoverColumn
    }
  }
}

const gridData = {
  // 存储异步加载过的行\列数据
  asyncRenderMap: {},
  // 列分组配置
  collectColumn: [],
  // 存放列相关的信息
  columnStore: {
    autoList: [],
    centerList: [],
    leftList: [],
    pxList: [],
    pxMinList: [],
    resizeList: [],
    rightList: [],
    scaleList: [],
    scaleMinList: []
  },
  // 存放快捷菜单的信息
  ctxMenuStore: {
    list: [],
    selectChild: null,
    selected: null,
    showChild: false,
    style: null,
    visible: false
  },
  // 当前行
  currentRow: null,
  // 存放可编辑相关信息
  editStore: {
    editorAutoRefreshKey: 0,
    // 激活
    actived: { column: null, row: null },
    // 所有选中
    checked: { columns: [], rows: [], tColumns: [], tRows: [] },
    // 已复制源
    copyed: { columns: [], cut: false, rows: [] },
    indexs: { columns: [] },
    insertList: [],
    removeList: [],
    // 选中源
    selected: { column: null, row: null },
    titles: { columns: [] }
  },
  // 已展开的行
  expandeds: [],
  // 当前选中的筛选列
  filterStore: {
    column: null,
    condition: { input: '', relation: 'equals' },
    id: '',
    multi: false,
    options: [],
    visible: false
  },
  // 表尾合计数据
  footerData: [],
  groupData: {},
  groupFolds: [],
  // 所有列已禁用
  headerCheckDisabled: false,
  id: uniqueId(),
  // 是否全选
  isAllSelected: false,
  // 多选属性，有选中且非全选状态
  isIndeterminate: false,
  // 是否存在横向滚动条
  overflowX: false,
  // 是否存在纵向滚动条
  overflowY: true,
  // 存储滚动加载，上次滚动的位置
  scrollLoadStore: { bodyHeight: 0, scrollHeight: 0 },
  // 是否启用了横向 X 可视渲染方式加载
  scrollXLoad: false,
  // 是否启用了纵向 Y 可视渲染方式加载
  scrollYLoad: false,
  // 横向滚动条的高度
  scrollbarHeight: 0,
  // 纵向滚动条的宽度
  scrollbarWidth: 0,
  // 单选属性，选中行
  selectRow: null,
  // 存放多选工具栏相关信息
  selectToolbarStore: {
    layout: { height: 0, left: 0, top: 0, width: 0, zIndex: 1 },
    visible: false
  },
  // 多选属性，已选中的列
  selection: [],
  // 渲染的列
  tableColumn: [],
  // 渲染中的数据
  tableData: [],
  // 完整所有列
  tableFullColumn: [],
  // tooltip提示内容
  tooltipContent: '',
  // tooltip提示内容是否处理换行字符
  tooltipContentPre: false,
  // 已展开树节点
  treeExpandeds: [],
  // 树节点不确定状态的列表
  treeIndeterminates: [],
  // 存放数据校验相关信息
  validStore: {
    column: null,
    content: '',
    isArrow: false,
    row: null,
    rule: null,
    visible: false
  },
  // 校验tip提示内容
  validTipContent: '',
  // 在编辑模式下 单元格在失去焦点验证的状态
  validatedMap: {},
  // 显示的列
  visibleColumn: []
}
const getTableData = () => {
  const tableData = {
    // 条件处理后数据
    afterFullData: [],
    elemStore: {},
    // 表尾高度
    footerHeight: 0,
    // 缓存数据集
    fullAllDataRowIdData: {},
    fullAllDataRowMap: new Map(),
    fullColumnIdData: {},
    fullColumnMap: new Map(),
    fullDataRowIdData: {},
    fullDataRowMap: new Map(),
    // 缓存树形表格行数据以及其父级行数据的映射关系
    parentRowMap: new Map(),
    // 临时插入数据集
    temporaryRows: [],
    // 表头高度
    headerHeight: 0,
    // 最后滚动位置
    lastScrollLeft: 0,
    lastScrollTop: 0,
    // 表格父容器的高度
    parentHeight: 0,
    scrollDirection: 'N', // N,X,Y （滚动方向）
    // 存放横向 X 虚拟滚动相关的信息
    scrollXStore: {},
    // 存放纵向 Y 虚拟滚动相关信息
    scrollYStore: {},
    // 完整数据
    tableFullData: [],
    // 表格高度
    tableHeight: 0,
    // 表格宽度
    tableWidth: 0,
    // 存放 tooltip 相关信息
    tooltipStore: {}
  }
  return tableData
}

export default {
  name: `${$prefix}GridTable`,
  props: {
    // 所有的列对其方式
    align: { type: String, default: () => GlobalConfig.align },
    // 是否自动监听父容器变化去更新响应式表格宽高
    autoResize: Boolean,
    // 是否带有纵向边框
    border: { type: Boolean, default: () => GlobalConfig.border },
    // 给单元格附加 className
    cellClassName: [String, Function],
    // 主键配置
    columnKey: Boolean,
    // 所有列最小宽度，把剩余宽度按比例分配
    columnMinWidth: [Number, String],
    // 所有列宽度
    columnWidth: [Number, String],
    // 快捷菜单配置项
    contextMenu: Object,
    // 初始化绑定动态列
    customs: Array,
    // 数据
    data: [Array, Object],
    // 行拖拽和列拖拽的配置
    dropConfig: Object,
    // 编辑配置项
    editConfig: [Object, Boolean],
    // 校验规则配置项
    editRules: Object,
    // 展开行配置项
    expandConfig: Object,
    // 列的宽度是否自撑开
    fit: { type: Boolean, default: () => GlobalConfig.fit },
    // 所有的表尾列的对齐方式
    footerAlign: { type: String, default: () => GlobalConfig.footerAlign },
    // 给表尾的单元格附加 className
    footerCellClassName: [String, Function],
    // 表尾合计的计算方法
    footerMethod: Function,
    // 给表尾的行附加 className
    footerRowClassName: [String, Function],
    // 表尾合并行或列
    footerSpanMethod: Function,
    // 所有的表头列的对齐方式
    headerAlign: { type: String, default: () => GlobalConfig.headerAlign },
    // 给表头的单元格附加 className
    headerCellClassName: [String, Function],
    // 给表头的行附加 className
    headerRowClassName: [String, Function],
    // 表头后置图标是否绝对定位
    headerSuffixIconAbsolute: Boolean,
    // 表格的高度
    height: [Number, String],
    // 激活单元格编辑时是否高亮显示
    highlightCell: Boolean,
    // 是否要高亮当前选中列
    highlightCurrentColumn: {
      type: Boolean,
      default: () => GlobalConfig.highlightCurrentColumn
    },
    // 是否要高亮当前选中行
    highlightCurrentRow: {
      type: Boolean,
      default: () => GlobalConfig.highlightCurrentRow
    },
    // 鼠标移到列是否要高亮显示
    highlightHoverColumn: {
      type: Boolean,
      default: () => GlobalConfig.highlightHoverColumn
    },
    // 鼠标移到行是否要高亮显示
    highlightHoverRow: {
      type: Boolean,
      default: () => GlobalConfig.highlightHoverRow
    },
    // 是否开启异步列功能
    isAsyncColumn: Boolean,
    isCenterEmpty: Boolean,
    // 是否拖拽表头调整列顺序
    isDragHeaderSorting: Boolean,
    // 按键配置项
    keyboardConfig: Object,
    // 表格是否加载中
    loading: Boolean,
    loadingComponent: Object,
    // 表格的最大高度
    maxHeight: [Number, String],
    // 表格的最小高度
    minHeight: [Number, String],
    // 鼠标配置项
    mouseConfig: Object,
    // 优化配置项
    optimization: Object,
    // 额外的参数
    params: Object,
    // 单选配置
    radioConfig: Object,
    // 是否所有服务端筛选
    remoteFilter: Boolean,
    // 是否所有服务端排序
    remoteSort: Boolean,
    // 空数据渲染
    renderEmpty: Function,
    renderRowAfter: Function,
    // 所有列是否允许拖动列宽调整大小
    resizable: { type: Boolean, default: () => GlobalConfig.resizable },
    // 给行附加 className
    rowClassName: [String, Function],
    // 行分组配置
    rowGroup: Object,
    rowId: { type: String, default: () => GlobalConfig.rowId },
    rowKey: Boolean,
    // 行合并
    rowSpan: Array,
    // 滚动加载
    scrollLoad: Object,
    // 多选配置项
    selectConfig: Object,
    // 是否显示表尾合计
    showFooter: Boolean,
    // 是否显示表头
    showHeader: { type: Boolean, default: () => GlobalConfig.showHeader },
    // 设置表头所有内容过长时显示为省略号
    showHeaderOverflow: {
      type: [Boolean, String],
      default: () => GlobalConfig.showHeaderOverflow
    },
    // 设置所有内容过长时显示为省略号
    showOverflow: {
      type: [Boolean, String],
      default: () => GlobalConfig.showOverflow
    },
    // 表格的尺寸
    size: { type: String, default: () => GlobalConfig.size },
    // 排序配置项
    sortConfig: Object,
    // 自定义所有列的排序方法
    sortMethod: Function,
    // 全局开关控制所有的列是否可以排列
    sortable: { type: Boolean, default: true },
    // 合并行或列
    spanMethod: Function,
    // 只对 type=index 时有效，自定义序号的起始值
    startIndex: { type: Number, default: 0 },
    // 是否带有斑马纹
    stripe: { type: Boolean, default: () => GlobalConfig.stripe },
    // 默认统计配置
    summaryConfig: Object,
    // 是否自动根据状态属性去更新响应式表格宽高
    syncResize: Boolean,
    tableLayout: String,
    // tooltip 配置项
    tooltipConfig: { type: Object, default: () => ({}) },
    // 树形结构配置项
    treeConfig: Object,
    // 校验配置项
    validConfig: Object
  },
  provide() {
    return {
      $table: this,
      // 嵌套表格屏蔽父表格列
      $column: null
    }
  },
  inject: {
    $grid: {
      default: null
    }
  },
  data() {
    return extend(true, {}, gridData)
  },
  computed: {
    bodyCtxMenu() {
      return this.ctxMenuOpts.body && this.ctxMenuOpts.body.options ? this.ctxMenuOpts.body.options : []
    },
    ctxMenuList() {
      let rest = []
      this.ctxMenuStore.list.forEach((list) => list.forEach((item) => rest.push(item)))
      return rest
    },
    ctxMenuOpts() {
      return extend(true, {}, GlobalConfig.menu, this.contextMenu)
    },
    hasFilter() {
      return this.tableColumn.some((column) => isObject(column.filter) && !isEmptyObject(column.filter))
    },
    hasTip() {
      return TINYGrid._tooltip
    },
    headerCtxMenu() {
      return this.ctxMenuOpts.header && this.ctxMenuOpts.header.options ? this.ctxMenuOpts.header.options : []
    },
    isCtxMenu() {
      return this.headerCtxMenu.length || this.bodyCtxMenu.length
    },
    // 是否使用了分组表头
    isGroup() {
      return this.collectColumn.some((column) => hasChildrenList(column))
    },
    isResizable() {
      return this.resizable || this.tableFullColumn.some((column) => column.resizable)
    },
    optimizeOpts() {
      return extend(true, {}, GlobalConfig.optimization, this.optimization)
    },
    sortOpts() {
      return extend(true, {}, GlobalConfig.sortConfig, this.sortConfig)
    },
    tooltipContentOpts() {
      return extend(
        true,
        {
          content: this.tooltipContent,
          pre: this.tooltipContentPre,
          renderContent: this.tooltipConfig.renderContent,
          placement: 'right',
          type: this.tooltipConfig.effect ? undefined : 'normal'
        },
        this.tooltipConfig
      )
    },
    vSize() {
      return this.size || (this.$parent && this.$parent.size) || (this.$parent && this.$parent.vSize)
    },
    vaildTipOpts() {
      return extend(
        true,
        {
          isArrow: false,
          placement: 'top',
          type: 'error',
          content: this.validTipContent
        },
        this.tooltipConfig
      )
    },
    validOpts() {
      return extend(true, { message: 'tooltip' }, GlobalConfig.validConfig, this.validConfig)
    }
  },
  watch: {
    collectColumn(value) {
      this.watchColumn(value)
    },
    customs(value) {
      !this.isUpdateCustoms && this.mergeCustomColumn(value)
      this.isUpdateCustoms = false
    },
    data(value) {
      if (Array.isArray(value)) {
        !this._isUpdateData && this.loadTableData(value, true).then(this.handleDefault)
        this._isUpdateData = false
      }
    },
    'data.length': {
      handler() {
        // 此处考虑性能问题不能深度监听data属性，再结合表格内部显示数据都是来自data的浅拷贝，所以只需要监听data的长度即可
        if (Array.isArray(this.data)) {
          !this._isUpdateData && this.loadTableData(this.data, true).then(this.handleDefault)
          this._isUpdateData = false
        }
      }
    },
    height() {
      this.$nextTick(this.recalculate)
    },
    syncResize(value) {
      value && this.$nextTick(this.recalculate)
    },
    tableColumn() {
      this.analyColumnWidth()
    }
  },
  created() {
    let { scrollXStore, scrollYStore, optimizeOpts, data } = Object.assign(this, getTableData())
    let { scrollX, scrollY } = optimizeOpts

    verifyConfig(this)
    mergeScrollDirStore(scrollX, scrollXStore)
    mergeScrollDirStore(scrollY, scrollYStore)
    loadStatic(data, this)
    mergeTreeConfig(this)

    // 处理拖拽的逻辑
    initDrop(this)

    GlobalEvent.on(this, 'mousedown', this.handleGlobalMousedownEvent)
    GlobalEvent.on(this, 'blur', this.handleGlobalBlurEvent)
    GlobalEvent.on(this, 'mousewheel', this.handleGlobalMousewheelEvent)
    GlobalEvent.on(this, 'keydown', this.handleGlobalKeydownEvent)
    GlobalEvent.on(this, 'resize', this.handleGlobalResizeEvent)
    GlobalEvent.on(this, 'contextmenu', this.handleGlobalContextmenuEvent)
  },
  mounted() {
    this.$nextTick().then(() => {
      if (this.autoResize && TINYGrid._resize) {
        this.bindResize()
      }

      document.body.appendChild(this.$refs.tableWrapper)
    })
  },
  activated() {
    let { lastScrollLeft, lastScrollTop } = this

    if (lastScrollLeft || lastScrollTop) {
      this.clearScroll()
        .then(this.recalculate)
        .then(() => this.scrollTo(lastScrollLeft, lastScrollTop))
    }
  },
  setup(props, { slots, attrs, listeners }) {
    hooks.onBeforeUnmount(() => {
      const table = hooks.getCurrentInstance().proxy
      const { elemStore, $refs } = table
      const containerList = ['main', 'left', 'right']
      const tableWrapper = $refs.tableWrapper

      if (tableWrapper && tableWrapper.parentNode) {
        tableWrapper.parentNode.removeChild(tableWrapper)
      }

      if (TINYGrid._resize) {
        table.unbindResize()
      }

      table.closeFilter()
      table.closeMenu()

      // 清除 拖动相关的引用
      table.columnSortable && table.columnSortable.destroy()
      table.rowSortable && table.rowSortable.destroy()

      containerList.forEach((layout) => {
        const ySpaceElem = elemStore[`${layout}-body-ySpace`]

        if (ySpaceElem) {
          ySpaceElem.onscroll = null
        }
      })

      GlobalEvent.off(table, 'mousedown')
      GlobalEvent.off(table, 'blur')
      GlobalEvent.off(table, 'mousewheel')
      GlobalEvent.off(table, 'keydown')
      GlobalEvent.off(table, 'resize')
      GlobalEvent.off(table, 'contextmenu')
      clearOnTableUnmount(table)
    })

    const tableListeners = getListeners(attrs, listeners)

    return { slots, tableListeners }
  },
  render() {
    let { border, collectColumn, columnStore, editConfig, highlightCell, highlightHoverColumn } = this
    let { highlightHoverRow, isGroup, loading, loadingComponent, mouseConfig = {}, optimizeOpts } = this
    let { overflowX, overflowY, showFooter, showHeader, showHeaderOverflow, showOverflow } = this
    let { stripe, tableColumn, tableData, vSize, visibleColumn } = this
    let { leftList, rightList } = columnStore
    let $slots = this.slots
    const props = { tableData, tableColumn, visibleColumn, collectColumn, size: vSize, isGroup }
    let args = { $slots, _vm: this, leftList, optimizeOpts, overflowX, props, rightList }

    Object.assign(args, { showFooter, showHeader, tableColumn, tableData, vSize, visibleColumn })
    const renders = getRenderer(args)
    const { renderHeader, renderEmptyPart, renderFooter, renderFixedLeft } = renders
    const { renderFixedRight, renderResizeBar, renderPluginWrapper, renderSelectToolbar } = renders

    args = { vSize, editConfig, showHeader, showFooter, overflowY, overflowX, leftList, rightList, showOverflow }
    Object.assign(args, { showHeaderOverflow, highlightCell, optimizeOpts, stripe, border, isGroup, mouseConfig })
    Object.assign(args, { loading, highlightHoverRow, highlightHoverColumn })

    return h('div', getTableAttrs(args), [
      // 隐藏列
      h('div', { class: 'tiny-grid-hidden-column', ref: 'hideColumn' }, $slots.default && $slots.default()),
      // 主头部
      renderHeader(),
      // 居中显示空数据
      renderEmptyPart(),
      // 主内容
      h(GridBody, { ref: 'tableBody', props }),
      // 底部汇总
      renderFooter(),
      // 左侧固定列
      renderFixedLeft(),
      // 右侧固定列
      renderFixedRight(),
      // 边框线
      h('div', { class: 'tiny-grid__border-line', key: 'tinyGridBorderLine' }),
      // 列宽线
      renderResizeBar(),
      // 加载中
      h(loadingComponent || GridLoading, { props: { visible: loading } }),
      // 筛选、快捷菜单、Tip提示、校验提示
      renderPluginWrapper(),
      // 多选工具栏
      renderSelectToolbar()
    ])
  },
  methods
}
