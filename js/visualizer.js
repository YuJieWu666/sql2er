// ER图可视化类
class ERVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.network = null;
    this.options = {
      nodes: {
        shape: "box",
        margin: {
          top: 10,
          bottom: 10,
          left: 15,
          right: 15,
        },
        borderWidth: 1,
        fixed: {
          x: false,
          y: false,
        },
        color: {
          background: "#ffffff",
          border: "#0366d6",
          highlight: {
            background: "#f1f8ff",
            border: "#0366d6",
          },
          hover: {
            background: "#f1f8ff",
            border: "#0366d6",
          },
        },
        shadow: {
          enabled: true,
          color: "rgba(0,0,0,0.1)",
          size: 2,
        },
      },
      groups: {
        tables: {
          shape: "box",
          font: {
            size: 14,
            face: "Arial, sans-serif",
            color: "#24292e",
            bold: {
              color: "#0366d6",
              size: 16,
              face: "Arial, sans-serif",
              mod: "bold",
            },
            mono: {
              color: "#6f42c1",
              size: 13,
              face: "Consolas, Monaco, monospace",
              mod: "",
            },
          },
          shapeProperties: {
            borderRadius: 3,
          },
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: "curvedCW",
          roundness: 0.2,
          forceDirection: "none",
        },
        color: {
          color: "#0366d6",
          highlight: "#2188ff",
          hover: "#2188ff",
        },
        width: 1,
        selectionWidth: 2,
        hoverWidth: 2,
        physics: false,
        selfReference: {
          size: 20,
          angle: Math.PI / 4,
        },
      },
      physics: {
        enabled: false,
        repulsion: {
          nodeDistance: 200,
          damping: 0.09,
          springLength: 300,
        },
        solver: "repulsion",
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 25,
        },
      },
      manipulation: {
        enabled: true,
        initiallyActive: true,
        dragNodes: true,
        dragView: true,
      },
    };
  }

  // 创建表结构的节点和边
  createTableStructure(table) {
    const tableHTML = this.createTableHTML(table);
    return {
      nodes: [
        {
          id: table.name,
          label: tableHTML,
          group: "tables",
          shape: "box",
          font: {
            multi: true,
            face: "monospace",
          },
        },
      ],
      edges: [],
    };
  }

  // 创建表格HTML
  createTableHTML(table) {
    let label = "";

    // 表头 - 使用粗体和颜色
    label += `<b><i><code>\u3000${table.name.toUpperCase()}\u3000</code></i></b>\n`;
    label += "─".repeat(Math.max(20, table.name.length + 2)) + "\n";

    // 列
    table.columns.forEach((col, index) => {
      const icons = [];
      if (col.isPrimaryKey) icons.push("🔑");
      if (!col.isNullable) icons.push("❗");
      if (col.isAutoIncrement) icons.push("🔄");

      // 使用等宽字体和对齐
      const iconsPart = icons.length ? ` ${icons.join(" ")}` : "";
      const typePart = `<code>${col.type}</code>`;
      label += `${col.name} : ${typePart}${iconsPart}\n`;
    });

    return label;
  }

  // 创建表关系的边
  createRelationships(erModel) {
    const edges = [];

    erModel.relationships.forEach((rel) => {
      rel.fromColumns.forEach((fromCol, index) => {
        const fromId = rel.from;
        const toId = rel.to;

        edges.push({
          from: fromId,
          to: toId,
          arrows: "to",
          label: `${fromCol} → ${rel.toColumns[index]}`,
          font: {
            align: "middle",
            size: 12,
          },
          smooth: {
            enabled: true,
            type: "curvedCW",
            roundness: 0.2 + index * 0.1,
            forceDirection: "none",
          },
          length: 250,
        });
      });
    });

    return edges;
  }

  // 转换为vis.js数据格式
  transformToVisData(erModel) {
    const allNodes = [];
    const allEdges = [];

    // 创建所有表的结构
    erModel.tables.forEach((table) => {
      const { nodes, edges } = this.createTableStructure(table);
      allNodes.push(...nodes);
      allEdges.push(...edges);
    });

    // 创建表之间的关系
    const relationshipEdges = this.createRelationships(erModel);
    allEdges.push(...relationshipEdges);

    return { nodes: allNodes, edges: allEdges };
  }

  // 渲染ER图
  render(erModel) {
    const data = this.transformToVisData(erModel);
    const nodes = new vis.DataSet(data.nodes);
    const edges = new vis.DataSet(data.edges);
    const visData = { nodes, edges };

    if (this.network) {
      this.network.destroy();
    }

    this.network = new vis.Network(this.container, visData, this.options);

    // 双击节点时聚焦
    this.network.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        this.network.focus(params.nodes[0], {
          scale: 1.2,
          animation: true,
        });
      }
    });

    // 拖动时临时启用物理引擎以实现平滑的边调整
    this.network.on("dragStart", () => {
      this.network.setOptions({ physics: { enabled: true } });
    });

    this.network.on("dragEnd", () => {
      this.network.setOptions({ physics: { enabled: false } });
    });
  }

  // 获取当前图的PNG数据URL
  getPNGData() {
    return this.network.canvas.toDataURL();
  }

  // 调整布局
  adjustLayout() {
    this.network.fit();
  }

  // 启用/禁用物理模拟
  togglePhysics(enabled) {
    this.network.setOptions({ physics: { enabled } });
  }

  // 显示全屏
  showFullscreen() {
    const modal = document.getElementById("fullscreen-modal");
    const fullscreenContainer = document.getElementById("fullscreen-diagram");

    // 显示模态框
    modal.style.display = "block";

    // 创建新的网络实例
    const fullscreenNetwork = new vis.Network(
      fullscreenContainer,
      this.network.body.data,
      {
        ...this.options,
        nodes: {
          ...this.options.nodes,
          font: {
            ...this.options.nodes.font,
            size: 16, // 全屏时字体放大
          },
        },
      }
    );

    // 复制当前视图的位置和缩放
    const position = this.network.getViewPosition();
    const scale = this.network.getScale();
    fullscreenNetwork.moveTo({ position, scale });

    // 关闭按钮事件
    const closeBtn = modal.querySelector(".close-btn");
    closeBtn.onclick = () => {
      modal.style.display = "none";
      fullscreenNetwork.destroy();
    };

    // ESC键关闭
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "block") {
        modal.style.display = "none";
        fullscreenNetwork.destroy();
      }
    });
  }
}

// 创建可视化实例并导出可视化函数
const visualizer = new ERVisualizer("er-diagram");

function visualizeER(erModel) {
  visualizer.render(erModel);
}
