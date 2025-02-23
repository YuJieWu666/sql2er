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
document
  .getElementById("export-png")
  .addEventListener("click", async function () {
    try {
      // 显示加载提示
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导出中...';

      // 获取PNG数据
      const dataUrl = await visualizer.getPNGData();

      // 创建下载链接
      const link = document.createElement("a");
      link.download = "er-diagram.png";
      link.href = dataUrl;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert("导出失败：" + error.message);
    } finally {
      // 恢复按钮状态
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-download"></i> 导出PNG';
    }
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

// 添加新的事件监听
document
  .getElementById("toggle-physics")
  .addEventListener("change", function () {
    visualizer.togglePhysics(this.checked);
  });

document.getElementById("reset-view").addEventListener("click", function () {
  visualizer.adjustLayout();
});
