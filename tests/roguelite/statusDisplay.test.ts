import { getStatusDisplayMeta, getStatusTooltip } from '../../src/dungeon/utils/statusDisplay';

describe('statusDisplay', () => {
  it('labels burn as Ignite for player-facing combat UI', () => {
    expect(getStatusDisplayMeta('burn')).toEqual(
      expect.objectContaining({ label: 'Ignite', token: 'IGN' })
    );
  });

  it('explains enemy Ignite damage and decay', () => {
    expect(getStatusTooltip('burn', 3, 'enemy')).toBe(
      'Ignite: enemy takes 3 damage during its turn, then Ignite decreases by 1.'
    );
  });

  it('explains player Ignite timing separately', () => {
    expect(getStatusTooltip('burn', 2, 'player')).toBe(
      'Ignite: you take 2 damage when you end your turn, then Ignite decreases by 1.'
    );
  });
});
