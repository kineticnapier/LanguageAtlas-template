const DEFAULT_NODE_SIZE = {
  main: { width: 220, height: 86 },
  support: { width: 180, height: 68 }
};

const NODE_VERTICAL_GAP = 40;
const EDGE_CHANNEL_GAP = 24;
const EDGE_OBSTACLE_GAP = 28;
const EDGE_BOUND_PADDING = 80;
const EDGE_LANE_SPACING = 8;
const EDGE_LANE_MAX = 24;
const EDGE_LANE_OVERLAP_PADDING = 12;

function nodeSize(node) {
  return DEFAULT_NODE_SIZE[node.kind === 'support' ? 'support' : 'main'];
}

function nodeWidth(node) {
  return node.width ?? nodeSize(node).width;
}

function nodeHeight(node) {
  return node.height ?? nodeSize(node).height;
}

export function extractSupportSnippet(article, maxLines = 4) {
  const bad = typeof article?.bad === 'string' ? article.bad.trim() : '';
  const code = typeof article?.code === 'string' ? article.code.trim() : '';
  const source = bad || code;
  if (!source) return '';

  const lines = source.split('\n');
  const highlights = Array.isArray(article?.badHighlight)
    ? article.badHighlight.filter(line => Number.isInteger(line) && line > 0)
    : [];

  if (!bad || !highlights.length) {
    return lines.slice(0, maxLines).join('\n');
  }

  const first = Math.min(...highlights) - 1;
  const last = Math.max(...highlights) - 1;
  const start = Math.max(0, first - (maxLines - 1));
  const end = Math.min(lines.length, Math.max(last + 1, start + 1));
  return lines.slice(Math.max(start, end - maxLines), end).join('\n');
}

export function buildQuestChapter(articles, chapter) {
  const articlesById = new Map(articles.map(article => [article.id, article]));
  const configById = new Map(chapter.nodes.map(node => [node.id, node]));
  const nodes = chapter.nodes
    .map(config => {
      const article = articlesById.get(config.id);
      if (!article) return null;
      const kind = config.kind ?? 'main';
      return {
        ...article,
        kind,
        code: config.code ?? (kind === 'support' ? extractSupportSnippet(article) : ''),
        prerequisites: [...(config.prerequisites ?? [])],
        attachedTo: config.attachedTo ?? null,
        lane: config.lane,
        offsetY: config.offsetY ?? 0
      };
    })
    .filter(Boolean);

  const edges = [];
  for (const node of chapter.nodes) {
    if (!configById.has(node.id)) continue;
    for (const prerequisite of node.prerequisites ?? []) {
      if (configById.has(prerequisite)) {
        edges.push({ source: prerequisite, target: node.id, kind: 'prerequisite' });
      }
    }
    if ((node.kind ?? 'main') === 'support' && node.attachedTo && configById.has(node.attachedTo)) {
      edges.push({ source: node.attachedTo, target: node.id, kind: 'support' });
    }
  }

  return {
    id: chapter.id,
    title: chapter.title,
    description: chapter.description,
    nodes: computeQuestLayout(nodes),
    edges
  };
}

export function computeQuestLayout(nodes) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const depthMemo = new Map();
  const visiting = new Set();

  function depthOf(node) {
    if (depthMemo.has(node.id)) return depthMemo.get(node.id);
    if (visiting.has(node.id)) return 0;
    visiting.add(node.id);
    const localPrerequisites = (node.prerequisites ?? [])
      .map(id => byId.get(id))
      .filter(Boolean);
    const depth = localPrerequisites.length
      ? Math.max(...localPrerequisites.map(depthOf)) + 1
      : 0;
    visiting.delete(node.id);
    depthMemo.set(node.id, depth);
    return depth;
  }

  const usedLanes = new Map();
  const staged = [];
  for (const node of nodes) {
    let depth = depthOf(node);
    if (node.kind === 'support' && node.attachedTo && byId.has(node.attachedTo)) {
      depth = depthOf(byId.get(node.attachedTo)) + 1;
    }
    const nextLane = usedLanes.get(depth) ?? 0;
    const lane = Number.isFinite(node.lane) ? node.lane : nextLane;
    usedLanes.set(depth, Math.max(nextLane + 1, lane + 1));
    staged.push({ ...node, depth, lane });
  }

  return reflowQuestLayout(staged);
}

export function reflowQuestLayout(nodes, measurements = new Map()) {
  if (!nodes.length) return [];

  const sized = nodes.map((node, index) => {
    const fallback = nodeSize(node);
    const measured = measurements.get(node.id) ?? {};
    return {
      ...node,
      width: measured.width ?? node.width ?? fallback.width,
      height: measured.height ?? node.height ?? fallback.height,
      layoutOrder: index
    };
  });

  const depths = [...new Set(sized.map(node => node.depth ?? 0))].sort((a, b) => a - b);
  const maxWidthByDepth = new Map(depths.map(depth => [
    depth,
    Math.max(...sized.filter(node => (node.depth ?? 0) === depth).map(node => node.width))
  ]));
  const depthX = new Map();
  let nextX = 120;
  for (const depth of depths) {
    depthX.set(depth, nextX);
    nextX += maxWidthByDepth.get(depth) + 110;
  }

  const positions = new Map();
  const sizedById = new Map(sized.map(node => [node.id, node]));
  const parentCenter = node => {
    const parentIds = node.kind === 'support' && node.attachedTo
      ? [node.attachedTo]
      : (node.prerequisites ?? []);
    const centers = parentIds
      .map(id => {
        const parent = sizedById.get(id);
        const position = positions.get(id);
        return parent && position ? position.y + parent.height / 2 : null;
      })
      .filter(value => value !== null);
    return centers.length ? centers.reduce((sum, value) => sum + value, 0) / centers.length : null;
  };

  for (const depth of depths) {
    const column = sized
      .filter(node => (node.depth ?? 0) === depth)
      .sort((a, b) => {
        const aParent = parentCenter(a);
        const bParent = parentCenter(b);
        if (aParent !== null && bParent !== null && aParent !== bParent) return aParent - bParent;
        if (aParent !== null && bParent === null) return -1;
        if (aParent === null && bParent !== null) return 1;
        return (a.lane ?? 0) - (b.lane ?? 0) || a.layoutOrder - b.layoutOrder;
      });

    let nextY = 110;
    for (const node of column) {
      const y = nextY + (node.offsetY ?? 0);
      positions.set(node.id, { x: depthX.get(depth), y });
      nextY = Math.max(nextY, y) + node.height + NODE_VERTICAL_GAP;
    }
  }

  return sized.map(({ layoutOrder, ...node }) => ({
    ...node,
    ...positions.get(node.id)
  }));
}

export function assignEdgeRouteOffsets(edges, nodes) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const groups = new Map();
  const offsets = Array(edges.length).fill(0);

  edges.forEach((edge, index) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return;
    const sourceDepth = source.depth ?? 0;
    const targetDepth = target.depth ?? sourceDepth + 1;
    const startY = source.y + nodeHeight(source) / 2;
    const endY = target.y + nodeHeight(target) / 2;
    const channelKey = `${sourceDepth}:${targetDepth}`;
    const entry = {
      index,
      kind: edge.kind,
      minY: Math.min(startY, endY),
      maxY: Math.max(startY, endY)
    };
    if (!groups.has(channelKey)) groups.set(channelKey, []);
    groups.get(channelKey).push(entry);
  });

  const laneSlots = [0, 1, -1, 2, -2, 3, -3];
  for (const group of groups.values()) {
    group.sort((a, b) => {
      const kindOrder = (a.kind === 'support') - (b.kind === 'support');
      return kindOrder || a.minY - b.minY || a.index - b.index;
    });

    const assigned = [];
    for (const edge of group) {
      const overlaps = assigned.filter(other => (
        edge.minY < other.maxY + EDGE_LANE_OVERLAP_PADDING &&
        other.minY < edge.maxY + EDGE_LANE_OVERLAP_PADDING
      ));
      const usedSlots = new Set(overlaps.map(other => other.slot));
      const slot = laneSlots.find(candidate => !usedSlots.has(candidate)) ?? laneSlots.at(-1);
      offsets[edge.index] = Math.max(-EDGE_LANE_MAX, Math.min(EDGE_LANE_MAX, slot * EDGE_LANE_SPACING));
      assigned.push({ ...edge, slot });
    }
  }

  return offsets;
}

export function routeQuestEdgePoints(source, target, nodes, routeOffset = 0) {
  const start = { x: source.x + nodeWidth(source), y: source.y + nodeHeight(source) / 2 };
  const end = { x: target.x, y: target.y + nodeHeight(target) / 2 };

  const sourceDepth = source.depth ?? 0;
  const targetDepth = target.depth ?? sourceDepth + 1;
  const sourceDepthRight = Math.max(...nodes
    .filter(node => (node.depth ?? 0) === sourceDepth)
    .map(node => node.x + nodeWidth(node)));
  const targetDepthLeft = Math.min(...nodes
    .filter(node => (node.depth ?? 0) === targetDepth)
    .map(node => node.x));

  const intermediate = nodes.filter(node => {
    const depth = node.depth ?? 0;
    return depth > sourceDepth && depth < targetDepth;
  });

  if (!intermediate.length || targetDepth <= sourceDepth + 1) {
    const midX = (sourceDepthRight + targetDepthLeft) / 2 + routeOffset;
    return [
      start,
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      end
    ];
  }

  const sourceChannelX = sourceDepthRight + EDGE_CHANNEL_GAP;
  const targetChannelX = targetDepthLeft - EDGE_CHANNEL_GAP;
  const laneClearance = EDGE_OBSTACLE_GAP + EDGE_LANE_MAX;
  const topBase = Math.min(...intermediate.map(node => node.y)) - laneClearance;
  const bottomBase = Math.max(...intermediate.map(node => node.y + nodeHeight(node))) + laneClearance;
  const topCost = Math.abs(start.y - topBase) + Math.abs(end.y - topBase);
  const bottomCost = Math.abs(start.y - bottomBase) + Math.abs(end.y - bottomBase);
  const routeY = (topCost <= bottomCost ? topBase : bottomBase) + routeOffset;

  return [
    start,
    { x: sourceChannelX, y: start.y },
    { x: sourceChannelX, y: routeY },
    { x: targetChannelX, y: routeY },
    { x: targetChannelX, y: end.y },
    end
  ];
}

export function questWorldBounds(nodes) {
  if (!nodes.length) return { width: 900, height: 560 };
  return {
    width: Math.max(900, Math.max(...nodes.map(node => node.x + nodeWidth(node))) + 140),
    height: Math.max(560, Math.max(...nodes.map(node => node.y + nodeHeight(node))) + EDGE_BOUND_PADDING + 40)
  };
}
