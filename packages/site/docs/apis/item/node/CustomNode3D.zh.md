---
title: 自定义 3D 节点
order: 14
---

在 G6 中，如果内置 3D 节点不能满足特定需求，可以通过扩展已有的节点类型来创建自定义节点。这允许您利用 G6 强大的内置功能的同时，为节点添加特有的逻辑和样式。

可以通过继承内置的节点（例如 SphereNode），来创建自定义 3D 节点。可继承图形参见： [节点类型](/manual/customize/extension-cats#1-%E8%8A%82%E7%82%B9%E7%B1%BB%E5%9E%8Bnodes)

```ts
import { Graph, Extensions, extend } from '@antv/g6';

/**
 * 创建自定义边，继承自 CircleNode
 */
class CustomNode extends Extensions.SphereNode {
  /**
 * overwrite member method
 */
  /**
 * 重载成员方法，自定义绘制逻辑
 */
}

/**
 * 使用 extend 方法扩展 Graph 类，注册自定义边
 */
const ExtGraph = extend(Graph, {
  nodes: {
    'custom-node': CustomNode,
  },
});

/**
 * 使用扩展后的 Graph 类创建图实例，指定节点类型为自定义节点
 */
const graph = new ExtGraph({
  /**
 * ...其他配置项
 */
  node: {
    type: 'custom-node', /**
 * 指定自定义节点
 */
    /**
 * ...其他配置项详见具体节点配置
 */
  },
});
```

## 重载方法

### draw

**类型**：

```ts
type draw = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: { [shapeId: string]: DisplayObject },
) => {
  keyShape: DisplayObject;
  labelShape?: DisplayObject;
  iconShape?: DisplayObject;
  [otherShapeId: string]: DisplayObject;
};
```

**说明**：用于绘制与节点相关的所有图形

### drawKeyShape

**类型**：

```ts
type drawKeyShape = (model: NodeDisplayModel, shapeMap: NodeShapeMap) => DisplayObject;
```

**说明**：用于绘制关键图形

### drawLabelShape

**类型**：

```ts
type drawLabelShape = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => DisplayObject;
```

**说明**：绘制节点的文本标签图形

### drawLabelBackgroundShape

**类型**：

```ts
type drawLabelBackgroundShape = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => DisplayObject;
```

**说明**：绘制节点的文本的背景图形

### drawIconShape

**类型**：

```ts
type drawIconShape = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => DisplayObject;
```

**说明**：绘制节点的图标图形

### drawHaloShape

**类型**：

```ts
type drawHaloShape = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => DisplayObject;
```

**说明**：绘制节点的光晕图形

### drawAnchorShapes

**类型**：

```ts
type drawAnchorShapes = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => {
  [shapeId: string]: DisplayObject;
};
```

**说明**：绘制节点的锚点图形

### drawBadgeShapes

**类型**：

```ts
type drawBadgeShapes = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => {
  [shapeId: string]: DisplayObject;
};
```

**说明**：绘制节点的徽标图形

### drawOtherShapes

**类型**：

```ts
type drawOtherShapes = (
  model: NodeDisplayModel | ComboDisplayModel,
  shapeMap: NodeShapeMap | ComboShapeMap,
) => { [id: string]: DisplayObject };
```

**说明**：绘制边的其他图形。自定义边中的其他图形应当定义和配置在 `otherShapes` 中。

### afterDraw

**类型**：

```ts
type afterDraw = (
  model: EdgeDisplayModel,
  shapeMap: { [shapeId: string]: DisplayObject },
  shapesChanged?: string[],
) => { [otherShapeId: string]: DisplayObject };
```

**说明**：绘制后执行其他绘图操作或添加自定义形状

### getMergedStyles

**类型**：

```ts
type getMergedStyles = (model: EdgeDisplayModel) => EdgeDisplayModel;
```

**说明**：将 display model 数据中定义的样式与默认样式和主题样式合并

## 成员方法

继承的图形提供下列方法调用

### upsertShape

**类型**：

```ts
type upsertShape = (
  type: SHAPE_TYPE | SHAPE_TYPE_3D,
  id: string,
  style: ShapeStyle,
  shapeMap: NodeShapeMap | ComboShapeMap,
  model: NodeDisplayModel | ComboDisplayModel,
) => DisplayObject;
```

**说明**：根据配置创建（如果在 shapeMap 中不存在）或更新形状