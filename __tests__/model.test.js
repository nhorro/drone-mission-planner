beforeAll(() => {
  require('../public/geo.js');
  require('../public/model.js');
});

beforeEach(() => {
  window.localStorage.clear();
  window.Model.resetPlan();
});

describe('Model', () => {
  test('createEmptyPlan returns normalized empty plan', () => {
    const plan = window.Model.createEmptyPlan();
    expect(plan).toMatchObject({
      name: 'My Flight',
      defaults: {
        speed_mps: expect.any(Number),
        shot_latency_s: expect.any(Number),
        pm_defaults: {
          alt_rel_m: expect.any(Number),
          yaw_abs_deg: expect.any(Number),
          gimbal_pitch_deg: expect.any(Number),
          gimbal_yaw_abs_deg: expect.any(Number),
          speed_out_mps: null,
          actions: []
        }
      },
      placemarks: [],
      pois: [],
      zones: []
    });
  });

  test('insertPlacemarkAt clones defaults when populating fields', () => {
    const base = window.Model.createEmptyPlan();
    base.defaults.pm_defaults = {
      alt_rel_m: 80,
      yaw_abs_deg: 45,
      gimbal_pitch_deg: -30,
      gimbal_yaw_abs_deg: 12,
      speed_out_mps: 6,
      actions: [{ type: 'Wait', params: { seconds: 1 } }]
    };
    window.Model.setPlan(base);

    const placemark = window.Model.insertPlacemarkAt(0, { lat: 10, lon: 20, alt: 60 });

    expect(placemark).toMatchObject({
      lat: 10,
      lon: 20,
      alt_rel_m: 60,
      aircraft: { yaw_abs_deg: 45 },
      gimbal: { pitch_deg: -30, yaw_abs_deg: 12 },
      speed_out_mps: 6,
      actions: [{ type: 'Wait', params: { seconds: 1 } }]
    });
    expect(placemark.actions).not.toBe(base.defaults.pm_defaults.actions);
  });

  test('computeTotals measures length and duration with waits and photos', () => {
    const plan = window.Model.createEmptyPlan();
    plan.defaults.speed_mps = 10;
    plan.defaults.shot_latency_s = 0.5;
    plan.defaults.pm_defaults.actions = [
      { type: 'Wait', params: { seconds: 5 } },
      { type: 'TakePhoto' }
    ];
    plan.placemarks = [
      { lat: 0, lon: 0, speed_out_mps: null, actions: null },
      { lat: 0, lon: 0.001, speed_out_mps: 5, actions: [{ type: 'Wait', params: { seconds: 400 } }] },
      { lat: 0, lon: 0.002, speed_out_mps: null, actions: [] }
    ];

    const totals = window.Model.computeTotals(plan, { WAIT_S_MAX: 120 });

    const dist1 = window.Geo.distanceMeters(0, 0, 0, 0.001);
    const dist2 = window.Geo.distanceMeters(0, 0.001, 0, 0.002);
    const expectedLength = dist1 + dist2;
    const expectedDuration = dist1 / 10 + dist2 / 5 + 5 + 0.5 + 120;

    expect(totals.count).toBe(3);
    expect(totals.length_m).toBeCloseTo(expectedLength, 5);
    expect(totals.duration_s).toBeCloseTo(expectedDuration, 5);
  });
});
