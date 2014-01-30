"use strict";

var GridTypes = {CART: 1, TRIANGLE: 2};
var GridFlags = {
  XRULER: 1,
  YRULER: 2,
  ZRULER: 4
};

function ViewGrid(steps) {
  this.steps = steps;
  this.substeps = substeps;
  this.substep_level = 2;
  
  this.unit = g_all_state.session.settings.unit;
  this.rulerunit = this.unit;
  this.type = GridTypes.CART;
  
  this.bb = [[-10, -10, -10], [10, 10, 10]];
  this.bb[0] = new Vector3(this.bb[0]);
  this.bb[1] = new Vector3(this.bb[1]);
  
  this.dir = new Vector3([0, 0, 1.0]);
  
  this.flag = 0;  
}
create_prototype(ViewGrid);

ViewGrid.prototype.draw = function() {
}
