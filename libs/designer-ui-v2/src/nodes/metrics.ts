/** Presentation geometry only. Graph spacing, routing and dynamic agent extents belong to hosts. */
export const nodeMetrics = {
  cards: {
    action: { width: 232, height: 74 },
    trigger: { width: 232, height: 74 },
    condition: { width: 160, height: 74 },
    switch: { width: 160, height: 103 },
    loop: { width: 160, height: 74 },
    agent: { width: 280, headerHeight: 74, modelHeight: 42 },
    tool: { width: 232, height: 74, smallHeight: 56 },
  },
  tile: { medium: 40, small: 32, mediumIcon: 24, smallIcon: 20 },
  handle: { size: 12, stroke: 1.5, edgeOffset: -7, labeledHeight: 20 },
  badge: { height: 20, icon: 12, overhang: 10 },
  testData: { size: 20, icon: 16, textReserve: 32 },
  toolConnector: { diamond: 12, gap: 9, line: 20, add: 20 },
  toolsHeader: 20,
  hoverCard: { width: 275, dismiss: 16, offset: 8 },
  actionAdd: { buttonWidth: 20, buttonHeight: 32 },
  frame: { minWidth: 232, minBodyHeight: 106 },
  mergePoint: { size: 16, dot: 6 },
  edgeControl: { pillSize: 24, hitTargetSize: 32, dualHitTargetWidth: 68, interactionWidth: 20 },
  collapseChip: { height: 24, maxVisibleCount: 99 },
} as const;

export const nodeHoverCardTiming = { openDelay: 400, closeDelay: 200 } as const;
