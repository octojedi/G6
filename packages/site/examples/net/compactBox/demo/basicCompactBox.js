import { Graph, Utils } from '@antv/g6';

fetch('https://gw.alipayobjects.com/os/antvdemo/assets/data/algorithm-category.json')
  .then((res) => res.json())
  .then((data) => {
    const graph = new Graph({
      container: 'container',
      data: Utils.treeToGraphData(data),
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      node: {
        style: {
          labelText: (data) => data.id,
          labelPlacement: 'right',
          labelMaxWidth: 200,
          ports: [
            {
              placement: 'right',
            },
            {
              placement: 'left',
            },
          ],
        },
      },
      edge: {
        style: {
          type: 'cubic-horizontal',
        },
      },
      layout: {
        type: 'compact-box',
        direction: 'LR',
        getHeight: function getHeight() {
          return 32;
        },
        getWidth: function getWidth() {
          return 32;
        },
        getVGap: function getVGap() {
          return 10;
        },
        getHGap: function getHGap() {
          return 100;
        },
      },
      animation: false,
      autoFit: 'view',
    });

    graph.render();
  });
