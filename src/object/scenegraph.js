class SceneGraph extends Dag {
  constructor() {
    super();
  }
};

SceneGraph.STRUCT = STRUCT.inherit(SceneGraph, Dag) + """
  }
""";

//this type is sufficiently important that we double-check
//that SceneGraph.fromSTRUCT was inherited correctly from Dag.
//the typesystem should be perfect but, well. . .
if (SceneGraph.fromSTRUCT != Dag.fromSTRUCT) {
  define_static(SceneGraph, "fromSTRUCT", Dag.fromSTRUCT);
}
