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
      interaction: {
        dragNodes: true,
        dragView: true,
        hover: true,
        multiselect: true,
        navigationButtons: true,
        keyboard: true,
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
          label: `${rel.from}.${fromCol}\n↓\n${rel.to}.${rel.toColumns[index]}`,
          font: {
            align: "middle",
            size: 14,
            face: "monospace",
            color: "#666",
            multi: true,
          },
          smooth: {
            enabled: true,
            type: "curvedCW",
            roundness: 0.2 + index * 0.1,
            forceDirection: "none",
          },
          length: 400,
        });
      });
    });

    return edges;
  }

  // 转换为vis.js数据格式
  transformToVisData(erModel) {
    const allNodes = [];
    const allEdges = [];

    // 分析表之间的关系
    const relationshipMap = new Map();
    const connectedTables = new Set();

    // 构建关系图
    erModel.relationships.forEach((rel) => {
      if (!relationshipMap.has(rel.from)) {
        relationshipMap.set(rel.from, new Set());
      }
      if (!relationshipMap.has(rel.to)) {
        relationshipMap.set(rel.to, new Set());
      }
      relationshipMap.get(rel.from).add(rel.to);
      relationshipMap.get(rel.to).add(rel.from);
      connectedTables.add(rel.from);
      connectedTables.add(rel.to);
    });

    // 将表分组：有关系的和独立的
    const connectedTablesList = Array.from(connectedTables);
    const isolatedTables = erModel.tables.filter(
      (table) => !connectedTables.has(table.name)
    );

    // 布局参数
    const spacing = 500; // 增加表之间的间距
    const radius = spacing * (connectedTablesList.length / (2 * Math.PI));
    const centerX = 0;
    const centerY = 0;

    // 布局有关系的表
    connectedTablesList.forEach((tableName, index) => {
      const table = erModel.tables.find((t) => t.name === tableName);
      const angle = (2 * Math.PI * index) / connectedTablesList.length;

      // 在圆形布局上分配位置
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const { nodes, edges } = this.createTableStructure(table);

      // 为节点添加初始位置
      nodes[0].x = x;
      nodes[0].y = y;
      nodes[0].fixed = {
        x: true,
        y: true,
      };

      allNodes.push(...nodes);
      allEdges.push(...edges);
    });

    // 布局独立的表
    const isolatedSpacing = spacing * 1.5;
    isolatedTables.forEach((table, index) => {
      const x = centerX + radius * 2 + isolatedSpacing;
      const y =
        centerY - (isolatedTables.length * spacing) / 2 + index * spacing;

      const { nodes, edges } = this.createTableStructure(table);

      nodes[0].x = x;
      nodes[0].y = y;
      nodes[0].fixed = {
        x: true,
        y: true,
      };

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

    // 初始化完成后解除节点固定并适应视图
    setTimeout(() => {
      // 解除所有节点的固定状态
      nodes.forEach((node) => {
        nodes.update({
          id: node.id,
          fixed: {
            x: false,
            y: false,
          },
        });
      });

      // 调整视图以适应所有节点
      this.network.fit({
        animation: {
          duration: 1000,
          easingFunction: "easeInOutQuad",
        },
      });
    }, 100);

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
    return new Promise((resolve, reject) => {
      try {
        // 获取当前视图的尺寸和位置
        const scale = this.network.getScale();
        const position = this.network.getViewPosition();
        const boundingBox = this.network.getBoundingBox();

        // 创建一个临时容器用于导出
        const exportContainer = document.createElement("div");
        exportContainer.style.width = "2000px";
        exportContainer.style.height = "2000px";
        exportContainer.style.position = "absolute";
        exportContainer.style.left = "-9999px";
        document.body.appendChild(exportContainer);

        // 创建临时网络实例
        const exportNetwork = new vis.Network(
          exportContainer,
          this.network.body.data,
          {
            ...this.options,
            nodes: {
              ...this.options.nodes,
              font: {
                ...this.options.nodes.font,
                size: 16,
              },
            },
          }
        );

        // 等待网络完全稳定
        exportNetwork.once("stabilized", () => {
          // 确保渲染完成
          setTimeout(() => {
            try {
              // 获取画布元素
              const canvas = exportContainer.querySelector("canvas");
              if (!canvas) {
                throw new Error("Canvas element not found");
              }

              // 获取画布数据
              const dataUrl = canvas.toDataURL("image/png", 1.0);

              // 清理临时元素
              document.body.removeChild(exportContainer);
              exportNetwork.destroy();

              resolve(dataUrl);
            } catch (error) {
              reject(error);
            }
          }, 500); // 给予足够的时间完成渲染
        });

        // 适应视图
        exportNetwork.fit({
          animation: false,
        });
      } catch (error) {
        reject(error);
      }
    });
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
