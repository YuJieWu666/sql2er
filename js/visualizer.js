// ER图可视化类
class ERVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.network = null;
    this.options = {
      nodes: {
        shape: "box",
        margin: 10,
        borderWidth: 1,
        shadow: {
          enabled: true,
          color: "rgba(0,0,0,0.1)",
          size: 2,
        },
      },
      groups: {
        tables: {
          shape: "box",
          color: {
            border: "#e1e4e8",
            background: "#ffffff",
          },
          font: {
            size: 14,
            face: "Arial, sans-serif",
          },
        },
        headers: {
          shape: "box",
          color: {
            border: "#0366d6",
            background: "#0366d6",
          },
          font: {
            color: "#ffffff",
            size: 16,
            face: "Arial, sans-serif",
            bold: true,
          },
        },
        columns: {
          shape: "box",
          color: {
            border: "#e1e4e8",
            background: "#ffffff",
          },
          font: {
            size: 14,
            face: "Arial, sans-serif",
          },
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: "curvedCW",
          roundness: 0.2,
        },
        color: {
          color: "#0366d6",
          highlight: "#2188ff",
          hover: "#2188ff",
        },
        width: 1,
        selectionWidth: 2,
        hoverWidth: 2,
        selfReference: {
          size: 20,
          angle: Math.PI / 4,
        },
      },
      physics: {
        enabled: true,
        hierarchicalRepulsion: {
          nodeDistance: 200,
          damping: 0.09,
        },
        solver: "hierarchicalRepulsion",
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 25,
        },
      },
      layout: {
        hierarchical: {
          direction: "UD",
          sortMethod: "directed",
          levelSeparation: 250,
          nodeSpacing: 300,
          treeSpacing: 200,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: false,
        },
      },
    };
  }

  // 创建表结构的节点和边
  createTableStructure(table) {
    const nodes = [];
    const edges = [];

    // 表头节点
    const headerId = `${table.name}_header`;
    nodes.push({
      id: headerId,
      label: table.name.toUpperCase(),
      group: "headers",
      level: 0,
    });

    // 列节点
    table.columns.forEach((col, index) => {
      const columnId = `${table.name}_${col.name}`;
      const icons = [];

      // 添加图标
      if (col.isPrimaryKey) icons.push("🔑");
      if (!col.isNullable) icons.push("❗");
      if (col.isAutoIncrement) icons.push("🔄");

      nodes.push({
        id: columnId,
        label: `${col.name}\n${col.type} ${icons.join(" ")}`,
        group: "columns",
        level: 1,
        columnData: col, // 存储列信息用于关系连接
      });

      // 连接表头和列
      edges.push({
        from: headerId,
        to: columnId,
        arrows: "",
        color: { opacity: 0.3 },
      });
    });

    return { nodes, edges };
  }

  // 创建表关系的边
  createRelationships(erModel) {
    const edges = [];

    erModel.relationships.forEach((rel) => {
      rel.fromColumns.forEach((fromCol, index) => {
        const fromId = `${rel.from}_${fromCol}`;
        const toId = `${rel.to}_${rel.toColumns[index]}`;

        edges.push({
          from: fromId,
          to: toId,
          arrows: "to",
          label: "references",
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

    // 初始化完成后禁用物理引擎
    this.network.once("stabilized", () => {
      this.network.setOptions({ physics: { enabled: false } });
    });

    // 双击节点时聚焦
    this.network.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        this.network.focus(params.nodes[0], {
          scale: 1.2,
          animation: true,
        });
      }
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
