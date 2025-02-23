// SQL解析器类
class SQLParser {
  constructor() {
    this.tables = new Map(); // 存储表结构
    this.relationships = []; // 存储表关系
  }

  // 解析整个SQL文本
  parse(sqlText) {
    // 将SQL文本分割成单独的语句
    const statements = this.splitStatements(sqlText);

    // 解析每个CREATE TABLE语句
    statements.forEach((stmt) => {
      if (stmt.trim().toLowerCase().startsWith("create table")) {
        this.parseCreateTable(stmt);
      }
    });

    // 分析外键关系
    this.analyzeRelationships();

    return {
      tables: Array.from(this.tables.values()),
      relationships: this.relationships,
    };
  }

  // 将SQL文本分割成单独的语句
  splitStatements(sqlText) {
    return sqlText
      .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, "") // 删除注释
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);
  }

  // 解析CREATE TABLE语句
  parseCreateTable(createStmt) {
    // 提取表名
    const tableNameMatch = createStmt.match(
      /create\s+table\s+`?(\w+)`?\s*\(?/i
    );
    if (!tableNameMatch) return;

    const tableName = tableNameMatch[1];
    const tableStructure = {
      name: tableName,
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      comment: "", // 添加表注释支持
    };

    // 提取列定义部分
    let columnsPart = "";
    const startIdx = createStmt.indexOf("(");
    if (startIdx !== -1) {
      let depth = 1;
      let endIdx = startIdx + 1;
      for (let i = startIdx + 1; i < createStmt.length; i++) {
        if (createStmt[i] === "(") depth++;
        else if (createStmt[i] === ")") {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }
      columnsPart = createStmt.substring(startIdx + 1, endIdx).trim();
    }

    // 分割各个列定义
    const columnDefs = this.splitColumnDefinitions(columnsPart);

    // 解析每个列定义
    columnDefs.forEach((def) => {
      const lowerDef = def.trim().toLowerCase();
      if (lowerDef.startsWith("primary key")) {
        this.parsePrimaryKey(def, tableStructure);
      } else if (lowerDef.startsWith("foreign key")) {
        this.parseForeignKey(def, tableStructure);
      } else if (lowerDef.startsWith("constraint")) {
        this.parseConstraint(def, tableStructure);
      } else if (lowerDef.startsWith("index") || lowerDef.startsWith("key")) {
        // 忽略索引定义
      } else {
        this.parseColumn(def, tableStructure);
      }
    });

    // 解析表注释
    const commentMatch = createStmt.match(/comment\s*=?\s*['"]([^'"]+)['"]/i);
    if (commentMatch) {
      tableStructure.comment = commentMatch[1];
    }

    this.tables.set(tableName, tableStructure);
  }

  // 分割列定义
  splitColumnDefinitions(columnsPart) {
    const defs = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < columnsPart.length; i++) {
      if (columnsPart[i] === "(") depth++;
      else if (columnsPart[i] === ")") depth--;
      else if (columnsPart[i] === "," && depth === 0) {
        defs.push(columnsPart.substring(start, i));
        start = i + 1;
      }
    }

    defs.push(columnsPart.substring(start));
    return defs.map((def) => def.trim()).filter((def) => def.length > 0);
  }

  // 解析列定义
  parseColumn(columnDef, tableStructure) {
    const matches = columnDef.match(
      /`?(\w+)`?\s+(\w+(?:\s*\([^)]*\))?)\s*(.*)/i
    );
    if (!matches) return;

    const [, name, type, rest] = matches;
    const column = {
      name,
      type: type.toLowerCase(),
      isPrimaryKey: false,
      isNullable: !rest || !rest.toLowerCase().includes("not null"),
      isAutoIncrement: rest && rest.toLowerCase().includes("auto_increment"),
      comment: "", // 添加列注释支持
    };

    // 解析列注释
    const commentMatch = rest && rest.match(/comment\s*['"]([^'"]+)['"]/i);
    if (commentMatch) {
      column.comment = commentMatch[1];
    }

    // 解析主键约束
    if (rest && rest.toLowerCase().includes("primary key")) {
      column.isPrimaryKey = true;
      tableStructure.primaryKey = name;
    }

    tableStructure.columns.push(column);
  }

  // 解析主键定义
  parsePrimaryKey(pkDef, tableStructure) {
    const matches = pkDef.match(/primary\s+key\s*\(([^)]+)\)/i);
    if (!matches) return;

    const primaryKeys = matches[1]
      .split(",")
      .map((key) => key.trim().replace(/`/g, ""));

    tableStructure.primaryKey =
      primaryKeys.length === 1 ? primaryKeys[0] : primaryKeys;
  }

  // 解析外键定义
  parseForeignKey(fkDef, tableStructure) {
    const matches = fkDef.match(
      /foreign\s+key\s*\(([^)]+)\)\s*references\s+`?(\w+)`?\s*\(([^)]+)\)/i
    );
    if (!matches) return;

    const [, localColumns, referencedTable, referencedColumns] = matches;

    const foreignKey = {
      columns: localColumns
        .split(",")
        .map((col) => col.trim().replace(/`/g, "")),
      referencedTable: referencedTable,
      referencedColumns: referencedColumns
        .split(",")
        .map((col) => col.trim().replace(/`/g, "")),
    };

    tableStructure.foreignKeys.push(foreignKey);
  }

  // 解析约束
  parseConstraint(constraintDef, tableStructure) {
    const fkMatch = constraintDef.match(
      /constraint\s+`?(\w+)`?\s+foreign\s+key\s*\(([^)]+)\)\s*references\s+`?(\w+)`?\s*\(([^)]+)\)/i
    );

    if (fkMatch) {
      const [
        ,
        constraintName,
        localColumns,
        referencedTable,
        referencedColumns,
      ] = fkMatch;

      const foreignKey = {
        name: constraintName,
        columns: localColumns
          .split(",")
          .map((col) => col.trim().replace(/`/g, "")),
        referencedTable: referencedTable,
        referencedColumns: referencedColumns
          .split(",")
          .map((col) => col.trim().replace(/`/g, "")),
      };

      tableStructure.foreignKeys.push(foreignKey);
    }
  }

  // 分析表之间的关系
  analyzeRelationships() {
    this.tables.forEach((table) => {
      table.foreignKeys.forEach((fk) => {
        this.relationships.push({
          from: table.name,
          to: fk.referencedTable,
          fromColumns: fk.columns,
          toColumns: fk.referencedColumns,
          type: "foreign_key",
        });
      });
    });
  }
}

// 导出解析函数
function parseSQL(sqlText) {
  const parser = new SQLParser();
  return parser.parse(sqlText);
}
