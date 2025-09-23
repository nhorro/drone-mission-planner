beforeAll(() => {
  require('../public/geo.js');
  require('../public/model.js');
  require('../public/state.js');
});

beforeEach(() => {
  window.localStorage.clear();
  window.Model.resetPlan();
  window.State.setPlan(window.Model.createEmptyPlan());
});

describe('State', () => {
  test('undo and redo restore previous plans', () => {
    window.State.addPlacemark({ lat: 1, lon: 2 });
    window.State.addPlacemark({ lat: 3, lon: 4 });

    expect(window.State.getPlan().placemarks).toHaveLength(2);

    window.State.undo();
    expect(window.State.getPlan().placemarks).toHaveLength(1);

    window.State.undo();
    expect(window.State.getPlan().placemarks).toHaveLength(0);

    window.State.redo();
    expect(window.State.getPlan().placemarks).toHaveLength(1);
  });

  test('onChange notifies subscribers and updates autosave', () => {
    const updates = jest.fn();
    const unsubscribe = window.State.onChange(updates);

    window.State.addPlacemark({ lat: 5, lon: 6 });

    expect(updates).toHaveBeenCalledTimes(2);
    const saved = JSON.parse(window.localStorage.getItem('fpe_plan_autosave'));
    expect(saved.plan.placemarks).toHaveLength(1);

    unsubscribe();
  });

  test('exported plans can be reloaded through loadJSON', () => {
    window.State.addPlacemark({ lat: 7, lon: 8, alt: 15 });

    const exported = window.State.exportJSON();
    const snapshot = JSON.parse(exported);
    expect(snapshot.version).toBe(4);
    expect(snapshot.plan.placemarks).toHaveLength(1);

    window.State.newPlan();
    expect(window.State.getPlan().placemarks).toHaveLength(0);

    window.State.loadJSON(exported);
    expect(window.State.getPlan().placemarks).toHaveLength(1);
  });
});
