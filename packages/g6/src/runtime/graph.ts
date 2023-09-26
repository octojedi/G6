import EventEmitter from '@antv/event-emitter';
import {
  AABB,
  Canvas,
  DataURLType,
  DisplayObject,
  PointLike,
  Rect,
  Cursor,
} from '@antv/g';
import { GraphChange, ID } from '@antv/graphlib';
import {
  clone,
  groupBy,
  isArray,
  isEmpty,
  isEqual,
  isNil,
  isNumber,
  isObject,
  isString,
  map,
} from '@antv/util';
import { createDom } from '@antv/dom-util';
import { History } from '../stdlib/plugin/history';
import { Command } from '../stdlib/plugin/history/command';
import type {
  ComboUserModel,
  EdgeUserModel,
  GraphData,
  IGraph,
  NodeUserModel,
  Specification,
} from '../types';
import type { CameraAnimationOptions } from '../types/animate';
import type { BehaviorOptionsOf, BehaviorRegistry } from '../types/behavior';
import type { ComboDisplayModel, ComboModel } from '../types/combo';
import type { Bounds, Padding, Point } from '../types/common';
import type { DataChangeType, DataConfig, GraphCore } from '../types/data';
import type { EdgeDisplayModel, EdgeModel, EdgeModelData } from '../types/edge';
import type { StackType } from '../types/history';
import type { Hooks, ViewportChangeHookParams } from '../types/hook';
import type { ITEM_TYPE, SHAPE_TYPE, ShapeStyle } from '../types/item';
import type {
  ImmediatelyInvokedLayoutOptions,
  LayoutOptions,
  StandardLayoutOptions,
} from '../types/layout';
import type { NodeDisplayModel, NodeModel, NodeModelData } from '../types/node';
import type { RendererName } from '../types/render';
import type {
  ThemeOptionsOf,
  ThemeRegistry,
  ThemeSpecification,
} from '../types/theme';
import { FitViewRules, GraphTransformOptions } from '../types/view';
import { changeRenderer, createCanvas } from '../util/canvas';
import { formatPadding } from '../util/shape';
import { getLayoutBounds } from '../util/layout';
import { Plugin as PluginBase } from '../types/plugin';
import { ComboMapper, EdgeMapper, NodeMapper } from '../types/spec';
import {
  DataController,
  ExtensionController,
  InteractionController,
  ItemController,
  LayoutController,
  ThemeController,
  ViewportController,
} from './controller';
import { PluginController } from './controller/plugin';
import Hook from './hooks';

export default class Graph<B extends BehaviorRegistry, T extends ThemeRegistry>
  extends EventEmitter
  implements IGraph<B, T>
{
  public hooks: Hooks;
  // for nodes and edges, which will be separate into groups
  public canvas: Canvas;
  // the container dom for the graph canvas
  public container: HTMLElement;
  // the tag to indicate whether the graph instance is destroyed
  public destroyed: boolean;
  // the renderer type of current graph
  public rendererType: RendererName;
  // for transient shapes for interactions, e.g. transient node and related edges while draging, delegates
  public transientCanvas: Canvas;
  // for background shapes, e.g. grid, pipe indices
  public backgroundCanvas: Canvas;
  // the tag indicates all the three canvases are all ready
  private canvasReady: boolean;
  private specification: Specification<B, T>;

  private dataController: DataController;
  private interactionController: InteractionController;
  private layoutController: LayoutController;
  private viewportController: ViewportController;
  private itemController: ItemController;
  private extensionController: ExtensionController;
  private themeController: ThemeController;
  private pluginController: PluginController;

  private defaultSpecification = {
    theme: {
      type: 'spec',
      base: 'light',
    },
    enableStack: true,
  };

  constructor(spec: Specification<B, T>) {
    super();

    this.specification = Object.assign(
      {},
      this.defaultSpecification,
      this.formatSpecification(spec),
    );
    this.initHooks();
    this.initCanvas();
    this.initControllers();
    this.initHistory();

    this.hooks.init.emit({
      canvases: {
        background: this.backgroundCanvas,
        main: this.canvas,
        transient: this.transientCanvas,
      },
    });

    const { data } = spec;
    if (data) {
      // TODO: handle multiple type data configs
      this.read(data as GraphData);
    }
  }

  /**
   * Initialize the controllers for different plugins.
   */
  private initControllers() {
    this.dataController = new DataController(this);
    this.interactionController = new InteractionController(this);
    this.layoutController = new LayoutController(this);
    this.themeController = new ThemeController(this);
    this.itemController = new ItemController(this);
    this.viewportController = new ViewportController(this);
    this.extensionController = new ExtensionController(this);
    this.pluginController = new PluginController(this);
  }

  private initCanvas() {
    const {
      renderer,
      container,
      canvas,
      backgroundCanvas,
      transientCanvas,
      width,
      height,
    } = this.specification;

    let pixelRatio: number;
    if (renderer && !isString(renderer)) {
      // @ts-ignore
      this.rendererType = renderer.type || 'canvas';
      // @ts-ignore
      pixelRatio = renderer.pixelRatio;
    } else {
      // @ts-ignore
      this.rendererType = renderer || 'canvas';
    }

    /**
     * These 3 canvases can be passed in by users, e.g. when doing serverside rendering we can't use DOM API.
     */
    if (canvas) {
      this.canvas = canvas;
      this.backgroundCanvas = backgroundCanvas;
      this.transientCanvas = transientCanvas;
      this.container = container as HTMLDivElement;
    } else {
      const containerDOM = isString(container)
        ? document.getElementById(container as string)
        : (container as HTMLElement);

      if (!containerDOM) {
        console.error(
          `Create graph failed. The container for graph ${containerDOM} is not exist.`,
        );
        this.destroy();
        return;
      }

      this.container = containerDOM;
      const size = [width, height];
      if (size[0] === undefined) {
        size[0] = containerDOM.scrollWidth;
      }
      if (size[1] === undefined) {
        size[1] = containerDOM.scrollHeight;
      }
      this.backgroundCanvas = createCanvas(
        this.rendererType,
        containerDOM,
        size[0],
        size[1],
        pixelRatio,
      );
      this.canvas = createCanvas(
        this.rendererType,
        containerDOM,
        size[0],
        size[1],
        pixelRatio,
      );
      this.transientCanvas = createCanvas(
        this.rendererType,
        containerDOM,
        size[0],
        size[1],
        pixelRatio,
      );
    }

    Promise.all(
      [this.backgroundCanvas, this.canvas, this.transientCanvas].map(
        (canvas) => canvas.ready,
      ),
    ).then(() => {
      [this.backgroundCanvas, this.canvas, this.transientCanvas].forEach(
        (canvas, i) => {
          const $domElement = canvas
            .getContextService()
            .getDomElement() as unknown as HTMLElement;
          if ($domElement && $domElement.style) {
            $domElement.style.position = 'fixed';
            $domElement.style.outline = 'none';
            $domElement.tabIndex = 1; // Enable keyboard events
            // Transient canvas should let interactive events go through.
            if (i === 2) {
              $domElement.style.pointerEvents = 'none';
            }
          }
        },
      );

      this.canvasReady = true;
    });
  }

  private initHistory() {
    const { enableStack, stackCfg } = this.specification;
    if (enableStack) {
      const history = {
        type: 'history',
        key: 'history',
        enableStack,
        stackCfg,
      };
      if (!this.specification.plugins) {
        this.specification.plugins = [];
      }
      this.specification.plugins.push(history);
    }
  }

  /**
   * Change the renderer at runtime.
   * @param type renderer name
   * @returns
   */
  public changeRenderer(type) {
    this.rendererType = type || 'canvas';
    changeRenderer(this.rendererType, this.canvas);
  }

  /**
   * Initialize the hooks for graph's lifecycles.
   */
  private initHooks() {
    this.hooks = {
      init: new Hook<{
        canvases: {
          background: Canvas;
          main: Canvas;
          transient: Canvas;
        };
      }>({ name: 'init' }),
      datachange: new Hook<{ data: GraphData; type: DataChangeType }>({
        name: 'datachange',
      }),
      itemchange: new Hook<{
        type: ITEM_TYPE;
        changes: GraphChange<NodeModelData, EdgeModelData>[];
        graphCore: GraphCore;
        theme: ThemeSpecification;
        animate?: boolean;
        upsertAncestors?: boolean;
      }>({ name: 'itemchange' }),
      render: new Hook<{
        graphCore: GraphCore;
        theme: ThemeSpecification;
        transientCanvas: Canvas;
      }>({
        name: 'render',
      }),
      layout: new Hook<{
        graphCore: GraphCore;
        options?: LayoutOptions;
        animate?: boolean;
      }>({ name: 'layout' }),
      viewportchange: new Hook<ViewportChangeHookParams>({ name: 'viewport' }),
      modechange: new Hook<{ mode: string }>({ name: 'modechange' }),
      behaviorchange: new Hook<{
        action: 'update' | 'add' | 'remove';
        modes: string[];
        behaviors: (string | BehaviorOptionsOf<{}>)[];
      }>({ name: 'behaviorchange' }),
      itemstatechange: new Hook<{
        ids: ID[];
        states?: string[];
        value?: boolean;
      }>({
        name: 'itemstatechange',
      }),
      itemvisibilitychange: new Hook<{ ids: ID[]; value: boolean }>({
        name: 'itemvisibilitychange',
      }),
      itemzindexchange: new Hook<{
        ids: ID[];
        action: 'front' | 'back';
        graphCore: GraphCore;
      }>({
        name: 'itemzindexchange',
      }),
      transientupdate: new Hook<{
        type: ITEM_TYPE | SHAPE_TYPE;
        id: ID;
        config: {
          style: ShapeStyle;
          action: 'remove' | 'add' | 'update' | undefined;
        };
        canvas: Canvas;
        graphCore: GraphCore;
      }>({ name: 'transientupdate' }),
      pluginchange: new Hook<{
        action: 'update' | 'add' | 'remove';
        plugins: (
          | string
          | { key: string; type: string; [cfgName: string]: unknown }
        )[];
      }>({ name: 'pluginchange' }),
      themechange: new Hook<{
        theme: ThemeSpecification;
        canvases: {
          background: Canvas;
          main: Canvas;
          transient: Canvas;
        };
      }>({ name: 'themechange' }),
      mapperchange: new Hook<{
        type: ITEM_TYPE;
        mapper: NodeMapper | EdgeMapper | ComboMapper;
      }>({ name: 'mapperchange' }),
      treecollapseexpand: new Hook<{
        ids: ID[];
        animate: boolean;
        action: 'collapse' | 'expand';
        graphCore: GraphCore;
      }>({ name: 'treecollapseexpand' }),
      destroy: new Hook<{}>({ name: 'destroy' }),
    };
  }

  private formatSpecification(spec: Specification<B, T>) {
    return {
      ...this.specification,
      ...spec,
      optimize: {
        tileBehavior: 2000,
        tileBehaviorSize: 1000,
        tileFirstRender: 10000,
        tileFirstRenderSize: 1000,
        ...this.specification?.optimize,
        ...spec.optimize,
      },
    };
  }

  /**
   * Update the specs(configurations).
   */
  public updateSpecification(spec: Specification<B, T>): Specification<B, T> {
    const newSpec = Object.assign(
      this.specification,
      this.formatSpecification(spec),
    );
    // TODO: update something
    return newSpec;
  }
  /**
   * Update the theme specs (configurations).
   */
  public updateTheme(theme: ThemeOptionsOf<T>) {
    this.specification.theme = theme;
    // const { specification } = this.themeController;
    // notifiying the themeController
    this.hooks.themechange.emit({
      canvases: {
        background: this.backgroundCanvas,
        main: this.canvas,
        transient: this.transientCanvas,
      },
    });
    // theme is formatted by themeController, notify the item controller to update the items
    this.hooks.themechange.emit({
      theme: this.themeController.specification,
    });
  }

  /**
   * Update the item display mapper for a specific item type.
   * @param {ITEM_TYPE} type - The type of item (node, edge, or combo).
   * @param {NodeMapper | EdgeMapper | ComboMapper} mapper - The mapper to be updated.
   * */
  public updateMapper(
    type: ITEM_TYPE,
    mapper: NodeMapper | EdgeMapper | ComboMapper,
  ) {
    switch (type) {
      case 'node':
        this.specification.node = mapper as NodeMapper;
        break;
      case 'edge':
        this.specification.edge = mapper as EdgeMapper;
        break;
      case 'combo':
        this.specification.combo = mapper as ComboMapper;
        break;
    }
    this.hooks.mapperchange.emit({
      type,
      mapper,
    });
  }

  /**
   * Get the copy of specs(configurations).
   * @returns graph specs
   */
  public getSpecification(): Specification<B, T> {
    return this.specification;
  }

  /**
   * Input data and render the graph.
   * If there is old data, diffs and changes it.
   * @param data
   * @returns
   * @group Data
   */
  public async read(data: DataConfig) {
    const { tileFirstRender, tileFirstRenderSize } =
      this.specification.optimize || {};
    this.hooks.datachange.emit({ data, type: 'replace' });
    const emitRender = async () => {
      await this.hooks.render.emitLinearAsync({
        graphCore: this.dataController.graphCore,
        theme: this.themeController.specification,
        transientCanvas: this.transientCanvas,
        tileOptimize: {
          tileFirstRender,
          tileFirstRenderSize,
        },
      });
      this.emit('afterrender');

      this.once('afterlayout', async () => {
        const { autoFit } = this.specification;
        if (autoFit) {
          if (autoFit === 'view') {
            await this.fitView({ rules: { boundsType: 'layout' } });
          } else if (autoFit === 'center') {
            await this.fitCenter('layout');
          } else {
            const { type, effectTiming, ...others } = autoFit;
            if (type === 'view') {
              const { padding, rules } = others as {
                padding: Padding;
                rules: FitViewRules;
              };
              await this.fitView(
                {
                  padding,
                  rules: {
                    ...rules,
                    boundsType: 'layout',
                  },
                },
                effectTiming,
              );
            } else if (type === 'center') {
              await this.fitCenter('layout', effectTiming);
            } else if (type === 'position') {
              // TODO: align
              await this.translateTo((others as any).position, effectTiming);
            }
          }
        }
      });
      await this.layout();
    };
    if (this.canvasReady) {
      await emitRender();
    } else {
      await Promise.all(
        [this.backgroundCanvas, this.canvas, this.transientCanvas].map(
          (canvas) => canvas.ready,
        ),
      );
      await emitRender();
    }
  }

  /**
   * Change graph data.
   * @param data new data
   * @param type the way to change data, 'replace' means discard the old data and use the new one; 'mergeReplace' means merge the common part, remove (old - new), add (new - old)
   * @returns
   * @group Data
   */
  public async changeData(
    data: DataConfig,
    type: 'replace' | 'mergeReplace' = 'mergeReplace',
  ) {
    const { tileFirstRender, tileFirstRenderSize } =
      this.specification.optimize || {};
    this.hooks.datachange.emit({ data, type });
    this.hooks.render.emit({
      graphCore: this.dataController.graphCore,
      theme: this.themeController.specification,
      transientCanvas: this.transientCanvas,
      tileOptimize: {
        tileFirstRender,
        tileFirstRenderSize,
      },
    });
    this.emit('afterrender');

    await this.layout();
  }

  /**
   * Clear the graph, means remove all the items on the graph.
   * @returns
   */
  public clear() {
    this.startHistoryBatch();
    this.removeData(
      'edge',
      this.getAllEdgesData().map((edge) => edge.id),
    );
    this.removeData(
      'node',
      this.getAllNodesData().map((node) => node.id),
    );
    this.removeData(
      'combo',
      this.getAllCombosData().map((combo) => combo.id),
    );
    this.stopHistoryBatch();
  }

  public getViewportCenter(): PointLike {
    const { width, height } = this.canvas.getConfig();
    return { x: width! / 2, y: height! / 2 };
  }
  public async transform(
    options: GraphTransformOptions,
    effectTiming?: CameraAnimationOptions,
  ): Promise<void> {
    const { tileLodSize } = this.specification.optimize || {};
    await this.hooks.viewportchange.emitLinearAsync({
      transform: options,
      effectTiming,
      tileLodSize,
    });
    this.emit('viewportchange', options);
  }

  /**
   * Stop the current transition of transform immediately.
   */
  public stopTransformTransition() {
    this.canvas.getCamera().cancelLandmarkAnimation();
  }

  /**
   * Move the graph with a relative distance under viewport coordinates.
   * @param dx x of the relative distance
   * @param dy y of the relative distance
   * @param effectTiming animation configurations
   */
  public async translate(
    distance: Partial<{
      dx: number;
      dy: number;
      dz: number;
    }>,
    effectTiming?: CameraAnimationOptions,
  ) {
    await this.transform(
      {
        translate: distance,
      },
      effectTiming,
    );
  }

  /**
   * Move the graph to destination under viewport coordinates.
   * @param destination destination under viewport coordinates.
   * @param effectTiming animation configurations
   */
  public async translateTo(
    { x, y }: Point,
    effectTiming?: CameraAnimationOptions,
  ) {
    const { x: cx, y: cy } = this.getViewportCenter();
    await this.translate({ dx: cx - x, dy: cy - y }, effectTiming);
  }

  /**
   * Zoom the graph with a relative ratio.
   * @param ratio relative ratio to zoom
   * @param origin origin under viewport coordinates.
   * @param effectTiming animation configurations
   */
  public async zoom(
    ratio: number,
    origin?: Point,
    effectTiming?: CameraAnimationOptions,
  ) {
    await this.transform(
      {
        zoom: {
          ratio,
        },
        origin,
      },
      effectTiming,
    );
  }

  /**
   * Zoom the graph to a specified ratio.
   * @param zoom specified ratio
   * @param origin zoom center
   * @param effectTiming animation configurations
   */
  public async zoomTo(
    zoom: number,
    origin?: PointLike,
    effectTiming?: CameraAnimationOptions,
  ) {
    await this.zoom(
      zoom / this.canvas.getCamera().getZoom(),
      origin,
      effectTiming,
    );
  }

  /**
   * Return the current zoom level of camera.
   * @returns current zoom
   */
  public getZoom() {
    return this.canvas.getCamera().getZoom();
  }

  /**
   * Rotate the graph with a relative angle.
   * @param angle
   * @param origin
   * @param effectTiming
   */
  public async rotate(
    angle: number,
    origin?: PointLike,
    effectTiming?: CameraAnimationOptions,
  ) {
    await this.transform(
      {
        rotate: {
          angle,
        },
        origin,
      },
      effectTiming,
    );
  }

  /**
   * Rotate the graph to an absolute angle.
   * @param angle
   * @param origin
   * @param effectTiming
   */
  public async rotateTo(
    angle: number,
    origin?: PointLike,
    effectTiming?: CameraAnimationOptions,
  ) {
    await this.rotate(
      angle - this.canvas.getCamera().getRoll(),
      origin,
      effectTiming,
    );
  }

  /**
   * Fit the graph content to the view.
   * @param options.padding padding while fitting
   * @param options.rules rules for fitting
   * @param effectTiming animation configurations
   */
  public async fitView(
    options?: {
      padding?: Padding;
      rules?: FitViewRules;
    },
    effectTiming?: CameraAnimationOptions,
  ) {
    const { padding, rules } = options || {};
    const [top, right, bottom, left] = padding
      ? formatPadding(padding)
      : [0, 0, 0, 0];
    const {
      direction = 'both',
      ratioRule = 'min',
      boundsType = 'render',
    } = rules || {};

    const {
      center: [graphCenterX, graphCenterY],
      halfExtents,
    } =
      boundsType === 'render'
        ? // Get the bounds of the whole graph content.
          this.canvas.document.documentElement.getBounds()
        : // Get the bounds of the nodes positions while the graph content is not ready.
          getLayoutBounds(this);
    const origin = this.canvas.canvas2Viewport({
      x: graphCenterX,
      y: graphCenterY,
    });
    const { width: viewportWidth, height: viewportHeight } =
      this.canvas.getConfig();

    const graphWidth = halfExtents[0] * 2;
    const graphHeight = halfExtents[1] * 2;
    const tlInCanvas = this.canvas.viewport2Canvas({ x: left, y: top });
    const brInCanvas = this.canvas.viewport2Canvas({
      x: viewportWidth! - right,
      y: viewportHeight! - bottom,
    });

    const targetViewWidth = brInCanvas.x - tlInCanvas.x;
    const targetViewHeight = brInCanvas.y - tlInCanvas.y;

    const wRatio = targetViewWidth / graphWidth;
    const hRatio = targetViewHeight / graphHeight;

    let ratio: number;
    if (direction === 'x') {
      ratio = wRatio;
    } else if (direction === 'y') {
      ratio = hRatio;
    } else {
      ratio =
        ratioRule === 'max'
          ? Math.max(wRatio, hRatio)
          : Math.min(wRatio, hRatio);
    }

    await this.transform(
      {
        translate: {
          dx: viewportWidth! / 2 - origin.x,
          dy: viewportHeight! / 2 - origin.y,
        },
        zoom: {
          ratio,
        },
      },
      effectTiming,
    );
  }
  /**
   * Fit the graph center to the view center.
   * @param effectTiming animation configurations
   */
  public async fitCenter(
    boundsType: 'render' | 'layout' = 'render',
    effectTiming?: CameraAnimationOptions,
  ) {
    const {
      center: [graphCenterX, graphCenterY],
    } =
      boundsType === 'render'
        ? // Get the bounds of the whole graph content.
          this.canvas.document.documentElement.getBounds()
        : // Get the bounds of the nodes positions while the graph content is not ready.
          getLayoutBounds(this);
    await this.translateTo(
      this.canvas.canvas2Viewport({ x: graphCenterX, y: graphCenterY }),
      effectTiming,
    );
  }
  /**
   * Move the graph to make the item align the view center.
   * @param item node/edge/combo item or its id
   * @param effectTiming animation configurations
   */
  public async focusItem(id: ID | ID[], effectTiming?: CameraAnimationOptions) {
    let bounds: AABB | null = null;
    for (const itemId of !isArray(id) ? [id] : id) {
      const item = this.getItemById(itemId);
      if (item) {
        const itemBounds = item.group.getBounds();
        if (!bounds) {
          bounds = itemBounds;
        } else {
          bounds.add(itemBounds);
        }
      }
    }

    if (bounds) {
      const {
        center: [itemCenterX, itemCenterY],
      } = bounds;
      await this.translateTo(
        this.canvas.canvas2Viewport({ x: itemCenterX, y: itemCenterY }),
        effectTiming,
      );
    }
  }

  /**
   * Get item by id. We don't want to
   * @param id
   * @returns Node | Edge | Combo
   */
  private getItemById(id: ID) {
    return this.itemController.getItemById(id);
  }

  /**
   * Get the size of the graph canvas.
   * @returns [width, height]
   * @group View
   */
  public getSize(): number[] {
    const { width = 500, height = 500 } = this.specification;
    return [width, height];
  }

  /**
   * Set the size for the graph canvas.
   * @param number[] [width, height]
   * @group View
   */
  public setSize(size: number[]) {
    if (!isArray(size) || size.length < 2) {
      console.warn(
        `Failed to setSize. The parameter size: ${size} is invalid. It must be an array with 2 number elements.`,
      );
      return;
    }
    this.specification.width = size[0];
    this.specification.height = size[1];
    this.canvas.resize(size[0], size[1]);
  }

  public getCanvasRange(): Bounds {
    const [width, height] = this.getSize();
    const leftTop = this.getCanvasByViewport({ x: 0, y: 0 });
    const rightBottom = this.getCanvasByViewport({ x: width, y: height });
    return {
      min: [leftTop.x, leftTop.y, leftTop.z],
      max: [rightBottom.x, rightBottom.y, rightBottom.z],
      center: [
        (leftTop.x + rightBottom.x) / 2,
        (leftTop.y + rightBottom.y) / 2,
        (leftTop.z + rightBottom.z) / 2,
      ],
      halfExtents: [
        (rightBottom.x - leftTop.x) / 2,
        (rightBottom.y - leftTop.y) / 2,
        (rightBottom.z - leftTop.z) / 2,
      ],
    };
  }

  /**
   * Get the rendering coordinate according to the canvas dom (viewport) coordinate.
   * @param Point rendering coordinate
   * @returns canvas dom (viewport) coordinate
   * @group View
   */
  public getCanvasByViewport(viewportPoint: Point): Point {
    return this.canvas.viewport2Canvas(viewportPoint);
  }

  /**
   * Get the canvas dom (viewport) coordinate according to the rendering coordinate.
   * @param Point canvas dom (viewport) coordinate
   * @returns rendering coordinate
   * @group View
   */
  public getViewportByCanvas(canvasPoint: Point): Point {
    return this.canvas.canvas2Viewport(canvasPoint);
  }

  /**
   * Get the browser coordinate according to the rendering coordinate.
   * @param Point rendering coordinate
   * @returns browser coordinate
   * @group View
   */
  public getClientByCanvas(canvasPoint: Point): Point {
    const viewportPoint = this.canvas.canvas2Viewport(canvasPoint);
    return this.canvas.viewport2Client(viewportPoint as any);
  }

  /**
   * Get the rendering coordinate according to the browser coordinate.
   * @param Point browser coordinate
   * @returns rendering coordinate
   * @group View
   */
  public getCanvasByClient(clientPoint: Point): Point {
    const viewportPoint = this.canvas.client2Viewport(clientPoint);
    return this.canvas.viewport2Canvas(viewportPoint as any);
  }

  // ===== item operations =====
  /**
   * Find a node's inner data according to id or function.
   * @param { ID | Function } condition id or condition function
   * @returns result node's inner data
   * @group Data
   */
  public getNodeData(condition: ID | Function): NodeModel | undefined {
    const conds =
      isString(condition) || isNumber(condition) ? [condition] : condition;
    return this.dataController.findData('node', conds)?.[0] as NodeModel;
  }
  /**
   * Find an edge's inner data according to id or function.
   * @param { ID | Function } condition id or condition function
   * @returns result edge's inner data
   * @group Data
   */
  public getEdgeData(condition: ID | Function): EdgeModel | undefined {
    const conds =
      isString(condition) || isNumber(condition) || isNumber(condition)
        ? [condition]
        : condition;
    return this.dataController.findData('edge', conds)?.[0] as EdgeModel;
  }
  /**
   * Find an combo's inner data according to id or function.
   * @param { ID | Function } condition id or condition function
   * @returns result combo's inner data
   * @group Data
   */
  public getComboData(condition: ID | Function): ComboModel | undefined {
    const conds =
      isString(condition) || isNumber(condition) ? [condition] : condition;
    return this.dataController.findData('combo', conds)?.[0] as ComboModel;
  }
  /**
   * Get all the nodes' inner data
   * @returns all nodes' inner data on the graph
   * @group Data
   */
  public getAllNodesData(): NodeModel[] {
    return this.dataController.findAllData('node') as NodeModel[];
  }
  /**
   * Get all the edges' inner data
   * @returns all edges' inner data on the graph
   * @group Data
   */
  public getAllEdgesData(): EdgeModel[] {
    return this.dataController.findAllData('edge') as EdgeModel[];
  }
  /**
   * Get all the combos' inner data
   * @returns all combos' inner data on the graph
   * @group Data
   */
  public getAllCombosData(): ComboModel[] {
    return this.dataController.findAllData('combo') as ComboModel[];
  }
  /**
   * Get one-hop edge ids from a start node.
   * @param nodeId id of the start node
   * @returns one-hop edges' data array
   * @group Data
   */
  public getRelatedEdgesData(
    nodeId: ID,
    direction: 'in' | 'out' | 'both' = 'both',
  ): EdgeModel[] {
    return this.dataController.findRelatedEdges(nodeId, direction);
  }
  /**
   * Get one-hop node ids from a start node.
   * @param nodeId id of the start node
   * @returns one-hop nodes' data array
   * @group Data
   */
  public getNeighborNodesData(
    nodeId: ID,
    direction: 'in' | 'out' | 'both' = 'both',
  ): NodeModel[] {
    return this.dataController.findNeighborNodes(nodeId, direction);
  }
  /**
   * Get the children's data of a combo.
   * @param comboId combo id
   * @returns children's data array
   * @group Data
   */
  public getComboChildrenData(comboId: ID): (ComboModel | NodeModel)[] {
    return this.dataController.findChildren(comboId, 'combo');
  }

  /*
   * Get the display model of a node / edge / combo.
   * @param id item id
   * @returns display model
   * @group Data
   */
  protected getDisplayModel(
    id: ID,
  ): NodeDisplayModel | EdgeDisplayModel | ComboDisplayModel {
    return this.itemController.findDisplayModel(id);
  }

  /**
   * Retrieve the nearby edges for a given node using quadtree collision detection.
   * @param nodeId node id
   * @group Data
   */
  public getNearEdgesForNode(nodeId: ID): EdgeModel[] {
    const { graphCore } = this.dataController;
    return this.itemController.findNearEdgesByNode(nodeId, graphCore);
  }

  /**
   * Find items which has the state.
   * @param itemType item type
   * @param state state name
   * @param additionalFilter additional filter function
   * @returns items that is the type and has the state
   * @group Item
   */
  public findIdByState(
    itemType: ITEM_TYPE,
    state: string,
    value: string | boolean = true,
    additionalFilter?: (item: NodeModel | EdgeModel | ComboModel) => boolean,
  ): ID[] {
    let ids = this.itemController.findIdByState(itemType, state, value);
    if (additionalFilter) {
      let getDataFunc: any = this.getEdgeData;
      if (itemType === 'node') getDataFunc = this.getNodeData;
      else if (itemType === 'combo') getDataFunc = this.getComboData;
      ids = ids.filter((id) => additionalFilter(getDataFunc(id)));
    }
    return ids;
  }
  /**
   * Add one or more node/edge/combo data to the graph.
   * @param itemType item type
   * @param model user data
   * @returns whether success
   * @group Data
   */
  public addData(
    itemType: ITEM_TYPE,
    models:
      | NodeUserModel
      | EdgeUserModel
      | ComboUserModel
      | NodeUserModel[]
      | EdgeUserModel[]
      | ComboUserModel[],
  ):
    | NodeModel
    | EdgeModel
    | ComboModel
    | NodeModel[]
    | EdgeModel[]
    | ComboModel[] {
    // data controller and item controller subscribe additem in order

    const { graphCore } = this.dataController;
    const { specification } = this.themeController;
    graphCore.once('changed', (event) => {
      if (!event.changes.length) return;
      const changes = event.changes;
      const timingParameters = {
        type: itemType,
        action: 'add',
        models,
        apiName: 'addData',
        changes,
      };
      this.emit('beforeitemchange', timingParameters);
      this.hooks.itemchange.emit({
        type: itemType,
        changes: graphCore.reduceChanges(event.changes),
        graphCore,
        theme: specification,
      });
      this.emit('afteritemchange', timingParameters);
    });

    const modelArr = isArray(models) ? models : [models];
    const data = { nodes: [], edges: [], combos: [] };
    data[`${itemType}s`] = modelArr;
    this.hooks.datachange.emit({
      data,
      type: 'union',
    });
    const dataList = this.dataController.findData(
      itemType,
      modelArr.map((model) => model.id),
    );
    return isArray(models) ? dataList : dataList[0];
  }
  /**
   * Remove one or more node/edge/combo data from the graph.
   * @param item the item to be removed
   * @returns whether success
   * @group Data
   */
  public removeData(itemType: ITEM_TYPE, ids: ID | ID[]) {
    const idArr = isArray(ids) ? ids : [ids];
    const data = { nodes: [], edges: [], combos: [] };
    const { graphCore } = this.dataController;
    const { specification } = this.themeController;
    const getItem = itemType === 'edge' ? graphCore.getEdge : graphCore.getNode;
    const hasItem = itemType === 'edge' ? graphCore.hasEdge : graphCore.hasNode;
    data[`${itemType}s`] = idArr
      .map((id) => {
        if (!hasItem.bind(graphCore)(id)) {
          console.warn(
            `The ${itemType} data with id ${id} does not exist. It will be ignored`,
          );
          return;
        }
        return getItem.bind(graphCore)(id);
      })
      .filter(Boolean);
    graphCore.once('changed', (event) => {
      if (!event.changes.length) return;
      const changes = event.changes;
      const timingParameters = {
        type: itemType,
        action: 'remove',
        ids: idArr,
        apiName: 'removeData',
        changes,
      };
      this.emit('beforeitemchange', timingParameters);
      this.hooks.itemchange.emit({
        type: itemType,
        changes: event.changes,
        graphCore,
        theme: specification,
      });
      this.emit('afteritemchange', timingParameters);
    });
    this.hooks.datachange.emit({
      data,
      type: 'remove',
    });
  }
  /**
   * Extends the fields of oldValue and newValue
   * to make sure they both contain the union set of their original fields.
   * The missing fields' values are filled using data from displayModel data.
   * @param changes
   * @returns
   */
  private extendChanges(changes) {
    return changes
      .map((change) => {
        const { id, propertyName, oldValue, newValue } = change;
        if (!oldValue || !newValue) return change;
        if (propertyName) {
          if (oldValue !== newValue) return change;
          return false;
        }

        const displayData = this.getItemById(id).displayModel.data;
        const oldFields = Object.keys(oldValue);
        const newFields = Object.keys(newValue);
        const commonFields = [...new Set([...oldFields, ...newFields])];

        commonFields.forEach((field) => {
          if (!Object.prototype.hasOwnProperty.call(oldValue, field)) {
            oldValue[field] = displayData[field];
          }
          if (!Object.prototype.hasOwnProperty.call(newValue, field)) {
            newValue[field] = displayData[field];
          }
        });

        if (
          (oldValue.x === undefined || Number.isNaN(oldValue.x)) &&
          !oldValue._isCombo
        )
          oldValue.x = 0;
        if (
          (oldValue.y === undefined || Number.isNaN(oldValue.x)) &&
          !oldValue._isCombo
        )
          oldValue.y = 0;
        if (Number.isNaN(newValue.x)) delete newValue.x;
        if (Number.isNaN(newValue.y)) delete newValue.y;

        if (isEqual(newValue, oldValue)) return false;

        return {
          ...change,
          newValue,
          oldValue,
        };
      })
      .filter(Boolean);
  }
  /**
   * Update one or more node/edge/combo data on the graph.
   * @param {ITEM_TYPE} itemType 'node' | 'edge' | 'combo'
   * @param models new configurations for every node/edge/combo, which has id field to indicate the specific item
   * @group Data
   */
  public updateData(
    itemType: ITEM_TYPE,
    models:
      | Partial<NodeUserModel>
      | Partial<EdgeUserModel>
      | Partial<
          | ComboUserModel
          | Partial<NodeUserModel>[]
          | Partial<EdgeUserModel>[]
          | Partial<ComboUserModel>[]
        >,
  ):
    | NodeModel
    | EdgeModel
    | ComboModel
    | NodeModel[]
    | EdgeModel[]
    | ComboModel[] {
    const modelArr = isArray(models) ? models : [models];
    const data = { nodes: [], edges: [], combos: [] };
    data[`${itemType}s`] = modelArr;

    const { graphCore } = this.dataController;
    const { specification } = this.themeController;
    graphCore.once('changed', (event) => {
      const changes = this.extendChanges(clone(event.changes));
      const timingParameters = {
        type: itemType,
        action: 'update',
        models,
        apiName: 'updateData',
        changes,
      };
      this.emit('beforeitemchange', timingParameters);
      this.hooks.itemchange.emit({
        type: itemType,
        changes: event.changes,
        graphCore,
        theme: specification,
      });
      this.emit('afteritemchange', timingParameters);
    });

    this.hooks.datachange.emit({
      data,
      type: 'update',
    });
    const dataList = this.dataController.findData(
      itemType,
      modelArr.map((model) => model.id),
    );
    return isArray(models) ? dataList : dataList[0];
  }

  /**
   * Update one or more nodes' positions,
   * do not update other styles which leads to better performance than updating positions by updateData.
   * @param models new configurations with x and y for every node, which has id field to indicate the specific item
   * @group Data
   */
  public updateNodePosition(
    models:
      | Partial<NodeUserModel>
      | Partial<
          ComboUserModel | Partial<NodeUserModel>[] | Partial<ComboUserModel>[]
        >,
    upsertAncestors?: boolean,
    disableAnimate = false,
    callback?: (
      model: NodeModel | EdgeModel | ComboModel,
      canceled?: boolean,
    ) => void,
    stack?: boolean,
  ) {
    return this.updatePosition(
      'node',
      models,
      upsertAncestors,
      disableAnimate,
      callback,
      stack,
    );
  }

  /**
   * Update one or more combos' positions,
   * do not update other styles which leads to better performance than updating positions by updateData.
   * In fact, it changes the succeed nodes positions to affect the combo's position, but not modify the combo's position directly.
   * @param models new configurations with x and y for every combo, which has id field to indicate the specific item
   * @group Data
   */
  public updateComboPosition(
    models:
      | Partial<NodeUserModel>
      | Partial<
          ComboUserModel | Partial<NodeUserModel>[] | Partial<ComboUserModel>[]
        >,
    upsertAncestors?: boolean,
    disableAnimate = false,
    callback?: (model: NodeModel | EdgeModel | ComboModel) => void,
    stack?: boolean,
  ) {
    return this.updatePosition(
      'combo',
      models,
      upsertAncestors,
      disableAnimate,
      callback,
      stack,
    );
  }

  /**
   * Get history plugin instance
   */
  private getHistoryPlugin(): History {
    if (
      !this.specification.enableStack ||
      !this.pluginController.hasPlugin('history')
    ) {
      console.error('The history plugin is not loaded or initialized.');
      return;
    }
    return this.pluginController.getPlugin('history') as History;
  }

  private updatePosition(
    type: 'node' | 'combo',
    models:
      | Partial<NodeUserModel>
      | Partial<
          ComboUserModel | Partial<NodeUserModel>[] | Partial<ComboUserModel>[]
        >,
    upsertAncestors?: boolean,
    disableAnimate = false,
    callback?: (
      model: NodeModel | EdgeModel | ComboModel,
      canceled?: boolean,
    ) => void,
    stack?: boolean,
  ) {
    const modelArr = isArray(models) ? models : [models];
    const { graphCore } = this.dataController;
    const { specification } = this.themeController;
    graphCore.once('changed', (event) => {
      if (!event.changes.length) return;
      const changes = event.changes.filter(
        (change) => !isEqual(change.newValue, change.oldValue),
      );
      const timingParameters = {
        type,
        action: 'updatePosition',
        upsertAncestors,
        models,
        apiName: 'updatePosition',
        changes,
      };
      this.emit('beforeitemchange', timingParameters);
      this.hooks.itemchange.emit({
        type,
        changes: event.changes,
        graphCore,
        theme: specification,
        upsertAncestors,
        action: 'updatePosition',
        animate: !disableAnimate,
        callback,
      });
      this.emit('afteritemchange', timingParameters);
    });

    this.hooks.datachange.emit({
      data: {
        nodes: type === 'node' ? (modelArr as NodeUserModel[]) : [],
        edges: [],
        combos: type === 'combo' ? (modelArr as ComboUserModel[]) : [],
      },
      type: 'update',
    });
    const dataList = this.dataController.findData(
      type,
      modelArr.map((model) => model.id),
    );
    return isArray(models) ? dataList : dataList[0];
  }

  private getItemPreviousVisibility(ids: ID[]) {
    const objs = ids.map((id) => ({ id, visible: this.getItemVisible(id) }));
    const groupedByVisible = groupBy(objs, 'visible');

    const values = [];
    for (const visible in groupedByVisible) {
      values.push({
        ids: map(groupedByVisible[visible], (item) => item.id),
        visible: visible === 'true',
      });
    }
    return values;
  }

  /**
   * Show the item(s).
   * @param item the item to be shown
   * @returns
   * @group Item
   */
  public showItem(ids: ID | ID[], disableAnimate = false) {
    const idArr = isArray(ids) ? ids : [ids];
    if (isEmpty(idArr)) return;
    const changes = {
      newValue: [{ ids: idArr, visible: true }],
      oldValue: this.getItemPreviousVisibility(idArr),
    };
    this.hooks.itemvisibilitychange.emit({
      ids: idArr as ID[],
      value: true,
      graphCore: this.dataController.graphCore,
      animate: !disableAnimate,
    });
    this.emit('afteritemvisibilitychange', {
      ids,
      value: true,
      animate: !disableAnimate,
      action: 'updateVisibility',
      apiName: 'showItem',
      changes,
    });
  }
  /**
   * Hide the item(s).
   * @param item the item to be hidden
   * @returns
   * @group Item
   */
  public hideItem(
    ids: ID | ID[],
    disableAnimate = false,
    keepKeyShape = false,
  ) {
    const idArr = isArray(ids) ? ids : [ids];
    if (isEmpty(idArr)) return;
    const changes = {
      newValue: [{ ids: idArr, visible: false }],
      oldValue: this.getItemPreviousVisibility(idArr),
    };
    this.hooks.itemvisibilitychange.emit({
      ids: idArr as ID[],
      value: false,
      graphCore: this.dataController.graphCore,
      animate: !disableAnimate,
      keepKeyShape,
    });
    this.emit('afteritemvisibilitychange', {
      ids,
      value: false,
      animate: !disableAnimate,
      action: 'updateVisibility',
      apiName: 'hideItem',
      keepKeyShape,
      changes,
    });
  }

  /**
   * Make the item(s) to the front.
   * @param ids
   * @returns
   * @group Item
   */
  public frontItem(ids: ID | ID[]) {
    const idArr = isArray(ids) ? ids : [ids];
    this.hooks.itemzindexchange.emit({
      ids: idArr as ID[],
      action: 'front',
      graphCore: this.dataController.graphCore,
    });
    this.emit('afteritemzindexchange', {
      ids: idArr,
      action: 'front',
      apiName: 'frontItem',
    });
  }
  /**
   * Make the item(s) to the back.
   * @param ids
   * @returns
   * @group Item
   */
  public backItem(ids: ID | ID[]) {
    const idArr = isArray(ids) ? ids : [ids];
    this.hooks.itemzindexchange.emit({
      ids: idArr as ID[],
      action: 'back',
      graphCore: this.dataController.graphCore,
    });
    this.emit('afteritemzindexchange', {
      ids: idArr,
      action: 'back',
      apiName: 'backItem',
    });
  }

  private getItemPreviousStates(stateOption: {
    ids: ID | ID[];
    states: string | string[];
    value: boolean;
  }) {
    const { ids, states } = stateOption;
    const idArr = Array.isArray(ids) ? ids : [ids];
    const stateArr = Array.isArray(states) ? states : [states];
    if (isEmpty(idArr)) return;
    return idArr.flatMap((id) => {
      return stateArr.map((state) => ({
        ids: id,
        states: state,
        value: this.getItemState(id, state),
      }));
    });
  }
  /**
   * Set state for the item.
   * @param item the item to be set
   * @param state the state name
   * @param value state value
   * @returns
   * @group Item
   */
  public setItemState(
    ids: ID | ID[],
    states: string | string[],
    value: boolean,
  ) {
    const idArr = isArray(ids) ? ids : [ids];
    const stateArr = isArray(states) ? states : [states];
    const stateOption = { ids: idArr, states: stateArr, value };
    const changes = {
      newValue: [stateOption],
      oldValue: this.getItemPreviousStates(stateOption),
    };
    this.hooks.itemstatechange.emit({
      ids: idArr as ID[],
      states: stateArr as string[],
      value,
    });
    this.emit('afteritemstatechange', {
      ids,
      states,
      value,
      action: 'updateState',
      apiName: 'setItemState',
      changes,
    });
  }
  /**
   * Get the state value for an item.
   * @param id the id for the item
   * @param states the state name
   * @returns {boolean} the state value
   * @group Item
   */
  public getItemState(id: ID, state: string) {
    return this.itemController.getItemState(id, state);
  }

  /**
   * Get all the state names with value true for an item.
   * @param id the id for the item
   * @returns {string[]} the state names with value true
   * @group Item
   */
  public getItemAllStates(id: ID): string[] {
    return this.itemController.getItemAllStates(id);
  }

  /**
   * Clear all the states for item(s).
   * @param ids the id(s) for the item(s) to be clear
   * @param states the states' names, all the states wil be cleared if states is not assigned
   * @returns
   * @group Item
   */
  public clearItemState(ids: ID | ID[], states?: string[]) {
    const idArr = isArray(ids) ? ids : [ids];
    const stateOptions = { ids: idArr, states, value: false };
    const changes = {
      newValue: [stateOptions],
      oldValue: this.getItemPreviousStates(stateOptions),
    };
    this.hooks.itemstatechange.emit({
      ids: idArr as ID[],
      states,
      value: false,
    });
    this.emit('afteritemstatechange', {
      ids,
      states,
      value: false,
      action: 'updateState',
      apiName: 'clearItemState',
      changes,
    });
  }

  /**
   * Get the rendering bbox for a node / edge / combo, or the graph (when the id is not assigned).
   * @param id the id for the node / edge / combo, undefined for the whole graph
   * @returns rendering bounding box. returns false if the item is not exist
   * @group Item
   */
  public getRenderBBox(
    id: ID | undefined,
    onlyKeyShape = false,
    isTransient = false,
  ): AABB | false {
    if (!id) return this.canvas.getRoot().getRenderBounds();
    return this.itemController.getItemBBox(id, onlyKeyShape, isTransient);
  }

  /**
   * Get the visibility for a node / edge / combo.
   * @param id the id for the node / edge / combo
   * @returns visibility for the item, false for invisible or unexistence for the item
   * @group Item
   */
  public getItemVisible(id: ID) {
    return this.itemController.getItemVisible(id);
  }

  // ===== combo operations =====

  /**
   * Add a new combo to the graph, and update the structure of the existed child in childrenIds to be the children of the new combo.
   * Different from addData with combo type, this API update the succeeds' combo tree strucutres in the same time.
   * @param model combo user data
   * @returns whether success
   * @group Combo
   */
  public addCombo(model: ComboUserModel, childrenIds: ID[]): ComboModel {
    const { graphCore } = this.dataController;
    const { specification } = this.themeController;
    graphCore.once('changed', (event) => {
      if (!event.changes.length) return;
      const changes = event.changes;
      const timingParameters = {
        type: 'combo',
        action: 'add',
        models: [model],
        apiName: 'addCombo',
        changes,
      };
      this.emit('beforeitemchange', timingParameters);
      this.hooks.itemchange.emit({
        type: 'combo',
        changes: graphCore.reduceChanges(event.changes),
        graphCore,
        theme: specification,
      });
      this.emit('afteritemchange', timingParameters);
    });

    const data = {
      nodes: [],
      edges: [],
      combos: [
        {
          ...model,
          data: {
            ...model.data,
            _children: childrenIds,
          },
        },
      ],
    };
    this.hooks.datachange.emit({
      data,
      type: 'addCombo',
    });
    return this.dataController.findData('combo', [model.id])[0] as ComboModel;
  }
  /**
   * Collapse a combo.
   * @param comboId combo ids
   * @group Combo
   */
  public collapseCombo(comboIds: ID | ID[]) {
    const ids = isArray(comboIds) ? comboIds : [comboIds];
    this.executeWithNoStack(() => {
      this.updateData(
        'combo',
        ids.map((id) => ({ id, data: { collapsed: true } })),
      );
    });
    this.emit('aftercollapsecombo', {
      type: 'combo',
      action: 'collapseCombo',
      ids: comboIds,
      apiName: 'collapseCombo',
    });
  }
  /**
   * Expand a combo.
   * @param combo combo ids
   * @group Combo
   */
  public expandCombo(comboIds: ID | ID[]) {
    const ids = isArray(comboIds) ? comboIds : [comboIds];
    this.executeWithNoStack(() => {
      this.updateData(
        'combo',
        ids.map((id) => ({ id, data: { collapsed: false } })),
      );
    });
    this.emit('afterexpandcombo', {
      type: 'combo',
      action: 'expandCombo',
      ids: comboIds,
      apiName: 'expandCombo',
    });
  }

  /**
   * Move one or more combos a distance (dx, dy) relatively,
   * do not update other styles which leads to better performance than updating positions by updateData.
   * In fact, it changes the succeed nodes positions to affect the combo's position, but not modify the combo's position directly.
   * @param models new configurations with x and y for every combo, which has id field to indicate the specific item
   * @group Combo
   */
  public moveCombo(
    ids: ID | ID[],
    dx: number,
    dy: number,
    upsertAncestors?: boolean,
    callback?: (
      model: NodeModel | EdgeModel | ComboModel,
      canceled?: boolean,
    ) => void,
  ): ComboModel[] {
    const idArr = isArray(ids) ? ids : [ids];
    const { graphCore } = this.dataController;
    const { specification } = this.themeController;
    graphCore.once('changed', (event) => {
      if (!event.changes.length) return;
      const changes = this.extendChanges(clone(event.changes));
      const timingParameters = {
        type: 'combo',
        ids: idArr,
        dx,
        dy,
        action: 'updatePosition',
        upsertAncestors,
        apiName: 'moveCombo',
        changes,
      };
      this.emit('beforeitemchange', timingParameters);
      this.hooks.itemchange.emit({
        type: 'combo',
        changes: event.changes,
        graphCore,
        theme: specification,
        upsertAncestors,
        action: 'updatePosition',
        callback,
      });
      this.emit('afteritemchange', timingParameters);
    });

    this.hooks.datachange.emit({
      data: {
        nodes: [],
        edges: [],
        combos: idArr.map((id) => ({ id, data: { dx, dy } })),
      },
      type: 'moveCombo',
    });
    return this.dataController.findData('combo', idArr) as ComboModel[];
  }

  // ===== layout =====
  /**
   * Layout the graph (with current configurations if cfg is not assigned).
   */
  public async layout(options?: LayoutOptions, disableAnimate = false) {
    this.emit('beforelayout');
    const { graphCore } = this.dataController;
    const formattedOptions = {
      ...this.getSpecification().layout,
      ...options,
    } as LayoutOptions;

    this.updateSpecification({ layout: formattedOptions });

    const layoutUnset =
      (!options && !this.getSpecification().layout) ||
      !Object.keys(formattedOptions).length;
    if (layoutUnset) {
      const nodes = graphCore.getAllNodes();
      if (nodes.every((node) => isNil(node.data.x) && isNil(node.data.y))) {
        // Use `grid` layout as default when x/y of each node is unset.
        (formattedOptions as StandardLayoutOptions).type = 'grid';
      } else {
        // Use user-defined position(x/y default to 0).
        (formattedOptions as ImmediatelyInvokedLayoutOptions).execute = async (
          graph,
        ) => {
          const nodes = graph.getAllNodes();
          return {
            nodes: nodes.map((node) => ({
              id: node.id,
              data: {
                x: Number(node.data.x) || 0,
                y: Number(node.data.y) || 0,
              },
            })),
            edges: [],
          };
        };
      }
    }

    await this.hooks.layout.emitLinearAsync({
      graphCore,
      options: formattedOptions,
      animate: !disableAnimate,
    });

    this.emit('afterlayout');
  }

  /**
   * Some layout algorithms has many iterations which can be stopped at any time.
   */
  public stopLayout() {
    this.layoutController.stopLayout();
  }

  /**
   *
   * @returns
   */
  public getLayoutCurrentAnimation() {
    return this.layoutController.getCurrentAnimation();
  }

  /**
   * Switch mode.
   * @param mode mode name
   * @returns
   * @group Interaction
   */
  public setMode(mode: string) {
    this.hooks.modechange.emit({ mode });
  }

  /**
   * Get current mode.
   * @returns mode name
   * @group Interaction
   */
  public getMode(): string {
    return this.interactionController.getMode();
  }

  /**
   * Set the cursor. But the cursor in item's style has higher priority.
   * @param cursor
   */
  public setCursor(cursor: Cursor) {
    this.canvas.setCursor(cursor);
    this.transientCanvas.setCursor(cursor);
  }

  /**
   * Add behavior(s) to mode(s).
   * @param behaviors behavior names or configs
   * @param modes mode names
   * @returns
   * @group Interaction
   */
  public addBehaviors(
    behaviors: BehaviorOptionsOf<B> | BehaviorOptionsOf<B>[],
    modes: string | string[],
  ) {
    const modesArr = isArray(modes) ? modes : [modes];
    const behaviorsArr = isArray(behaviors) ? behaviors : [behaviors];
    this.hooks.behaviorchange.emit({
      action: 'add',
      modes: modesArr,
      // TODO: update type define.
      // @ts-ignore
      behaviors: behaviorsArr,
    });
    // update the graph specification
    modesArr.forEach((mode) => {
      this.specification.modes[mode] =
        this.specification.modes[mode].concat(behaviorsArr);
    });
  }
  /**
   * Remove behavior(s) from mode(s).
   * @param behaviors behavior configs with unique key
   * @param modes mode names
   * @returns
   * @group Interaction
   */
  public removeBehaviors(behaviorKeys: string[], modes: string | string[]) {
    const modesArr = isArray(modes) ? modes : [modes];
    this.hooks.behaviorchange.emit({
      action: 'remove',
      modes: modesArr,
      behaviors: behaviorKeys,
    });
    // update the graph specification
    modesArr.forEach((mode) => {
      behaviorKeys.forEach((key) => {
        const oldBehavior = this.specification.modes[mode].find(
          (behavior) => isObject(behavior) && behavior.key === key,
        );
        const indexOfOldBehavior =
          this.specification.modes[mode].indexOf(oldBehavior);
        this.specification.modes[mode].splice(indexOfOldBehavior, 1);
      });
    });
  }

  /**
   * Update a behavior on a mode.
   * @param behavior behavior configs, whose name indicates the behavior to be updated
   * @param mode mode name
   * @returns
   * @group Interaction
   */
  public updateBehavior(behavior: BehaviorOptionsOf<B>, mode?: string) {
    this.hooks.behaviorchange.emit({
      action: 'update',
      modes: [mode],
      // TODO: update type define.
      // @ts-ignore
      behaviors: [behavior],
    });
    // no need to update specification since the corresponding part is the same object as the behavior's option
    // this.specification.modes[mode].forEach((b, i) => {
    //   if (isObject(b) && b.key === behavior.key) {
    //     this.specification.modes[mode][i] = behavior;
    //   }
    // });
  }

  /**
   * Add plugin(s) to graph.
   * @param pluginCfgs
   * @returns
   * @group Plugin
   */
  public addPlugins(
    pluginCfgs: (
      | {
          key: string;
          type: string;
          [cfgName: string]: unknown; // TODO: configs from plugins
        }
      | string
    )[],
  ) {
    const pluginsArr = isArray(pluginCfgs) ? pluginCfgs : [pluginCfgs];

    // update the graph specification
    if (!this.specification.plugins) this.specification.plugins = [];
    const oldPlugins = this.specification.plugins;
    const validPlugins: (
      | {
          key: string;
          type: string;
          [cfgName: string]: unknown; // TODO: configs from plugins
        }
      | string
    )[] = [];
    pluginsArr.forEach((config) => {
      const oldPlugin = oldPlugins.find((oldPlugin) => {
        if (typeof oldPlugin === 'string' || typeof config === 'string')
          return false;
        return oldPlugin.key === config.key;
      });
      if (oldPlugin) {
        console.warn(
          `Add plugin with key ${
            (config as any).key
          } failed, the key is duplicated to the existing plugins on the graph.`,
        );
        return;
      }
      validPlugins.push(config);
    });
    this.specification.plugins = oldPlugins.concat(validPlugins);

    this.hooks.pluginchange.emit({
      action: 'add',
      plugins: validPlugins,
    });
  }

  /**
   * Remove plugin(s) from graph.
   * @param pluginKeys
   * @returns
   * @group Plugin
   */
  public removePlugins(pluginKeys: (PluginBase | string)[]) {
    const pluginArr = isArray(pluginKeys) ? pluginKeys : [pluginKeys];
    this.hooks.pluginchange.emit({
      action: 'remove',
      plugins: pluginArr,
    });
    // update the graph specification
    const { plugins } = this.specification;
    this.specification.plugins = plugins?.filter((plugin) => {
      if (isObject(plugin))
        return !(
          pluginArr.includes(plugin.key) ||
          pluginArr.includes(plugin as PluginBase)
        );
      return !pluginArr.includes(plugin);
    });
  }

  /**
   * Update a plugin of the graph.
   * @param plugin plugin configs, whose key indicates the behavior to be updated
   * @returns
   * @group Interaction
   */
  public updatePlugin(
    plugin:
      | {
          key: string;
          type: string;
          [cfg: string]: unknown;
        }
      | PluginBase,
  ) {
    const { plugins } = this.specification;
    const { key } = plugin;
    if (!key) {
      console.warn(
        'Update plugin failed, the key for the plugin to be updated should be assign.',
      );
      return;
    }
    if (!plugins) {
      console.warn(
        'Update plugin failed, the plugin to be updated does not exist.',
      );
      return;
    }
    const oldPlugin = plugins?.find((p) => {
      if (typeof p === 'string') return p === key;
      return p.key === key;
    });
    if (!oldPlugin) {
      console.warn(
        'Update plugin failed, the key for the plugin to be updated should be assign.',
      );
      return;
    }
    const idx = plugins.indexOf(oldPlugin);
    plugins[idx] = {
      // TODO: update type define.
      // @ts-ignore
      ...oldPlugin,
      ...plugin,
    };

    this.hooks.pluginchange.emit({
      action: 'update',
      plugins: [plugin],
    });
  }

  /**
   * Draw or update a G shape or group to the transient canvas.
   * @param type shape type or item type
   * @param id new shape id or updated shape id for a interation shape, node/edge/combo id for item interaction group drawing
   * @returns upserted shape or group
   * @group Interaction
   */
  public drawTransient(
    type: ITEM_TYPE | SHAPE_TYPE,
    id: ID,
    config: {
      action?: 'remove' | 'add' | 'update' | undefined;
      /** Data to be merged into the transient item. */
      data?: Record<string, any>;
      /** Style to be merged into the transient shape. */
      style?: ShapeStyle;
      /** For type: 'edge' */
      drawSource?: boolean;
      /** For type: 'edge' */
      drawTarget?: boolean;
      /** Only shape with id in shapeIds will be cloned while type is ITEM_TYPE. If shapeIds is not assigned, the whole item will be cloned. */
      shapeIds?: string[];
      /** Whether show the shapes in shapeIds. True by default. */
      visible?: boolean;
      upsertAncestors?: boolean;
    },
    canvas?: Canvas,
  ): DisplayObject {
    this.hooks.transientupdate.emit({
      type,
      id,
      config,
      canvas: canvas || this.transientCanvas,
      graphCore: this.dataController.graphCore,
    });
    return this.itemController.getTransient(String(id));
  }

  // ===== download operations =====
  /**
   * Asynchronously generates a Data URL representation of the canvas content, including
   * background, main content, and transient canvas.
   * @param The type of the Data URL (e.g., 'image/png', 'image/jpeg').
   * @returns A Promise that resolves to the Data URL string.
   */
  public async toDataURL(type?: DataURLType): Promise<string> {
    const backgroundCanvas = this.backgroundCanvas;
    const canvas = this.canvas;
    const transientCanvas = this.transientCanvas;
    const rendererType = this.rendererType;

    const pixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const width = this.getSize()[0];
    const height = this.getSize()[1];

    const vContainerDOM: HTMLDivElement = createDom(
      '<div id="virtual-image"></div>',
    );
    const vCanvas = createCanvas(
      rendererType,
      vContainerDOM,
      width,
      height,
      pixelRatio,
    );
    const vCanvasContextService = vCanvas.getContextService();
    let bgRect;
    if (rendererType !== 'svg') {
      bgRect = new Rect({
        style: {
          x: 0,
          y: 0,
          z: -1,
          width: vCanvasContextService.getDomElement().width,
          height: vCanvasContextService.getDomElement().height,
          //@ts-ignore
          fill: backgroundCanvas.getContextService().getDomElement().style[
            'background-color'
          ],
        },
      });
      vCanvas.appendChild(bgRect);
    }
    const backgroundClonedGroup = backgroundCanvas.getRoot().cloneNode(true);
    const clonedGroup = canvas.getRoot().cloneNode(true);
    const transientClonedGroup = transientCanvas.getRoot().cloneNode(true);
    vCanvas.appendChild(backgroundClonedGroup);
    vCanvas.appendChild(clonedGroup);
    vCanvas.appendChild(transientClonedGroup);
    vCanvas.render();

    if (!type) type = 'image/png';
    let dataURL = '';
    await vCanvasContextService.toDataURL({ type }).then((url) => {
      dataURL = url;
    });
    return dataURL;
  }

  /**
   * Asynchronously generates a Data URL representation of the full canvas content,
   * including background, main content, and transient canvas, with optional padding.
   * @param type The type of the Data URL (e.g., 'image/png', 'image/jpeg').
   * @param imageConfig Configuration options for the image (optional).
   * @returns A Promise that resolves to the Data URL string.
   */
  public async toFullDataURL(
    type?: DataURLType,
    imageConfig?: { padding?: number | number[] },
  ) {
    const backgroundCanvas = this.backgroundCanvas;
    const canvas = this.canvas;
    const transientCanvas = this.transientCanvas;
    const backgroundRoot = canvas.getRoot();
    const root = canvas.getRoot();
    const transientRoot = transientCanvas.getRoot();
    const rendererType = this.rendererType;

    const backgroundBBox = backgroundRoot.getBBox();
    const BBox = root.getBBox();
    const transientBBox = transientRoot.getBBox();

    let padding = imageConfig ? imageConfig.padding : undefined;
    if (!padding) {
      padding = [0, 0, 0, 0];
    } else if (isNumber(padding)) {
      padding = [padding, padding, padding, padding];
    }

    const left =
      (transientBBox.left
        ? backgroundBBox.left
          ? Math.min(backgroundBBox.left, BBox.left, transientBBox.left)
          : Math.min(BBox.left, transientBBox.left)
        : BBox.left) - padding[3];
    const right =
      (transientBBox.right
        ? backgroundBBox.right
          ? Math.max(backgroundBBox.right, BBox.right, transientBBox.right)
          : Math.max(BBox.right, transientBBox.right)
        : BBox.right) + padding[1];
    const top =
      (transientBBox.top
        ? backgroundBBox.top
          ? Math.min(backgroundBBox.top, BBox.top, transientBBox.top)
          : Math.min(BBox.top, transientBBox.top)
        : BBox.top) - padding[0];
    const bottom =
      (transientBBox.bottom
        ? backgroundBBox.bottom
          ? Math.max(backgroundBBox.bottom, BBox.bottom, transientBBox.bottom)
          : Math.max(BBox.bottom, transientBBox.bottom)
        : BBox.bottom) + padding[2];

    const graphCenterX = (left + right) / 2;
    const graphCenterY = (top + bottom) / 2;
    const halfX = (right - left) / 2;
    const halfY = (bottom - top) / 2;

    const pixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const vWidth = halfX * 2;
    const vHeight = halfY * 2;
    const vContainerDOM: HTMLDivElement = createDom(
      '<div id="virtual-image"></div>',
    );
    const vCanvas = createCanvas(
      rendererType,
      vContainerDOM,
      vWidth,
      vHeight,
      pixelRatio,
    );
    const vCanvasContextService = vCanvas.getContextService();
    if (rendererType !== 'svg') {
      const bgRect = new Rect({
        style: {
          x: 0,
          y: 0,
          z: -1,
          width: vCanvasContextService.getDomElement().width,
          height: vCanvasContextService.getDomElement().height,
          //@ts-ignore
          fill: backgroundCanvas.getContextService().getDomElement().style[
            'background-color'
          ],
        },
      });
      vCanvas.appendChild(bgRect);
    }
    const backgroundClonedGroup = backgroundRoot.cloneNode(true);
    const clonedGroup = root.cloneNode(true);
    const transientClonedGroup = transientRoot.cloneNode(true);
    const transPosition: [number, number] = [
      -graphCenterX + halfX,
      -graphCenterY + halfY,
    ];
    backgroundClonedGroup.setPosition(transPosition);
    clonedGroup.setPosition(transPosition);
    transientClonedGroup.setPosition(transPosition);
    vCanvas.appendChild(backgroundClonedGroup);
    vCanvas.appendChild(clonedGroup);
    vCanvas.appendChild(transientClonedGroup);
    vCanvas.render();

    if (!type) type = 'image/png';
    let dataURL = '';
    await vCanvasContextService.toDataURL({ type }).then((url) => {
      dataURL = url;
    });
    return dataURL;
  }

  /**
   * Converts a Data URL to an image file and handles the download of the image.
   * @param dataURL The Data URL of the image to be converted and downloaded.
   * @param renderer The renderer type ('svg' or other) used for the canvas.
   * @param link The HTML link element used for image download.
   * @param fileName The desired name for the downloaded image file.
   */
  private dataURLToImage(dataURL: string, renderer: string, link, fileName) {
    if (!dataURL || dataURL === 'data:') {
      console.error(
        'Download image failed. The graph is too large or there is invalid attribute values in graph items',
      );
      return;
    }

    if (typeof window !== 'undefined') {
      if (window.Blob && window.URL && renderer !== 'svg') {
        const arr = dataURL.split(',');
        let mime = '';
        if (arr && arr.length > 0) {
          const match = arr[0].match(/:(.*?);/);
          // eslint-disable-next-line prefer-destructuring
          if (match && match.length >= 2) mime = match[1];
        }

        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }

        const blobObj = new Blob([u8arr], { type: mime });

        if ((window.navigator as any).msSaveBlob) {
          (window.navigator as any).msSaveBlob(blobObj, fileName);
        } else {
          link.addEventListener('click', () => {
            link.download = fileName;
            link.href = window.URL.createObjectURL(blobObj);
          });
        }
      } else {
        link.addEventListener('click', () => {
          link.download = fileName;
          link.href = dataURL;
        });
      }
    }
  }

  /**
   * Initiates the download of the graph as an image with an optional name and type.
   * @param name The desired name for the downloaded image file (optional).
   * @param type The type of the image to download (optional, defaults to 'image/png').
   */
  public downloadImage(name?: string, type?: DataURLType): void {
    const self = this;
    // self.stopAnimate();

    const rendererType = this.rendererType;
    if (!type) type = 'image/png';

    const fileName: string =
      (name || 'graph') +
      (rendererType === 'svg' ? '.svg' : type.split('/')[1]);

    const link: HTMLAnchorElement = document.createElement('a');

    self.asyncToDataUrl(type, (dataURL) => {
      this.dataURLToImage(dataURL, rendererType, link, fileName);
      const e = document.createEvent('MouseEvents');
      e.initEvent('click', false, false);
      link.dispatchEvent(e);
    });
  }

  /**
   * Initiates the download of the entire graph as an image with optional name, type, and padding configuration.
   * @param name The desired name for the downloaded image file (optional).
   * @param type The type of the image to download (optional, defaults to 'image/png').
   * @param imageConfig Configuration options for the image (optional).
   */
  public downloadFullImage(
    name?: string,
    type?: DataURLType,
    imageConfig?: { padding?: number | number[] },
  ): void {
    const self = this;

    const rendererType = this.rendererType;
    if (!type) type = 'image/png';
    const fileName: string =
      (name || 'graph') +
      (rendererType === 'svg' ? '.svg' : type.split('/')[1]);
    const link: HTMLAnchorElement = document.createElement('a');

    self.asyncToFullDataUrl(type, imageConfig, (dataURL) => {
      this.dataURLToImage(dataURL, rendererType, link, fileName);
      const e = document.createEvent('MouseEvents');
      e.initEvent('click', false, false);
      link.dispatchEvent(e);
    });
  }

  /**
   * Asynchronously converts the canvas content to a Data URL of the specified type and invokes the provided callback.
   * @param type The type of the Data URL (optional, defaults to 'image/png').
   * @param callback A callback function to handle the Data URL (optional).
   */
  protected asyncToDataUrl(type?: DataURLType, callback?: Function): void {
    let dataURL = '';
    if (!type) type = 'image/png';

    setTimeout(async () => {
      await this.toDataURL(type).then((url) => {
        dataURL = url;
      });
      if (callback) callback(dataURL);
    }, 16);
  }

  /**
   * Asynchronously converts the entire canvas content to a Data URL of the specified type
   * with optional padding, and invokes the provided callback.
   * @param type The type of the Data URL (optional, defaults to 'image/png').
   * @param imageConfig Configuration options for the image (optional).
   * @param callback A callback function to handle the Data URL (optional).
   */
  protected asyncToFullDataUrl(
    type?: DataURLType,
    imageConfig?: { padding?: number | number[] },
    callback?: (dataUrl: string) => void,
  ): void {
    let dataURL = '';
    if (!type) type = 'image/png';

    setTimeout(async () => {
      await this.toFullDataURL(type, imageConfig).then((url) => {
        dataURL = url;
      });
      if (callback) callback(dataURL);
    }, 16);
  }

  // ===== history operations =====

  /**
   * Determine if history (redo/undo) is enabled.
   */
  public isHistoryEnabled() {
    const history = this.getHistoryPlugin();
    return history?.isEnable();
  }

  /**
   * Push the operation(s) onto the specified stack
   * @param cmd commands to be pushed
   * @param stackType undo/redo stack
   * @param isNew
   */
  public pushStack(cmd: Command[], stackType: StackType, isNew?: boolean) {
    const history = this.getHistoryPlugin();
    return history?.push(cmd, stackType, isNew);
  }

  /**
   * Pause stacking operation.
   */
  public pauseStack(): void {
    const history = this.getHistoryPlugin();
    return history?.pauseStack();
  }

  /**
   * Resume stacking operation.
   */
  public resumeStack(): void {
    const history = this.getHistoryPlugin();
    return history?.resumeStack();
  }

  /**
   * Execute a callback without allowing any stacking operations.
   * @param callback
   */
  public executeWithNoStack = (callback: () => void): void => {
    const history = this.getHistoryPlugin();
    history?.pauseStack();
    try {
      callback();
    } finally {
      history?.resumeStack();
    }
  };

  /**
   * Retrieve the current redo stack which consists of operations that could be undone
   */
  public getUndoStack() {
    const history = this.getHistoryPlugin();
    return history?.getUndoStack();
  }

  /**
   * Retrieve the current undo stack which consists of operations that were undone
   */
  public getRedoStack() {
    const history = this.getHistoryPlugin();
    return history?.getRedoStack();
  }

  /**
   * Retrieve the complete history stack
   * @returns
   */
  public getStack() {
    const history = this.getHistoryPlugin();
    return history?.getStack();
  }

  /**
   * Restore n operations that were last n reverted on the graph.
   * @param steps The number of operations to undo. Default to 1.
   * @returns
   */
  public undo() {
    const history = this.getHistoryPlugin();
    history?.undo();
  }

  /**
   * Revert recent n operation(s) performed on the graph.
   * @param steps The number of operations to redo. Default to 1.
   * @returns
   */
  public redo() {
    const history = this.getHistoryPlugin();
    history?.redo();
  }

  /**
   * Indicate whether there are any actions available in the undo stack.
   */
  public canUndo() {
    const history = this.getHistoryPlugin();
    return history?.canUndo();
  }

  /**
   * Indicate whether there are any actions available in the redo stack.
   */
  public canRedo() {
    const history = this.getHistoryPlugin();
    return history?.canRedo();
  }

  /**
   * Begin a historyBatch operation.
   * Any operations performed between `startHistoryBatch` and `stopHistoryBatch` are grouped together.
   * treated as a single operation when undoing or redoing.
   */
  public startHistoryBatch() {
    const history = this.getHistoryPlugin();
    history?.startHistoryBatch();
  }

  /**
   * End a historyBatch operation.
   * Any operations performed between `startHistoryBatch` and `stopHistoryBatch` are grouped together.
   * treated as a single operation when undoing or redoing.
   */
  public stopHistoryBatch() {
    const history = this.getHistoryPlugin();
    history?.stopHistoryBatch();
  }

  /**
   * Execute a provided function within a batched context
   * All operations performed inside callback will be treated as a composite operation
   * more convenient way without manually invoking `startHistoryBatch` and `stopHistoryBatch`.
   * @param callback The func containing operations to be batched together.
   */
  public historyBatch(callback: () => void) {
    const history = this.getHistoryPlugin();
    history?.historyBatch(callback);
  }

  /**
   * Clear history stack
   * @param {StackType} stackType undo/redo stack
   */
  public cleanHistory(stackType?: StackType) {
    const history = this.getHistoryPlugin();
    if (!stackType) return history?.clear();
    return stackType === 'undo'
      ? history?.clearUndoStack()
      : history?.clearRedoStack();
  }

  /**
   * Collapse sub tree(s).
   * @param ids Root id(s) of the sub trees.
   * @param disableAnimate Whether disable the animations for this operation.
   * @param stack Whether push this operation to stack.
   * @returns
   * @group Tree
   */
  public collapse(ids: ID | ID[], disableAnimate = false, stack?: boolean) {
    this.hooks.treecollapseexpand.emit({
      ids: isArray(ids) ? ids : [ids],
      action: 'collapse',
      animate: !disableAnimate,
      graphCore: this.dataController.graphCore,
    });
  }
  /**
   * Expand sub tree(s).
   * @param ids Root id(s) of the sub trees.
   * @param disableAnimate Whether disable the animations for this operation.
   * @param stack Whether push this operation to stack.
   * @returns
   * @group Tree
   */
  public expand(ids: ID | ID[], disableAnimate = false, stack?: boolean) {
    this.hooks.treecollapseexpand.emit({
      ids: isArray(ids) ? ids : [ids],
      action: 'expand',
      animate: !disableAnimate,
      graphCore: this.dataController.graphCore,
    });
  }

  /**
   * Destroy the graph instance and remove the related canvases.
   * @returns
   * @group Graph Instance
   */
  public destroy(callback?: Function) {
    // TODO: call the destroy functions after items' buildOut animations finished
    // setTimeout(() => {
    this.canvas.destroy();
    this.backgroundCanvas.destroy();
    this.transientCanvas.destroy();

    // clear history stack
    this.cleanHistory();

    callback?.();
    // }, 500);

    this.hooks.destroy.emit({});

    // TODO: destroy controllers and off the listeners
    // this.dataController.destroy();
    // this.interactionController.destroy();
    // this.layoutController.destroy();
    // this.themeController.destroy();
    // this.itemController.destroy();
    // this.extensionController.destroy();

    this.destroyed = true;
  }
}