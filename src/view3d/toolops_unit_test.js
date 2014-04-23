"use strict";

var optest_valid_args = new set([
  "selectmode", //view3d selection mode
  "needs_mesh",
  "datamode" //datamode type mask, e.g. MeshTypes.VERT|MeshTypes.FACE
]);

class ToolOpTestReq {
  constructor(ObjectMap args) {
    this.selectmode = args.selectmode;
    this.datamode = args.datamode;
    this.needs_mesh = args.needs_mesh;
    
    for (var k in args) {
      if (!(optest_valid_args.has(k))) {
        throw new Error("invalid argument " + k + " passed to new ToolOpTest()");
      }
    }
  }
}

