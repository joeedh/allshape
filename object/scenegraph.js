
create_prototype(SceneObject);
SceneObject.gen_transmat = function() {}

function SceneGraph() {
	DAG.call(this);
}
inherit(SceneGraph, DAG);
