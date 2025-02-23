// 事件监听
document.getElementById("parse-btn").addEventListener("click", function () {
  const sqlCode = window.editor.getValue();
  try {
    const erModel = parseSQL(sqlCode);
    visualizeER(erModel);
  } catch (error) {
    alert("解析错误：" + error.message);
  }
});

// 导出功能
document.getElementById("export-png").addEventListener("click", function () {
  // TODO: 实现PNG导出
});

document.getElementById("export-pdf").addEventListener("click", function () {
  // TODO: 实现PDF导出
});

// 全屏按钮事件
document
  .getElementById("fullscreen-btn")
  .addEventListener("click", function () {
    visualizer.showFullscreen();
  });

// 等待Monaco Editor加载完成
window.onload = function () {
  window.editor = monaco.editor.create(document.getElementById("sql-editor"), {
    value: "-- 在此输入MySQL建表语句\n\n",
    language: "sql",
    theme: "vs",
    minimap: { enabled: false },
    automaticLayout: true,
  });
};
