export type StatusOwner = 'player' | 'enemy' | 'unit';

export interface StatusDisplayMeta {
  token: string;
  color: string;
  label: string;
}

const STATUS_DISPLAY: Record<string, StatusDisplayMeta> = {
  burn:       { token: 'IGN', color: '#ff5a2e', label: 'Ignite' },
  poison:     { token: 'PSN', color: '#44cc44', label: 'Poison' },
  shield:     { token: 'SHD', color: '#3b8fff', label: 'Shield' },
  strength:   { token: 'STR', color: '#ffcc00', label: 'Strength' },
  weak:       { token: 'WEK', color: '#aaaaaa', label: 'Weak' },
  vulnerable: { token: 'VUL', color: '#ff8c00', label: 'Vulnerable' },
  barrier:    { token: 'BAR', color: '#00aaff', label: 'Barrier' },
  stealth:    { token: 'STL', color: '#cccccc', label: 'Stealth' },
  phase:      { token: 'PHS', color: '#c27dff', label: 'Phase' },
};

export function getStatusDisplayMeta(type: string): StatusDisplayMeta {
  return STATUS_DISPLAY[type] ?? { token: '?', color: '#888888', label: type };
}

export function getStatusTooltip(type: string, stacks: number, owner: StatusOwner = 'unit'): string {
  switch (type) {
    case 'burn':
      if (owner === 'enemy') {
        return `Ignite: enemy takes ${stacks} damage during its turn, then Ignite decreases by 1.`;
      }
      if (owner === 'player') {
        return `Ignite: you take ${stacks} damage when you end your turn, then Ignite decreases by 1.`;
      }
      return `Ignite: this unit takes ${stacks} damage during its turn, then Ignite decreases by 1.`;
    case 'poison':
      return `Poison: takes ${stacks} damage from poison effects.`;
    case 'weak':
      return `Weak: deals 25% less attack damage.`;
    case 'vulnerable':
      return `Vulnerable: takes 25% more attack damage.`;
    case 'strength':
      return `Strength: attacks and damage effects deal +${stacks} damage.`;
    case 'shield':
      return `Shield: absorbs the next ${stacks} damage.`;
    case 'barrier':
      return `Barrier: protective status with ${stacks} stack${stacks === 1 ? '' : 's'}.`;
    case 'stealth':
      return 'Stealth: harder to target until revealed.';
    case 'phase':
      return 'Phase: temporary dimensional protection.';
    default:
      return `${getStatusDisplayMeta(type).label}: ${stacks} stack${stacks === 1 ? '' : 's'}.`;
  }
}
