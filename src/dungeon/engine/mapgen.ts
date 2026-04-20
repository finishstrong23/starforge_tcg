import type { ActMap, MapNode } from '../types';

export function generateActMap(_actNumber: 1 | 2 | 3, _seed: string): ActMap {
  throw new Error('generateActMap not implemented');
}

export function getAvailableNodes(_map: ActMap, _currentNodeId: string): MapNode[] {
  return [];
}

export function visitNode(map: ActMap, _nodeId: string): ActMap {
  return map;
}
