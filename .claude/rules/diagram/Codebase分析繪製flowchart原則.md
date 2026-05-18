# Codebase 分析繪製 Flowchart 原則

以「繪製 Flowchart 基本原則」為基礎，從程式碼轉換為 flowchart 時，額外遵循以下原則。

## 節點描述格式

- 語意化描述為主角，程式碼參照作為輔助
- 格式：第一行為行為描述，第二行為對應的程式碼，以 `<br/>` 分隔
- 程式碼參照一律附上；生成後由使用者決定移除或保留指定節點的程式碼

### Good Example

```
"設定 i18n 資源路徑<br/>setI18Param('rms/v3', 'aiResumeList', 'aiResumeList')"
```

```
"強制載入初始推薦履歷<br/>manager.forceLoadResumePage()"
```

### Bad Example

```
"setI18Param('rms/v3', 'aiResumeList', 'aiResumeList')"
```

```
"manager.forceLoadResumePage()"
```

## Lifecycle Hook 處理

- Vue lifecycle hook 一律拆為子流程節點，維持主流程的一致性與可讀性
- 適用於：`onBeforeMount`、`onMounted`、`onBeforeUnmount`、`onUnmounted` 等
