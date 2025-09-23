// Orchestrates UI modules and binds them to application state
(function () {
  function init() {
    ModeController.init();
    PlanPanel.init();
    PlacemarkPanel.init();
    PoiPanel.init();
    ZonePanel.init();

    State.onChange((plan) => {
      MapView.renderPlan(plan);
      const totals = State.computeTotals();
      PlanPanel.render(plan, totals);
      PlacemarkPanel.render(plan);
      PoiPanel.render(plan);
      ZonePanel.render(plan);
    });

    MapView.init();
    MapView.renderPlan(State.getPlan());
  }

  init();
})();
